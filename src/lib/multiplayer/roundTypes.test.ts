import assert from "node:assert/strict";
import test from "node:test";
import { GONE_KEY, changedOriginals, judgePick, roundTypeForLevel, validRoundType } from "./roundTypes";
import { getRoomRoundSpec } from "@/lib/engine";

test("mixed rooms rotate by level and fixed rooms never change", () => {
  assert.deepEqual([1, 2, 3, 4].map((l) => roundTypeForLevel("mixed", l)), ["item", "change", "delayed", "item"]);
  assert.equal(roundTypeForLevel("change", 7), "change");
});

test("round type validation: defaults to items, teams stay on items", () => {
  assert.deepEqual(validRoundType(undefined, "individual"), { ok: true, type: "item" });
  assert.deepEqual(validRoundType("mixed", "individual"), { ok: true, type: "mixed" });
  assert.equal(validRoundType("position", "individual").ok, false);
  assert.equal(validRoundType("change", "team").ok, false);
});

test("changed originals compare the two views slot by slot", () => {
  assert.deepEqual(changedOriginals(["a", "b", "c"], ["a", "x", GONE_KEY]), ["b", "c"]);
  assert.deepEqual(changedOriginals(["a"], ["a"]), []);
});

test("one judgement for every type", () => {
  const facts = { inItems: true, inChoices: false, inChanged: false };
  assert.deepEqual(judgePick("item", { ...facts, inChoices: true }), { valid: true, correct: true });
  assert.deepEqual(judgePick(undefined, { ...facts, inItems: false, inChoices: true }), { valid: true, correct: false });
  assert.deepEqual(judgePick("delayed", facts), { valid: false, correct: true });
  assert.deepEqual(judgePick("change", facts), { valid: true, correct: false });
  assert.deepEqual(judgePick("change", { ...facts, inChanged: true }), { valid: true, correct: true });
  assert.deepEqual(judgePick("change", { inItems: false, inChoices: true, inChanged: false }), { valid: false, correct: false });
});

test("room round specs keep the duel curve and add the type's timing", () => {
  const item = getRoomRoundSpec("medium", 3, "item");
  const change = getRoomRoundSpec("medium", 3, "change");
  const delayed = getRoomRoundSpec("medium", 3, "delayed");
  assert.equal(item.roundType, "item");
  assert.equal(change.itemCount, item.itemCount);
  assert.ok(change.hideMs > 0);
  assert.ok(delayed.distractMs >= 5000);
  assert.equal(delayed.memorizeMs, item.memorizeMs + delayed.distractMs);
});
