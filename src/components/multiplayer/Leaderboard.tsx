"use client";

import { Medal } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";
import { useEffect, useMemo, useState } from "react";
import type { Standing } from "@/lib/multiplayer/leaderboard";
import { teamThemeFor } from "@/lib/multiplayer/teamTheme";
import type { PlayerRow, TeamRow } from "@/lib/multiplayer/types";
import { LeaderboardTable } from "@/components/leaderboard/table/LeaderboardTable";
import { MEDAL_TONES } from "@/components/leaderboard/table/RankBadge";
import { RankChange } from "@/components/leaderboard/table/RankChange";
import type { LeaderboardEntry } from "@/components/leaderboard/table/types";
import { Avatar } from "./shared";

const SETTLE_MS = 700;

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

  const entries = useMemo<LeaderboardEntry[]>(
    () =>
      shown.map((row) => {
        const player = players.find((p) => p.id === row.playerId);
        const theme = teams ? teamThemeFor(player?.team_id, teams) : null;
        const TeamIcon = theme?.icon;
        const teamName = teams?.find((t) => t.id === player?.team_id)?.name;
        return {
          id: row.playerId,
          rank: settled || !showChanges ? row.rank : row.rank + (row.delta ?? 0),
          name: row.name,
          points: row.points,
          isMe: row.playerId === meId,
          avatar: <Avatar player={player} className="size-8 text-lg" />,
          accessory: (
            <>
              {TeamIcon && (
                <span className={cn("flex items-center gap-1 text-xs font-semibold", theme?.text)}>
                  <TeamIcon className="size-4" aria-hidden />
                  <span className="sr-only">{teamName}</span>
                </span>
              )}
              {showLevelGain && <span className="text-xs font-semibold tabular-nums text-success">+{row.levelPoints}</span>}
            </>
          ),
          trailing: showChanges ? <RankChange delta={settled ? row.delta : null} /> : undefined,
        };
      }),
    [shown, players, teams, meId, settled, showChanges, showLevelGain],
  );

  const mine = rows.find((r) => r.playerId === meId);
  return (
    <div className="flex flex-col gap-2">
      {mine && (
        <p className="text-center text-sm font-semibold" role="status">
          You are <span className="font-extrabold">#{mine.rank}</span> with <span className="tabular-nums">{mine.points}</span> points
        </p>
      )}
      <LeaderboardTable entries={entries} ariaLabel="Leaderboard" animateLayout className="max-h-[min(55dvh,28rem)]" />
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
