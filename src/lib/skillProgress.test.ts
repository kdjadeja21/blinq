import assert from "node:assert/strict";
import test from "node:test";
import { getCheckSpec, getRoundSpec } from "./engine";
import { checkChange, checkDue, mergeChecks, recordCheck, recordSkill, skillTrend, skillTrends, type SkillLog } from "./skillProgress";
import { addProfile, DEFAULT_PROFILES, parseProfiles, scopedKey, selectProfile } from "./profile";
import { getLevelConfig, KIDS_FIRST_BLOCK_ITEM_CAP, KIDS_ITEM_CAP } from "./levelConfig";

test("skill trend compares the last 30 days with the 30 before", () => {
  let log: SkillLog = {};
  log = recordSkill(log, "position", "2026-09-01", 5, 10);
  log = recordSkill(log, "position", "2026-10-10", 8, 10);
  const trend = skillTrend(log, "position", "2026-10-16");
  assert.equal(trend.recent, 80);
  assert.equal(trend.delta, 30);
  assert.equal(skillTrend(log, "item", "2026-10-16").recent, null);
});

test("old days are dropped and trends skip unplayed skills", () => {
  let log: SkillLog = recordSkill({}, "order", "2026-07-01", 1, 2);
  log = recordSkill(log, "order", "2026-10-16", 2, 2);
  assert.deepEqual(Object.keys(log.order ?? {}), ["2026-10-16"]);
  assert.deepEqual(skillTrends(log, "2026-10-16").map((t) => t.type), ["order"]);
  assert.equal(skillTrend(log, "order", "2026-10-16").delta, null);
});

test("memory check: baseline on day 1, re-test after 14 days", () => {
  assert.equal(checkDue([], "2026-10-01"), true);
  const first = recordCheck([], "2026-10-01", 60);
  assert.equal(checkDue(first, "2026-10-14"), false);
  assert.equal(checkDue(first, "2026-10-15"), true);
  assert.equal(checkChange(first), null);
  assert.equal(checkChange(recordCheck(first, "2026-10-15", 75)), 15);
});

test("profiles are separate and the default keeps the legacy key", () => {
  assert.equal(scopedKey("blinq:v1", "default"), "blinq:v1");
  assert.equal(scopedKey("blinq:v1", "kid1"), "blinq:v1:kid1");
  const added = addProfile(DEFAULT_PROFILES, " Mia ", true, "kid1");
  assert.equal(added.active, "kid1");
  assert.equal(added.profiles[1].name, "Mia");
  assert.equal(selectProfile(added, "default").active, "default");
  assert.equal(addProfile(added, "  ", false, "x"), added);
  assert.equal(parseProfiles("garbage"), DEFAULT_PROFILES);
  assert.equal(parseProfiles(JSON.stringify({ active: "gone", profiles: [] })).active, "default");
});

test("kids levels: visual skills first and small grids", () => {
  const types = [1, 11, 21, 31, 41].map((l) => getLevelConfig(l, "easy", 0, true).roundType);
  assert.deepEqual(types, ["item", "position", "change", "order", "delayed"]);
  for (let level = 1; level <= 60; level++) {
    const config = getLevelConfig(level, "easy", 2, true);
    assert.ok(config.items <= (level <= 10 ? KIDS_FIRST_BLOCK_ITEM_CAP : KIDS_ITEM_CAP), `level ${level}`);
  }
});

test("specs: kids rounds are flagged and capped, the check is fixed", () => {
  const spec = getRoundSpec({ mode: "level", difficulty: "easy", level: 9, kids: true });
  assert.equal(spec.kids, true);
  assert.ok(spec.itemCount <= KIDS_FIRST_BLOCK_ITEM_CAP);
  assert.equal(getRoundSpec({ mode: "level", difficulty: "medium", level: 9 }).kids, false);
  const check = getCheckSpec();
  assert.equal(check.itemCount, 6);
  assert.equal(check.mode, "training");
});

test("mergeChecks unions by date, keeps the first entry for a date and sorts oldest first", () => {
  const merged = mergeChecks(
    [{ date: "2026-10-16", accuracy: 60 }],
    [
      { date: "2026-10-02", accuracy: 40 },
      { date: "2026-10-16", accuracy: 90 },
    ],
  );
  assert.deepEqual(merged, [
    { date: "2026-10-02", accuracy: 40 },
    { date: "2026-10-16", accuracy: 60 },
  ]);
});
