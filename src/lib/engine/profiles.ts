import type { Difficulty, Modifier } from "./types";

/** A value that starts at `start`, moves by `perLevel` each level and stops at `max`. */
export interface Ramp {
  start: number;
  perLevel: number;
  max: number;
}

/** Phase time = base + perItem x items (capped at maxMs), then scaled by decay^(level-1), never below floor. */
export interface PhaseTiming {
  baseMs: number;
  perItemMs: number;
  maxMs: number;
  decay: number;
  floor: number;
}

export interface DifficultyProfile {
  items: Ramp;
  memorize: PhaseTiming;
  recall: PhaseTiming;
  /** choices on the grid = items x choiceRatio */
  choiceRatio: number;
  lookalike: Ramp;
  lives: number;
  wrongPenaltyMs: number;
  bot: {
    ratio: Ramp;
    ratioSpread: number;
    minFinish: number;
    maxFinish: number;
  };
}

/**
 * The difficulty curves. Retuning the game means editing this file only;
 * run `npm run engine:table` to see the resulting levels.
 */
export const PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    items: { start: 4, perLevel: 1, max: 12 },
    memorize: { baseMs: 5_000, perItemMs: 2_000, maxMs: 30_000, decay: 0.98, floor: 0.7 },
    recall: { baseMs: 9_000, perItemMs: 1_500, maxMs: 30_000, decay: 0.99, floor: 0.8 },
    choiceRatio: 2,
    lookalike: { start: 0.25, perLevel: 0.025, max: 0.5 },
    lives: 4,
    wrongPenaltyMs: 0,
    bot: { ratio: { start: 0.55, perLevel: 0.015, max: 0.75 }, ratioSpread: 0.1, minFinish: 0.7, maxFinish: 0.95 },
  },
  medium: {
    items: { start: 6, perLevel: 2, max: 14 },
    memorize: { baseMs: 4_000, perItemMs: 2_000, maxMs: 30_000, decay: 0.97, floor: 0.55 },
    recall: { baseMs: 8_000, perItemMs: 1_500, maxMs: 30_000, decay: 0.98, floor: 0.7 },
    choiceRatio: 2,
    lookalike: { start: 0.5, perLevel: 0.03, max: 0.8 },
    lives: 3,
    wrongPenaltyMs: 0,
    bot: { ratio: { start: 0.7, perLevel: 0.015, max: 0.8 }, ratioSpread: 0.1, minFinish: 0.6, maxFinish: 0.9 },
  },
  hard: {
    items: { start: 8, perLevel: 2, max: 16 },
    memorize: { baseMs: 3_000, perItemMs: 1_800, maxMs: 28_000, decay: 0.96, floor: 0.5 },
    recall: { baseMs: 7_000, perItemMs: 1_400, maxMs: 28_000, decay: 0.97, floor: 0.65 },
    choiceRatio: 1.75,
    lookalike: { start: 0.8, perLevel: 0.02, max: 1 },
    lives: 2,
    wrongPenaltyMs: 4_000,
    bot: { ratio: { start: 0.75, perLevel: 0.015, max: 0.85 }, ratioSpread: 0.1, minFinish: 0.5, maxFinish: 0.8 },
  },
};

/** Single player levels follow this curve. */
export const SOLO_DIFFICULTY: Difficulty = "medium";

/** The daily challenge is this level of the solo curve, the same for everyone. */
export const DAILY_LEVEL = 3;

/** Solo levels from this one on cost time for a wrong pick. */
export const SOLO_PENALTY_FROM_LEVEL = 11;
export const SOLO_WRONG_PENALTY_MS = 3_000;

export const COMBO_WINDOW_MS = 3_000;
export const HIDE_MS = 700;

/** Levels are grouped into tiers; twists unlock as tiers go up. */
export const TIER_SIZE = 5;

export interface ModifierRule {
  /** first tier the twist can appear in */
  fromTier: number;
  /** appears on levels divisible by this */
  every: number;
}

export const MODIFIER_RULES: Record<Modifier, ModifierRule> = {
  /** items come from one or two categories, so they look more alike */
  themed: { fromTier: 2, every: 3 },
  /** the last level of a tier: memorize time is cut */
  flash: { fromTier: 3, every: TIER_SIZE },
};

export const FLASH_MEMORIZE_FACTOR = 0.7;

export const MODIFIER_LABELS: Record<Modifier, string> = {
  themed: "Themed",
  flash: "Flash",
};

export const TRAINING_PRESET = {
  itemCount: 3,
  memorizeMs: 15_000,
  recallMs: 20_000,
};
