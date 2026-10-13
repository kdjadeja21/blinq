import {
  DUEL_INTRO_MS,
  GUESSES_PER_SECOND,
  GUESS_GRACE_MS,
  autoResultMs,
} from "@/lib/multiplayer/config";
import type { DuelProgressRow, DuelRow, RoomRow, SubmissionRow } from "@/lib/multiplayer/types";
import { MAX_LIVES, WRONG_PENALTY_MS, scoreRecall } from "@/lib/scoring";
import { after } from "next/server";
import { ApiError, db, isUniqueViolation, must } from "./db";
import { countDuels, ensureLevel, resolveDuel, toPicks } from "./duels";
import { ensureAdminOnline } from "./lobby";
import { findDuel, findRoom, listPlayers, requireAdmin, requireMember, swapPhase, timedPhase } from "./queries";

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

type GuessRow = Pick<SubmissionRow, "player_id" | "item_key" | "correct" | "created_at">;

/** Clients stamp taps with the server-corrected clock so queued sends keep their real spacing. */
const MAX_TAP_AGE_MS = 5_000;

function tapTime(now: number, claimed: unknown, startedAt: number): number {
  if (typeof claimed !== "number" || !Number.isFinite(claimed)) return now;
  return Math.min(now, Math.max(claimed, now - MAX_TAP_AGE_MS, startedAt));
}

async function loadRecall(userId: string, duelId: string) {
  const duel = must(await db().from("duels").select("*").eq("id", duelId).maybeSingle<DuelRow>());
  if (!duel) throw new ApiError(404, "Duel not found.");
  const [room, player, mine] = await Promise.all([
    findRoom(duel.room_id),
    requireMember(duel.room_id, userId),
    db()
      .from("submissions")
      .select("player_id, item_key, correct, created_at")
      .eq("duel_id", duel.id)
      .returns<GuessRow[]>()
      .then(must),
  ]);
  if (player.id !== duel.player_a && player.id !== duel.player_b) throw new ApiError(403, "You are not in this duel.");
  if (room.phase !== "recall" || room.level !== duel.level || room.duel_index !== duel.duel_index || !room.phase_started_at) {
    throw new ApiError(409, "Recall is not open.");
  }
  return { duel, room, player, mine: mine.filter((s) => s.player_id === player.id) };
}

export async function submitGuess(userId: string, duelId: unknown, itemKey: unknown, claimedAt?: unknown) {
  if (typeof duelId !== "string" || typeof itemKey !== "string") throw new ApiError(400, "Bad guess.");
  const now = Date.now();
  const [{ duel, room, player, mine }, choice, target] = await Promise.all([
    loadRecall(userId, duelId),
    db().from("duel_choices").select("item_key").eq("duel_id", duelId).eq("item_key", itemKey).maybeSingle(),
    db().from("duel_items").select("item_key").eq("duel_id", duelId).eq("item_key", itemKey).maybeSingle(),
  ]);

  const startedAt = Date.parse(room.phase_started_at ?? "");
  if (mine.some((s) => s.item_key === itemKey)) {
    return { alreadyGuessed: true, ...(await settle(duel, player.id, room, mine)) };
  }

  const at = tapTime(now, claimedAt, startedAt);
  const wrong = mine.filter((s) => !s.correct).length;
  if (wrong >= MAX_LIVES) throw new ApiError(409, "You are out of lives.");
  const personalDeadline = startedAt + duel.recall_ms - wrong * WRONG_PENALTY_MS + GUESS_GRACE_MS;
  if (at > personalDeadline) throw new ApiError(409, "Time is up.");
  if (mine.filter((s) => at - Date.parse(s.created_at) < 1000).length >= GUESSES_PER_SECOND) {
    throw new ApiError(429, "Slow down.");
  }

  if (!must(choice)) throw new ApiError(400, "That item is not in this duel.");
  const correct = Boolean(must(target));

  const createdAt = new Date(at).toISOString();
  const { error } = await db()
    .from("submissions")
    .insert({ duel_id: duel.id, player_id: player.id, item_key: itemKey, correct, created_at: createdAt });
  if (isUniqueViolation(error)) return { alreadyGuessed: true, ...(await settle(duel, player.id, room, mine)) };
  must({ data: null, error });

  const all = [...mine, { player_id: player.id, item_key: itemKey, correct, created_at: createdAt }];
  return { alreadyGuessed: false, correct, ...(await settle(duel, player.id, room, all)) };
}

/** "I'm done": stop recalling now and bank the remaining time as a speed bonus. */
export async function finishEarly(userId: string, duelId: unknown) {
  if (typeof duelId !== "string") throw new ApiError(400, "Bad duel.");
  const { duel, room, player, mine } = await loadRecall(userId, duelId);
  const doneMs = Date.now() - Date.parse(room.phase_started_at ?? "");
  return { alreadyGuessed: false, ...(await settle(duel, player.id, room, mine, { doneMs })) };
}

type ProgressRow = Pick<DuelProgressRow, "player_id" | "done" | "correct_count" | "wrong_count">;

function isDone(duel: DuelRow, row: ProgressRow | undefined): boolean {
  return Boolean(row && (row.done || row.wrong_count >= MAX_LIVES || row.correct_count >= duel.item_count));
}

/**
 * Stores live progress, then ends the duel when someone found everything or when both
 * players are finished (out of lives, done early, or a bot opponent).
 */
async function settle(
  duel: DuelRow,
  playerId: string,
  room: RoomRow,
  subs: GuessRow[],
  options: { doneMs?: number } = {},
) {
  const startedAt = room.phase_started_at ?? new Date().toISOString();
  const doneMs = options.doneMs ?? null;
  const score = scoreRecall(toPicks(subs, startedAt), duel.item_count, duel.recall_ms, doneMs);
  const selfDone = doneMs !== null || score.complete || score.wrong >= MAX_LIVES;

  const write = async () => {
    must(
      await db().from("duel_progress").upsert(
        {
          duel_id: duel.id,
          player_id: playerId,
          correct_count: score.correct,
          wrong_count: score.wrong,
          points: score.points,
          ...(selfDone ? { done: true } : {}),
          ...(doneMs !== null ? { done_ms: doneMs } : {}),
        },
        { onConflict: "duel_id,player_id" },
      ),
    );
  };
  if (selfDone) await write();
  else after(write);

  let ended = score.complete;
  if (!ended && selfDone) {
    const opponentId = playerId === duel.player_a ? duel.player_b : duel.player_a;
    const [opponent, players] = await Promise.all([
      db()
        .from("duel_progress")
        .select("player_id, done, correct_count, wrong_count")
        .eq("duel_id", duel.id)
        .eq("player_id", opponentId)
        .maybeSingle<ProgressRow>()
        .then(must),
      listPlayers(room.id),
    ]);
    ended = players.find((p) => p.id === opponentId)?.is_bot === true || isDone(duel, opponent ?? undefined);
  }
  if (ended) await endRecall(room);

  return {
    complete: score.complete,
    points: score.points,
    combo: score.combo,
    correctCount: score.correct,
    wrongCount: score.wrong,
    deadlineMs: score.deadlineMs,
    ended,
  };
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
