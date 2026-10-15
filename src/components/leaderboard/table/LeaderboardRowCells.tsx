import { cn } from "cn";
import { RankBadge } from "./RankBadge";
import type { LeaderboardEntry } from "./types";

export function rowClassName(isMe: boolean): string {
  return cn("flex items-center gap-2 rounded-xl px-2 py-2", isMe ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/50");
}

export function LeaderboardRowCells({ entry }: { entry: LeaderboardEntry }) {
  return (
    <>
      <RankBadge rank={entry.rank} />
      {entry.avatar}
      <span className="min-w-0 flex-1 truncate font-semibold">
        {entry.name}
        {entry.isMe ? <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span> : null}
      </span>
      {entry.accessory}
      <span className="w-12 text-right text-lg font-extrabold tabular-nums">{entry.points}</span>
      {entry.trailing}
    </>
  );
}
