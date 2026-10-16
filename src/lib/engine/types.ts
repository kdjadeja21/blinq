import type { RoundType } from "@/lib/levelConfig";

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export type RoundMode = "training" | "level" | "daily" | "duel";

/** Twists layered on top of the normal curve. Each one is pure data on the spec. */
export type Modifier = "themed" | "flash";

export interface RoundInput {
  mode: RoundMode;
  difficulty: Difficulty;
  level: number;
}

/** The rules a player is judged by during recall. */
export interface RoundRules {
  lives: number;
  wrongPenaltyMs: number;
  comboWindowMs: number;
}

/** How a bot opponent performs: recall share and finish time as fractions of recall time. */
export interface BotSkill {
  minRatio: number;
  maxRatio: number;
  minFinish: number;
  maxFinish: number;
}

/** Everything a round needs. Every screen, the server and bots read from this, never from constants. */
export interface RoundSpec {
  engineVersion: number;
  mode: RoundMode;
  difficulty: Difficulty;
  level: number;
  tier: number;
  /** skill the round trains; only item recall is playable so far */
  roundType: RoundType;
  /** 0-based level block */
  block: number;
  itemCount: number;
  choiceCount: number;
  memorizeMs: number;
  hideMs: number;
  recallMs: number;
  /** share of decoys that are lookalikes of the targets (0..1) */
  lookalikeRatio: number;
  modifiers: Modifier[];
  rules: RoundRules;
  bot: BotSkill;
}
