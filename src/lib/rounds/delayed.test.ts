import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateRound, getRoundSpec } from "@/lib/engine";
import { roundReducer, type Round } from "@/lib/game";
import { mulberry32 } from "@/lib/rng";
import { distractMsFor } from "./delayed";

function startRound(level = 41): Round {
  const spec = getRoundSpec({ mode: "level", difficulty: "medium", level });
  const { items, choices, layout, table } = generateRound(spec, mulberry32(9));
  const started = roundReducer(null, { type: "start", mode: "level", spec, items, choices, layout, table, level, now: 0, key: 1 });
  assert.ok(started);
  return started;
}

describe("distractMsFor", () => {
  it("runs from 5s to 9.5s over a block and never exceeds 10s", () => {
    assert.equal(distractMsFor(41), 5_000);
    assert.equal(distractMsFor(49), 9_000);
    assert.ok(Array.from({ length: 200 }, (_, i) => distractMsFor(i + 1)).every((ms) => ms >= 5_000 && ms <= 10_000));
  });
});

describe("delayed round", () => {
  it("level 41 is delayed recall with a distraction and normal item recall data", () => {
    const round = startRound();
    assert.equal(round.spec.roundType, "delayed");
    assert.equal(round.spec.distractMs, 5_000);
    assert.equal(round.choices.length, round.spec.choiceCount);
    assert.equal(round.layout, null);
    assert.equal(round.table, null);
  });

  it("goes memorize, hide, distract, then recall", () => {
    let round = startRound();
    const phases = [round.phase];
    let now = round.phaseEndsAt;
    let distractLength = 0;
    for (let i = 0; i < 3; i++) {
      const before = round.phaseEndsAt;
      round = roundReducer(round, { type: "tick", now })!;
      phases.push(round.phase);
      if (round.phase === "distract") distractLength = round.phaseEndsAt - before;
      now = round.phaseEndsAt;
    }
    assert.deepEqual(phases, ["memorize", "hide", "distract", "recall"]);
    assert.equal(distractLength, round.spec.distractMs);
    assert.equal(round.phaseEndsAt, round.recallEndsAt);
  });

  it("other round types skip the distraction", () => {
    const round = startRound(1);
    assert.equal(round.spec.distractMs, 0);
    let r = roundReducer(round, { type: "tick", now: round.phaseEndsAt })!;
    r = roundReducer(r, { type: "tick", now: r.phaseEndsAt })!;
    assert.equal(r.phase, "recall");
  });
});
