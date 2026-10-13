"use client";

import { avatarFor } from "@/lib/multiplayer/avatars";
import { cn } from "cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PlayerRow } from "@/lib/multiplayer/types";
import type { TeamTheme } from "@/lib/multiplayer/teamTheme";

const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const distance = 110 + (i % 3) * 38;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: 6 + (i % 3) * 3 };
});

const IMPACT_DELAY = 0.8;

interface FighterProps {
  player: PlayerRow | undefined;
  team: string | undefined;
  theme: TeamTheme | null;
  from: "left" | "right";
  you: boolean;
}

function Fighter({ player, team, theme, from, you }: FighterProps) {
  const reduce = useReducedMotion();
  const left = from === "left";
  const Icon = theme?.icon;
  return (
    <motion.div
      initial={reduce ? false : { x: left ? -360 : 360, opacity: 0, skewX: left ? 20 : -20 }}
      animate={{ x: 0, opacity: 1, skewX: 0 }}
      transition={{ type: "spring", stiffness: 170, damping: 16, delay: left ? 0.1 : 0.35 }}
      className={cn(
        "relative z-10 flex w-full items-center gap-4 rounded-3xl border-2 p-3 pr-5 shadow-2xl",
        !left && "flex-row-reverse",
        theme
          ? [theme.border, left ? theme.gradient : theme.gradientReverse, theme.glow]
          : left
            ? "border-primary bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-primary/50"
            : "border-flame bg-gradient-to-l from-flame to-gold text-black shadow-flame/50",
      )}
    >
      <motion.span
        animate={reduce ? undefined : { rotate: [0, -6, 6, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: 1.2 }}
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded-full border-4 text-4xl shadow-inner",
          theme || left ? "border-white/70 bg-black/25" : "border-black/60 bg-white/40",
        )}
        aria-hidden
      >
        {player ? avatarFor(player) : "?"}
      </motion.span>
      <div className={cn("min-w-0 flex-1", left ? "text-left" : "text-right")}>
        <p className="truncate text-2xl font-black leading-tight tracking-tight">{player?.name ?? "?"}</p>
        <p className="flex items-center gap-2 text-sm font-semibold opacity-85" style={{ justifyContent: left ? "flex-start" : "flex-end" }}>
          {Icon && <Icon className="size-4" aria-hidden />}
          {team}
          {you && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-extrabold", theme || left ? "bg-white/25" : "bg-black/20")}>YOU</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}

export function VersusIntro({
  a,
  b,
  teamA,
  teamB,
  themeA,
  themeB,
  meId,
  seconds,
}: {
  a: PlayerRow | undefined;
  b: PlayerRow | undefined;
  teamA: string | undefined;
  teamB: string | undefined;
  themeA: TeamTheme | null;
  themeB: TeamTheme | null;
  meId: string | undefined;
  seconds: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative flex flex-1 flex-col items-center justify-center gap-2 overflow-x-clip px-2 py-6 text-center"
      role="status"
      animate={reduce ? undefined : { x: [0, -8, 8, -5, 5, 0], y: [0, 4, -4, 2, -2, 0] }}
      transition={{ duration: 0.45, delay: IMPACT_DELAY }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        {themeA && themeB && (
          <>
            <motion.div
              initial={reduce ? false : { y: "-100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("absolute inset-x-0 top-0 h-1/2 opacity-35 bg-gradient-to-b to-transparent", themeA.key === "a" ? "from-team-a" : "from-team-b")}
            />
            <motion.div
              initial={reduce ? false : { y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("absolute inset-x-0 bottom-0 h-1/2 opacity-35 bg-gradient-to-t to-transparent", themeB.key === "a" ? "from-team-a" : "from-team-b")}
            />
          </>
        )}
        <motion.div
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 size-[170%] -translate-x-1/2 -translate-y-1/2 opacity-30 [background:repeating-conic-gradient(from_0deg,var(--color-primary)_0deg_8deg,transparent_8deg_24deg)] [mask-image:radial-gradient(circle,black_0%,transparent_62%)]"
        />
      </div>

      <Fighter player={a} team={teamA} theme={themeA} from="left" you={a?.id === meId} />

      <div className="relative z-20 -my-3 flex h-28 w-full items-center justify-center">
        {!reduce && (
          <>
            <motion.span
              aria-hidden
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 4.5, opacity: 0 }}
              transition={{ duration: 0.8, delay: IMPACT_DELAY, ease: "easeOut" }}
              className="absolute size-24 rounded-full border-4 border-gold"
            />
            {SPARKS.map((spark, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: spark.x, y: spark.y, scale: [0, 1.4, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.8, delay: IMPACT_DELAY, ease: "easeOut" }}
                className="absolute rounded-full bg-gold shadow-[0_0_10px_var(--color-gold)]"
                style={{ width: spark.size, height: spark.size }}
              />
            ))}
          </>
        )}
        <motion.div
          aria-label="versus"
          initial={reduce ? false : { scale: 6, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 11, delay: IMPACT_DELAY }}
          className="relative"
        >
          <motion.span
            animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: IMPACT_DELAY + 0.6 }}
            className="block px-6 py-1"
          >
            <span aria-hidden className="absolute inset-0 select-none px-6 py-1 text-8xl font-black italic leading-none tracking-tighter text-black/60 translate-x-1 translate-y-1.5">
              VS
            </span>
            <span className="relative bg-gradient-to-b from-gold via-flame to-fuchsia-500 bg-clip-text text-8xl font-black italic leading-none tracking-tighter text-transparent [-webkit-text-stroke:2px_white]">
              VS
            </span>
          </motion.span>
        </motion.div>
      </div>

      <Fighter player={b} team={teamB} theme={themeB} from="right" you={b?.id === meId} />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-4 flex flex-col items-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Memorize starts in</p>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={seconds}
            initial={reduce ? false : { scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="text-6xl font-black tabular-nums text-gold drop-shadow-[0_0_14px_var(--color-gold)]"
          >
            {seconds}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
