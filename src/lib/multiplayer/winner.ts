export interface DuelOutcome {
  playerId: string;
  correct: number;
  complete: boolean;
  finishedMs: number | null;
}

/**
 * First to recall everything wins; otherwise more correct items; then the earlier
 * last correct answer; still level is a draw (null).
 */
export function decideWinner(a: DuelOutcome, b: DuelOutcome): string | null {
  if (a.complete !== b.complete) return a.complete ? a.playerId : b.playerId;
  if (a.complete && b.complete) return earlier(a, b);
  if (a.correct !== b.correct) return a.correct > b.correct ? a.playerId : b.playerId;
  if (a.correct === 0) return null;
  return earlier(a, b);
}

function earlier(a: DuelOutcome, b: DuelOutcome): string | null {
  if (a.finishedMs === null || b.finishedMs === null || a.finishedMs === b.finishedMs) return null;
  return a.finishedMs < b.finishedMs ? a.playerId : b.playerId;
}
