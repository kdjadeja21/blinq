import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockLeaderboard, parseMock } from "./leaderboardMock";

describe("parseMock", () => {
  it("is off without mock", () => assert.equal(parseMock({}), null));
  it("reads count and position", () => assert.deepEqual(parseMock({ mock: "20", me: "14" }), { count: 20, mePosition: 14 }));
  it("caps the count and ignores a bad position", () => assert.deepEqual(parseMock({ mock: "9999", me: "x" }), { count: 200, mePosition: null }));
});

describe("mockLeaderboard", () => {
  it("marks the viewer at the requested rank", () => {
    const data = mockLeaderboard({ count: 20, mePosition: 14 }, "2026-01-01");
    assert.equal(data.rows.length, 20);
    assert.equal(data.rows.findIndex((r) => r.isMe), 13);
    assert.equal(data.me, null);
  });
  it("puts a viewer beyond the list in me", () => {
    const data = mockLeaderboard({ count: 150, mePosition: 140 }, "2026-01-01");
    assert.equal(data.rows.length, 100);
    assert.equal(data.me?.rank, 140);
  });
});
