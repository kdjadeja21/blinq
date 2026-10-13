import type { Item } from "./items";
import {
  MAX_LIVES,
  WRONG_PENALTY_MS,
  WIN_RATIO,
  nextCombo,
  pointsForCombo,
  starsFor,
} from "./scoring";

export type Mode = "training" | "level" | "daily";
export type Phase = "intro" | "memorize" | "hide" | "recall" | "result";

export const INTRO_STEPS = 3;

export const HIDE_MS = 700;

const TRAINING_TIMINGS = { memorizeMs: 15_000, recallMs: 20_000 };

/** Memorize 4s + 2s per item, recall 8s + 1.5s per item, both capped at 30s. */
export function roundTimings(mode: Mode, itemCount: number): { memorizeMs: number; recallMs: number } {
  if (mode === "training") return TRAINING_TIMINGS;
  return {
    memorizeMs: Math.min(30_000, 4_000 + 2_000 * itemCount),
    recallMs: Math.min(30_000, 8_000 + 1_500 * itemCount),
  };
}

export interface Recalled {
  id: string;
  points: number;
}

export interface RoundResult {
  correct: number;
  total: number;
  stars: 0 | 1 | 2 | 3;
  won: boolean;
  perfect: boolean;
  score: number;
  speedBonus: number;
  wrongCount: number;
  early: boolean;
}

export interface Round {
  key: number;
  mode: Mode;
  level: number;
  attempt: number;
  items: Item[];
  choices: Item[];
  lives: number;
  memorizeMs: number;
  recallMs: number;
  phase: Phase;
  introStep: number;
  phaseEndsAt: number;
  recallEndsAt: number;
  recalled: Recalled[];
  /** ids of decoys the player tapped */
  wrong: string[];
  combo: number;
  lastCorrectAt: number | null;
  result: RoundResult | null;
}

export type Action =
  | { type: "start"; mode: Mode; items: Item[]; choices: Item[]; level: number; now: number; key: number }
  | { type: "introNext"; now: number }
  | { type: "tick"; now: number }
  | { type: "pick"; id: string; now: number }
  | { type: "submit"; now: number }
  | { type: "retry"; now: number; key: number; items?: Item[]; choices?: Item[] }
  | { type: "quit" };

function beginMemorize(round: Round, now: number): Round {
  return { ...round, phase: "memorize", phaseEndsAt: now + round.memorizeMs };
}

function finish(round: Round, now: number, early: boolean): Round {
  const total = round.items.length;
  const correct = round.recalled.length;
  const remainingSeconds = Math.max(0, Math.floor((round.recallEndsAt - now) / 1000));
  const speedBonus = early && correct > 0 ? remainingSeconds : 0;
  const score = round.recalled.reduce((sum, r) => sum + r.points, 0) + speedBonus;
  const stars = starsFor(correct, total);
  return {
    ...round,
    phase: "result",
    result: {
      correct,
      total,
      stars,
      won: total > 0 && correct / total >= WIN_RATIO,
      perfect: correct === total,
      score,
      speedBonus,
      wrongCount: round.wrong.length,
      early,
    },
  };
}

export function roundReducer(round: Round | null, action: Action): Round | null {
  if (action.type === "start") {
    const base: Round = {
      key: action.key,
      mode: action.mode,
      level: action.level,
      attempt: 1,
      items: action.items,
      choices: action.choices,
      lives: MAX_LIVES,
      ...roundTimings(action.mode, action.items.length),
      phase: action.mode === "training" ? "intro" : "memorize",
      introStep: 0,
      phaseEndsAt: 0,
      recallEndsAt: 0,
      recalled: [],
      wrong: [],
      combo: 0,
      lastCorrectAt: null,
      result: null,
    };
    return action.mode === "training" ? base : beginMemorize(base, action.now);
  }
  if (action.type === "quit") return null;
  if (!round) return round;

  switch (action.type) {
    case "introNext": {
      if (round.phase !== "intro") return round;
      if (round.introStep < INTRO_STEPS - 1) return { ...round, introStep: round.introStep + 1 };
      return beginMemorize(round, action.now);
    }
    case "tick": {
      if (action.now < round.phaseEndsAt) return round;
      if (round.phase === "memorize") {
        return { ...round, phase: "hide", phaseEndsAt: round.phaseEndsAt + HIDE_MS };
      }
      if (round.phase === "hide") {
        const recallEndsAt = action.now + round.recallMs;
        return { ...round, phase: "recall", phaseEndsAt: recallEndsAt, recallEndsAt };
      }
      if (round.phase === "recall") return finish(round, action.now, false);
      return round;
    }
    case "pick": {
      if (round.phase !== "recall") return round;
      if (round.recalled.some((r) => r.id === action.id) || round.wrong.includes(action.id)) return round;
      if (!round.items.some((i) => i.id === action.id)) {
        const wrong = [...round.wrong, action.id];
        if (round.mode === "training") return { ...round, wrong, combo: 0 };
        const next = {
          ...round,
          wrong,
          combo: 0,
          lives: round.lives - 1,
          phaseEndsAt: round.phaseEndsAt - WRONG_PENALTY_MS,
          recallEndsAt: round.recallEndsAt - WRONG_PENALTY_MS,
        };
        return next.lives <= 0 || action.now >= next.phaseEndsAt ? finish(next, action.now, false) : next;
      }
      const combo = nextCombo(round.combo, round.lastCorrectAt, action.now);
      const points = pointsForCombo(combo);
      const next: Round = {
        ...round,
        recalled: [...round.recalled, { id: action.id, points }],
        combo,
        lastCorrectAt: action.now,
      };
      return next.recalled.length === next.items.length ? finish(next, action.now, true) : next;
    }
    case "submit":
      return round.phase === "recall" ? finish(round, action.now, true) : round;
    case "retry": {
      const fresh = roundReducer(null, {
        type: "start",
        mode: round.mode,
        items: action.items ?? round.items,
        choices: action.choices ?? round.choices,
        level: round.level,
        now: action.now,
        key: action.key,
      });
      if (!fresh) return fresh;
      return beginMemorize({ ...fresh, attempt: round.attempt + 1, introStep: INTRO_STEPS - 1 }, action.now);
    }
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
