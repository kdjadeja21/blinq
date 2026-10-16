/**
 * Blinq level config: 10-level skill blocks, adaptive difficulty, review mix.
 * Pure and deterministic. Every level number lives in this file.
 */

export type RoundType = "item" | "position" | "order" | "change" | "delayed" | "combo";

export type Difficulty = "easy" | "medium" | "hard";

export interface LevelConfig {
  level: number;
  /** 0-based block index */
  block: number;
  roundType: RoundType;
  /** items on the table */
  items: number;
  /** recall grid size (items + distractors) */
  gridTiles: number;
  /** time the table is visible */
  showTimeMs: number;
  recallTimeMs: number;
  /** 0..1 share of distractors that look like real items */
  lookAlikeShare: number;
  /** first level of a block: guided training round and strategy tip */
  isIntro: boolean;
  /** last level of a block: graduation round, always "combo" */
  isBoss: boolean;
  strategyTip?: string;
}

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  item: "Item Recall",
  position: "Position Recall",
  order: "Order Recall",
  change: "Spot the Change",
  delayed: "Delayed Recall",
  combo: "Combo",
};

export interface AdaptiveState {
  winStreak: number;
  lossStreak: number;
  /** -2..+2, each step is 2 items */
  offset: number;
}

export const BLOCK_SIZE = 10;
/** 4 columns x 6 rows, fits a 360px-wide phone without scrolling. */
export const GRID_CAP = 24;
export const MIN_ITEMS = 3;
export const ITEMS_PER_LEVEL = 2;
/** The item block ramps gently so beginners reach the cap near level 10. */
export const FIRST_BLOCK_ITEMS_PER_LEVEL = 1;
export const ITEMS_PER_ADAPTIVE_STEP = 2;
export const MIN_DISTRACTORS = 6;
export const MAX_DISTRACTORS = 10;

export const SHOW_BASE_PER_ITEM_MS = 2000;
export const SHOW_DECAY_PER_LEVEL_MS = 40;
export const SHOW_MIN_PER_ITEM_MS = 900;
export const RECALL_BASE_MS = 4000;
export const RECALL_PER_ITEM_MS = 900;
/** Extra time on the first levels of every block after the first. */
export const NEW_SKILL_LEVELS = 3;
export const NEW_SKILL_TIME_FACTOR = 1.25;

export const LOOKALIKE_BASE = 0.2;
export const LOOKALIKE_PER_POS = 0.05;
export const LOOKALIKE_PER_BLOCK = 0.05;
export const LOOKALIKE_MAX = 0.8;

/** Levels at this position in a block (pos % REVIEW_EVERY === REVIEW_EVERY - 1) review an earlier skill. */
export const REVIEW_EVERY = 4;

export const ADAPTIVE_MAX_OFFSET = 2;
export const ADAPTIVE_STREAK = 2;
export const SKIP_AHEAD_PERFECT_RUN = 3;
/** Levels jumped over when a player accepts the skip-ahead offer. */
export const SKIP_AHEAD_LEVELS = 3;

interface BlockDef {
  type: RoundType;
  startItems: number;
  /** items added per level inside the block */
  perLevel: number;
  itemCap: number;
  tip: string;
}

/** One skill per block. Past the last entry the game loops through "combo". */
const BLOCKS: readonly BlockDef[] = [
  { type: "item", startItems: 4, perLevel: FIRST_BLOCK_ITEMS_PER_LEVEL, itemCap: 14, tip: "Group items by category (fruits, tools) to remember more." },
  { type: "position", startItems: 4, perLevel: ITEMS_PER_LEVEL, itemCap: 12, tip: "Picture the table as a room and place each item in a spot." },
  { type: "order", startItems: 4, perLevel: ITEMS_PER_LEVEL, itemCap: 12, tip: "Link items into a silly story, in order." },
  { type: "change", startItems: 5, perLevel: ITEMS_PER_LEVEL, itemCap: 14, tip: "Scan in zones, left to right, so nothing escapes you." },
  { type: "delayed", startItems: 4, perLevel: ITEMS_PER_LEVEL, itemCap: 12, tip: "Repeat a vivid mental image to keep it alive during the pause." },
];

const COMBO_BLOCK: BlockDef = {
  type: "combo",
  startItems: 4,
  perLevel: ITEMS_PER_LEVEL,
  itemCap: 12,
  tip: "Mix everything you learned: group, place and link.",
};

