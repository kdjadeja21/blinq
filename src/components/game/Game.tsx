"use client";

import { useClerk } from "@clerk/nextjs";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { SOLO_DIFFICULTY, generateRound, getCheckSpec, getComboStageSpecs, getRoundSpec, getTrainingSpec, type RoundSpec } from "@/lib/engine";
import { RESULTS_TRANSITION_DELAY_MS } from "@/lib/roundEnd";
import { roundReducer, type Mode, type Stage } from "@/lib/game";
import { getLevelConfig, updateAdaptive } from "@/lib/levelConfig";
import { hasSeenIntro, loadLevelProgress, markIntroSeen, recordLevelResult, saveLevelProgress, useLevelProgress } from "@/lib/levelProgress";
import { DEFAULT_PROFILE_ID, activeProfile, loadProfiles, useProfiles } from "@/lib/profile";
import { MEMORY_CHECK_ENABLED, SKILL_TYPES, checkChange, checkDue, recordCheck, recordSkill, skillTrends } from "@/lib/skillProgress";
import { applyRoundResult } from "@/lib/progress";
import { hash, mulberry32, utcDateKey } from "@/lib/rng";
import { introCards } from "@/lib/rounds/intro";
import { isGuestLocked } from "@/lib/solo/guest";
import { loadStats, saveStats, useStats } from "@/lib/storage";
import { HomeScreen } from "./HomeScreen";
import { PlayScreen } from "./PlayScreen";
import { ResultScreen } from "./ResultScreen";
import { ResultsTransition } from "./ResultsTransition";
import { SoloAuthControl } from "./SoloAuth";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { TrainingIntro } from "./TrainingIntro";
import { TrainingPrompt } from "./TrainingPrompt";
import { useGameMusic } from "./useGameMusic";
import { useMemoryCheckSync } from "./useMemoryCheckSync";
import { useSoloSync } from "./useSoloSync";

const TRAINING_PROMPT_DELAY_MS = 2000;

function buildStages(specs: RoundSpec[]): Stage[] {
  return specs.map((spec) => ({ spec, ...generateRound(spec) }));
}

