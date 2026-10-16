import { BLOCK_SIZE, INITIAL_ADAPTIVE, SKIP_AHEAD_PERFECT_RUN, shouldSkipAhead, skipTargetLevel, type AdaptiveState } from "./levelConfig";
import { useMemo, useSyncExternalStore } from "react";
import { activeProfileId, scopedKey, subscribeProfiles } from "./profile";
import type { MemoryCheck, SkillLog } from "./skillProgress";

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
  adaptive: AdaptiveState;
  skills: SkillLog;
  checks: MemoryCheck[];
}

export const DEFAULT_LEVEL_PROGRESS: LevelProgress = { block: 0, run: 0, broken: false, introsSeen: [], adaptive: INITIAL_ADAPTIVE, skills: {}, checks: [] };

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

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(scopedKey(KEY, activeProfileId()));
  } catch {
    return null;
  }
}

function parse(raw: string | null): LevelProgress {
  if (!raw) return DEFAULT_LEVEL_PROGRESS;
  try {
    return { ...DEFAULT_LEVEL_PROGRESS, ...(JSON.parse(raw) as Partial<LevelProgress>) };
  } catch {
    return DEFAULT_LEVEL_PROGRESS;
  }
}

export function loadLevelProgress(): LevelProgress {
  return parse(readRaw());
}

export function saveLevelProgress(state: LevelProgress) {
  try {
    window.localStorage.setItem(scopedKey(KEY, activeProfileId()), JSON.stringify(state));
  } catch {
    // storage unavailable: progress lasts for this session only
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  const unsubscribeProfiles = subscribeProfiles(listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    unsubscribeProfiles();
  };
}

/** The active profile's level progress, or null on the server and during hydration. */
export function useLevelProgress(): LevelProgress | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw() ?? "", () => null);
  return useMemo(() => (raw === null ? null : parse(raw || null)), [raw]);
}
