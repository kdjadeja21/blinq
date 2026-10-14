import { generateRound, getRoundSpec } from "@/lib/engine";
import type { Item } from "@/lib/items";
import { botPicks, makeBotPlan } from "@/lib/multiplayer/bots";
import { drawPairings, pairKey } from "@/lib/multiplayer/pairing";
import type {
  DuelRow,
  DuelRules,
  PlayerRow,
  RoomRow,
  SubmissionRow,
  TeamRow,
} from "@/lib/multiplayer/types";
import { decideWinner, type DuelOutcome } from "@/lib/multiplayer/winner";
import { scoreRecall, type PickEvent, type RecallScore } from "@/lib/scoring";
import { db, must, seededRandom } from "./db";
import { listPlayers, listTeams } from "./queries";

function teamRoster(players: PlayerRow[], team: TeamRow | undefined): string[] {
  return players
    .filter((p) => p.team_id === team?.id)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
    .map((p) => p.id);
}

/**
 * Builds every duel of a level: fresh pairings, shuffled duel order, items and choices.
 * Randomness is derived from a server secret, so concurrent callers build identical
 * rows and the inserts are safely idempotent.
 */
export async function ensureLevel(
  room: RoomRow,
  level: number,
): Promise<number> {
  const [players, teams] = await Promise.all([
    listPlayers(room.id),
    listTeams(room.id),
  ]);
  const teamA = teamRoster(
    players,
    teams.find((t) => t.name === "Team A"),
  );
  const teamB = teamRoster(
    players,
    teams.find((t) => t.name === "Team B"),
  );

  const earlier = must(
    await db()
      .from("duels")
      .select("player_a, player_b")
      .eq("room_id", room.id)
      .lt("level", level)
      .returns<Pick<DuelRow, "player_a" | "player_b">[]>(),
  );
  const history = new Set(earlier.map((d) => pairKey(d.player_a, d.player_b)));
  const pairings = drawPairings(
    teamA,
    teamB,
    history,
    seededRandom(`${room.id}:pairs:${level}`),
  );

  const spec = getRoundSpec({ mode: "duel", difficulty: room.difficulty, level });
  const rules: DuelRules = {
    ...spec.rules,
    engineVersion: spec.engineVersion,
    choiceCount: spec.choiceCount,
    modifiers: spec.modifiers,
  };
  const botIds = new Set(players.filter((p) => p.is_bot).map((p) => p.id));

  const rows = pairings.map((pair, index) => ({
    room_id: room.id,
    level,
    duel_index: index,
    player_a: pair.a,
    player_b: pair.b,
    item_count: spec.itemCount,
    memorize_ms: spec.memorizeMs,
    recall_ms: spec.recallMs,
    rules,
    bot_plan:
      botIds.has(pair.a) || botIds.has(pair.b)
        ? makeBotPlan(spec, seededRandom(`${room.id}:bot:${level}:${index}`))
        : null,
  }));
  must(
    await db()
      .from("duels")
      .upsert(rows, {
        onConflict: "room_id,level,duel_index",
        ignoreDuplicates: true,
      }),
  );

  const duels = must(
    await db()
      .from("duels")
      .select("id, duel_index")
      .eq("room_id", room.id)
      .eq("level", level)
      .returns<Pick<DuelRow, "id" | "duel_index">[]>(),
  );
  for (const duel of duels) {
    const random = seededRandom(`${room.id}:items:${level}:${duel.duel_index}`);
    const { items, choices } = generateRound(spec, random);
    const toRows = (list: Item[]) =>
      list.map((item, position) => ({
        duel_id: duel.id,
        position,
        item_key: item.id,
      }));
    const opts = { onConflict: "duel_id,position", ignoreDuplicates: true };
    must(await db().from("duel_items").upsert(toRows(items), opts));
    must(await db().from("duel_choices").upsert(toRows(choices), opts));
  }
  return duels.length;
}

export async function countDuels(
  roomId: string,
  level: number,
): Promise<number> {
  const { count, error } = await db()
    .from("duels")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("level", level);
  if (error) throw error;
  return count ?? 0;
}

export function toPicks(
  subs: Pick<SubmissionRow, "correct" | "created_at">[],
  startedAt: string,
): PickEvent[] {
  const start = Date.parse(startedAt);
  return subs.map((s) => ({
    correct: s.correct,
    at: Date.parse(s.created_at) - start,
  }));
}

