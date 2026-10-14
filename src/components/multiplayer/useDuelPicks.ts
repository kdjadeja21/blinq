"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { playCue } from "@/lib/feedback";
import { callMp, MpError } from "@/lib/multiplayer/api";
import type { DuelRow } from "@/lib/multiplayer/types";
import { musicHit } from "@/lib/music";
import { nextCombo, pointsForCombo, scoreRecall } from "@/lib/scoring";

interface Pick {
  id: string;
  /** null while the server has not answered and the client could not judge the tap itself */
  correct: boolean | null;
  at: number;
}

export interface Popup {
  key: number;
  kind: "good" | "bad";
  points: number;
}

interface GuessResponse {
  correct?: boolean;
  alreadyGuessed?: boolean;
}

const RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface PickStage {
  id: string;
  item_count: number;
  recall_ms: number;
  rules: DuelRow["rules"];
}

interface Options {
  /** the duel, or the shared round in individual mode */
  duel: PickStage;
  kind?: "duel" | "round";
  /** server-clock ms when recall started */
  startedAt: number;
  /** keys seen during memorize; empty when this client joined late and must wait for the server */
  memorized: string[];
  now: () => number;
}

/**
 * Taps are judged on the device against the table the player just memorized, so feedback is
 * instant (same model as single-player). Each tap is queued and sent to the server in order;
 * the server stays authoritative and its answer only corrects the local state if they differ.
 */
export function useDuelPicks({ duel, kind = "duel", startedAt, memorized, now }: Options) {
  const stageKey = kind === "round" ? "roundId" : "duelId";
  const [picks, setPicks] = useState<Pick[]>([]);
  const [finished, setFinished] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const sent = useRef(new Set<string>());
  const known = useMemo(() => new Set(memorized), [memorized]);

  const judged = useMemo(() => picks.flatMap((p) => (p.correct === null ? [] : [{ correct: p.correct, at: p.at }])), [picks]);
  const { rules } = duel;
  const score = useMemo(() => scoreRecall(judged, duel.item_count, duel.recall_ms, rules), [judged, duel.item_count, duel.recall_ms, rules]);

  const right = useMemo(() => picks.filter((p) => p.correct === true).map((p) => p.id), [picks]);
  const wrong = useMemo(() => picks.filter((p) => p.correct === false).map((p) => p.id), [picks]);
  const pending = useMemo(() => picks.filter((p) => p.correct === null).map((p) => p.id), [picks]);
  const out = wrong.length >= rules.lives;
  const complete = right.length >= duel.item_count;
  const stopped = out || complete || finished;

  const drop = useCallback((id: string) => {
    sent.current.delete(id);
    setPicks((list) => list.filter((p) => p.id !== id));
  }, []);

  const send = useCallback(
    async (id: string, claimedAt: number): Promise<void> => {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const result = await callMp<GuessResponse>("submit_guess", { [stageKey]: duel.id, itemKey: id, at: claimedAt });
          if (typeof result.correct === "boolean") {
            const correct = result.correct;
            setPicks((list) => list.map((p) => (p.id === id && p.correct !== correct ? { ...p, correct } : p)));
          } else {
            setPicks((list) => list.filter((p) => !(p.id === id && p.correct === null)));
          }
          return;
        } catch (error) {
          const retryable = !(error instanceof MpError) || error.status === 429;
          if (!retryable || attempt >= RETRIES) {
            drop(id);
            return;
          }
          await sleep(400 * 2 ** attempt);
        }
      }
    },
    [duel.id, stageKey, drop],
  );

  const pick = useCallback(
    (id: string) => {
      const t = now();
      if (stopped || sent.current.has(id) || t > startedAt + score.deadlineMs) return;
      sent.current.add(id);
      const at = t - startedAt;
      const correct = known.size > 0 ? known.has(id) : null;
      setPicks((list) => [...list, { id, correct, at }]);

      if (correct === null) playCue("tap");
      else if (correct) {
        const combo = nextCombo(score.combo, score.finishedMs, at, rules.comboWindowMs);
        if (!musicHit(combo)) playCue("correct");
        setPopup({ key: Date.now(), kind: "good", points: pointsForCombo(combo) });
      } else {
        playCue("wrong");
        setPopup({ key: Date.now(), kind: "bad", points: 0 });
      }
      queue.current = queue.current.then(() => send(id, t));
    },
    [now, stopped, startedAt, score.deadlineMs, score.combo, score.finishedMs, rules.comboWindowMs, known, send],
  );

  const finish = useCallback(() => {
    if (stopped) return;
    setFinished(true);
    queue.current = queue.current.then(async () => {
      try {
        await callMp("finish_early", { [stageKey]: duel.id });
      } catch {
        setFinished(false);
      }
    });
  }, [stopped, duel.id, stageKey]);

  return {
    right,
    wrong,
    pending,
    lives: Math.max(0, rules.lives - wrong.length),
    maxLives: rules.lives,
    out,
    complete,
    finished,
    stopped,
    score,
    popup,
    pick,
    finish,
  };
}
