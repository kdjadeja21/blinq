/** Charged per level to players who never finished, so "no finish" never beats a real time. */
export const NO_FINISH_MS = 3_600_000;

export interface BoardPlayer {
  id: string;
  name: string;
}

export interface RoundScore {
  playerId: string;
  level: number;
  points: number;
  correct: number;
  finishedMs: number | null;
}

export interface Standing {
  playerId: string;
  name: string;
  /** Ties share a rank (1, 1, 3). */
  rank: number;
  points: number;
  correct: number;
  timeMs: number;
  /** Points scored in the level being shown. */
  levelPoints: number;
  /** Places gained (positive) or lost (negative) versus the previous level. Null on level 1. */
  delta: number | null;
}

interface Totals {
  player: BoardPlayer;
  points: number;
  correct: number;
  timeMs: number;
}

function totalsFor(players: readonly BoardPlayer[], scores: readonly RoundScore[], from: number, to: number): Totals[] {
  const byPlayer = new Map<string, Totals>(players.map((player) => [player.id, { player, points: 0, correct: 0, timeMs: 0 }]));
  for (const score of scores) {
    if (score.level < from || score.level > to) continue;
    const row = byPlayer.get(score.playerId);
    if (!row) continue;
    row.points += score.points;
    row.correct += score.correct;
    row.timeMs += score.finishedMs ?? NO_FINISH_MS;
  }
  return [...byPlayer.values()];
}

function compare(a: Totals, b: Totals): number {
  return b.points - a.points || b.correct - a.correct || a.timeMs - b.timeMs || a.player.name.localeCompare(b.player.name);
}

function tied(a: Totals, b: Totals): boolean {
  return a.points === b.points && a.correct === b.correct && a.timeMs === b.timeMs;
}

function rankTotals(totals: Totals[]): { row: Totals; rank: number }[] {
  const sorted = [...totals].sort(compare);
  return sorted.map((row, index) => {
    let first = index;
    while (first > 0 && tied(sorted[first - 1], row)) first -= 1;
    return { row, rank: first + 1 };
  });
}

function toStandings(ranked: { row: Totals; rank: number }[], levelPoints: Map<string, number>, previous: Map<string, number> | null): Standing[] {
  return ranked.map(({ row, rank }) => {
    const before = previous?.get(row.player.id);
    return {
      playerId: row.player.id,
      name: row.player.name,
      rank,
      points: row.points,
      correct: row.correct,
      timeMs: row.timeMs,
      levelPoints: levelPoints.get(row.player.id) ?? 0,
      delta: before === undefined ? null : before - rank,
    };
  });
}

function pointsOfLevel(scores: readonly RoundScore[], level: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of scores) if (s.level === level) map.set(s.playerId, s.points);
  return map;
}

/** Ranking of a single level. */
export function levelStandings(players: readonly BoardPlayer[], scores: readonly RoundScore[], level: number): Standing[] {
  return toStandings(rankTotals(totalsFor(players, scores, level, level)), pointsOfLevel(scores, level), null);
}

/** Running totals for levels 1..level, with each player's rank change versus levels 1..level-1. */
export function cumulativeStandings(players: readonly BoardPlayer[], scores: readonly RoundScore[], level: number): Standing[] {
  const ranked = rankTotals(totalsFor(players, scores, 1, level));
  const previous =
    level > 1 ? new Map(rankTotals(totalsFor(players, scores, 1, level - 1)).map(({ row, rank }) => [row.player.id, rank])) : null;
  return toStandings(ranked, pointsOfLevel(scores, level), previous);
}
