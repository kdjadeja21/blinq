"use client";

import { useEffect, useState } from "react";
import { type Round } from "@/lib/game";
import { useFeedbackEnabled } from "@/lib/feedback";
import { refreshMusic, startMusic, stopMusic, type Mood } from "@/lib/music";

const RUSH_MS = 8000;

function pickMood(round: Round | null, now: number): Mood {
  if (!round) return "calm";
  switch (round.phase) {
    case "memorize":
    case "hide":
      return "focus";
    case "recall":
      return round.combo >= 3 || round.phaseEndsAt - now <= RUSH_MS ? "rush" : "drive";
    default:
      return "calm";
  }
}

export function useGameMusic(round: Round | null, now: number) {
  const enabled = useFeedbackEnabled();
  const [unlocked, setUnlocked] = useState(false);
  const mood = pickMood(round, now);

  useEffect(() => {
    if (unlocked) return;
    const unlock = () => setUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    if (enabled) startMusic(mood);
    else stopMusic();
  }, [unlocked, enabled, mood]);

  useEffect(() => {
    refreshMusic();
  }, [enabled]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stopMusic();
      else if (unlocked && enabled) startMusic(mood);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [unlocked, enabled, mood]);

  useEffect(() => stopMusic, []);
}
