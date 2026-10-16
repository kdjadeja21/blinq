"use client";

import { useClerk } from "@clerk/nextjs";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { SOLO_DIFFICULTY, generateRound, getComboStageSpecs, getRoundSpec, getTrainingSpec, type RoundSpec } from "@/lib/engine";
import { roundReducer, type Mode, type Stage } from "@/lib/game";
import { getLevelConfig } from "@/lib/levelConfig";
import { hasSeenIntro, loadLevelProgress, markIntroSeen, recordLevelResult, saveLevelProgress } from "@/lib/levelProgress";
import { applyRoundResult } from "@/lib/progress";
import { hash, mulberry32, utcDateKey } from "@/lib/rng";
import { introCards } from "@/lib/rounds/intro";
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

function buildStages(specs: RoundSpec[]): Stage[] {
  return specs.map((spec) => ({ spec, ...generateRound(spec) }));
}

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
  const [practiceLevel, setPracticeLevel] = useState<number | null>(null);
  const [skipOffer, setSkipOffer] = useState<{ key: number; to: number } | null>(null);

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
    const before = loadStats();
    saveStats(applyRoundResult(before, round, Date.now()));
    if (round.mode === "level" && round.result.stars === 3 && round.level === before.level) {
      const outcome = recordLevelResult(loadLevelProgress(), round.level, round.result.perfect);
      saveLevelProgress(outcome.state);
      const offer = outcome.skipTo ? { key: round.key, to: outcome.skipTo } : null;
      queueMicrotask(() => setSkipOffer(offer));
    }
    if (round.mode !== "training") recordRound(round);
  }, [round, recordRound]);

  const start = useCallback((mode: Mode, skipIntro = false) => {
    const t = Date.now();
    setPracticeLevel(null);
    setSkipOffer(null);
    const level = mode === "level" ? loadStats().level : 1;
    if (guest && (mode === "daily" || (mode === "level" && isGuestLocked(guest, level)))) {
      dispatch({ type: "quit" });
      void openSignIn();
      return;
    }
    const config = mode === "level" ? getLevelConfig(level, SOLO_DIFFICULTY) : null;
    if (config?.isIntro && !skipIntro && !hasSeenIntro(loadLevelProgress(), config.block)) {
      const spec = getTrainingSpec(config.roundType);
      keyRef.current += 1;
      setPracticeLevel(level);
      dispatch({ type: "start", mode: "training", spec, ...generateRound(spec), level, now: t, key: keyRef.current });
      return;
    }
    if (config?.isBoss) {
      const stages = buildStages(getComboStageSpecs(SOLO_DIFFICULTY, level));
      keyRef.current += 1;
      dispatch({ type: "start", mode, spec: stages[0].spec, items: stages[0].items, choices: stages[0].choices, stages, level, now: t, key: keyRef.current });
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

  const finishPractice = useCallback(() => {
    if (practiceLevel === null) return;
    const block = getLevelConfig(practiceLevel, SOLO_DIFFICULTY).block;
    saveLevelProgress(markIntroSeen(loadLevelProgress(), block));
    start("level", true);
  }, [practiceLevel, start]);

  const skipAhead = useCallback(() => {
    if (!skipOffer) return;
    const current = loadStats();
    saveStats({ ...current, level: skipOffer.to, bestLevel: Math.max(current.bestLevel, skipOffer.to) });
    start("level");
  }, [skipOffer, start]);

  const retry = useCallback(() => {
    keyRef.current += 1;
    const now = Date.now();
    if (round && round.stageSpecs.length > 1) {
      dispatch({ type: "retry", now, key: keyRef.current, stages: buildStages(round.stageSpecs) });
      return;
    }
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
        onSkip={practiceLevel === null ? finishTraining : finishPractice}
        cards={practiceLevel === null ? undefined : introCards(round.spec.roundType, getLevelConfig(practiceLevel, SOLO_DIFFICULTY).strategyTip)}
        label={practiceLevel === null ? "Training" : "Practice"}
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
        onStartPlaying={practiceLevel === null ? finishTraining : finishPractice}
        skipTo={skipOffer?.key === round.key ? skipOffer.to : null}
        onSkipAhead={skipAhead}
      />
    );
  } else {
    body = <PlayScreen key={`${round.key}-${round.stage.index}`} round={round} now={now} dispatch={dispatch} onSkipTraining={finishTraining} />;
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

