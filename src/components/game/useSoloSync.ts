"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef } from "react";
import { statsEqual, type RoundSummary } from "@/lib/progress";
import { recordSoloRound, syncSoloStats } from "@/lib/solo/api";
import { loadStats, saveStats } from "@/lib/storage";

/**
 * Keeps signed-in players' solo stats in the database. Local storage stays the source the UI renders from;
 * a failed save only marks the account as behind, and the next call re-syncs the full local stats first.
 */
export function useSoloSync(): { signedIn: boolean; guest: boolean; recordRound: (round: RoundSummary) => void } {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const behind = useRef(true);
  const signedIn = Boolean(isLoaded && isSignedIn && userId);
  const guest = Boolean(isLoaded && !isSignedIn);

  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task, task);
  }, []);

  const runSync = useCallback(async () => {
    try {
      const merged = await syncSoloStats(loadStats());
      if (!statsEqual(merged, loadStats())) saveStats(merged);
      behind.current = false;
    } catch {
      behind.current = true;
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      behind.current = true;
      return;
    }
    enqueue(runSync);
  }, [signedIn, userId, enqueue, runSync]);

  const recordRound = useCallback(
    (round: RoundSummary) => {
      if (!signedIn) return;
      enqueue(async () => {
        if (behind.current) {
          await runSync();
          return;
        }
        try {
          await recordSoloRound(round);
        } catch {
          behind.current = true;
        }
      });
    },
    [signedIn, enqueue, runSync],
  );

  return { signedIn, guest, recordRound };
}
