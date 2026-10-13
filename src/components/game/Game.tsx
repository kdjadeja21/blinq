"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { roundReducer, type Mode } from "@/lib/game";
import { ITEMS_BY_ID, TRAINING_ITEM_IDS, type Item } from "@/lib/items";
import { applyRoundResult } from "@/lib/progress";
import { buildChoices } from "@/lib/choices";
import { dailyItems, hash, mulberry32, pickItems, utcDateKey } from "@/lib/rng";
import { levelItemCount } from "@/lib/scoring";
import { loadStats, saveStats, useStats } from "@/lib/storage";
import { HomeScreen } from "./HomeScreen";
import { PlayScreen } from "./PlayScreen";
import { ResultScreen } from "./ResultScreen";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { TrainingIntro } from "./TrainingIntro";
import { useGameMusic } from "./useGameMusic";

const TRAINING_ITEMS = TRAINING_ITEM_IDS.map((id) => ITEMS_BY_ID.get(id)).filter(
  (item): item is Item => item !== undefined,
);

function subscribeNever() {
  return () => {};
}

function Splash() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center" aria-busy="true">
      <p className="animate-bounce text-7xl" aria-hidden>
        🧠
      </p>
      <h1 className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent">
        Blinq
      </h1>
      <p className="text-muted-foreground">Warming up your memory...</p>
    </div>
  );
}

export function Game() {
  const stats = useStats();
  const today = useSyncExternalStore(subscribeNever, () => utcDateKey(Date.now()), () => "");
  const [round, dispatch] = useReducer(roundReducer, null);
  const [now, setNow] = useState(0);
  const keyRef = useRef(0);
  const committedRef = useRef(-1);
  const autoTrainingRef = useRef(false);

  useGameMusic(round, now);

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
    const seed = mode === "training" ? "training" : mode === "daily" ? utcDateKey(t) : null;
    const choices = buildChoices(items, seed ? mulberry32(hash(`blinq:choices:${seed}`)) : Math.random);
    keyRef.current += 1;
    dispatch({ type: "start", mode, items, choices, level, now: t, key: keyRef.current });
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
    const now = Date.now();
    if (round?.mode === "level") {
      const items = pickItems(round.items.length);
      dispatch({ type: "retry", now, key: keyRef.current, items, choices: buildChoices(items, Math.random) });
      return;
    }
    dispatch({ type: "retry", now, key: keyRef.current });
  }, [round]);

  let body: React.ReactNode;
  if (!stats) {
    body = <Splash />;
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

