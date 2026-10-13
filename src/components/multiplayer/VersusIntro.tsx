"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import type { PlayerRow } from "@/lib/multiplayer/types";

interface FighterProps {
  player: PlayerRow | undefined;
  team: string | undefined;
  from: "left" | "right";
  you: boolean;
}

function Fighter({ player, team, from, you }: FighterProps) {
  const reduce = useReducedMotion();
  const offset = from === "left" ? -320 : 320;
  return (
    <motion.div
      initial={reduce ? false : { x: offset, opacity: 0, skewX: from === "left" ? 18 : -18 }}
      animate={{ x: 0, opacity: 1, skewX: 0 }}
      transition={{ type: "spring", stiffness: 190, damping: 17, delay: from === "left" ? 0.1 : 0.35 }}
      className={cn(
        "w-full rounded-3xl border-2 px-4 py-5 text-center shadow-xl",
        from === "left"
          ? "border-primary bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-primary/40"
          : "border-flame bg-gradient-to-l from-flame to-gold text-black shadow-flame/40",
      )}
    >
      <p className="truncate text-3xl font-black tracking-tight">{player?.name ?? "?"}</p>
      <p className="text-sm font-semibold opacity-80">
        {team}
        {you ? " - you" : ""}
      </p>
    </motion.div>
  );
}

export function VersusIntro({
  a,
  b,
  teamA,
  teamB,
  meId,
  seconds,
}: {
  a: PlayerRow | undefined;
  b: PlayerRow | undefined;
  teamA: string | undefined;
  teamB: string | undefined;
  meId: string | undefined;
  seconds: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden text-center" role="status">
      <motion.div
        aria-hidden
        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0.35], scale: [0.4, 1.6, 1.3] }}
        transition={{ duration: 1.1, delay: 0.7, times: [0, 0.3, 1] }}
        className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_65%)] opacity-0"
      />
      <Fighter player={a} team={teamA} from="left" you={a?.id === meId} />
      <motion.span
        aria-label="versus"
        initial={reduce ? false : { scale: 5, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 13, delay: 0.75 }}
        className="relative z-10 bg-gradient-to-b from-gold to-flame bg-clip-text text-7xl font-black italic leading-none tracking-tighter text-transparent drop-shadow-[0_4px_0_rgba(0,0,0,0.35)]"
      >
        VS
      </motion.span>
      <Fighter player={b} team={teamB} from="right" you={b?.id === meId} />
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-2 text-sm font-medium uppercase tracking-widest text-muted-foreground"
      >
        Starting in <span className="text-lg font-extrabold tabular-nums text-foreground">{seconds}</span>
      </motion.p>
    </div>
  );
}
