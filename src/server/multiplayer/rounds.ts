import { generateRound, getRoomRoundSpec } from "@/lib/engine";
import { GUESSES_PER_SECOND, GUESS_GRACE_MS, ONLINE_WITHIN_MS, autoResultMs } from "@/lib/multiplayer/config";
import type {
  DuelRules,
  RoomRow,
  RoundDoneRow,
  RoundRow,
  RoundSubmissionRow,
} from "@/lib/multiplayer/types";
import { GONE_KEY, changedOriginals, judgePick, roundTypeForLevel } from "@/lib/multiplayer/roundTypes";
import { scoreRecall } from "@/lib/scoring";
import { ApiError, db, isUniqueViolation, must, seededRandom } from "./db";
import { toPicks } from "./duels";
import { findRoom, listPlayers, requireMember, swapPhase, timedPhase } from "./queries";
import { tapTime } from "./taps";

/** Builds the shared round of a level. Seeded and upserted, so concurrent callers agree. */
export async function ensureRound(room: RoomRow, level: number): Promise<RoundRow> {
  const roundType = roundTypeForLevel(room.round_type ?? "item", level);
  const spec = getRoomRoundSpec(room.difficulty, level, roundType);
  const { items, choices, table } = generateRound(spec, seededRandom(`${room.id}:round-items:${level}`));

  // Change rounds store the table before the change as the items and the table after it as the choices.
  const shown = table ? table.before : items;
  const offered = table ? table.after.map((item) => item?.id ?? GONE_KEY) : choices.map((item) => item.id);
  const rules: DuelRules = {
    ...spec.rules,
    engineVersion: spec.engineVersion,
    choiceCount: spec.choiceCount,
    modifiers: spec.modifiers,
    roundType,
    hideMs: spec.hideMs,
    distractMs: spec.distractMs,
  };
  must(
    await db()
      .from("rounds")
      .upsert(
        {
          room_id: room.id,
          level,
          item_count: table ? table.changed.length : spec.itemCount,
          memorize_ms: spec.memorizeMs,
          recall_ms: spec.recallMs,
          rules,
        },
        { onConflict: "room_id,level", ignoreDuplicates: true },
      ),
  );
  const round = await findRound(room.id, level);
  if (!round) throw new ApiError(500, "The round is missing.");

  const toRows = (keys: string[]) => keys.map((key, position) => ({ round_id: round.id, position, item_key: key }));
  const opts = { onConflict: "round_id,position", ignoreDuplicates: true };
  must(await db().from("round_items").upsert(toRows(shown.map((item) => item.id)), opts));
  must(await db().from("round_choices").upsert(toRows(offered), opts));
  if (table) {
    must(
      await db()
        .from("round_puzzles")
        .upsert(
          { round_id: round.id, changed: changedOriginals(table.before.map((i) => i.id), offered) },
          { onConflict: "round_id", ignoreDuplicates: true },
        ),
    );
  }
  return round;
}

export async function findRound(roomId: string, level: number): Promise<RoundRow | null> {
  return must(
    await db().from("rounds").select("*").eq("room_id", roomId).eq("level", level).maybeSingle<RoundRow>(),
  );
}

export async function currentRound(room: RoomRow): Promise<RoundRow> {
  const round = await findRound(room.id, room.level);
  if (!round) throw new ApiError(500, "The current round is missing.");
  return round;
}

type GuessRow = Pick<RoundSubmissionRow, "player_id" | "item_key" | "correct" | "created_at">;

async function loadRecall(userId: string, roundId: string) {
  const round = must(await db().from("rounds").select("*").eq("id", roundId).maybeSingle<RoundRow>());
  if (!round) throw new ApiError(404, "Round not found.");
  const [room, player] = await Promise.all([findRoom(round.room_id), requireMember(round.room_id, userId)]);
  if (room.phase !== "recall" || room.level !== round.level || !room.phase_started_at) {
    throw new ApiError(409, "Recall is not open.");
  }
  const mine = must(
    await db()
      .from("round_submissions")
      .select("player_id, item_key, correct, created_at")
      .eq("round_id", round.id)
      .eq("player_id", player.id)
      .returns<GuessRow[]>(),
  );
  return { round, room, player, mine };
}

