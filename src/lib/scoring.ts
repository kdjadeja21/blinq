export const BASE_POINTS = 100;
export const COMBO_WINDOW_MS = 3000;
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
