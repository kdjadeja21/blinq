import { Medal } from "lucide-react";
import { cn } from "cn";
import { RankChange } from "@/components/multiplayer/Leaderboard";
import type { PublicRow } from "@/server/solo/leaderboard";

const MEDAL_TONES = ["text-gold", "text-slate-300", "text-amber-600"] as const;

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

function PlayerAvatar({ row }: { row: PublicRow }) {
  if (row.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- remote Clerk avatar, size is fixed
    return <img src={row.avatarUrl} alt="" className="size-8 shrink-0 rounded-full bg-muted object-cover" />;
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold" aria-hidden>
      {row.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Row({ row }: { row: PublicRow }) {
  return (
    <li className={cn("flex items-center gap-2 rounded-xl px-2 py-2", row.isMe ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/50")}>
      <RankBadge rank={row.rank} />
      <PlayerAvatar row={row} />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {row.name}
        {row.isMe ? <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span> : null}
      </span>
      <span className="w-14 text-right text-lg font-extrabold tabular-nums">{row.points}</span>
      <RankChange delta={row.delta} />
    </li>
  );
}

export function LeaderboardList({ rows, me }: { rows: PublicRow[]; me: PublicRow | null }) {
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1.5 rounded-2xl border-2 bg-card p-2 text-left" aria-label="Leaderboard">
        {rows.map((row, index) => (
          <Row key={index} row={row} />
        ))}
      </ol>
      {me ? (
        <ol className="rounded-2xl border-2 border-dashed bg-card p-2 text-left" aria-label="Your position">
          <Row row={me} />
        </ol>
      ) : null}
    </div>
  );
}
