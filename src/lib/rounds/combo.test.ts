import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateRound, getComboStageSpecs, getRoundSpec, type RoundSpec } from "@/lib/engine";
import { roundReducer, type Round, type Stage } from "@/lib/game";
import { getComboStageTypes, getLevelConfig } from "@/lib/levelConfig";
import { mulberry32 } from "@/lib/rng";

const buildStages = (specs: RoundSpec[]): Stage[] => specs.map((spec, i) => ({ spec, ...generateRound(spec, mulberry32(i + 1)) }));

function startBoss(level: number): Round {
  const stages = buildStages(getComboStageSpecs("medium", level));
  const round = roundReducer(null, {
    type: "start",
    mode: "level",
    spec: stages[0].spec,
    items: stages[0].items,
    choices: stages[0].choices,
    stages,
    level,
    now: 0,
    key: 1,
  });
  assert.ok(round);
  return { ...round, phase: "recall", phaseEndsAt: 100_000, recallEndsAt: 100_000 };
}

describe("combo stage types", () => {
  it("chain item recall with the block skill", () => {
    assert.deepEqual(getComboStageTypes(10), ["item", "item"]);
    assert.deepEqual(getComboStageTypes(20), ["item", "position"]);
    assert.deepEqual(getComboStageTypes(30), ["item", "order"]);
    assert.deepEqual(getComboStageTypes(40), ["item", "change"]);
    assert.deepEqual(getComboStageTypes(50), ["item", "delayed"]);
    assert.deepEqual(getComboStageTypes(60), ["item", "position"]);
    assert.deepEqual(getComboStageTypes(70), ["item", "order"]);
  });
});

describe("getComboStageSpecs", () => {
  it("splits the boss items into two playable stages that fit the grid", () => {
    for (const level of [10, 20, 30, 40, 50, 60]) {
      const config = getLevelConfig(level, "medium");
      const specs = getComboStageSpecs("medium", level);
      assert.equal(specs.length, 2);
      assert.equal(specs[0].roundType, "item");
      assert.ok(specs.every((spec) => spec.itemCount >= 3 && spec.choiceCount <= 24));
      assert.equal(specs[0].itemCount + specs[1].itemCount, config.items);
    }
    assert.equal(getComboStageSpecs("medium", 40)[1].roundType, "change");
  });

  it("the single-round spec for a boss level still reports the total items", () => {
    assert.equal(getRoundSpec({ mode: "level", difficulty: "medium", level: 20 }).itemCount, getLevelConfig(20).items);
  });
});

describe("boss round", () => {
  it("moves to stage 2 after stage 1 and combines both results", () => {
    let round = startBoss(20);
    assert.equal(round.stage.count, 2);
    const stageOneItems = round.items.length;
    let now = 1000;
    for (const item of round.items) round = roundReducer(round, { type: "pick", id: item.id, now: (now += 200) })!;
    round = roundReducer(round, { type: "finish", key: round.key, now: 50_000 })!;
    assert.equal(round.phase, "memorize");
    assert.equal(round.stage.index, 1);
    assert.equal(round.spec.roundType, "position");
    assert.equal(round.result, null);
    assert.equal(round.recalled.length, 0);

    round = { ...round, phase: "recall", phaseEndsAt: 100_000, recallEndsAt: 100_000 };
    for (const item of round.items) {
      round = roundReducer(round, { type: "place", id: item.id, slot: round.layout!.slots[item.id], now: (now += 200) })!;
    }
    round = roundReducer(round, { type: "finish", key: round.key, now: 50_000 })!;
    assert.equal(round.phase, "result");
    assert.equal(round.result?.total, stageOneItems + round.items.length);
    assert.equal(round.result?.correct, round.result?.total);
    assert.equal(round.result?.perfect, true);
  });

  it("running out of lives ends the whole boss and counts the unplayed stage as missed", () => {
    let round = startBoss(20);
    const wrongId = "not-an-item";
    for (let i = 0; i < round.spec.rules.lives; i++) {
      round = roundReducer(round, { type: "pick", id: `${wrongId}${i}`, now: 1000 + i })!;
    }
    round = roundReducer(round, { type: "finish", key: round.key, now: 50_000 })!;
    assert.equal(round.phase, "result");
    const specs = getComboStageSpecs("medium", 20);
    assert.equal(round.result?.total, specs[0].itemCount + specs[1].itemCount);
    assert.equal(round.result?.correct, 0);
  });

  it("a retry restarts both stages", () => {
    const round = startBoss(20);
    const stages = buildStages(round.stageSpecs);
    const retried = roundReducer(round, { type: "retry", now: 5, key: 2, stages })!;
    assert.equal(retried.stage.index, 0);
    assert.equal(retried.upcoming.length, 1);
    assert.equal(retried.attempt, 2);
  });
});
