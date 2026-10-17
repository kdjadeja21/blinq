import type { Difficulty, Pacing, RoomMode, RoomRow, TeamStyle } from "./types";

/** Realtime Postgres Changes fans every row change out to every subscriber, so rooms stay small. */
export const MAX_PLAYERS_BY_MODE: Record<RoomMode, number> = { team: 12, individual: 21 };
export const MAX_PLAYERS = MAX_PLAYERS_BY_MODE.team;
export const DEFAULT_MODE: RoomMode = "individual";

export function maxPlayersFor(mode: RoomMode): number {
  return MAX_PLAYERS_BY_MODE[mode];
}
export const DEFAULT_TEAM_STYLE: TeamStyle = "squad";
export const SQUAD_ENABLED = true;

/** True for Squad rooms: team mode with every duel of a level played at the same time. */
export function isSquad(room: Pick<RoomRow, "mode" | "team_style">): boolean {
  return room.mode === "team" && room.team_style === "squad";
}
export const MIN_HUMANS = 2;
export const MAX_ROOM_LEVELS = 10;
export const DEFAULT_LEVELS = 3;
export const DEFAULT_DIFFICULTY: Difficulty = "medium";
export const DEFAULT_PACING: Pacing = "manual";

export const ROOM_CODE_LENGTH = 6;
/** No 0/O/1/I look-alikes. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export const ROOMS_PER_HOUR = 5;

export const DUEL_INTRO_MS = 5_000;
export const AUTO_DUEL_RESULT_MS = 8_000;
export const AUTO_LEVEL_RESULT_MS = 10_000;

export const GUESS_GRACE_MS = 1_000;
export const GUESSES_PER_SECOND = 3;

export const HEARTBEAT_MS = 20_000;
export const ONLINE_WITHIN_MS = 45_000;
export const ADMIN_OFFLINE_MS = 60_000;

export const NAME_MIN = 2;
export const NAME_MAX = 16;
export const BOT_NAME = "Botty";

/** Labels only: items, timers and rules per difficulty come from the engine (`src/lib/engine/profiles.ts`). */
export const DIFFICULTIES: Record<Difficulty, { label: string }> = {
  easy: { label: "Easy" },
  medium: { label: "Medium" },
  hard: { label: "Hard" },
};

export function autoResultMs(phase: "duel_result" | "level_result"): number {
  return phase === "duel_result" ? AUTO_DUEL_RESULT_MS : AUTO_LEVEL_RESULT_MS;
}

export const PACING_INFO: Record<Pacing, { label: string; description: string }> = {
  manual: { label: "Manual", description: "You tap Next after each result." },
  auto: { label: "Auto", description: "Results advance on their own." },
};

export const MODES: Record<RoomMode, { label: string; description: string }> = {
  team: { label: "Team", description: "Two teams, one-on-one duels." },
  individual: { label: "Individual", description: "Everyone plays at once. Top of the leaderboard wins." },
};

export const TEAM_STYLES_INFO: Record<TeamStyle, { label: string; description: string }> = {
  squad: { label: "Squad", description: "Everyone plays every level at the same time. Your team's combined score wins." },
  duel: { label: "Duel", description: "Players face off one-on-one, one duel at a time. Winning duels wins the level." },
};
