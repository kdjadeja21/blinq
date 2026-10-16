import { useMemo, useSyncExternalStore } from "react";
import { activeProfileId, scopedKey, subscribeProfiles } from "./profile";
import { DEFAULT_STATS, type Stats } from "./stats";

const KEY = "blinq:v1";

export { DEFAULT_STATS, type DailyResult, type Stats } from "./stats";

const listeners = new Set<() => void>();

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

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(scopedKey(KEY, activeProfileId()));
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
    window.localStorage.setItem(scopedKey(KEY, activeProfileId()), JSON.stringify(stats));
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
