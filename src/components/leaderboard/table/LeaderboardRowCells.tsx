import { cn } from "cn";
import { youRowClass } from "@/components/game/YouBadge";
import { RankBadge } from "./RankBadge";
import type { LeaderboardEntry } from "./types";

export function rowClassName(isMe: boolean): string {
  return cn("flex items-center gap-2 rounded-xl px-2 py-2", youRowClass(isMe));
}

export function LeaderboardRowCells({ entry }: { entry: LeaderboardEntry }) {
  return (
    <>
      <RankBadge rank={entry.rank} />
      {entry.avatar}
      <span className="min-w-0 flex-1 truncate font-semibold">{entry.name}</span>
      {entry.accessory}
      <span className="w-12 text-right text-lg font-extrabold tabular-nums">{entry.points}</span>
      {entry.trailing}
    </>
  );
}