const DIFFICULTY_PRESETS: Record<Difficulty, { time: number; lookAlike: number; itemDelta: number }> = {
  easy: { time: 1.3, lookAlike: 0.7, itemDelta: -2 },
  medium: { time: 1, lookAlike: 1, itemDelta: 0 },
  hard: { time: 0.8, lookAlike: 1.15, itemDelta: 2 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function blockDef(blockIndex: number): BlockDef {
  return BLOCKS[blockIndex] ?? COMBO_BLOCK;
}

function normalizeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

function pickRoundType(level: number, blockIndex: number, pos: number): RoundType {
  if (pos === BLOCK_SIZE - 1) return "combo";
  const main = blockDef(blockIndex).type;
  if (pos === 0 || blockIndex === 0) return main;
  if (pos % REVIEW_EVERY === REVIEW_EVERY - 1) {
    const earlier = BLOCKS.slice(0, Math.min(blockIndex, BLOCKS.length));
    return earlier[level % earlier.length].type;
  }
  return main;
}

/** Items plus distractors, never above the grid cap. */
export function gridTilesFor(items: number): number {
  return Math.min(items + clamp(items, MIN_DISTRACTORS, MAX_DISTRACTORS), GRID_CAP);
}

function timingFor(level: number, items: number, diffTime: number, blockIndex: number, pos: number) {
  const timeFactor = diffTime * (blockIndex > 0 && pos < NEW_SKILL_LEVELS ? NEW_SKILL_TIME_FACTOR : 1);
  const perItemMs = Math.max(SHOW_MIN_PER_ITEM_MS, SHOW_BASE_PER_ITEM_MS - SHOW_DECAY_PER_LEVEL_MS * (level - 1));
  return {
    showTimeMs: Math.round(items * perItemMs * timeFactor),
    recallTimeMs: Math.round((RECALL_BASE_MS + items * RECALL_PER_ITEM_MS) * timeFactor),
  };
}

/** Show and recall time for a different item count at the same level, used by the stages of a boss round. */
export function getStageTiming(level: number, difficulty: Difficulty, items: number) {
  const lvl = normalizeLevel(level);
  return timingFor(lvl, items, DIFFICULTY_PRESETS[difficulty].time, Math.floor((lvl - 1) / BLOCK_SIZE), (lvl - 1) % BLOCK_SIZE);
}

const COMBO_SKILLS: readonly RoundType[] = ["position", "order", "change", "delayed"];

/**
 * The stages of a boss round: item recall first, then the block's own skill.
 * The item block chains item recall with itself, later combo blocks rotate through the skills.
 */
export function getComboStageTypes(level: number): RoundType[] {
  const blockIndex = Math.floor((normalizeLevel(level) - 1) / BLOCK_SIZE);
  const skill: RoundType =
    blockIndex === 0
      ? "item"
      : (BLOCKS[blockIndex]?.type ?? COMBO_SKILLS[(blockIndex - BLOCKS.length) % COMBO_SKILLS.length]);
  return ["item", skill];
}

export function getLevelConfig(
  level: number,
  difficulty: Difficulty = "medium",
  adaptiveOffset = 0,
): LevelConfig {
  const lvl = normalizeLevel(level);
  const blockIndex = Math.floor((lvl - 1) / BLOCK_SIZE);
  const pos = (lvl - 1) % BLOCK_SIZE;
  const block = blockDef(blockIndex);
  const preset = DIFFICULTY_PRESETS[difficulty];
  const offset = clamp(Math.round(adaptiveOffset), -ADAPTIVE_MAX_OFFSET, ADAPTIVE_MAX_OFFSET);

  const rawItems =
    block.startItems + block.perLevel * pos + preset.itemDelta + offset * ITEMS_PER_ADAPTIVE_STEP;
  const items = clamp(rawItems, MIN_ITEMS, block.itemCap);

  const gridTiles = gridTilesFor(items);
  const { showTimeMs, recallTimeMs } = timingFor(lvl, items, preset.time, blockIndex, pos);

  const lookAlikeShare = Math.min(
    LOOKALIKE_MAX,
    (LOOKALIKE_BASE + LOOKALIKE_PER_POS * pos + LOOKALIKE_PER_BLOCK * blockIndex) * preset.lookAlike,
  );

  const isIntro = pos === 0;
  return {
    level: lvl,
    block: blockIndex,
    roundType: pickRoundType(lvl, blockIndex, pos),
    items,
    gridTiles,
    showTimeMs,
    recallTimeMs,
    lookAlikeShare,
    isIntro,
    isBoss: pos === BLOCK_SIZE - 1,
    strategyTip: isIntro ? block.tip : undefined,
  };
}

export const INITIAL_ADAPTIVE: AdaptiveState = { winStreak: 0, lossStreak: 0, offset: 0 };

/** Two wins in a row: +1. Two losses in a row: -1. Streaks reset after each change. */
export function updateAdaptive(state: AdaptiveState, won: boolean): AdaptiveState {
  let { winStreak, lossStreak, offset } = state;
  if (won) {
    winStreak += 1;
    lossStreak = 0;
  } else {
    lossStreak += 1;
    winStreak = 0;
  }
  if (winStreak >= ADAPTIVE_STREAK) {
    offset = clamp(offset + 1, -ADAPTIVE_MAX_OFFSET, ADAPTIVE_MAX_OFFSET);
    winStreak = 0;
  }
  if (lossStreak >= ADAPTIVE_STREAK) {
    offset = clamp(offset - 1, -ADAPTIVE_MAX_OFFSET, ADAPTIVE_MAX_OFFSET);
    lossStreak = 0;
  }
  return { winStreak, lossStreak, offset };
}

export function shouldSkipAhead(perfectRunInBlock: number): boolean {
  return perfectRunInBlock >= SKIP_AHEAD_PERFECT_RUN;
}

/** The level a skip-ahead offer jumps to from the level just cleared. Never reaches the boss. */
export function skipTargetLevel(level: number): number {
  const lvl = normalizeLevel(level);
  const blockStart = Math.floor((lvl - 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
  return Math.min(lvl + 1 + SKIP_AHEAD_LEVELS, blockStart + BLOCK_SIZE - 2);
}
