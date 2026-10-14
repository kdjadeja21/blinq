import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVATARS } from "./avatars";
import { MAX_PLAYERS_BY_MODE, maxPlayersFor } from "./config";
import { layoutFor } from "./layout";
import { cumulativeStandings, duelScores, levelStandings, type BoardPlayer, type RoundScore } from "./leaderboard";

const KEYS = Array.from({ length: 12 }, (_, i) => `item-${i}`);

describe("layoutFor", () => {
  it("is stable for the same player and round", () => {
    assert.deepEqual(layoutFor("r1", "p1", "board", KEYS), layoutFor("r1", "p1", "board", KEYS));
  });

  it("keeps the same items for every player", () => {
    for (const player of ["p1", "p2", "p3"]) {
      assert.deepEqual([...layoutFor("r1", player, "board", KEYS)].sort(), [...KEYS].sort());
    }
  });

  it("places tiles differently for different players", () => {
    const orders = new Set(Array.from({ length: 10 }, (_, i) => layoutFor("r1", `p${i}`, "board", KEYS).join()));
    assert.ok(orders.size >= 9);
  });

  it("uses separate orders for the board and the choices", () => {
    assert.notDeepEqual(layoutFor("r1", "p1", "board", KEYS), layoutFor("r1", "p1", "choices", KEYS));
  });
});

describe("player caps", () => {
  it("allows 21 players in individual mode and 12 in team mode", () => {
    assert.equal(maxPlayersFor("individual"), 21);
    assert.equal(MAX_PLAYERS_BY_MODE.team, 12);
  });

  it("has an avatar for every seat", () => {
    assert.ok(AVATARS.length > maxPlayersFor("individual"));
  });
});

const players: BoardPlayer[] = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cy" },
];

function score(playerId: string, level: number, points: number, correct = 3, finishedMs: number | null = 1000): RoundScore {
  return { playerId, level, points, correct, finishedMs };
}

describe("levelStandings", () => {
  it("ranks by points, then correct, then time", () => {
    const rows = levelStandings(
      players,
      [score("a", 1, 100, 3, 5000), score("b", 1, 100, 4, 9000), score("c", 1, 300)],
      1,
    );
    assert.deepEqual(rows.map((r) => r.playerId), ["c", "b", "a"]);
    assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3]);
    assert.equal(rows[0].delta, null);
  });

  it("shares a rank on a full tie and skips the next one", () => {
    const rows = levelStandings(players, [score("a", 1, 200), score("b", 1, 200), score("c", 1, 100)], 1);
    assert.deepEqual(rows.map((r) => r.rank), [1, 1, 3]);
  });

  it("ranks players with no result last", () => {
    const rows = levelStandings(players, [score("a", 1, 50)], 1);
    assert.equal(rows[0].playerId, "a");
    assert.equal(rows[2].points, 0);
  });
});

describe("cumulativeStandings", () => {
  const scores = [
    score("a", 1, 300), score("b", 1, 200), score("c", 1, 100),
    score("a", 2, 0, 0, null), score("b", 2, 100), score("c", 2, 400),
  ];

  it("sums points across levels", () => {
    const rows = cumulativeStandings(players, scores, 2);
    assert.deepEqual(rows.map((r) => [r.playerId, r.points]), [["c", 500], ["b", 300], ["a", 300]]);
  });

  it("reports rank changes versus the previous level", () => {
    const rows = cumulativeStandings(players, scores, 2);
    const delta = Object.fromEntries(rows.map((r) => [r.playerId, r.delta]));
    assert.equal(delta.c, 2);
    assert.equal(delta.a, -2);
  });

  it("has no deltas on level 1 and reports level points", () => {
    const rows = cumulativeStandings(players, scores, 1);
    assert.ok(rows.every((r) => r.delta === null));
    assert.equal(rows[0].levelPoints, 300);
  });

  it("counts an unfinished level as the maximum time, never as a head start", () => {
    const rows = cumulativeStandings(players, [score("a", 1, 100, 2, null), score("b", 1, 100, 2, 4000)], 1);
    assert.equal(rows[0].playerId, "b");
  });
});

describe("duelScores", () => {
  it("maps duel results to per-level scores and feeds the standings", () => {
    const duels = [
      { id: "d1", level: 1 },
      { id: "d2", level: 1 },
      { id: "d3", level: 2 },
    ];
    const result = (duel_id: string, player_id: string, points: number, correct_count: number) => ({
      duel_id,
      player_id,
      points,
      correct_count,
      finished_ms: 1000,
    });
    const scores = duelScores(duels, [
      result("d1", "a", 100, 5),
      result("d1", "bot", 80, 4),
      result("d2", "b", 60, 3),
      result("d3", "a", 10, 1),
      result("d3", "b", 90, 5),
      result("missing", "a", 999, 9),
    ]);
    assert.equal(scores.length, 5);
    const board = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "bot", name: "Botty" }];
    const overall = cumulativeStandings(board, scores, 2);
    assert.deepEqual(overall.map((r) => [r.name, r.points, r.rank]), [["B", 150, 1], ["A", 110, 2], ["Botty", 80, 3]]);
    assert.equal(overall.find((r) => r.name === "B")?.delta, 2);
  });
});
