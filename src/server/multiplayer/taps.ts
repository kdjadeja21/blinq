/** Clients stamp taps with the server-corrected clock so queued sends keep their real spacing. */
export const MAX_TAP_AGE_MS = 5_000;

export function tapTime(now: number, claimed: unknown, startedAt: number): number {
  if (typeof claimed !== "number" || !Number.isFinite(claimed)) return now;
  return Math.min(now, Math.max(claimed, now - MAX_TAP_AGE_MS, startedAt));
}
