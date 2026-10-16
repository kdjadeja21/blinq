import { BLOCK_SIZE, SKIP_AHEAD_PERFECT_RUN, shouldSkipAhead, skipTargetLevel } from "./levelConfig";

const KEY = "blinq:levels:v1";
/** Skip-ahead is judged on the first levels of a block. */
const JUDGED_LEVELS = SKIP_AHEAD_PERFECT_RUN;

export interface LevelProgress {
  /** block the perfect run belongs to */
  block: number;
  /** consecutive perfect levels from the start of the block */
  run: number;
  /** a non-perfect early level ends the run for this block */
  broken: boolean;
  /** blocks whose guided intro was already played */
  introsSeen: number[];
}

export const DEFAULT_LEVEL_PROGRESS: LevelProgress = { block: 0, run: 0, broken: false, introsSeen: [] };

export interface LevelOutcome {
  state: LevelProgress;
  /** level to offer a skip to, or null */
  skipTo: number | null;
}

/** Records a finished level. Offers a skip once the first three levels of a block were all perfect. */
export function recordLevelResult(state: LevelProgress, level: number, perfect: boolean): LevelOutcome {
  const block = Math.floor((level - 1) / BLOCK_SIZE);
  const pos = (level - 1) % BLOCK_SIZE;
  if (pos >= JUDGED_LEVELS) return { state, skipTo: null };

  const base: LevelProgress = state.block === block ? state : { ...state, block, run: 0, broken: false };
  if (!perfect || base.broken || pos !== base.run) {
    return { state: { ...base, broken: true }, skipTo: null };
  }
  const next = { ...base, run: base.run + 1 };
  return { state: next, skipTo: shouldSkipAhead(next.run) ? skipTargetLevel(level) : null };
}

export function hasSeenIntro(state: LevelProgress, block: number): boolean {
  return block === 0 || state.introsSeen.includes(block);
}

export function markIntroSeen(state: LevelProgress, block: number): LevelProgress {
  return state.introsSeen.includes(block) ? state : { ...state, introsSeen: [...state.introsSeen, block] };
}

export function loadLevelProgress(): LevelProgress {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_LEVEL_PROGRESS, ...(JSON.parse(raw) as Partial<LevelProgress>) } : DEFAULT_LEVEL_PROGRESS;
  } catch {
    return DEFAULT_LEVEL_PROGRESS;
  }
}

export function saveLevelProgress(state: LevelProgress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: the offer just will not appear
  }
}
