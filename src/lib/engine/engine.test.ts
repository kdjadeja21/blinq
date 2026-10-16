import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ITEMS_BY_ID, LOOKALIKES } from "@/lib/items";
import { makeBotPlan } from "@/lib/multiplayer/bots";
import { hash, mulberry32 } from "@/lib/rng";
import { scoreRecall } from "@/lib/scoring";
import { generateRound } from "./generate";
import { TRAINING_PRESET } from "./profiles";
import { MAX_CHOICES, MAX_ITEMS, MIN_DECOYS, getRoundSpec } from "./spec";
import { DIFFICULTY_LEVELS, type Difficulty, type RoundSpec } from "./types";

const LEVELS = Array.from({ length: 40 }, (_, i) => i + 1);
const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

const duel = (difficulty: Difficulty, level: number) => getRoundSpec({ mode: "duel", difficulty, level });

function lookalikeShare(spec: RoundSpec, seed: number): number {
  const { items, choices } = generateRound(spec, mulberry32(seed));
  const targets = new Set(items.map((i) => i.id));
  const decoys = choices.filter((c) => !targets.has(c.id));
  const lookalikes = decoys.filter((d) => items.some((i) => LOOKALIKES.get(i.id)?.includes(d.id)));
  return decoys.length ? lookalikes.length / decoys.length : 0;
}

