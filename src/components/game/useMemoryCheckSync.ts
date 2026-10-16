"use client";

import { useEffect } from "react";
import { loadLevelProgress, saveLevelProgress } from "@/lib/levelProgress";
import { mergeChecks, type MemoryCheck } from "@/lib/skillProgress";
import { syncMemoryChecks } from "@/lib/solo/api";

function same(a: MemoryCheck[], b: MemoryCheck[]): boolean {
  return a.length === b.length && a.every((c, i) => c.date === b[i].date && c.accuracy === b[i].accuracy);
}

/**
 * Keeps a signed-in player's memory test results on their account. Runs when the device's checks change
 * (a new test) and on load, merging the account's list into local storage. Failures retry on the next change.
 */
export function useMemoryCheckSync(enabled: boolean, localCount: number | null) {
  useEffect(() => {
    if (!enabled || localCount === null) return;
    let cancelled = false;
    syncMemoryChecks(loadLevelProgress().checks)
      .then((remote) => {
        if (cancelled) return;
        const progress = loadLevelProgress();
        const merged = mergeChecks(progress.checks, remote);
        if (!same(merged, progress.checks)) saveLevelProgress({ ...progress, checks: merged });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, localCount]);
}
