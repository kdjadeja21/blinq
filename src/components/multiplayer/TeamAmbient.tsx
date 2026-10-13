"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { RoomPhase } from "@/lib/multiplayer/types";
import type { TeamTheme } from "@/lib/multiplayer/teamTheme";

function intensityFor(phase: RoomPhase): number {
  switch (phase) {
    case "lobby":
      return 0;
    case "teams_ready":
    case "duel_intro":
    case "level_result":
    case "finished":
      return 1;
    case "memorize":
    case "recall":
    case "duel_result":
      return 0.5;
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

export function TeamAmbient({ theme, phase }: { theme: TeamTheme | null; phase: RoomPhase }) {
  const reduce = useReducedMotion();
  const intensity = theme ? intensityFor(phase) : 0;
  return (
    <AnimatePresence>
      {theme && intensity > 0 && (
        <motion.div
          key={theme.key}
          aria-hidden
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: intensity }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.8 }}
          className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden"
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${theme.gradient}`} />
          <div className={`team-blob absolute -left-[25vmax] -top-[25vmax] size-[75vmax] rounded-full opacity-20 blur-[90px] ${theme.blob}`} />
          <div
            className={`team-blob absolute -bottom-[25vmax] -right-[25vmax] size-[75vmax] rounded-full opacity-15 blur-[90px] [animation-delay:-12s] ${theme.blob}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
