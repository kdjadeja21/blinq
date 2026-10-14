"use client";

import { ArrowDown, ArrowUp, Medal, Minus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";
import { useEffect, useMemo, useState } from "react";
import type { Standing } from "@/lib/multiplayer/leaderboard";
import { teamThemeFor } from "@/lib/multiplayer/teamTheme";
import type { PlayerRow, TeamRow } from "@/lib/multiplayer/types";
import { Avatar } from "./shared";

const MEDAL_TONES = ["text-gold", "text-slate-300", "text-amber-600"] as const;
const SETTLE_MS = 700;

export function RankChange({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="w-10" aria-hidden />;
  if (delta === 0) {
    return (
      <span className="flex w-10 items-center justify-end gap-0.5 text-xs font-bold text-muted-foreground" role="img" aria-label="Rank unchanged">
        <Minus className="size-3.5" aria-hidden />
      </span>
    );
  }
  const up = delta > 0;
  const places = Math.abs(delta);
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn("flex w-10 items-center justify-end gap-0.5 text-xs font-extrabold tabular-nums", up ? "text-success" : "text-destructive")}
      role="img"
      aria-label={`${up ? "Up" : "Down"} ${places} ${places === 1 ? "place" : "places"}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {places}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="flex w-7 justify-center" role="img" aria-label={`Rank ${rank}`}>
        <Medal className={cn("size-6", MEDAL_TONES[rank - 1])} aria-hidden />
      </span>
    );
  }
  return <span className="w-7 text-center text-sm font-bold tabular-nums text-muted-foreground">{rank}</span>;
}

interface LeaderboardProps {
  rows: Standing[];
  players: PlayerRow[];
  meId: string | undefined;
  /** Shows the points gained this level next to the total. */
  showLevelGain: boolean;
  /** Shows rank-change arrows. When set, rows start in last level's order and slide into place. */
  showChanges: boolean;
  /** Squad: marks each row with its team. Color is always paired with the icon and the team name. */
  teams?: TeamRow[];
}

/** Rows start in the previous order and slide into the new one, so rank changes are visible. */
export function Leaderboard({ rows, players, meId, showLevelGain, showChanges, teams }: LeaderboardProps) {
  const reduce = useReducedMotion();
  const [settled, setSettled] = useState(Boolean(reduce) || !showChanges);
  useEffect(() => {
    if (settled) return;
    const id = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [settled]);

  const shown = useMemo(() => {
    if (settled || !showChanges) return rows;
    const before = (row: Standing) => row.rank + (row.delta ?? 0);
    return [...rows].sort((a, b) => before(a) - before(b) || a.name.localeCompare(b.name));
  }, [rows, settled, showChanges]);

  const mine = rows.find((r) => r.playerId === meId);
  return (
    <div className="flex flex-col gap-2">
      {mine && (
        <p className="text-center text-sm font-semibold" role="status">
          You are <span className="font-extrabold">#{mine.rank}</span> with <span className="tabular-nums">{mine.points}</span> points
        </p>
      )}
      <ol className="flex max-h-[min(55dvh,28rem)] flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-2xl border-2 bg-card p-2 text-left" aria-label="Leaderboard">
        {shown.map((row) => {
          const player = players.find((p) => p.id === row.playerId);
          const isMe = row.playerId === meId;
          const theme = teams ? teamThemeFor(player?.team_id, teams) : null;
          const TeamIcon = theme?.icon;
          const teamName = teams?.find((t) => t.id === player?.team_id)?.name;
          return (
            <motion.li
              key={row.playerId}
              layout={!reduce}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={cn("flex items-center gap-2 rounded-xl px-2 py-2", isMe ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/50")}
            >
              <RankBadge rank={settled || !showChanges ? row.rank : row.rank + (row.delta ?? 0)} />
              <Avatar player={player} className="size-8 text-lg" />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {row.name}
                {isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
              </span>
              {TeamIcon && (
                <span className={cn("flex items-center gap-1 text-xs font-semibold", theme?.text)}>
                  <TeamIcon className="size-4" aria-hidden />
                  <span className="sr-only">{teamName}</span>
                </span>
              )}
              {showLevelGain && <span className="text-xs font-semibold tabular-nums text-success">+{row.levelPoints}</span>}
              <span className="w-12 text-right text-lg font-extrabold tabular-nums">{row.points}</span>
              {showChanges && <RankChange delta={settled ? row.delta : null} />}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export function Podium({ rows, players }: { rows: Standing[]; players: PlayerRow[] }) {
  const reduce = useReducedMotion();
  const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
  if (top.length === 0) return null;
  const heights = ["h-24", "h-16", "h-12"];
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return (
    <ol className="flex items-end justify-center gap-2" aria-label="Podium">
      {order.map((row, i) => {
        const player = players.find((p) => p.id === row.playerId);
        return (
          <motion.li
            key={row.playerId}
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.15 * i, type: "spring", stiffness: 300, damping: 20 }}
            className="flex w-24 flex-col items-center gap-1"
          >
            <Avatar player={player} className="size-12 text-3xl" />
            <p className="w-full truncate text-center text-sm font-bold">{row.name}</p>
            <div className={cn("flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b from-primary/40 to-primary/10 pt-1", heights[Math.min(row.rank, 3) - 1])}>
              <Medal className={cn("size-6", MEDAL_TONES[Math.min(row.rank, 3) - 1])} aria-hidden />
              <span className="text-sm font-extrabold tabular-nums">{row.points}</span>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
