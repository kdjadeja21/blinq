import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateRound, getRoundSpec } from "@/lib/engine";
import { roundReducer, type Round } from "@/lib/game";
import { mulberry32 } from "@/lib/rng";
import { buildChangeTable, changeCountFor } from "./change";

function startRound(seed = 5): Round {
  const spec = getRoundSpec({ mode: "level", difficulty: "medium", level: 31 });
  const { items, choices, layout, table } = generateRound(spec, mulberry32(seed));
  const started = roundReducer(null, { type: "start", mode: "level", spec, items, choices, layout, table, level: 31, now: 0, key: 1 });
  assert.ok(started);
  return { ...started, phase: "recall", phaseEndsAt: 100_000, recallEndsAt: 100_000 };
}

describe("changeCountFor", () => {
  it("goes from 1 to 3 changes inside a block", () => {
    assert.deepEqual(Array.from({ length: 10 }, (_, i) => changeCountFor(31 + i)), [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
  });
});

describe("change table", () => {
  it("changes only the chosen slots and never repeats an item", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const spec = getRoundSpec({ mode: "level", difficulty: "hard", level: 39 });
      const { table } = generateRound(spec, mulberry32(seed));
      assert.ok(table);
      assert.equal(table.changed.length, 3);
      table.before.forEach((item, slot) => {
        if (table.changed.includes(slot)) assert.notEqual(table.after[slot]?.id, item.id);
        else assert.equal(table.after[slot]?.id, item.id);
      });
      const ids = table.after.flatMap((i) => (i ? [i.id] : []));
      assert.equal(new Set(ids).size, ids.length);
    }
  });

  it("keeps at least one tile unchanged on tiny tables", () => {
    const spec = getRoundSpec({ mode: "level", difficulty: "easy", level: 31 });
    const { table } = generateRound(spec, mulberry32(1));
    const small = buildChangeTable(table!.before.slice(0, 2), 3, 0.5, mulberry32(2));
    assert.equal(small.changed.length, 1);
  });
});

describe("change round", () => {
  it("level 31 is a change round whose answers are the changed items", () => {
    const round = startRound();
    assert.equal(round.spec.roundType, "change");
    assert.equal(round.spec.hideMs, 1500);
    assert.equal(round.items.length, round.table!.changed.length);
    assert.deepEqual(round.items.map((i) => i.id), round.table!.changed.map((s) => round.table!.before[s].id));
  });

  it("finding every change finishes the round, wrong taps cost lives", () => {
    let round = startRound();
    const { table } = round;
    const unchanged = table!.before.find((_, slot) => !table!.changed.includes(slot))!;
    round = roundReducer(round, { type: "pick", id: unchanged.id, now: 1000 })!;
    assert.equal(round.lives, round.spec.rules.lives - 1);
    let now = 1000;
    for (const slot of table!.changed) {
      round = roundReducer(round, { type: "pick", id: table!.before[slot].id, now: (now += 300) })!;
    }
    assert.equal(round.phase, "result");
    assert.equal(round.result?.total, table!.changed.length);
    assert.equal(round.result?.perfect, true);
  });
});
