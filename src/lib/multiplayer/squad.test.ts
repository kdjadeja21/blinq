import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allDuelsResolved, duelProgress, duelRefusesPicks, myDuel, writesLiveProgress } from "./squad";

const duel = (level: number, a: string, b: string, resolved = false) => ({ level, player_a: a, player_b: b, resolved });
const DUELS = [duel(1, "a1", "b1", true), duel(1, "a2", "b2"), duel(2, "a1", "b2")];

describe("myDuel", () => {
  it("finds the duel of a player in the given level", () => {
    assert.equal(myDuel(DUELS, 1, "b2"), DUELS[1]);
    assert.equal(myDuel(DUELS, 2, "b2"), DUELS[2]);
  });

  it("returns undefined for unknown players and levels", () => {
    assert.equal(myDuel(DUELS, 1, "zz"), undefined);
    assert.equal(myDuel(DUELS, 3, "a1"), undefined);
    assert.equal(myDuel(DUELS, 1, null), undefined);
  });
});

describe("duel progress", () => {
  it("counts resolved duels of the level", () => {
    assert.deepEqual(duelProgress(DUELS, 1), { done: 1, total: 2 });
    assert.deepEqual(duelProgress(DUELS, 3), { done: 0, total: 0 });
  });

  it("is complete only when every duel of the level is resolved", () => {
    assert.equal(allDuelsResolved(DUELS, 1), false);
    assert.equal(allDuelsResolved([duel(1, "a", "b", true), duel(1, "c", "d", true)], 1), true);
    assert.equal(allDuelsResolved(DUELS, 3), false);
  });
});

describe("squad guards", () => {
  it("skips per-pick progress writes in squad but keeps the done row", () => {
    assert.equal(writesLiveProgress(true, false), false);
    assert.equal(writesLiveProgress(true, true), true);
    assert.equal(writesLiveProgress(false, false), true);
    assert.equal(writesLiveProgress(false, true), true);
  });

  it("refuses late picks on a resolved squad duel only", () => {
    assert.equal(duelRefusesPicks(true, { resolved: true }), true);
    assert.equal(duelRefusesPicks(true, { resolved: false }), false);
    assert.equal(duelRefusesPicks(false, { resolved: true }), false);
  });
});
