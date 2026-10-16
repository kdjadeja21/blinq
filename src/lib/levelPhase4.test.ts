import assert from "node:assert/strict";
import test from "node:test";
import { skipTargetLevel } from "./levelConfig";
import { introCards, hintNudge } from "./rounds/intro";
import { getTrainingSpec } from "./engine";

test("skipTargetLevel stays inside the block and ahead of level", () => {
  assert.equal(skipTargetLevel(4), 8);
  assert.ok(skipTargetLevel(8) <= 9);
  assert.ok(skipTargetLevel(4) > 4);
});

test("intro cards and nudges exist per type", () => {
  for (const t of ["item", "position", "order", "change", "delayed"] as const) {
    assert.equal(introCards(t, "tip").length, 3);
    assert.ok(hintNudge(t).length > 0);
    assert.equal(getTrainingSpec(t).roundType, t);
  }
});