export async function submitRoundGuess(userId: string, roundId: unknown, itemKey: unknown, claimedAt?: unknown) {
  if (typeof roundId !== "string" || typeof itemKey !== "string") throw new ApiError(400, "Bad guess.");
  const now = Date.now();
  const [{ round, room, player, mine }, choice, target, puzzle] = await Promise.all([
    loadRecall(userId, roundId),
    db().from("round_choices").select("item_key").eq("round_id", roundId).eq("item_key", itemKey).maybeSingle(),
    db().from("round_items").select("item_key").eq("round_id", roundId).eq("item_key", itemKey).maybeSingle(),
    db().from("round_puzzles").select("changed").eq("round_id", roundId).maybeSingle<{ changed: string[] }>(),
  ]);

  const startedAt = Date.parse(room.phase_started_at ?? "");
  if (mine.some((s) => s.item_key === itemKey)) {
    return { alreadyGuessed: true, ...(await settleRound(round, player.id, room, mine)) };
  }

  const at = tapTime(now, claimedAt, startedAt);
  const wrong = mine.filter((s) => !s.correct).length;
  if (wrong >= round.rules.lives) throw new ApiError(409, "You are out of lives.");
  const personalDeadline = startedAt + round.recall_ms - wrong * round.rules.wrongPenaltyMs + GUESS_GRACE_MS;
  if (at > personalDeadline) throw new ApiError(409, "Time is up.");
  if (mine.filter((s) => at - Date.parse(s.created_at) < 1000).length >= GUESSES_PER_SECOND) {
    throw new ApiError(429, "Slow down.");
  }

  const { valid, correct } = judgePick(round.rules.roundType, {
    inItems: Boolean(must(target)),
    inChoices: Boolean(must(choice)),
    inChanged: must(puzzle)?.changed.includes(itemKey) ?? false,
  });
  if (!valid) throw new ApiError(400, "That item is not in this round.");

  const createdAt = new Date(at).toISOString();
  const { error } = await db()
    .from("round_submissions")
    .insert({ round_id: round.id, player_id: player.id, item_key: itemKey, correct, created_at: createdAt });
  if (isUniqueViolation(error)) return { alreadyGuessed: true, ...(await settleRound(round, player.id, room, mine)) };
  must({ data: null, error });

  const all = [...mine, { player_id: player.id, item_key: itemKey, correct, created_at: createdAt }];
  return { alreadyGuessed: false, correct, ...(await settleRound(round, player.id, room, all)) };
}

export async function finishRoundEarly(userId: string, roundId: unknown) {
  if (typeof roundId !== "string") throw new ApiError(400, "Bad round.");
  const { round, room, player, mine } = await loadRecall(userId, roundId);
  const doneMs = Date.now() - Date.parse(room.phase_started_at ?? "");
  return { alreadyGuessed: false, ...(await settleRound(round, player.id, room, mine, { doneMs })) };
}

/**
 * Marks the player done once they are finished (all found, out of lives, or "I'm done") and
 * reports whether every online human is done, so the caller can end recall early. Per-pick
 * progress is never stored: it would fan out to every player in the room.
 */
async function settleRound(
  round: RoundRow,
  playerId: string,
  room: RoomRow,
  subs: GuessRow[],
  options: { doneMs?: number } = {},
) {
  const startedAt = room.phase_started_at ?? new Date().toISOString();
  const doneMs = options.doneMs ?? null;
  const score = scoreRecall(toPicks(subs, startedAt), round.item_count, round.recall_ms, round.rules, doneMs);
  const selfDone = doneMs !== null || score.complete || score.wrong >= round.rules.lives;

  let ended = false;
  if (selfDone) {
    must(
      await db()
        .from("round_done")
        .upsert({ round_id: round.id, player_id: playerId, done_ms: doneMs }, { onConflict: "round_id,player_id" }),
    );
    ended = await everyoneDone(round, room);
  }
  if (ended) {
    await endRoundRecall(room);
  }

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

async function everyoneDone(round: RoundRow, room: RoomRow): Promise<boolean> {
  const [players, done] = await Promise.all([
    listPlayers(room.id),
    db().from("round_done").select("player_id").eq("round_id", round.id).returns<Pick<RoundDoneRow, "player_id">[]>().then(must),
  ]);
  const finished = new Set(done.map((d) => d.player_id));
  const now = Date.now();
  return players
    .filter((p) => !p.is_bot && now - Date.parse(p.last_seen_at) < ONLINE_WITHIN_MS)
    .every((p) => finished.has(p.id));
}

/** Idempotent: scores every human from stored submissions and writes the results. */
export async function resolveRound(room: RoomRow, round: RoundRow): Promise<void> {
  const startedAt = room.phase_started_at ?? new Date().toISOString();
  const [players, subs, done] = await Promise.all([
    listPlayers(room.id),
    db()
      .from("round_submissions")
      .select("player_id, item_key, correct, created_at")
      .eq("round_id", round.id)
      .order("created_at")
      .returns<GuessRow[]>()
      .then(must),
    db().from("round_done").select("player_id, done_ms").eq("round_id", round.id).returns<Pick<RoundDoneRow, "player_id" | "done_ms">[]>().then(must),
  ]);
  const doneMs = new Map(done.map((d) => [d.player_id, d.done_ms]));

  const rows = players
    .filter((p) => !p.is_bot)
    .map((player) => {
      const mine = subs.filter((s) => s.player_id === player.id);
      const score = scoreRecall(
        toPicks(mine, startedAt),
        round.item_count,
        round.recall_ms,
        round.rules,
        doneMs.get(player.id) ?? null,
      );
      return {
        round_id: round.id,
        player_id: player.id,
        level: round.level,
        correct_count: score.correct,
        wrong_count: score.wrong,
        speed_bonus: score.speedBonus,
        found_keys: mine.filter((s) => s.correct).slice(0, score.correct).map((s) => s.item_key),
        finished_ms: score.finishedMs,
        points: score.points,
      };
    });
  must(await db().from("round_results").upsert(rows, { onConflict: "round_id,player_id" }));
  must(await db().from("rounds").update({ resolved: true }).eq("id", round.id));
}

/** Scores the round, then shows the leaderboard. Safe to call twice: only one phase swap wins. */
export async function endRoundRecall(room: RoomRow): Promise<RoomRow | null> {
  await resolveRound(room, await currentRound(room));
  return swapPhase(room, {
    phase: "level_result",
    ...timedPhase(room.pacing === "auto" ? autoResultMs("level_result") : null),
  });
}
