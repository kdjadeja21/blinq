import type { Difficulty, Modifier, RoundRules } from "@/lib/engine";

export type { Difficulty };

export const ROOM_PHASES = [
  "lobby",
  "teams_ready",
  "duel_intro",
  "memorize",
  "recall",
  "duel_result",
  "level_result",
  "finished",
] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];

export type Pacing = "manual" | "auto";

export const ROOM_MODES = ["individual", "team"] as const;
export type RoomMode = (typeof ROOM_MODES)[number];

export interface RoomRow {
  id: string;
  code: string;
  admin_user_id: string;
  phase: RoomPhase;
  phase_version: number;
  phase_started_at: string | null;
  phase_duration_ms: number | null;
  level: number;
  max_levels: number;
  difficulty: Difficulty;
  pacing: Pacing;
  mode: RoomMode;
  duel_index: number;
  expires_at: string;
  created_at: string;
}

export interface TeamRow {
  id: string;
  room_id: string;
  name: string;
  score: number;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  user_id: string | null;
  name: string;
  avatar: string | null;
  is_bot: boolean;
  team_id: string | null;
  seat: number | null;
  joined_at: string;
  last_seen_at: string;
}

export interface BotPlan {
  correct: number;
  finishMs: number;
}

/** The engine's rules stored on a duel (`duels.rules`). */
export interface DuelRules extends RoundRules {
  engineVersion: number;
  choiceCount: number;
  modifiers: Modifier[];
}

export interface DuelRow {
  id: string;
  room_id: string;
  level: number;
  duel_index: number;
  player_a: string;
  player_b: string;
  item_count: number;
  memorize_ms: number;
  recall_ms: number;
  winner_id: string | null;
  resolved: boolean;
  bot_plan: BotPlan | null;
  rules: DuelRules;
}

export interface DuelItemRow {
  duel_id: string;
  position: number;
  item_key: string;
}

export interface DuelProgressRow {
  duel_id: string;
  player_id: string;
  correct_count: number;
  wrong_count: number;
  points: number;
  done: boolean;
  done_ms: number | null;
}

export interface DuelResultRow {
  duel_id: string;
  player_id: string;
  correct_count: number;
  wrong_count: number;
  speed_bonus: number;
  found_keys: string[];
  finished_ms: number | null;
  points: number;
}

export interface SubmissionRow {
  duel_id: string;
  player_id: string;
  item_key: string;
  correct: boolean;
  created_at: string;
}

/** Individual mode: one shared round per level. */
export interface RoundRow {
  id: string;
  room_id: string;
  level: number;
  item_count: number;
  memorize_ms: number;
  recall_ms: number;
  rules: DuelRules;
  resolved: boolean;
}

export interface RoundDoneRow {
  round_id: string;
  player_id: string;
  done_ms: number | null;
}

export interface RoundResultRow {
  round_id: string;
  player_id: string;
  level: number;
  correct_count: number;
  wrong_count: number;
  speed_bonus: number;
  found_keys: string[];
  finished_ms: number | null;
  points: number;
}

export interface RoundSubmissionRow {
  round_id: string;
  player_id: string;
  item_key: string;
  correct: boolean;
  created_at: string;
}
