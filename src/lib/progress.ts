import type { Round } from "./game";
import { previousDateKey, utcDateKey } from "./rng";
import type { Stats } from "./storage";

export function applyRoundResult(stats: Stats, round: Round, now: number): Stats {
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

export function shareText(daily: NonNullable<Stats["daily"]>): string {
  const cells = daily.itemIds.map((id) => (daily.recalledIds.includes(id) ? "🟩" : "⬜"));
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4).join(""));
  const stars = "⭐".repeat(daily.stars) || "·";
  return [`Blinq ${daily.date} ${stars}`, `${daily.correct}/${daily.total} remembered`, ...rows].join("\n");
}
