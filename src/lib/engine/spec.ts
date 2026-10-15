import { ITEMS } from "@/lib/items";
import {
  COMBO_WINDOW_MS,
  DAILY_LEVEL,
  FLASH_MEMORIZE_FACTOR,
  HIDE_MS,
  MODIFIER_RULES,
  PROFILES,
  SOLO_DIFFICULTY,
  SOLO_PENALTY_FROM_LEVEL,
  SOLO_WRONG_PENALTY_MS,
  TIER_SIZE,
  TRAINING_PRESET,
  type DifficultyProfile,
  type PhaseTiming,
  type Ramp,
} from "./profiles";
import type { Modifier, RoundInput, RoundMode, RoundRules, RoundSpec } from "./types";

/** Bump when the curve changes in a way stored rounds should be told apart by. */
export const ENGINE_VERSION = 2;

/** What the choice grid can show (5 columns x 4 rows). */
export const MAX_CHOICES = 20;
export const MIN_DECOYS = 4;
export const MAX_ITEMS = Math.min(ITEMS.length - MIN_DECOYS, MAX_CHOICES - MIN_DECOYS);

const MIN_MEMORIZE_MS = 4_000;
const MIN_RECALL_MS = 6_000;
const MIN_MEMORIZE_PER_ITEM_MS = 700;
const MIN_RECALL_PER_ITEM_MS = 1_000;
const MAX_BOT_RATIO = 0.95;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function rampAt(ramp: Ramp, level: number): number {
  return Math.min(ramp.max, ramp.start + ramp.perLevel * (level - 1));
}

function phaseMs(timing: PhaseTiming, items: number, level: number, minMs: number, minPerItemMs: number, factor = 1): number {
  const raw = Math.min(timing.maxMs, timing.baseMs + timing.perItemMs * items);
  const scale = Math.max(timing.floor, timing.decay ** (level - 1)) * factor;
  return Math.max(minMs, minPerItemMs * items, Math.round((raw * scale) / 100) * 100);
}

function normalizeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

export function tierOf(level: number): number {
  return Math.floor((normalizeLevel(level) - 1) / TIER_SIZE) + 1;
}

export function modifiersFor(level: number): Modifier[] {
  const tier = tierOf(level);
  return (Object.keys(MODIFIER_RULES) as Modifier[]).filter((modifier) => {
    const rule = MODIFIER_RULES[modifier];
    return tier >= rule.fromTier && level % rule.every === 0;
  });
}

function wrongPenaltyFor(profile: DifficultyProfile, mode: RoundMode, level: number): number {
  switch (mode) {
    case "level":
      return level >= SOLO_PENALTY_FROM_LEVEL ? SOLO_WRONG_PENALTY_MS : 0;
    case "duel":
      return profile.wrongPenaltyMs;
    case "daily":
    case "training":
      return 0;
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}

function rulesOf(profile: DifficultyProfile, mode: RoundMode, level: number): RoundRules {
  return { lives: profile.lives, wrongPenaltyMs: wrongPenaltyFor(profile, mode, level), comboWindowMs: COMBO_WINDOW_MS };
}

function botOf(profile: DifficultyProfile, level: number): RoundSpec["bot"] {
  const minRatio = clamp(rampAt(profile.bot.ratio, level), 0, MAX_BOT_RATIO);
  return {
    minRatio,
    maxRatio: Math.min(MAX_BOT_RATIO, minRatio + profile.bot.ratioSpread),
    minFinish: profile.bot.minFinish,
    maxFinish: profile.bot.maxFinish,
  };
}

function trainingSpec(): RoundSpec {
  const profile = PROFILES[SOLO_DIFFICULTY];
  const itemCount = TRAINING_PRESET.itemCount;
  return {
    engineVersion: ENGINE_VERSION,
    mode: "training",
    difficulty: SOLO_DIFFICULTY,
    level: 1,
    tier: 1,
    itemCount,
    choiceCount: itemCount * 2,
    memorizeMs: TRAINING_PRESET.memorizeMs,
    hideMs: HIDE_MS,
    recallMs: TRAINING_PRESET.recallMs,
    lookalikeRatio: 1,
    modifiers: [],
    rules: rulesOf(profile, "training", 1),
    bot: botOf(profile, 1),
  };
}

/**
 * The single source of truth for a round: how many items, how long each phase lasts,
 * how tricky the decoys are, and the rules. Pure and deterministic.
 */
export function getRoundSpec(input: RoundInput): RoundSpec {
  if (input.mode === "training") return trainingSpec();

  const daily = input.mode === "daily";
  const difficulty = daily ? SOLO_DIFFICULTY : input.difficulty;
  const level = daily ? DAILY_LEVEL : normalizeLevel(input.level);
  const profile = PROFILES[difficulty];
  const modifiers = modifiersFor(level);

  const itemCount = clamp(Math.round(rampAt(profile.items, level)), 1, MAX_ITEMS);
  const choiceCount = clamp(Math.round(itemCount * profile.choiceRatio), itemCount + MIN_DECOYS, MAX_CHOICES);
  const flash = modifiers.includes("flash") ? FLASH_MEMORIZE_FACTOR : 1;

  return {
    engineVersion: ENGINE_VERSION,
    mode: input.mode,
    difficulty,
    level,
    tier: tierOf(level),
    itemCount,
    choiceCount,
    memorizeMs: phaseMs(profile.memorize, itemCount, level, MIN_MEMORIZE_MS, MIN_MEMORIZE_PER_ITEM_MS, flash),
    hideMs: HIDE_MS,
    recallMs: phaseMs(profile.recall, itemCount, level, MIN_RECALL_MS, MIN_RECALL_PER_ITEM_MS),
    lookalikeRatio: clamp(rampAt(profile.lookalike, level), 0, 1),
    modifiers,
    rules: rulesOf(profile, input.mode, level),
    bot: botOf(profile, level),
  };
}
