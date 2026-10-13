import {
  DUEL_INTRO_MS,
  GUESSES_PER_SECOND,
  GUESS_GRACE_MS,
  autoResultMs,
} from "@/lib/multiplayer/config";
import type { DuelRow, RoomRow, SubmissionRow } from "@/lib/multiplayer/types";
import { MAX_LIVES, WRONG_PENALTY_MS } from "@/lib/scoring";
import { ApiError, db, isUniqueViolation, must } from "./db";
import { countDuels, ensureLevel, resolveDuel, scorePlayer } from "./duels";
import { ensureAdminOnline } from "./lobby";
import { findDuel, findRoom, requireAdmin, requireMember, swapPhase, timedPhase } from "./queries";

const TIMED_PHASES = ["duel_intro", "memorize", "recall", "duel_result", "level_result"] as const;

export function deadlineOf(room: RoomRow): number | null {
  if (!room.phase_started_at || room.phase_duration_ms === null) return null;
  return Date.parse(room.phase_started_at) + room.phase_duration_ms;
}

async function currentDuel(room: RoomRow): Promise<DuelRow> {
  const duel = await findDuel(room.id, room.level, room.duel_index);
  if (!duel) throw new ApiError(500, "The current duel is missing.");
  return duel;
}

function resultDuration(room: RoomRow, phase: "duel_result" | "level_result"): number | null {
  return room.pacing === "auto" ? autoResultMs(phase) : null;
}

/** Leaves a result screen for the next duel, the level result, the next level, or the final. */
async function moveOnFromResult(room: RoomRow): Promise<RoomRow | null> {
  if (room.phase === "duel_result") {
    const total = await countDuels(room.id, room.level);
    if (room.duel_index + 1 < total) {
      return swapPhase(room, {
        phase: "duel_intro",
        duel_index: room.duel_index + 1,
        ...timedPhase(DUEL_INTRO_MS),
      });
    }
    return swapPhase(room, { phase: "level_result", ...timedPhase(resultDuration(room, "level_result")) });
  }
  if (room.level >= room.max_levels) {
    return swapPhase(room, { phase: "finished", ...timedPhase(null) });
  }
  await ensureLevel(room, room.level + 1);
  return swapPhase(room, {
    phase: "duel_intro",
    level: room.level + 1,
    duel_index: 0,
    ...timedPhase(DUEL_INTRO_MS),
  });
}

async function endRecall(room: RoomRow): Promise<RoomRow | null> {
  await resolveDuel(room, await currentDuel(room));
  return swapPhase(room, { phase: "duel_result", ...timedPhase(resultDuration(room, "duel_result")) });
}

/**
 * Idempotent. Anyone (admin client, other clients, the cron sweeper) may call it with the
 * `phase_version` they saw; a stale version or an unreached deadline is a no-op.
 */
export async function advancePhase(roomId: string, expectedVersion: number) {
  const room = await findRoom(roomId);
  if (room.phase_version !== expectedVersion) return { advanced: false, room };
  const deadline = deadlineOf(room);
  if (deadline === null || Date.now() < deadline) return { advanced: false, room };

  let next: RoomRow | null = null;
  switch (room.phase) {
    case "duel_intro": {
      const duel = await currentDuel(room);
      next = await swapPhase(room, { phase: "memorize", ...timedPhase(duel.memorize_ms) });
      break;
    }
    case "memorize": {
      const duel = await currentDuel(room);
      next = await swapPhase(room, { phase: "recall", ...timedPhase(duel.recall_ms) });
      break;
    }
    case "recall":
      next = await endRecall(room);
      break;
    case "duel_result":
    case "level_result":
      next = await moveOnFromResult(room);
      break;
    case "lobby":
    case "teams_ready":
    case "finished":
      break;
    default: {
      const unreachable: never = room.phase;
      return unreachable;
    }
  }
  return { advanced: next !== null, room: next ?? (await findRoom(roomId)) };
}

/** Admin in manual mode: skip the waiting on a result screen. */
export async function nextStep(userId: string, roomId: string, expectedVersion: number) {
  const room = await requireAdmin(roomId, userId);
  if (room.phase_version !== expectedVersion) return { advanced: false, room };
  if (room.phase !== "duel_result" && room.phase !== "level_result") {
    throw new ApiError(409, "There is nothing to skip right now.");
  }
  const next = await moveOnFromResult(room);
  return { advanced: next !== null, room: next ?? (await findRoom(roomId)) };
}

