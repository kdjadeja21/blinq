import type { Round } from "./game";
import { previousDateKey, utcDateKey } from "./rng";
import type { Stats } from "./stats";

export type RoundSummary = Pick<Round, "mode" | "level" | "result"> & {
  recalled: ReadonlyArray<{ id: string }>;
  items: ReadonlyArray<{ id: string }>;
};

export function applyRoundResult(stats: Stats, round: RoundSummary, now: number): Stats {
  const result = round.result;
  if (!result) return stats;

  if (round.mode === "training") return { ...stats, trainingDone: true };

  const next: Stats = {
    ...stats,
    roundsPlayed: stats.roundsPlayed + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    perfectRounds: stats.perfectRounds + (result.perfect ? 1 : 0),
    correctItems: stats.correctItems + result.correct,
    totalItems: stats.totalItems + result.total,
    wrongGuesses: stats.wrongGuesses + result.wrongCount,
    bestScore: Math.max(stats.bestScore, result.score),
  };

  if (round.mode === "level") {
    if (result.stars === 3 && round.level === stats.level) {
      next.level = stats.level + 1;
      next.bestLevel = Math.max(stats.bestLevel, next.level);
    }
    return next;
  }

  const today = utcDateKey(now);
  const continues = stats.lastDailyDate === previousDateKey(today);
  next.streak = continues ? stats.streak + 1 : 1;
  next.bestStreak = Math.max(stats.bestStreak, next.streak);
  next.lastDailyDate = today;
  next.daily = {
    date: today,
    correct: result.correct,
    total: result.total,
    stars: result.stars,
    score: result.score,
    recalledIds: round.recalled.map((r) => r.id),
    itemIds: round.items.map((i) => i.id),
  };
  return next;
}

/** A streak is only alive if the last daily was today or yesterday. */
export function currentStreak(stats: Stats, today: string): number {
  if (!stats.lastDailyDate) return 0;
  return stats.lastDailyDate === today || stats.lastDailyDate === previousDateKey(today)
    ? stats.streak
    : 0;
}

const SHARE_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDailyDate(iso: string, now: Date = new Date()): string {
  const m = SHARE_DATE_RE.exec(iso);
  if (!m) return iso;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(date.getTime())) return iso;
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

export function shareText(daily: NonNullable<Stats["daily"]>): string {
  const cells = daily.itemIds.map((id) => (daily.recalledIds.includes(id) ? "🟩" : "⬜"));
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4).join(""));
  const stars = "⭐".repeat(daily.stars) || "·";
  return [
    `🧠 Blinq Daily · ${formatDailyDate(daily.date)} ${stars}`,
    `I remembered ${daily.correct}/${daily.total} items`,
    "",
    ...rows,
    "",
    "Think you can beat me? Play here 👇",
  ].join("\n");
}

export function sharePath(daily: NonNullable<Stats["daily"]>): string {
  const grid = daily.itemIds.map((id) => (daily.recalledIds.includes(id) ? "1" : "0")).join("");
  const params = new URLSearchParams({
    d: daily.date,
    c: String(daily.correct),
    t: String(daily.total),
    s: String(daily.stars),
    g: grid,
  });
  return params.toString();
}

/**
 * Combines two cumulative stats snapshots of the same player (guest device and account).
 * Counters are cumulative, so taking the max keeps the merge idempotent: syncing twice never double counts.
 */
export function mergeStats(a: Stats, b: Stats): Stats {
  const latest = (a.lastDailyDate ?? "") >= (b.lastDailyDate ?? "") ? a : b;
  const other = latest === a ? b : a;
  const sameDay = latest.lastDailyDate === other.lastDailyDate;
  return {
    level: Math.max(a.level, b.level),
    bestLevel: Math.max(a.bestLevel, b.bestLevel),
    roundsPlayed: Math.max(a.roundsPlayed, b.roundsPlayed),
    wins: Math.max(a.wins, b.wins),
    perfectRounds: Math.max(a.perfectRounds, b.perfectRounds),
    correctItems: Math.max(a.correctItems, b.correctItems),
    totalItems: Math.max(a.totalItems, b.totalItems),
    wrongGuesses: Math.max(a.wrongGuesses, b.wrongGuesses),
    bestScore: Math.max(a.bestScore, b.bestScore),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    streak: sameDay ? Math.max(a.streak, b.streak) : latest.streak,
    lastDailyDate: latest.lastDailyDate,
    daily: latest.daily ?? other.daily,
    trainingDone: a.trainingDone || b.trainingDone,
  };
}

export function statsEqual(a: Stats, b: Stats): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