export interface PlayerScore {
  score: RecallScore;
  foundKeys: string[];
}

export async function scorePlayer(
  duel: DuelRow,
  playerId: string,
  startedAt: string,
): Promise<PlayerScore> {
  const [subs, progress] = await Promise.all([
    db()
      .from("submissions")
      .select("item_key, correct, created_at")
      .eq("duel_id", duel.id)
      .eq("player_id", playerId)
      .order("created_at")
      .returns<Pick<SubmissionRow, "item_key" | "correct" | "created_at">[]>()
      .then(must),
    db()
      .from("duel_progress")
      .select("done_ms")
      .eq("duel_id", duel.id)
      .eq("player_id", playerId)
      .maybeSingle<{ done_ms: number | null }>()
      .then(must),
  ]);
  const score = scoreRecall(
    toPicks(subs, startedAt),
    duel.item_count,
    duel.recall_ms,
    duel.rules,
    progress?.done_ms ?? null,
  );
  const foundKeys = subs
    .filter((s) => s.correct)
    .slice(0, score.correct)
    .map((s) => s.item_key);
  return { score, foundKeys };
}

/** Idempotent: computes results from stored submissions, writes them, refreshes team totals. */
export async function resolveDuel(
  room: RoomRow,
  duel: DuelRow,
  options: { refreshScores?: boolean } = {},
): Promise<void> {
  const startedAt = room.phase_started_at ?? new Date().toISOString();
  const players = await listPlayers(room.id);
  const bots = new Set(players.filter((p) => p.is_bot).map((p) => p.id));

  const outcomes: (DuelOutcome & PlayerScore)[] = await Promise.all(
    [duel.player_a, duel.player_b].map(async (playerId) => {
      let result: PlayerScore;
      if (bots.has(playerId) && duel.bot_plan) {
        const score = scoreRecall(
          botPicks(duel.bot_plan),
          duel.item_count,
          duel.recall_ms,
          duel.rules,
        );
        const items = must(
          await db()
            .from("duel_items")
            .select("item_key")
            .eq("duel_id", duel.id)
            .order("position")
            .returns<{ item_key: string }[]>(),
        );
        result = {
          score,
          foundKeys: items.slice(0, score.correct).map((i) => i.item_key),
        };
      } else {
        result = await scorePlayer(duel, playerId, startedAt);
      }
      return {
        playerId,
        correct: result.score.correct,
        complete: result.score.complete,
        finishedMs: result.score.finishedMs,
        ...result,
      };
    }),
  );
  const winner = decideWinner(outcomes[0], outcomes[1]);

  must(
    await db()
      .from("duel_results")
      .upsert(
        outcomes.map((o) => ({
          duel_id: duel.id,
          player_id: o.playerId,
          correct_count: o.score.correct,
          wrong_count: o.score.wrong,
          speed_bonus: o.score.speedBonus,
          found_keys: o.foundKeys,
          finished_ms: o.score.finishedMs,
          points: o.score.points,
        })),
        { onConflict: "duel_id,player_id" },
      ),
  );
  must(
    await db()
      .from("duels")
      .update({ winner_id: winner, resolved: true })
      .eq("id", duel.id),
  );
  if (options.refreshScores !== false) await refreshTeamScores(room.id, players);
}

export async function refreshTeamScores(
  roomId: string,
  players: PlayerRow[],
): Promise<void> {
  const duels = must(
    await db()
      .from("duels")
      .select("id")
      .eq("room_id", roomId)
      .returns<{ id: string }[]>(),
  );
  if (duels.length === 0) return;
  const results = must(
    await db()
      .from("duel_results")
      .select("player_id, points")
      .in(
        "duel_id",
        duels.map((d) => d.id),
      )
      .returns<{ player_id: string; points: number }[]>(),
  );
  const teamOf = new Map(players.map((p) => [p.id, p.team_id]));
  const totals = new Map<string, number>();
  for (const r of results) {
    const teamId = teamOf.get(r.player_id);
    if (teamId) totals.set(teamId, (totals.get(teamId) ?? 0) + r.points);
  }
  const teams = await listTeams(roomId);
  await Promise.all(
    teams.map(async (team) => {
      must(
        await db()
          .from("teams")
          .update({ score: totals.get(team.id) ?? 0 })
          .eq("id", team.id),
      );
    }),
  );
}
