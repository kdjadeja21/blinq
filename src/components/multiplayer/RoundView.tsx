"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { Board } from "@/components/game/Board";
import { ChoiceGrid } from "@/components/game/ChoiceGrid";
import { Lives } from "@/components/game/Lives";
import { Button } from "@/components/ui/button";
import { HIDE_MS, MODIFIER_LABELS } from "@/lib/engine";
import { layoutFor } from "@/lib/multiplayer/layout";
import type { RoundRow } from "@/lib/multiplayer/types";
import { comboMultiplier } from "@/lib/scoring";
import { Header, Popups, TimesUp, toItems, useTickCue } from "./DuelView";
import { Avatar, useServerNow } from "./shared";
import { useDuelPicks } from "./useDuelPicks";
import type { RoomState } from "./useRoom";

function RoundIntro({ state, round, seconds }: { state: RoomState; round: RoundRow; seconds: number }) {
  const reduce = useReducedMotion();
  const humans = state.players.filter((p) => !p.is_bot);
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border-2 bg-card p-6 text-center shadow-lg" aria-live="polite">
      <p className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Level {state.room?.level} of {state.room?.max_levels}
      </p>
      <h2 className="text-3xl font-extrabold">Everyone plays at once</h2>
      <p className="text-sm text-muted-foreground">
        {round.item_count} items. Same items for all {humans.length} players, but your tiles are laid out your own way.
      </p>
      <ul className="flex max-w-full flex-wrap justify-center gap-1" aria-label="Players">
        {humans.map((p) => (
          <li key={p.id}>
            <Avatar player={p} />
          </li>
        ))}
      </ul>
      <motion.p
        key={seconds}
        initial={reduce ? false : { scale: 1.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-6xl font-black tabular-nums"
        role="timer"
      >
        {seconds}
      </motion.p>
    </section>
  );
}

function MemorizeRound({ state, round, seconds, remaining, durationMs }: { state: RoomState; round: RoundRow; seconds: number; remaining: number; durationMs: number }) {
  useTickCue(seconds, true);
  const meId = state.me?.id ?? "";
  const items = useMemo(() => layoutFor(round.id, meId, "board", toItems(state.itemKeys)), [round.id, meId, state.itemKeys]);
  const twists = round.rules.modifiers.map((modifier) => ` · ${MODIFIER_LABELS[modifier]}`).join("");
  return (
    <div className="flex flex-col gap-3">
      <Header label={`Memorize the table${twists}`} seconds={seconds} progress={durationMs ? Math.min(1, remaining / durationMs) : 0} />
      <Board items={items} mode={remaining <= HIDE_MS ? "hide" : "memorize"} recalledIds={[]} />
    </div>
  );
}

function FinishedCounter({ state }: { state: RoomState }) {
  const humans = state.players.filter((p) => !p.is_bot).length;
  const done = state.roundDone.length;
  return (
    <p className="text-center text-xs font-semibold text-muted-foreground tabular-nums" role="status">
      {done} of {humans} players finished
    </p>
  );
}

function RecallRound({ state, round, clock, startedAt }: { state: RoomState; round: RoundRow; clock: number; startedAt: number }) {
  const meId = state.me?.id ?? "";
  const choices = useMemo(() => layoutFor(round.id, meId, "choices", toItems(state.choiceKeys)), [round.id, meId, state.choiceKeys]);
  const picks = useDuelPicks({ duel: round, kind: "round", startedAt, memorized: state.memorizedKeys, now: state.now });
  const { score } = picks;

  const current = clock || startedAt;
  const remaining = Math.max(0, startedAt + score.deadlineMs - current);
  const seconds = Math.ceil(remaining / 1000);
  const timeUp = remaining === 0;
  useTickCue(seconds, !picks.stopped && !timeUp);

  const waiting = picks.stopped || timeUp;
  const status = picks.out
    ? "Out of mistakes. Waiting for the others."
    : picks.complete || picks.finished
      ? "Done. Waiting for the others."
      : timeUp
        ? "Time is up."
        : null;

  return (
    <div className="flex flex-col gap-3">
      <Header
        label="Tap what you saw"
        seconds={seconds}
        progress={Math.min(1, remaining / round.recall_ms)}
        extra={
          <div className="h-8">
            <AnimatePresence mode="popLayout">
              {score.combo >= 2 && !waiting && (
                <motion.span
                  key={score.combo}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14 }}
                  className="inline-block rounded-full bg-flame px-3 py-1 text-sm font-bold text-black shadow-lg shadow-flame/40"
                >
                  🔥 x{comboMultiplier(score.combo)} combo
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        }
      />
      <div className="relative">
        <ChoiceGrid
          choices={choices}
          recalledIds={picks.right}
          wrongIds={picks.wrong}
          hintId={null}
          pendingIds={picks.pending}
          disabled={waiting}
          onPick={picks.pick}
        />
        <AnimatePresence>
          {picks.popup && <Popups key={picks.popup.key} id={picks.popup.key} kind={picks.popup.kind} points={picks.popup.points} penaltyMs={round.rules.wrongPenaltyMs} />}
        </AnimatePresence>
      </div>
      {status && (
        <p className="rounded-2xl bg-muted px-3 py-2 text-center text-sm font-medium" role="status">
          {status}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {picks.right.length}/{round.item_count} found
        </span>
        <Lives lives={picks.lives} max={picks.maxLives} />
        <Button variant="secondary" className="h-11 px-4" disabled={waiting} onClick={picks.finish}>
          I&apos;m done
        </Button>
      </div>
      <FinishedCounter state={state} />
    </div>
  );
}

export function RoundView({ state }: { state: RoomState }) {
  const { room, round, now } = state;
  const clock = useServerNow(now);
  if (!room || !round) return null;

  const started = room.phase_started_at ? Date.parse(room.phase_started_at) : clock;
  const durationMs = room.phase_duration_ms ?? 0;
  const remaining = Math.max(0, started + durationMs - clock);
  const seconds = Math.ceil(remaining / 1000);

  if (room.phase === "duel_intro") return <RoundIntro state={state} round={round} seconds={seconds} />;
  if (room.phase === "memorize") {
    return <MemorizeRound state={state} round={round} seconds={seconds} remaining={remaining} durationMs={durationMs} />;
  }
  const timesUp = clock > 0 && remaining === 0;
  return (
    <>
      <RecallRound key={round.id} state={state} round={round} clock={clock} startedAt={started} />
      {timesUp && <TimesUp />}
    </>
  );
}
