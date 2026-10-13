"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { roundReducer, type Mode } from "@/lib/game";
import { ITEMS_BY_ID, TRAINING_ITEM_IDS, type Item } from "@/lib/items";
import { applyRoundResult } from "@/lib/progress";
import { dailyItems, pickItems, utcDateKey } from "@/lib/rng";
import { levelItemCount } from "@/lib/scoring";
import { loadStats, saveStats, useStats } from "@/lib/storage";
import { HomeScreen } from "./HomeScreen";
import { PlayScreen } from "./PlayScreen";
import { ResultScreen } from "./ResultScreen";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { TrainingIntro } from "./TrainingIntro";

const TRAINING_ITEMS = TRAINING_ITEM_IDS.map((id) => ITEMS_BY_ID.get(id)).filter(
  (item): item is Item => item !== undefined,
);

function subscribeNever() {
  return () => {};
}

export function Game() {
  const stats = useStats();
  const today = useSyncExternalStore(subscribeNever, () => utcDateKey(Date.now()), () => "");
  const [round, dispatch] = useReducer(roundReducer, null);
  const [now, setNow] = useState(0);
  const keyRef = useRef(0);
  const committedRef = useRef(-1);
  const autoTrainingRef = useRef(false);

  const timed = round?.phase === "memorize" || round?.phase === "hide" || round?.phase === "recall";
  const phaseEndsAt = round?.phaseEndsAt ?? 0;

  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: "tick", now: t });
    }, 100);
    return () => window.clearInterval(id);
  }, [timed, phaseEndsAt]);

  useEffect(() => {
    if (!round?.result || committedRef.current === round.key) return;
    committedRef.current = round.key;
    saveStats(applyRoundResult(loadStats(), round, Date.now()));
  }, [round]);

  const start = useCallback((mode: Mode) => {
    const current = loadStats();
    const t = Date.now();
    let items: Item[];
    let level = current.level;
    if (mode === "training") items = TRAINING_ITEMS;
    else if (mode === "daily") items = dailyItems(utcDateKey(t), levelItemCount(3));
    else items = pickItems(levelItemCount(level));
    if (mode !== "level") level = 1;
    keyRef.current += 1;
    dispatch({ type: "start", mode, items, level, now: t, key: keyRef.current });
  }, []);

  useEffect(() => {
    if (stats && !stats.trainingDone && !round && !autoTrainingRef.current) {
      autoTrainingRef.current = true;
      start("training");
    }
  }, [stats, round, start]);

  const finishTraining = useCallback(() => {
    saveStats({ ...loadStats(), trainingDone: true });
    dispatch({ type: "quit" });
  }, []);

  const retry = useCallback(() => {
    keyRef.current += 1;
    dispatch({ type: "retry", now: Date.now(), key: keyRef.current });
  }, []);

  let body: React.ReactNode;
  if (!stats) {
    body = <div className="flex-1" aria-busy="true" />;
  } else if (!round) {
    body = (
      <HomeScreen
        stats={stats}
        today={today}
        onPlayLevel={() => start("level")}
        onPlayDaily={() => start("daily")}
        onTraining={() => start("training")}
      />
    );
  } else if (round.phase === "intro") {
    body = (
      <TrainingIntro
        step={round.introStep}
        onNext={() => dispatch({ type: "introNext", now: Date.now() })}
        onSkip={finishTraining}
      />
    );
  } else if (round.phase === "result") {
    body = (
      <ResultScreen
        key={round.key}
        round={round}
        stats={stats}
        onRetry={retry}
        onNextLevel={() => start("level")}
        onHome={() => dispatch({ type: "quit" })}
        onStartPlaying={finishTraining}
      />
    );
  } else {
    body = <PlayScreen key={round.key} round={round} now={now} dispatch={dispatch} onSkipTraining={finishTraining} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6">
      <header className="flex h-14 items-center justify-between">
        <span className="text-xl font-extrabold tracking-tight">Blinq</span>
        <div className="flex">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{body}</main>
    </div>
  );
}

