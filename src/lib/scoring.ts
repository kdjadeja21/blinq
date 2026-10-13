export const BASE_POINTS = 100;
export const COMBO_WINDOW_MS = 3000;
export const MAX_LIVES = 3;
export const WRONG_PENALTY_MS = 3000;
/** Partial recall counts as a win for now (>= 1 star); a perfect round is 100%. */
export const WIN_RATIO = 0.5;

export function levelItemCount(level: number): number {
  return Math.min(14, 6 + 2 * (level - 1));
}

export function comboMultiplier(combo: number): number {
  if (combo >= 4) return 2;
  if (combo === 3) return 1.5;
  if (combo === 2) return 1.2;
  return 1;
}

export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  const ratio = correct / total;
  if (ratio >= 1) return 3;
  if (ratio >= 0.8) return 2;
  if (ratio >= WIN_RATIO) return 1;
  return 0;
}

/** Next combo count when a correct pick lands at `now` (ms, any shared clock). */
export function nextCombo(combo: number, lastCorrectAt: number | null, now: number): number {
  const chained = lastCorrectAt !== null && now - lastCorrectAt <= COMBO_WINDOW_MS;
  return chained ? combo + 1 : 1;
}

export function pointsForCombo(combo: number): number {
  return Math.round(BASE_POINTS * comboMultiplier(combo));
}

export interface PickEvent {
  correct: boolean;
  /** ms since recall started */
  at: number;
}

export interface RecallScore {
  correct: number;
  wrong: number;
  points: number;
  speedBonus: number;
  /** ms from recall start to the last correct pick, null when nothing was correct */
  finishedMs: number | null;
  complete: boolean;
  /** recall time left to this player after wrong-pick penalties */
  deadlineMs: number;
}

/**
 * Replays picks with the same rules as the single-player round: combo chains,
 * wrong picks reset the combo and cost time, three wrong picks end recall, and
 * finishing every item early adds the remaining seconds as a speed bonus.
 */
export function scoreRecall(picks: readonly PickEvent[], total: number, recallMs: number): RecallScore {
  let deadlineMs = recallMs;
  let combo = 0;
  let lastCorrectAt: number | null = null;
  let correct = 0;
  let wrong = 0;
  let points = 0;

  for (const pick of [...picks].sort((a, b) => a.at - b.at)) {
    if (wrong >= MAX_LIVES || pick.at > deadlineMs || correct >= total) break;
    if (pick.correct) {
      combo = nextCombo(combo, lastCorrectAt, pick.at);
      points += pointsForCombo(combo);
      lastCorrectAt = pick.at;
      correct += 1;
    } else {
      wrong += 1;
      combo = 0;
      deadlineMs -= WRONG_PENALTY_MS;
    }
  }

  const complete = total > 0 && correct === total;
  const speedBonus = complete && lastCorrectAt !== null ? Math.max(0, Math.floor((deadlineMs - lastCorrectAt) / 1000)) : 0;
  return { correct, wrong, points: points + speedBonus, speedBonus, finishedMs: lastCorrectAt, complete, deadlineMs };
}
