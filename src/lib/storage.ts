import { useMemo, useSyncExternalStore } from "react";

const KEY = "blinq:v1";

export interface DailyResult {
  date: string;
  correct: number;
  total: number;
  stars: number;
  score: number;
  recalledIds: string[];
  itemIds: string[];
}

export interface Stats {
  level: number;
  bestLevel: number;
  roundsPlayed: number;
  wins: number;
  perfectRounds: number;
  correctItems: number;
  totalItems: number;
  wrongGuesses: number;
  bestScore: number;
  streak: number;
  bestStreak: number;
  lastDailyDate: string | null;
  daily: DailyResult | null;
  trainingDone: boolean;
}

export const DEFAULT_STATS: Stats = {
  level: 1,
  bestLevel: 1,
  roundsPlayed: 0,
  wins: 0,
  perfectRounds: 0,
  correctItems: 0,
  totalItems: 0,
  wrongGuesses: 0,
  bestScore: 0,
  streak: 0,
  bestStreak: 0,
  lastDailyDate: null,
  daily: null,
  trainingDone: false,
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Stats {
  if (!raw) return DEFAULT_STATS;
  try {
    return { ...DEFAULT_STATS, ...(JSON.parse(raw) as Partial<Stats>) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStats(stats: Stats) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // storage unavailable (private mode / quota): game still works for this session
  }
  listeners.forEach((l) => l());
}

export function loadStats(): Stats {
  return parse(readRaw());
}

/** Returns null on the server and during hydration, then the persisted stats. */
export function useStats(): Stats | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw() ?? "",
    () => null,
  );
  return useMemo(() => (raw === null ? null : parse(raw || null)), [raw]);
}
