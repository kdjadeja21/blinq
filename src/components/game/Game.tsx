"use client";

import { useClerk } from "@clerk/nextjs";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { SOLO_DIFFICULTY, generateRound, getRoundSpec } from "@/lib/engine";
import { roundReducer, type Mode } from "@/lib/game";
import { applyRoundResult } from "@/lib/progress";
import { hash, mulberry32, utcDateKey } from "@/lib/rng";
import { isGuestLocked } from "@/lib/solo/guest";
import { loadStats, saveStats, useStats } from "@/lib/storage";
import { HomeScreen } from "./HomeScreen";
import { PlayScreen } from "./PlayScreen";
import { ResultScreen } from "./ResultScreen";
import { SoloAuthControl } from "./SoloAuth";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { TrainingIntro } from "./TrainingIntro";
import { TrainingPrompt } from "./TrainingPrompt";
import { useGameMusic } from "./useGameMusic";
import { useSoloSync } from "./useSoloSync";

const TRAINING_PROMPT_DELAY_MS = 2000;

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

  const { guest, recordRound } = useSoloSync();
  const { openSignIn } = useClerk();

  useGameMusic(round, now);

  const timed = round?.phase === "memorize" || round?.phase === "hide" || round?.phase === "distract" || round?.phase === "recall";
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
    if (round.mode !== "training") recordRound(round);
  }, [round, recordRound]);

  const start = useCallback((mode: Mode) => {
    const t = Date.now();
    const level = mode === "level" ? loadStats().level : 1;
    if (guest && (mode === "daily" || (mode === "level" && isGuestLocked(guest, level)))) {
      dispatch({ type: "quit" });
      void openSignIn();
      return;
    }
    const spec = getRoundSpec({ mode, difficulty: SOLO_DIFFICULTY, level });
    const seed = mode === "daily" ? `blinq:${utcDateKey(t)}` : null;
    const { items, choices, layout, table } = generateRound(spec, seed ? mulberry32(hash(seed)) : Math.random);
    keyRef.current += 1;
    dispatch({ type: "start", mode, spec, items, choices, layout, table, level, now: t, key: keyRef.current });
  }, [guest, openSignIn]);

  const finishTraining = useCallback(() => {
    saveStats({ ...loadStats(), trainingDone: true });
    dispatch({ type: "quit" });
  }, []);

  const retry = useCallback(() => {
    keyRef.current += 1;
    const now = Date.now();
    if (round?.mode === "level" || round?.mode === "training") {
      dispatch({ type: "retry", now, key: keyRef.current, ...generateRound(round.spec) });
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
        guest={guest}
        onSignIn={() => void openSignIn()}
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
        guest={guest}
        onRetry={retry}
        onNextLevel={() => start("level")}
        onHome={() => dispatch({ type: "quit" })}
        onStartPlaying={finishTraining}
      />
    );
  } else {
    body = <PlayScreen key={round.key} round={round} now={now} dispatch={dispatch} onSkipTraining={finishTraining} />;
  }

  const eligibleForTraining = Boolean(stats && !stats.trainingDone && !round);
  const [promptDelayDone, setPromptDelayDone] = useState(false);
  useEffect(() => {
    if (!eligibleForTraining) return;
    const id = window.setTimeout(() => setPromptDelayDone(true), TRAINING_PROMPT_DELAY_MS);
    return () => {
      window.clearTimeout(id);
      setPromptDelayDone(false);
    };
  }, [eligibleForTraining]);
  const offerTraining = eligibleForTraining && promptDelayDone;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6">
      <div className="flex flex-1 flex-col" inert={offerTraining ? true : undefined}>
        <header className="flex h-14 items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight">Blinq</span>
          <div className="flex items-center gap-1">
            <SoloAuthControl showSignIn={!round} />
            <SoundToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col">{body}</main>
      </div>
      <AnimatePresence>
        {offerTraining ? <TrainingPrompt key="training" onStart={() => start("training")} onSkip={finishTraining} /> : null}
      </AnimatePresence>
    </div>
  );
}

