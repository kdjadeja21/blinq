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

export type Difficulty = "easy" | "medium" | "hard";
export type Pacing = "manual" | "auto";

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
}

export interface DuelResultRow {
  duel_id: string;
  player_id: string;
  correct_count: number;
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
