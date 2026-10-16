import type { RoundSpec } from "@/lib/engine";
import type { Item } from "./items";
import { isCorrectNext, orderKey } from "./rounds/order";
import { isCorrectPlacement, itemAt, placementKey, type Layout } from "./rounds/position";
import { WIN_RATIO, nextCombo, pointsForCombo, starsFor } from "./scoring";

export type Mode = "training" | "level" | "daily";
export type Phase = "intro" | "memorize" | "hide" | "recall" | "result";

export const INTRO_STEPS = 3;

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
  spec: RoundSpec;
  items: Item[];
  choices: Item[];
  /** slot positions for position rounds, null otherwise */
  layout: Layout | null;
  lives: number;
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
  | { type: "start"; mode: Mode; spec: RoundSpec; items: Item[]; choices: Item[]; layout?: Layout | null; level: number; now: number; key: number }
  | { type: "introNext"; now: number }
  | { type: "tick"; now: number }
  | { type: "pick"; id: string; now: number }
  | { type: "place"; id: string; slot: number; now: number }
  | { type: "submit"; now: number }
  | { type: "retry"; now: number; key: number; items?: Item[]; choices?: Item[]; layout?: Layout | null }
  | { type: "quit" };

function beginMemorize(round: Round, now: number): Round {
  return { ...round, phase: "memorize", phaseEndsAt: now + round.spec.memorizeMs };
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

/** Shared by every round type: a correct answer chains the combo, a wrong one costs a life and time. */
function applyAnswer(round: Round, id: string, correct: boolean, wrongKey: string, now: number): Round {
  const { rules } = round.spec;
  if (!correct) {
    const wrong = [...round.wrong, wrongKey];
    if (round.mode === "training") return { ...round, wrong, combo: 0 };
    const next = {
      ...round,
      wrong,
      combo: 0,
      lives: round.lives - 1,
      phaseEndsAt: round.phaseEndsAt - rules.wrongPenaltyMs,
      recallEndsAt: round.recallEndsAt - rules.wrongPenaltyMs,
    };
    return next.lives <= 0 || now >= next.phaseEndsAt ? finish(next, now, false) : next;
  }
  const combo = nextCombo(round.combo, round.lastCorrectAt, now, rules.comboWindowMs);
  const points = pointsForCombo(combo);
  const next: Round = {
    ...round,
    recalled: [...round.recalled, { id, points }],
    combo,
    lastCorrectAt: now,
  };
  return next.recalled.length === next.items.length ? finish(next, now, true) : next;
}

export function roundReducer(round: Round | null, action: Action): Round | null {
  if (action.type === "start") {
    const base: Round = {
      key: action.key,
      mode: action.mode,
      level: action.level,
      attempt: 1,
      spec: action.spec,
      items: action.items,
      choices: action.choices,
      layout: action.layout ?? null,
      lives: action.spec.rules.lives,
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
        return { ...round, phase: "hide", phaseEndsAt: round.phaseEndsAt + round.spec.hideMs };
      }
      if (round.phase === "hide") {
        const recallEndsAt = action.now + round.spec.recallMs;
        return { ...round, phase: "recall", phaseEndsAt: recallEndsAt, recallEndsAt };
      }
      if (round.phase === "recall") return finish(round, action.now, false);
      return round;
    }
    case "pick": {
      if (round.phase !== "recall") return round;
      if (round.recalled.some((r) => r.id === action.id) || round.wrong.includes(action.id)) return round;
      if (round.spec.roundType === "order") {
        const position = round.recalled.length;
        const key = orderKey(action.id, position);
        if (round.wrong.includes(key) || !round.items.some((i) => i.id === action.id)) return round;
        return applyAnswer(round, action.id, isCorrectNext(round.items, position, action.id), key, action.now);
      }
      return applyAnswer(round, action.id, round.items.some((i) => i.id === action.id), action.id, action.now);
    }
    case "place": {
      const { layout } = round;
      if (round.phase !== "recall" || !layout) return round;
      if (!round.items.some((i) => i.id === action.id) || round.recalled.some((r) => r.id === action.id)) return round;
      const owner = itemAt(layout, action.slot);
      if (owner !== null && round.recalled.some((r) => r.id === owner)) return round;
      const key = placementKey(action.id, action.slot);
      if (round.wrong.includes(key)) return round;
      return applyAnswer(round, action.id, isCorrectPlacement(layout, action.id, action.slot), key, action.now);
    }
    case "submit":
      return round.phase === "recall" ? finish(round, action.now, true) : round;
    case "retry": {
      const fresh = roundReducer(null, {
        type: "start",
        mode: round.mode,
        spec: round.spec,
        items: action.items ?? round.items,
        choices: action.choices ?? round.choices,
        layout: action.layout ?? round.layout,
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
