export const DISTRACT_MIN_MS = 5_000;
export const DISTRACT_MAX_MS = 10_000;
const DISTRACT_STEP_MS = 500;
const BLOCK_SIZE = 10;

/** The distraction task grows from 5s to 10s over a block. */
export function distractMsFor(level: number): number {
  const pos = (Math.max(1, Math.floor(level)) - 1) % BLOCK_SIZE;
  return Math.min(DISTRACT_MAX_MS, DISTRACT_MIN_MS + DISTRACT_STEP_MS * pos);
}
