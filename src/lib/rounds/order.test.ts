import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateRound, getRoundSpec } from "@/lib/engine";
import { roundReducer, type Round } from "@/lib/game";
import { mulberry32 } from "@/lib/rng";
import { shownIndex } from "./order";

function startRound(): Round {
  const spec = getRoundSpec({ mode: "level", difficulty: "medium", level: 21 });
  const { items, choices, layout } = generateRound(spec, mulberry32(3));
  const started = roundReducer(null, { type: "start", mode: "level", spec, items, choices, layout, level: 21, now: 0, key: 1 });
  assert.ok(started);
  return { ...started, phase: "recall", phaseEndsAt: 100_000, recallEndsAt: 100_000 };
}

describe("order round", () => {
  it("level 21 is order recall with the sequence as items and no layout", () => {
    const round = startRound();
    assert.equal(round.spec.roundType, "order");
    assert.equal(round.layout, null);
    assert.equal(round.choices.length, round.items.length);
    assert.deepEqual([...round.choices.map((c) => c.id)].sort(), [...round.items.map((i) => i.id)].sort());
  });

  it("scores taps made in sequence order and finishes perfect", () => {
    let round = startRound();
    let now = 1000;
    for (const item of round.items) round = roundReducer(round, { type: "pick", id: item.id, now: (now += 300) })!;
    assert.equal(round.phase, "result");
    assert.equal(round.result?.perfect, true);
    assert.equal(round.wrong.length, 0);
  });

  it("an out-of-order tap costs a life and can be retried later", () => {
    let round = startRound();
    const [first, second] = round.items;
    round = roundReducer(round, { type: "pick", id: second.id, now: 1000 })!;
    assert.equal(round.lives, round.spec.rules.lives - 1);
    assert.equal(round.recalled.length, 0);
    const again = roundReducer(round, { type: "pick", id: second.id, now: 1100 })!;
    assert.equal(again.lives, round.lives);
    round = roundReducer(round, { type: "pick", id: first.id, now: 1200 })!;
    round = roundReducer(round, { type: "pick", id: second.id, now: 1300 })!;
    assert.deepEqual(round.recalled.map((r) => r.id), [first.id, second.id]);
  });
});

describe("shownIndex", () => {
  it("steps through the sequence and clamps at both ends", () => {
    assert.equal(shownIndex(4, 8000, -500), 0);
    assert.equal(shownIndex(4, 8000, 0), 0);
    assert.equal(shownIndex(4, 8000, 2000), 1);
    assert.equal(shownIndex(4, 8000, 7999), 3);
    assert.equal(shownIndex(4, 8000, 20_000), 3);
  });
});