describe("getRoundSpec", () => {
  it("builds solo levels from the level config", () => {
    const spec = getRoundSpec({ mode: "level", difficulty: "medium", level: 1 });
    assert.equal(spec.itemCount, 4);
    assert.equal(spec.choiceCount, 10);
    assert.equal(spec.memorizeMs, 8_000);
    assert.equal(spec.recallMs, 7_600);
    assert.equal(spec.roundType, "item");
    assert.deepEqual(spec.rules, { lives: 3, wrongPenaltyMs: 0, comboWindowMs: 3_000 });
  });

  for (const difficulty of DIFFICULTY_LEVELS) {
    it(`${difficulty}: never gets easier as the level goes up`, () => {
      let prev = duel(difficulty, 1);
      for (const level of LEVELS.slice(1)) {
        const spec = duel(difficulty, level);
        assert.ok(spec.itemCount >= prev.itemCount, `items at level ${level}`);
        assert.ok(spec.choiceCount >= prev.choiceCount, `choices at level ${level}`);
        assert.ok(spec.lookalikeRatio >= prev.lookalikeRatio, `lookalikes at level ${level}`);
        assert.ok(spec.memorizeMs / spec.itemCount <= prev.memorizeMs / prev.itemCount + 1, `memorize per item at level ${level}`);
        assert.ok(spec.recallMs / spec.itemCount <= prev.recallMs / prev.itemCount + 1, `recall per item at level ${level}`);
        if (!spec.modifiers.includes("flash")) prev = spec;
      }
    });

    it(`${difficulty}: stays within the clamps`, () => {
      for (const level of [...LEVELS, 500]) {
        const spec = duel(difficulty, level);
        assert.ok(spec.itemCount >= 1 && spec.itemCount <= MAX_ITEMS);
        assert.ok(spec.choiceCount <= MAX_CHOICES);
        assert.ok(spec.choiceCount - spec.itemCount >= MIN_DECOYS);
        assert.ok(spec.memorizeMs >= 4_000 && spec.memorizeMs >= 700 * spec.itemCount);
        assert.ok(spec.recallMs >= 6_000 && spec.recallMs >= 1_000 * spec.itemCount);
        assert.ok(spec.lookalikeRatio >= 0 && spec.lookalikeRatio <= 1);
        assert.ok(spec.rules.lives >= 1);
        assert.ok(spec.bot.minRatio <= spec.bot.maxRatio && spec.bot.maxRatio <= 0.95);
      }
    });
  }

  it("normalizes bad levels to a valid one", () => {
    for (const level of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(duel("medium", level).level, 1);
    assert.equal(duel("medium", 2.7).level, 2);
  });

  it("unlocks twists by tier", () => {
    assert.deepEqual(duel("medium", 3).modifiers, []);
    assert.deepEqual(duel("medium", 5).modifiers, []);
    assert.deepEqual(duel("medium", 6).modifiers, ["themed"]);
    assert.deepEqual(duel("medium", 15).modifiers, ["themed", "flash"]);
    assert.deepEqual(duel("medium", 20).modifiers, ["flash"]);
    assert.ok(duel("medium", 20).memorizeMs < duel("medium", 19).memorizeMs);
  });

  it("solo levels ramp items, keep the grid within 24 and play item or position recall", () => {
    let prev = 0;
    for (let level = 1; level <= 30; level++) {
      const spec = getRoundSpec({ mode: "level", difficulty: "medium", level });
      assert.ok(spec.choiceCount <= 24);
      assert.ok(spec.roundType === "item" || spec.roundType === "position");
      if (level <= 10) {
        assert.equal(spec.roundType, "item");
        assert.ok(spec.itemCount >= prev);
        prev = spec.itemCount;
      }
    }
    assert.equal(getRoundSpec({ mode: "level", difficulty: "medium", level: 11 }).roundType, "position");
  });

  it("builds position layouts with one distinct slot per item", () => {
    for (const level of [11, 12, 15, 19]) {
      const spec = getRoundSpec({ mode: "level", difficulty: "medium", level });
      for (const seed of SEEDS) {
        const { items, choices, layout } = generateRound(spec, mulberry32(seed));
        assert.ok(layout);
        assert.equal(items.length, spec.itemCount);
        assert.equal(choices.length, items.length);
        assert.equal(layout.slotCount, spec.choiceCount);
        const slots = items.map((i) => layout.slots[i.id]);
        assert.equal(new Set(slots).size, items.length);
        assert.ok(slots.every((s) => s >= 0 && s < layout.slotCount));
      }
    }
  });

  it("fills decoys from the targets' categories before other items", () => {
    const spec = getRoundSpec({ mode: "level", difficulty: "medium", level: 1 });
    for (const seed of SEEDS) {
      const { items, choices } = generateRound({ ...spec, lookalikeRatio: 0 }, mulberry32(seed));
      const categories = new Set(items.map((i) => i.category));
      const targets = new Set(items.map((i) => i.id));
      const decoys = choices.filter((c) => !targets.has(c.id));
      assert.ok(decoys.filter((d) => categories.has(d.category)).length >= Math.min(decoys.length, 4));
    }
  });

  it("gives every player the same daily round", () => {
    const a = getRoundSpec({ mode: "daily", difficulty: "hard", level: 9 });
    const b = getRoundSpec({ mode: "daily", difficulty: "easy", level: 1 });
    assert.deepEqual(a, b);
  });

  it("uses the training preset", () => {
    const spec = getRoundSpec({ mode: "training", difficulty: "hard", level: 7 });
    assert.equal(spec.itemCount, TRAINING_PRESET.itemCount);
    assert.equal(spec.memorizeMs, TRAINING_PRESET.memorizeMs);
    const { items, choices } = generateRound(spec, mulberry32(1));
    assert.equal(items.length, TRAINING_PRESET.itemCount);
    assert.equal(choices.length, spec.choiceCount);
    const targetSets = new Set(SEEDS.map((seed) => generateRound(spec, mulberry32(seed)).items.map((i) => i.id).sort().join()));
    assert.ok(targetSets.size > 1, "training targets vary");
  });

  it("charges a wrong-pick time penalty on hard only, and in solo only from level 11", () => {
    const solo = (level: number) => getRoundSpec({ mode: "level", difficulty: "medium", level }).rules.wrongPenaltyMs;
    assert.equal(solo(10), 0);
    assert.equal(solo(11), 3_000);
    assert.equal(getRoundSpec({ mode: "daily", difficulty: "medium", level: 1 }).rules.wrongPenaltyMs, 0);
    assert.equal(getRoundSpec({ mode: "training", difficulty: "medium", level: 1 }).rules.wrongPenaltyMs, 0);
    assert.equal(duel("easy", 20).rules.wrongPenaltyMs, 0);
    assert.equal(duel("medium", 20).rules.wrongPenaltyMs, 0);
    assert.equal(duel("hard", 1).rules.wrongPenaltyMs, 4_000);
  });
});

describe("generateRound", () => {
  it("is deterministic for a seed", () => {
    const spec = duel("hard", 9);
    const seed = hash("room:items:9:0");
    const a = generateRound(spec, mulberry32(seed));
    const b = generateRound(spec, mulberry32(seed));
    assert.deepEqual(a.items.map((i) => i.id), b.items.map((i) => i.id));
    assert.deepEqual(a.choices.map((i) => i.id), b.choices.map((i) => i.id));
  });

  it("builds valid tables for every difficulty, level and seed", () => {
    for (const difficulty of DIFFICULTY_LEVELS) {
      for (const level of LEVELS) {
        const spec = duel(difficulty, level);
        for (const seed of SEEDS) {
          const { items, choices } = generateRound(spec, mulberry32(seed * 1000 + level));
          const choiceIds = new Set(choices.map((c) => c.id));
          assert.equal(items.length, spec.itemCount);
          assert.equal(choices.length, spec.choiceCount);
          assert.equal(new Set(items.map((i) => i.id)).size, items.length, "duplicate target");
          assert.equal(choiceIds.size, choices.length, "duplicate choice");
          assert.ok(items.every((i) => choiceIds.has(i.id)), "target missing from choices");
          assert.ok(choices.every((c) => ITEMS_BY_ID.has(c.id)));
        }
      }
    }
  });

  it("themed rounds draw targets from at most two categories", () => {
    for (const difficulty of DIFFICULTY_LEVELS) {
      const spec = duel(difficulty, 6);
      assert.ok(spec.modifiers.includes("themed"));
      for (const seed of SEEDS) {
        const { items } = generateRound(spec, mulberry32(seed));
        assert.ok(new Set(items.map((i) => i.category)).size <= 2);
      }
    }
  });

  it("hard rounds use more lookalike decoys than easy ones", () => {
    const avg = (spec: RoundSpec) => SEEDS.reduce((sum, seed) => sum + lookalikeShare(spec, seed), 0) / SEEDS.length;
    assert.ok(avg(duel("hard", 4)) > avg(duel("easy", 1)));
  });
});

describe("rules from the spec", () => {
  it("scoreRecall honours custom lives, penalty and combo window", () => {
    const rules = { lives: 2, wrongPenaltyMs: 5_000, comboWindowMs: 1_000 };
    const picks = [
      { correct: true, at: 1_000 },
      { correct: true, at: 1_500 },
      { correct: false, at: 2_000 },
      { correct: false, at: 2_500 },
      { correct: true, at: 3_000 },
    ];
    const score = scoreRecall(picks, 5, 20_000, rules);
    assert.equal(score.correct, 2);
    assert.equal(score.wrong, 2);
    assert.equal(score.deadlineMs, 10_000);
    assert.equal(score.points, 100 + 120);
  });

  it("bot plans follow the spec's bot skill", () => {
    for (const difficulty of DIFFICULTY_LEVELS) {
      for (const level of LEVELS) {
        const spec = duel(difficulty, level);
        const plan = makeBotPlan(spec, mulberry32(level));
        assert.ok(plan.correct >= 1 && plan.correct < spec.itemCount);
        assert.ok(plan.finishMs >= spec.recallMs * spec.bot.minFinish - 1);
        assert.ok(plan.finishMs <= spec.recallMs * spec.bot.maxFinish + 1);
      }
    }
  });
});
