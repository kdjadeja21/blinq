import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOCK_SIZE,
  GRID_CAP,
  INITIAL_ADAPTIVE,
  getLevelConfig,
  shouldSkipAhead,
  updateAdaptive,
  type AdaptiveState,
  type Difficulty,
} from "./levelConfig";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LEVELS = Array.from({ length: 120 }, (_, i) => i + 1);
const OFFSETS = [-2, -1, 0, 1, 2];

describe("getLevelConfig", () => {
  it("level 1 is the item intro", () => {
    const c = getLevelConfig(1);
    assert.equal(c.block, 0);
    assert.equal(c.roundType, "item");
    assert.equal(c.items, 4);
    assert.equal(c.gridTiles, 10);
    assert.equal(c.showTimeMs, 8_000);
    assert.equal(c.recallTimeMs, 7_600);
    assert.equal(c.isIntro, true);
    assert.equal(c.isBoss, false);
    assert.ok(c.strategyTip);
  });

  it("level 10 is the item boss, a combo capped at 14 items", () => {
    const c = getLevelConfig(10);
    assert.equal(c.block, 0);
    assert.equal(c.roundType, "combo");
    assert.equal(c.items, 14);
    assert.equal(c.gridTiles, 24);
    assert.equal(c.isBoss, true);
    assert.equal(c.isIntro, false);
  });

  it("level 11 restarts with a soft landing in the position block", () => {
    const c = getLevelConfig(11);
    assert.equal(c.block, 1);
    assert.equal(c.roundType, "position");
    assert.equal(c.items, 4);
    assert.equal(c.gridTiles, 10);
    assert.equal(c.isIntro, true);
    assert.equal(c.showTimeMs, Math.round(4 * 1600 * 1.25));
    assert.equal(c.recallTimeMs, Math.round((4000 + 4 * 900) * 1.25));
  });

  it("level 20 is the position boss", () => {
    const c = getLevelConfig(20);
    assert.equal(c.block, 1);
    assert.equal(c.roundType, "combo");
    assert.equal(c.items, 12);
    assert.equal(c.isBoss, true);
  });

  it("level 21 starts the order block", () => {
    const c = getLevelConfig(21);
    assert.equal(c.block, 2);
    assert.equal(c.roundType, "order");
    assert.equal(c.items, 4);
  });

  it("level 50 is the delayed block boss, and later blocks are combo", () => {
    const c = getLevelConfig(50);
    assert.equal(c.block, 4);
    assert.equal(c.roundType, "combo");
    assert.equal(c.isBoss, true);
    assert.equal(getLevelConfig(51).roundType, "combo");
    assert.equal(getLevelConfig(51).block, 5);
  });

  it("block 0 never reviews and reviews appear in later blocks", () => {
    for (let level = 1; level < BLOCK_SIZE; level++) {
      assert.equal(getLevelConfig(level).roundType, "item");
    }
    const types = Array.from({ length: BLOCK_SIZE }, (_, i) => getLevelConfig(31 + i).roundType);
    assert.equal(types[0], "change");
    assert.equal(types[9], "combo");
    assert.notEqual(types[3], "change");
    assert.notEqual(types[7], "change");
    assert.equal(types[1], "change");
  });

  it("distractors never decrease within a block", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const offset of OFFSETS) {
        for (let block = 0; block < 12; block++) {
          let previous = 0;
          for (let pos = 0; pos < BLOCK_SIZE; pos++) {
            const c = getLevelConfig(block * BLOCK_SIZE + pos + 1, difficulty, offset);
            const distractors = c.gridTiles - c.items;
            assert.ok(distractors >= previous, `${difficulty} offset ${offset} level ${c.level}`);
            previous = distractors;
          }
        }
      }
    }
  });

  it("keeps the grid within the cap and every value in range", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const offset of OFFSETS) {
        for (const level of LEVELS) {
          const c = getLevelConfig(level, difficulty, offset);
          assert.ok(c.gridTiles <= GRID_CAP);
          assert.ok(c.items >= 3);
          assert.ok(c.gridTiles - c.items >= 6);
          assert.ok(c.lookAlikeShare >= 0 && c.lookAlikeShare <= 0.8);
          assert.ok(c.showTimeMs > 0 && c.recallTimeMs > 0);
        }
      }
    }
  });

  it("flags exactly one intro and one boss per block", () => {
    for (let block = 0; block < 8; block++) {
      const configs = Array.from({ length: BLOCK_SIZE }, (_, i) => getLevelConfig(block * BLOCK_SIZE + i + 1));
      assert.deepEqual(configs.map((c) => c.isIntro), configs.map((_, i) => i === 0));
      assert.deepEqual(configs.map((c) => c.isBoss), configs.map((_, i) => i === BLOCK_SIZE - 1));
      assert.ok(configs.filter((c) => c.isBoss).every((c) => c.roundType === "combo"));
      assert.ok(configs.filter((c) => c.strategyTip).length === 1);
    }
  });

  it("applies difficulty presets and clamps the adaptive offset", () => {
    const easy = getLevelConfig(2, "easy");
    const medium = getLevelConfig(2, "medium");
    const hard = getLevelConfig(2, "hard");
    assert.equal(medium.items - easy.items, 2);
    assert.equal(hard.items - medium.items, 2);
    const perItem = (c: typeof easy) => c.showTimeMs / c.items;
    assert.ok(perItem(easy) > perItem(medium) && perItem(medium) > perItem(hard));
    assert.ok(easy.lookAlikeShare < medium.lookAlikeShare && medium.lookAlikeShare < hard.lookAlikeShare);
    assert.deepEqual(getLevelConfig(2, "medium", 9), getLevelConfig(2, "medium", 2));
    assert.deepEqual(getLevelConfig(2, "medium", -9), getLevelConfig(2, "medium", -2));
  });

  it("treats invalid levels as level 1", () => {
    assert.deepEqual(getLevelConfig(0), getLevelConfig(1));
    assert.deepEqual(getLevelConfig(Number.NaN), getLevelConfig(1));
  });

  it("is deterministic", () => {
    for (const level of LEVELS) {
      assert.deepEqual(getLevelConfig(level, "hard", 1), getLevelConfig(level, "hard", 1));
    }
  });
});

describe("updateAdaptive", () => {
  const run = (results: boolean[], start: AdaptiveState = INITIAL_ADAPTIVE) =>
    results.reduce(updateAdaptive, start);

  it("two wins raise the offset and reset streaks", () => {
    assert.deepEqual(run([true, true]), { winStreak: 0, lossStreak: 0, offset: 1 });
  });

  it("two losses lower the offset", () => {
    assert.deepEqual(run([false, false]), { winStreak: 0, lossStreak: 0, offset: -1 });
  });

  it("alternating results never change the offset", () => {
    assert.equal(run([true, false, true, false, true, false]).offset, 0);
  });

  it("clamps to -2..+2", () => {
    assert.equal(run(Array(20).fill(true)).offset, 2);
    assert.equal(run(Array(20).fill(false)).offset, -2);
  });
});

describe("shouldSkipAhead", () => {
  it("is true from three perfect levels", () => {
    assert.equal(shouldSkipAhead(2), false);
    assert.equal(shouldSkipAhead(3), true);
    assert.equal(shouldSkipAhead(5), true);
  });
});
