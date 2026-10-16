import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateRound, getRoundSpec } from "@/lib/engine";
import { roundReducer, type Round } from "@/lib/game";
import { mulberry32 } from "@/lib/rng";
import { itemAt } from "./position";

function startRound(mode: "level" | "training" = "level"): Round {
  const spec = getRoundSpec({ mode: "level", difficulty: "medium", level: 11 });
  const { items, choices, layout } = generateRound(spec, mulberry32(7));
  const started = roundReducer(null, { type: "start", mode, spec, items, choices, layout, level: 11, now: 0, key: 1 });
  assert.ok(started);
  return { ...started, phase: "recall", phaseEndsAt: 100_000, recallEndsAt: 100_000 };
}

const wrongSlotFor = (round: Round, id: string) => {
  const layout = round.layout!;
  for (let slot = 0; slot < layout.slotCount; slot++) if (itemAt(layout, slot) === null) return slot;
  return (layout.slots[id] + 1) % layout.slotCount;
};

describe("position round", () => {
  it("scores correct placements through the shared combo scoring", () => {
    let round = startRound();
    const [first, second] = round.items;
    round = roundReducer(round, { type: "place", id: first.id, slot: round.layout!.slots[first.id], now: 1000 })!;
    round = roundReducer(round, { type: "place", id: second.id, slot: round.layout!.slots[second.id], now: 1500 })!;
    assert.deepEqual(round.recalled.map((r) => r.points), [100, 120]);
    assert.equal(round.lives, round.spec.rules.lives);
  });

  it("a wrong placement costs a life and the item can be tried again", () => {
    let round = startRound();
    const item = round.items[0];
    const slot = wrongSlotFor(round, item.id);
    round = roundReducer(round, { type: "place", id: item.id, slot, now: 1000 })!;
    assert.equal(round.lives, round.spec.rules.lives - 1);
    assert.equal(round.wrong.length, 1);
    const same = roundReducer(round, { type: "place", id: item.id, slot, now: 1100 })!;
    assert.equal(same.lives, round.lives);
    const right = roundReducer(round, { type: "place", id: item.id, slot: round.layout!.slots[item.id], now: 1200 })!;
    assert.equal(right.recalled.length, 1);
  });

  it("training placements are free", () => {
    let round = startRound("training");
    const item = round.items[0];
    round = roundReducer(round, { type: "place", id: item.id, slot: wrongSlotFor(round, item.id), now: 1000 })!;
    assert.equal(round.lives, round.spec.rules.lives);
  });

  it("finishes with a perfect result when every item is placed", () => {
    let round = startRound();
    let now = 1000;
    for (const item of round.items) {
      round = roundReducer(round, { type: "place", id: item.id, slot: round.layout!.slots[item.id], now: (now += 200) })!;
    }
    round = roundReducer(round, { type: "finish", key: round.key, now: 50_000 })!;
    assert.equal(round.phase, "result");
    assert.equal(round.result?.perfect, true);
    assert.equal(round.result?.stars, 3);
  });

  it("ignores placements outside the recall phase and picks of unknown items", () => {
    const round = startRound();
    const memorizing = { ...round, phase: "memorize" as const };
    assert.equal(roundReducer(memorizing, { type: "place", id: round.items[0].id, slot: 0, now: 1 }), memorizing);
    assert.equal(roundReducer(round, { type: "place", id: "nope", slot: 0, now: 1 }), round);
  });
});
