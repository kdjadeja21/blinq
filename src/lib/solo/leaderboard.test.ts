import assert from "node:assert/strict";
import { test } from "node:test";
import { leaderboard, loadFrom, parseScope, weekStartKey, type DailyEntry } from "./leaderboard";

const entry = (userId: string, date: string, score: number, correct = score): DailyEntry => ({
  userId,
  name: userId.toUpperCase(),
  avatarUrl: null,
  date,
  score,
  correct,
});

test("weekStartKey returns the UTC Monday", () => {
  assert.equal(weekStartKey("2026-10-12"), "2026-10-12");
  assert.equal(weekStartKey("2026-10-14"), "2026-10-12");
  assert.equal(weekStartKey("2026-10-18"), "2026-10-12");
  assert.equal(weekStartKey("2026-10-19"), "2026-10-19");
});

test("parseScope falls back to daily", () => {
  assert.equal(parseScope("weekly"), "weekly");
  assert.equal(parseScope(["all", "daily"]), "all");
  assert.equal(parseScope("nope"), "daily");
  assert.equal(parseScope(undefined), "daily");
});

test("daily ranks by score then correct and ties share a rank", () => {
  const rows = leaderboard(
    [entry("a", "2026-10-14", 50), entry("b", "2026-10-14", 80), entry("c", "2026-10-14", 50), entry("d", "2026-10-14", 50, 10)],
    "daily",
    "2026-10-14",
  );
  assert.deepEqual(rows.map((r) => [r.userId, r.rank]), [["b", 1], ["a", 2], ["c", 2], ["d", 4]]);
});

test("daily delta compares with yesterday and is null for new players", () => {
  const rows = leaderboard(
    [
      entry("a", "2026-10-13", 90),
      entry("b", "2026-10-13", 60),
      entry("a", "2026-10-14", 40),
      entry("b", "2026-10-14", 70),
      entry("c", "2026-10-14", 10),
    ],
    "daily",
    "2026-10-14",
  );
  const byId = Object.fromEntries(rows.map((r) => [r.userId, r.delta]));
  assert.deepEqual(byId, { b: 1, a: -1, c: null });
});

test("weekly sums the week and measures change against the previous day", () => {
  const entries = [
    entry("a", "2026-10-11", 500),
    entry("a", "2026-10-12", 30),
    entry("b", "2026-10-12", 20),
    entry("a", "2026-10-13", 10),
    entry("b", "2026-10-13", 15),
    entry("b", "2026-10-14", 30),
  ];
  const rows = leaderboard(entries, "weekly", "2026-10-14");
  assert.deepEqual(rows.map((r) => [r.userId, r.points, r.rank, r.delta]), [
    ["b", 65, 1, 1],
    ["a", 40, 2, -1],
  ]);
});

test("all time includes every date up to today and ignores later dates", () => {
  const rows = leaderboard([entry("a", "2026-01-01", 5), entry("a", "2026-10-14", 5), entry("b", "2026-10-15", 99)], "all", "2026-10-14");
  assert.deepEqual(rows.map((r) => [r.userId, r.points]), [["a", 10]]);
});

test("loadFrom returns the earliest date needed per scope", () => {
  assert.equal(loadFrom("daily", "2026-10-14"), "2026-10-13");
  assert.equal(loadFrom("weekly", "2026-10-14"), "2026-10-12");
  assert.equal(loadFrom("weekly", "2026-10-12"), "2026-10-12");
  assert.equal(loadFrom("all", "2026-10-14"), null);
});
