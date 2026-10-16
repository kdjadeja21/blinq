import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateRound, getRoundSpec } from "@/lib/engine";
import { roundReducer, type Round } from "@/lib/game";
import { mulberry32 } from "@/lib/rng";

function startRound(mode: "level" | "training" = "level"): Round {
  const spec = getRoundSpec({ mode, difficulty: "medium", level: 1 });
  const { items, choices } = generateRound(spec, mulberry32(7));
  const started = roundReducer(null, { type: "start", mode, spec, items, choices, level: 1, now: 0, key: 4 });
  assert.ok(started);
  return { ...started, phase: "recall", phaseEndsAt: 100_000, recallEndsAt: 100_000 };
}

function pickAll(round: Round, skip = 0): Round {
  let now = 1000;
  for (const item of round.items.slice(0, round.items.length - skip)) {
    round = roundReducer(round, { type: "pick", id: item.id, now: (now += 200) })!;
  }
  return round;
}

describe("round end", () => {
  it("keeps the board up after the last correct tap and finishes only on finish", () => {
    const round = pickAll(startRound());
    assert.equal(round.phase, "recall");
    assert.equal(round.recalled.length, round.items.length);
    assert.deepEqual(round.ending?.early, true);
    const done = roundReducer(round, { type: "finish", key: round.key, now: 60_000 })!;
    assert.equal(done.phase, "result");
    assert.equal(done.result?.perfect, true);
  });

  it("scores the same as the tap time, not the time finish arrives", () => {
    const round = pickAll(startRound());
    const late = roundReducer(round, { type: "finish", key: round.key, now: 90_000 })!;
    const soon = roundReducer(round, { type: "finish", key: round.key, now: 1_000_000 })!;
    assert.equal(late.result?.score, soon.result?.score);
  });

  it("ignores taps, submit and ticks while ending, and a second end is a no-op", () => {
    const round = pickAll(startRound(), 1);
    const last = round.items[round.items.length - 1];
    const ending = roundReducer(round, { type: "pick", id: last.id, now: 5000 })!;
    assert.ok(ending.ending);
    assert.equal(roundReducer(ending, { type: "pick", id: "not-an-item", now: 5100 }), ending);
    assert.equal(roundReducer(ending, { type: "submit", now: 5200 }), ending);
    assert.equal(roundReducer(ending, { type: "tick", now: 200_000 }), ending);
  });

  it("ignores a finish for another round", () => {
    const round = pickAll(startRound());
    assert.equal(roundReducer(round, { type: "finish", key: round.key + 1, now: 60_000 }), round);
  });

  it("wrong last tap (out of lives) shows the miss before ending", () => {
    let round = startRound();
    for (let i = 0; i < round.spec.rules.lives; i++) {
      round = roundReducer(round, { type: "pick", id: `nope${i}`, now: 1000 + i })!;
    }
    assert.equal(round.phase, "recall");
    assert.equal(round.wrong.length, round.spec.rules.lives);
    assert.equal(round.ending?.early, false);
  });

  it("timer expiry ends the round once and keeps the board for finish", () => {
    const round = startRound();
    const expired = roundReducer(round, { type: "tick", now: 100_000 })!;
    assert.equal(expired.phase, "recall");
    assert.ok(expired.ending);
    assert.equal(roundReducer(expired, { type: "tick", now: 100_100 }), expired);
    assert.equal(roundReducer(expired, { type: "finish", key: expired.key, now: 100_700 })?.phase, "result");
  });
});
