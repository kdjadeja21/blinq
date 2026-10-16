import type { RoundType } from "./levelConfig";

/** Offers the 1-minute memory test and the retest. Set to false to hide it. */
export const MEMORY_CHECK_ENABLED = true;

export type SkillType = Exclude<RoundType, "combo">;
export const SKILL_TYPES: readonly SkillType[] = ["item", "position", "order", "change", "delayed"];

/** Correct and total answers for one day. */
export type DayTally = [correct: number, total: number];
export type SkillLog = Partial<Record<SkillType, Record<string, DayTally>>>;

export interface MemoryCheck {
  date: string;
  /** 0..100 */
  accuracy: number;
}

export const TREND_WINDOW_DAYS = 30;
const KEEP_DAYS = TREND_WINDOW_DAYS * 2;
export const RETEST_AFTER_DAYS = 14;
const MAX_CHECKS = 12;
const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function recordSkill(log: SkillLog, type: SkillType, date: string, correct: number, total: number): SkillLog {
  if (total <= 0) return log;
  const days = { ...(log[type] ?? {}) };
  const [c, t] = days[date] ?? [0, 0];
  days[date] = [c + correct, t + total];
  for (const key of Object.keys(days)) {
    if (daysBetween(key, date) >= KEEP_DAYS) delete days[key];
  }
  return { ...log, [type]: days };
}

function accuracyIn(days: Record<string, DayTally> | undefined, today: string, fromAgo: number, toAgo: number): number | null {
  let correct = 0;
  let total = 0;
  for (const [key, [c, t]] of Object.entries(days ?? {})) {
    const ago = daysBetween(key, today);
    if (ago >= fromAgo && ago < toAgo) {
      correct += c;
      total += t;
    }
  }
  return total ? (correct / total) * 100 : null;
}

export interface SkillTrend {
  type: SkillType;
  /** accuracy over the last 30 days, 0..100 */
  recent: number | null;
  /** change in percentage points against the 30 days before, null without both windows */
  delta: number | null;
}

export function skillTrend(log: SkillLog, type: SkillType, today: string): SkillTrend {
  const days = log[type];
  const recent = accuracyIn(days, today, 0, TREND_WINDOW_DAYS);
  const previous = accuracyIn(days, today, TREND_WINDOW_DAYS, KEEP_DAYS);
  return { type, recent, delta: recent !== null && previous !== null ? Math.round(recent - previous) : null };
}

/** Skills that have been played, best trend first. */
export function skillTrends(log: SkillLog, today: string): SkillTrend[] {
  return SKILL_TYPES.map((type) => skillTrend(log, type, today))
    .filter((trend) => trend.recent !== null)
    .sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity));
}

export function recordCheck(checks: MemoryCheck[], date: string, accuracy: number): MemoryCheck[] {
  return [...checks, { date, accuracy: Math.round(accuracy) }].slice(-MAX_CHECKS);
}

/** The first check is the day-1 baseline; after that a re-test is due every 14 days. */
export function checkDue(checks: MemoryCheck[], today: string): boolean {
  if (checks.length === 0) return true;
  return daysBetween(checks[checks.length - 1].date, today) >= RETEST_AFTER_DAYS;
}

/** Points gained between the baseline and the latest re-test, or null before the first re-test. */
export function checkChange(checks: MemoryCheck[]): number | null {
  if (checks.length < 2) return null;
  return checks[checks.length - 1].accuracy - checks[0].accuracy;
}
