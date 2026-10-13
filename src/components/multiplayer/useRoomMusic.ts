"use client";

import { useMoodMusic } from "@/components/game/useGameMusic";
import type { Mood } from "@/lib/music";
import type { RoomPhase } from "@/lib/multiplayer/types";

const RUSH_MS = 8000;

function moodFor(phase: RoomPhase | undefined, remainingMs: number): Mood {
  switch (phase) {
    case "duel_intro":
    case "memorize":
      return "focus";
    case "recall":
      return remainingMs <= RUSH_MS ? "rush" : "drive";
    case "lobby":
    case "teams_ready":
    case "duel_result":
    case "level_result":
    case "finished":
    case undefined:
      return "calm";
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

export function useRoomMusic(phase: RoomPhase | undefined, remainingMs: number) {
  useMoodMusic(moodFor(phase, remainingMs));
}
