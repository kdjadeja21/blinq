import { currentUser } from "@clerk/nextjs/server";
import type { RoundResult } from "@/lib/game";
import { applyRoundResult, mergeStats, type RoundSummary } from "@/lib/progress";
import { utcDateKey } from "@/lib/rng";
import { DEFAULT_STATS, type DailyResult, type Stats } from "@/lib/stats";
import { ApiError, db, isUniqueViolation, must } from "@/server/multiplayer/db";

interface StatsRow {
  level: number;
  best_level: number;
  rounds_played: number;
  wins: number;
  perfect_rounds: number;
  correct_items: number;
  total_items: number;
  wrong_guesses: number;
  best_score: number;
  streak: number;
  best_streak: number;
  last_daily_date: string | null;
  daily: DailyResult | null;
  training_done: boolean;
}

function fromRow(row: StatsRow | null): Stats {
  if (!row) return DEFAULT_STATS;
  return {
    level: row.level,
    bestLevel: row.best_level,
    roundsPlayed: row.rounds_played,
    wins: row.wins,
    perfectRounds: row.perfect_rounds,
    correctItems: row.correct_items,
    totalItems: row.total_items,
    wrongGuesses: row.wrong_guesses,
    bestScore: row.best_score,
    streak: row.streak,
    bestStreak: row.best_streak,
    lastDailyDate: row.last_daily_date,
    daily: row.daily,
    trainingDone: row.training_done,
  };
}

async function saveStats(userId: string, stats: Stats): Promise<void> {
  must(
    await db()
      .from("solo_stats")
      .upsert({
        user_id: userId,
        level: stats.level,
        best_level: stats.bestLevel,
        rounds_played: stats.roundsPlayed,
        wins: stats.wins,
        perfect_rounds: stats.perfectRounds,
        correct_items: stats.correctItems,
        total_items: stats.totalItems,
        wrong_guesses: stats.wrongGuesses,
        best_score: stats.bestScore,
        streak: stats.streak,
        best_streak: stats.bestStreak,
        last_daily_date: stats.lastDailyDate,
        daily: stats.daily,
        training_done: stats.trainingDone,
        updated_at: new Date().toISOString(),
      })
      .select("user_id")
      .single(),
  );
}

async function loadStats(userId: string): Promise<Stats> {
  const { data, error } = await db().from("solo_stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return fromRow(data as StatsRow | null);
}

export async function ensureProfile(userId: string): Promise<void> {
  const user = await currentUser();
  const name = user?.username?.trim() || null;
  // birth_year is player-provided, so it is deliberately left out of this upsert.
  must(
    await db()
      .from("solo_profiles")
      .upsert(
        {
          user_id: userId,
          display_name: name,
          avatar_url: user?.imageUrl ?? null,
          email: user?.primaryEmailAddress?.emailAddress ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("user_id")
      .single(),
  );
}

function num(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, "Invalid round data.");
  }
  return value;
}

function ids(value: unknown): { id: string }[] {
  if (!Array.isArray(value) || value.length > 200 || !value.every((v) => typeof v === "string" && v.length <= 64)) {
    throw new ApiError(400, "Invalid round data.");
  }
  return value.map((id: string) => ({ id }));
}

type ParsedRound = RoundSummary & { result: RoundResult };

function parseRound(body: Record<string, unknown>): ParsedRound {
  const mode = body.mode;
  if (mode !== "level" && mode !== "daily") throw new ApiError(400, "Invalid round data.");
  const raw = body.result as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") throw new ApiError(400, "Invalid round data.");
  const total = num(raw.total, 0, 200);
  const result: RoundResult = {
    correct: num(raw.correct, 0, total),
    total,
    stars: num(raw.stars, 0, 3) as RoundResult["stars"],
    won: raw.won === true,
    perfect: raw.perfect === true,
    score: num(raw.score, 0, 100_000),
    speedBonus: num(raw.speedBonus, 0, 1_000),
    wrongCount: num(raw.wrongCount, 0, 1_000),
    early: raw.early === true,
  };
  return { mode, level: num(body.level, 1, 10_000), result, recalled: ids(body.recalledIds), items: ids(body.itemIds) };
}

function parseStats(value: unknown): Stats {
  if (!value || typeof value !== "object") return DEFAULT_STATS;
  const raw = value as Partial<Stats>;
  const n = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);
  return {
    level: Math.max(1, n(raw.level, 1)),
    bestLevel: Math.max(1, n(raw.bestLevel, 1)),
    roundsPlayed: n(raw.roundsPlayed, 0),
    wins: n(raw.wins, 0),
    perfectRounds: n(raw.perfectRounds, 0),
    correctItems: n(raw.correctItems, 0),
    totalItems: n(raw.totalItems, 0),
    wrongGuesses: n(raw.wrongGuesses, 0),
    bestScore: n(raw.bestScore, 0),
    streak: n(raw.streak, 0),
    bestStreak: n(raw.bestStreak, 0),
    lastDailyDate: typeof raw.lastDailyDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastDailyDate) ? raw.lastDailyDate : null,
    daily: raw.daily && typeof raw.daily === "object" ? (raw.daily as DailyResult) : null,
    trainingDone: raw.trainingDone === true,
  };
}

export async function sync(userId: string, body: Record<string, unknown>): Promise<{ stats: Stats }> {
  await ensureProfile(userId);
  const merged = mergeStats(await loadStats(userId), parseStats(body.stats));
  await saveStats(userId, merged);
  return { stats: merged };
}

export async function recordRound(userId: string, body: Record<string, unknown>): Promise<{ stats: Stats }> {
  const round = parseRound(body);
  const now = Date.now();
  await ensureProfile(userId);

  const { error } = await db().from("solo_rounds").insert({
    user_id: userId,
    mode: round.mode,
    level: round.level,
    daily_date: round.mode === "daily" ? utcDateKey(now) : null,
    score: round.result.score,
    stars: round.result.stars,
    correct: round.result.correct,
    total: round.result.total,
    won: round.result.won,
  });
  const stats = await loadStats(userId);
  if (error) {
    // A second daily on the same date is already counted; retries must not double count.
    if (isUniqueViolation(error)) return { stats };
    throw new ApiError(500, error.message);
  }
  const next = applyRoundResult(stats, round, now);
  await saveStats(userId, next);
  return { stats: next };
}
