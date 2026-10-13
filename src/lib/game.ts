import type { Item } from "./items";
import { matchItem } from "./match";
import {
  BASE_POINTS,
  COMBO_WINDOW_MS,
  WIN_RATIO,
  comboMultiplier,
  starsFor,
} from "./scoring";

export type Mode = "training" | "level" | "daily";
export type Phase = "intro" | "memorize" | "hide" | "recall" | "result";

export const HIDE_MS = 700;

export const TIMINGS: Record<Mode, { memorizeMs: number; recallMs: number }> = {
  training: { memorizeMs: 15_000, recallMs: 20_000 },
  level: { memorizeMs: 30_000, recallMs: 30_000 },
  daily: { memorizeMs: 30_000, recallMs: 30_000 },
};

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
  phase: Phase;
  introStep: number;
  phaseEndsAt: number;
  recallEndsAt: number;
  recalled: Recalled[];
  wrong: string[];
  combo: number;
  lastCorrectAt: number | null;
  result: RoundResult | null;
}

export type GuessOutcome = "correct" | "duplicate" | "wrong" | "empty";

export type Action =
  | { type: "start"; mode: Mode; items: Item[]; level: number; now: number; key: number }
  | { type: "introNext"; now: number }
  | { type: "tick"; now: number }
  | { type: "guess"; raw: string; now: number }
  | { type: "submit"; now: number }
  | { type: "retry"; now: number; key: number }
  | { type: "quit" };

function beginMemorize(round: Round, now: number): Round {
  const { memorizeMs } = TIMINGS[round.mode];
  return { ...round, phase: "memorize", phaseEndsAt: now + memorizeMs };
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

export function guessOutcome(round: Round, raw: string): { outcome: GuessOutcome; item: Item | null } {
  if (!raw.trim()) return { outcome: "empty", item: null };
  const matched = matchItem(raw);
  const onTable = matched ? round.items.find((i) => i.id === matched.id) : undefined;
  if (!onTable) return { outcome: "wrong", item: null };
  if (round.recalled.some((r) => r.id === onTable.id)) return { outcome: "duplicate", item: onTable };
  return { outcome: "correct", item: onTable };
}

export function roundReducer(round: Round | null, action: Action): Round | null {
  if (action.type === "start") {
    const base: Round = {
      key: action.key,
      mode: action.mode,
      level: action.level,
      attempt: 1,
      items: action.items,
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
      if (round.introStep < 1) return { ...round, introStep: round.introStep + 1 };
      return beginMemorize(round, action.now);
    }
    case "tick": {
      if (action.now < round.phaseEndsAt) return round;
      if (round.phase === "memorize") {
        return { ...round, phase: "hide", phaseEndsAt: round.phaseEndsAt + HIDE_MS };
      }
      if (round.phase === "hide") {
        const recallEndsAt = action.now + TIMINGS[round.mode].recallMs;
        return { ...round, phase: "recall", phaseEndsAt: recallEndsAt, recallEndsAt };
      }
      if (round.phase === "recall") return finish(round, action.now, false);
      return round;
    }
    case "guess": {
      if (round.phase !== "recall") return round;
      const { outcome, item } = guessOutcome(round, action.raw);
      if (outcome === "empty" || outcome === "duplicate") return round;
      if (outcome === "wrong" || !item) {
        return { ...round, wrong: [...round.wrong, action.raw.trim()], combo: 0 };
      }
      const chained =
        round.lastCorrectAt !== null && action.now - round.lastCorrectAt <= COMBO_WINDOW_MS;
      const combo = chained ? round.combo + 1 : 1;
      const points = Math.round(BASE_POINTS * comboMultiplier(combo));
      const next: Round = {
        ...round,
        recalled: [...round.recalled, { id: item.id, points }],
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
        items: round.items,
        level: round.level,
        now: action.now,
        key: action.key,
      });
      if (!fresh) return fresh;
      return beginMemorize({ ...fresh, attempt: round.attempt + 1, introStep: 1 }, action.now);
    }
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