export async function submitGuess(userId: string, duelId: unknown, itemKey: unknown) {
  if (typeof duelId !== "string" || typeof itemKey !== "string") throw new ApiError(400, "Bad guess.");
  const now = Date.now();
  const duel = must(await db().from("duels").select("*").eq("id", duelId).maybeSingle<DuelRow>());
  if (!duel) throw new ApiError(404, "Duel not found.");
  const room = await findRoom(duel.room_id);
  const player = await requireMember(room.id, userId);
  if (player.id !== duel.player_a && player.id !== duel.player_b) throw new ApiError(403, "You are not in this duel.");
  if (room.phase !== "recall" || room.level !== duel.level || room.duel_index !== duel.duel_index || !room.phase_started_at) {
    throw new ApiError(409, "Recall is not open.");
  }

  const startedAt = Date.parse(room.phase_started_at);
  const mine = must(
    await db()
      .from("submissions")
      .select("item_key, correct, created_at")
      .eq("duel_id", duel.id)
      .eq("player_id", player.id)
      .returns<Pick<SubmissionRow, "item_key" | "correct" | "created_at">[]>(),
  );
  if (mine.some((s) => s.item_key === itemKey)) return { alreadyGuessed: true, ...(await progressOf(duel, player.id, room)) };

  const wrong = mine.filter((s) => !s.correct).length;
  if (wrong >= MAX_LIVES) throw new ApiError(409, "You are out of lives.");
  const personalDeadline = startedAt + duel.recall_ms - wrong * WRONG_PENALTY_MS + GUESS_GRACE_MS;
  if (now > personalDeadline) throw new ApiError(409, "Time is up.");
  if (mine.filter((s) => now - Date.parse(s.created_at) < 1000).length >= GUESSES_PER_SECOND) {
    throw new ApiError(429, "Slow down.");
  }

  const choice = must(
    await db().from("duel_choices").select("item_key").eq("duel_id", duel.id).eq("item_key", itemKey).maybeSingle(),
  );
  if (!choice) throw new ApiError(400, "That item is not in this duel.");
  const target = must(
    await db().from("duel_items").select("item_key").eq("duel_id", duel.id).eq("item_key", itemKey).maybeSingle(),
  );

  const { error } = await db().from("submissions").insert({
    duel_id: duel.id,
    player_id: player.id,
    item_key: itemKey,
    correct: Boolean(target),
    created_at: new Date(now).toISOString(),
  });
  if (isUniqueViolation(error)) return { alreadyGuessed: true, ...(await progressOf(duel, player.id, room)) };
  must({ data: null, error });

  const progress = await progressOf(duel, player.id, room);
  if (progress.complete) await endRecall(room);
  return { alreadyGuessed: false, ...progress, correct: Boolean(target) };
}

async function progressOf(duel: DuelRow, playerId: string, room: RoomRow) {
  const score = await scorePlayer(duel, playerId, room.phase_started_at ?? new Date().toISOString());
  must(
    await db().from("duel_progress").upsert(
      {
        duel_id: duel.id,
        player_id: playerId,
        correct_count: score.correct,
        wrong_count: score.wrong,
        points: score.points,
      },
      { onConflict: "duel_id,player_id" },
    ),
  );
  return { complete: score.complete, points: score.points, correctCount: score.correct, wrongCount: score.wrong };
}

/** Cron entry point: advance every room past its deadline and rescue rooms with an offline admin. */
export async function sweep() {
  const timed = must(
    await db()
      .from("rooms")
      .select("*")
      .in("phase", [...TIMED_PHASES])
      .not("phase_duration_ms", "is", null)
      .returns<RoomRow[]>(),
  );
  const now = Date.now();
  let advanced = 0;
  for (const room of timed) {
    const deadline = deadlineOf(room);
    if (deadline === null || now < deadline) continue;
    try {
      const result = await advancePhase(room.id, room.phase_version);
      if (result.advanced) advanced += 1;
    } catch (error) {
      console.error("sweep: advance failed", room.id, error);
    }
  }

  const active = must(
    await db().from("rooms").select("*").neq("phase", "finished").gt("expires_at", new Date().toISOString()).returns<RoomRow[]>(),
  );
  for (const room of active) await ensureAdminOnline(room);
  return { checked: timed.length, advanced };
}
