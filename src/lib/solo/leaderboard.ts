import { previousDateKey } from "../rng";

export type LeaderboardScope = "daily" | "weekly" | "all";

export const LEADERBOARD_SCOPES: readonly LeaderboardScope[] = ["daily", "weekly", "all"];

export function parseScope(value: string | string[] | undefined): LeaderboardScope {
  const raw = Array.isArray(value) ? value[0] : value;
  return LEADERBOARD_SCOPES.find((scope) => scope === raw) ?? "daily";
}

/** One player's daily result. A player has at most one entry per date. */
export interface DailyEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** UTC date key, YYYY-MM-DD. */
  date: string;
  score: number;
  correct: number;
}

export interface DateRange {
  /** Inclusive, null for no lower bound. */
  from: string | null;
  /** Inclusive. */
  to: string;
}

export interface LeaderboardRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Ties share a rank (1, 1, 3). */
  rank: number;
  points: number;
  correct: number;
  /** Places gained (positive) or lost (negative) versus the previous snapshot. Null when not ranked there. */
  delta: number | null;
}

interface Totals {
  userId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  correct: number;
}

/** Monday of the UTC week containing `dateKey`. */
export function weekStartKey(dateKey: string): string {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  const sinceMonday = (day + 6) % 7;
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - sinceMonday * 86_400_000).toISOString().slice(0, 10);
}

function totalsIn(entries: readonly DailyEntry[], range: DateRange): Totals[] {
  const byUser = new Map<string, Totals>();
  for (const entry of entries) {
    if ((range.from !== null && entry.date < range.from) || entry.date > range.to) continue;
    const row = byUser.get(entry.userId) ?? {
      userId: entry.userId,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      points: 0,
      correct: 0,
    };
    row.points += entry.score;
    row.correct += entry.correct;
    byUser.set(entry.userId, row);
  }
  return [...byUser.values()];
}

function compare(a: Totals, b: Totals): number {
  return b.points - a.points || b.correct - a.correct || a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId);
}

function tied(a: Totals, b: Totals): boolean {
  return a.points === b.points && a.correct === b.correct;
}

function rankTotals(totals: Totals[]): { row: Totals; rank: number }[] {
  const sorted = [...totals].sort(compare);
  return sorted.map((row, index) => {
    let first = index;
    while (first > 0 && tied(sorted[first - 1], row)) first -= 1;
    return { row, rank: first + 1 };
  });
}

/** Ranks the `current` range and compares each player's place with the `previous` range. */
export function boardWithChanges(entries: readonly DailyEntry[], current: DateRange, previous: DateRange | null): LeaderboardRow[] {
  const before = previous ? new Map(rankTotals(totalsIn(entries, previous)).map(({ row, rank }) => [row.userId, rank])) : null;
  return rankTotals(totalsIn(entries, current)).map(({ row, rank }) => {
    const was = before?.get(row.userId);
    return {
      userId: row.userId,
      name: row.name,
      avatarUrl: row.avatarUrl,
      rank,
      points: row.points,
      correct: row.correct,
      delta: was === undefined ? null : was - rank,
    };
  });
}

/** Date windows for a scope. The previous window ends the day before `today` (daily compares against yesterday). */
export function rangesFor(scope: LeaderboardScope, today: string): { current: DateRange; previous: DateRange } {
  const yesterday = previousDateKey(today);
  switch (scope) {
    case "daily":
      return { current: { from: today, to: today }, previous: { from: yesterday, to: yesterday } };
    case "weekly": {
      const start = weekStartKey(today);
      return { current: { from: start, to: today }, previous: { from: start, to: yesterday } };
    }
    case "all":
      return { current: { from: null, to: today }, previous: { from: null, to: yesterday } };
    default: {
      const unreachable: never = scope;
      return unreachable;
    }
  }
}

/** Earliest date the server must load so both windows can be ranked. */
export function loadFrom(scope: LeaderboardScope, today: string): string | null {
  const { current, previous } = rangesFor(scope, today);
  if (current.from === null) return null;
  return previous.from !== null && previous.from < current.from ? previous.from : current.from;
}

export function leaderboard(entries: readonly DailyEntry[], scope: LeaderboardScope, today: string): LeaderboardRow[] {
  const { current, previous } = rangesFor(scope, today);
  return boardWithChanges(entries, current, previous);
}
