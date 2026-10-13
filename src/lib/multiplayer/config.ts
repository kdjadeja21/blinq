import type { Difficulty, Pacing } from "./types";

export const MAX_PLAYERS = 12;
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
