import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeStats } from "./progress";
import { DEFAULT_STATS, type Stats } from "./stats";

const stats = (patch: Partial<Stats>): Stats => ({ ...DEFAULT_STATS, ...patch });

test("mergeStats keeps guest progress when the account is empty", () => {
  const guest = stats({ level: 4, bestLevel: 4, roundsPlayed: 9, bestScore: 120, trainingDone: true });
  assert.deepEqual(mergeStats(DEFAULT_STATS, guest), guest);
});

test("mergeStats is idempotent, so repeated syncs never double count", () => {
  const a = stats({ roundsPlayed: 5, wins: 3, correctItems: 40 });
  assert.deepEqual(mergeStats(a, a), a);
});

test("mergeStats takes the streak and daily from the most recent daily date", () => {
  const older = stats({ streak: 7, bestStreak: 7, lastDailyDate: "2026-10-10" });
  const newer = stats({ streak: 2, bestStreak: 2, lastDailyDate: "2026-10-13" });
  const merged = mergeStats(older, newer);
  assert.equal(merged.streak, 2);
  assert.equal(merged.bestStreak, 7);
  assert.equal(merged.lastDailyDate, "2026-10-13");
});

test("mergeStats takes the higher level and best values from either side", () => {
  const merged = mergeStats(stats({ level: 6, bestScore: 50 }), stats({ level: 3, bestScore: 90, bestLevel: 8 }));
  assert.equal(merged.level, 6);
  assert.equal(merged.bestLevel, 8);
  assert.equal(merged.bestScore, 90);
});
