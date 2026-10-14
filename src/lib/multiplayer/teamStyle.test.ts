import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSquad, maxPlayersFor } from "./config";
import { resolveTeamStyle } from "./teamStyle";

describe("isSquad", () => {
  it("is true only for team rooms in squad style", () => {
    assert.equal(isSquad({ mode: "team", team_style: "squad" }), true);
    assert.equal(isSquad({ mode: "team", team_style: "duel" }), false);
    assert.equal(isSquad({ mode: "individual", team_style: "squad" }), false);
    assert.equal(isSquad({ mode: "individual", team_style: "duel" }), false);
  });

  it("keeps the 12 player cap for team rooms", () => {
    assert.equal(maxPlayersFor("team"), 12);
  });
});

describe("resolveTeamStyle", () => {
  it("defaults to squad when enabled and to duel when not", () => {
    assert.deepEqual(resolveTeamStyle(undefined, "team", true), { ok: true, style: "squad" });
    assert.deepEqual(resolveTeamStyle(undefined, "team", false), { ok: true, style: "duel" });
  });

  it("accepts both styles when enabled", () => {
    assert.deepEqual(resolveTeamStyle("duel", "team", true), { ok: true, style: "duel" });
    assert.deepEqual(resolveTeamStyle("squad", "team", true), { ok: true, style: "squad" });
  });

  it("rejects squad while disabled", () => {
    assert.equal(resolveTeamStyle("squad", "team", false).ok, false);
  });

  it("rejects unknown values", () => {
    assert.deepEqual(resolveTeamStyle("battle", "team", true), { ok: false, error: "Pick squad or duel." });
    assert.equal(resolveTeamStyle(3, "team", true).ok, false);
  });

  it("ignores the style for individual rooms", () => {
    assert.deepEqual(resolveTeamStyle("squad", "individual", true), { ok: true, style: "duel" });
    assert.deepEqual(resolveTeamStyle("nonsense", "individual", true), { ok: true, style: "duel" });
  });
});