function soloSettings(): { kids: boolean; difficulty: typeof SOLO_DIFFICULTY } {
  const kids = activeProfile(loadProfiles()).kids;
  return { kids, difficulty: kids ? "easy" : SOLO_DIFFICULTY };
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

  const [checking, setChecking] = useState(false);
  const profiles = useProfiles();
  const levelProgress = useLevelProgress();
  const { guest, signedIn, recordRound } = useSoloSync();
  const memoryCheckOn = MEMORY_CHECK_ENABLED && !guest;
  const onAccountProfile = !profiles || activeProfile(profiles).id === DEFAULT_PROFILE_ID;
  useMemoryCheckSync(memoryCheckOn && signedIn && onAccountProfile, levelProgress ? levelProgress.checks.length : null);
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

  const roundKey = round?.key;
  const ending = Boolean(round?.ending);
  useEffect(() => {
    if (!ending || roundKey === undefined) return;
    const id = window.setTimeout(() => dispatch({ type: "finish", key: roundKey, now: Date.now() }), RESULTS_TRANSITION_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [ending, roundKey]);

  useEffect(() => {
    if (!round?.result || committedRef.current === round.key) return;
    committedRef.current = round.key;
    const before = loadStats();
    saveStats(applyRoundResult(before, round, Date.now()));
    const day = utcDateKey(Date.now());
    const { result } = round;
    let progress = loadLevelProgress();
    if (round.mode === "level") {
      progress = { ...progress, adaptive: updateAdaptive(progress.adaptive, result.won) };
      const skill = SKILL_TYPES.find((type) => type === round.spec.roundType);
      if (round.stage.count === 1 && skill) {
        progress = { ...progress, skills: recordSkill(progress.skills, skill, day, result.correct, result.total) };
      }
      if (result.stars === 3 && round.level === before.level) {
        const outcome = recordLevelResult(progress, round.level, result.perfect);
        progress = outcome.state;
        const offer = outcome.skipTo ? { key: round.key, to: outcome.skipTo } : null;
        queueMicrotask(() => setSkipOffer(offer));
      }
      saveLevelProgress(progress);
    } else if (checking && round.mode === "training" && round.attempt === 1 && result.total > 0) {
      saveLevelProgress({ ...progress, checks: recordCheck(progress.checks, day, (result.correct / result.total) * 100) });
    }
    if (round.mode !== "training") recordRound(round);
  }, [round, recordRound, checking]);

  const start = useCallback((mode: Mode, skipIntro = false) => {
    const t = Date.now();
    setPracticeLevel(null);
    setSkipOffer(null);
    setChecking(false);
    const { kids, difficulty } = soloSettings();
    const offset = loadLevelProgress().adaptive.offset;
    const level = mode === "level" ? loadStats().level : 1;
    if (guest && (mode === "daily" || (mode === "level" && isGuestLocked(guest, level)))) {
      dispatch({ type: "quit" });
      void openSignIn();
      return;
    }
    const config = mode === "level" ? getLevelConfig(level, difficulty, offset, kids) : null;
    if (config?.isIntro && !skipIntro && !hasSeenIntro(loadLevelProgress(), config.block)) {
      const spec = getTrainingSpec(config.roundType);
      keyRef.current += 1;
      setPracticeLevel(level);
      dispatch({ type: "start", mode: "training", spec, ...generateRound(spec), level, now: t, key: keyRef.current });
      return;
    }
    if (config?.isBoss) {
      const stages = buildStages(getComboStageSpecs(difficulty, level, kids));
      keyRef.current += 1;
      dispatch({ type: "start", mode, spec: stages[0].spec, items: stages[0].items, choices: stages[0].choices, stages, level, now: t, key: keyRef.current });
      return;
    }
    const spec = getRoundSpec({ mode, difficulty, level, adaptiveOffset: offset, kids });
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
    const block = getLevelConfig(practiceLevel, soloSettings().difficulty).block;
    saveLevelProgress(markIntroSeen(loadLevelProgress(), block));
    start("level", true);
  }, [practiceLevel, start]);

  const startCheck = useCallback(() => {
    const t = Date.now();
    const spec = getCheckSpec();
    keyRef.current += 1;
    setPracticeLevel(null);
    setSkipOffer(null);
    setChecking(true);
    dispatch({ type: "start", mode: "training", spec, ...generateRound(spec), introSteps: 1, level: 1, now: t, key: keyRef.current });
    dispatch({ type: "introNext", now: t });
  }, []);

  const finishCheck = useCallback(() => {
    setChecking(false);
    dispatch({ type: "quit" });
  }, []);

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

  const profile = profiles ? activeProfile(profiles) : null;
  const kids = profile?.kids ?? false;
  const difficulty = kids ? "easy" : SOLO_DIFFICULTY;
  const offset = levelProgress?.adaptive.offset ?? 0;

  let body: React.ReactNode;
  if (!stats || !profiles || !levelProgress) {
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
        profiles={profiles}
        levelItems={getRoundSpec({ mode: "level", difficulty, level: stats.level, adaptiveOffset: offset, kids }).itemCount}
        progress={{
          trends: skillTrends(levelProgress.skills, today),
          checkChange: memoryCheckOn ? checkChange(levelProgress.checks) : null,
          checkDue: memoryCheckOn && today !== "" && checkDue(levelProgress.checks, today),
          hasBaseline: levelProgress.checks.length > 0,
          onStartCheck: startCheck,
        }}
      />
    );
  } else if (round.phase === "intro") {
    body = (
      <TrainingIntro
        step={round.introStep}
        onNext={() => dispatch({ type: "introNext", now: Date.now() })}
        onSkip={practiceLevel === null ? finishTraining : finishPractice}
        cards={practiceLevel === null ? undefined : introCards(round.spec.roundType, getLevelConfig(practiceLevel, difficulty, 0, kids).strategyTip)}
        label={practiceLevel === null ? "Training" : "Practice"}
      />
    );
  } else if (round.phase === "result") {
    body = (
      <ResultsTransition key={round.key}>
      <ResultScreen
        round={round}
        stats={stats}
        guest={guest}
        onRetry={retry}
        onNextLevel={() => start("level")}
        onHome={() => dispatch({ type: "quit" })}
        onStartPlaying={checking ? finishCheck : practiceLevel === null ? finishTraining : finishPractice}
        check={checking}
        nextItems={getRoundSpec({ mode: "level", difficulty: round.spec.difficulty, level: round.level + 1, adaptiveOffset: offset, kids: round.spec.kids }).itemCount}
        skipTo={skipOffer?.key === round.key ? skipOffer.to : null}
        onSkipAhead={skipAhead}
      />
      </ResultsTransition>
    );
  } else {
    body = <PlayScreen key={`${round.key}-${round.stage.index}`} round={round} now={now} dispatch={dispatch} onSkipTraining={checking ? finishCheck : finishTraining} check={checking} />;
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

