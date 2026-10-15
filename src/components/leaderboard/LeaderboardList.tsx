import { LeaderboardTable } from "@/components/leaderboard/table/LeaderboardTable";
import { RankChange } from "@/components/leaderboard/table/RankChange";
import type { LeaderboardEntry } from "@/components/leaderboard/table/types";
import type { PublicRow } from "@/server/solo/leaderboard";

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

function toEntry(row: PublicRow, id: string, gapBefore: boolean): LeaderboardEntry {
  return {
    id,
    rank: row.rank,
    name: row.name,
    points: row.points,
    isMe: row.isMe,
    avatar: <PlayerAvatar row={row} />,
    trailing: <RankChange delta={row.delta} />,
    gapBefore,
  };
}

export function LeaderboardList({ rows, me }: { rows: PublicRow[]; me: PublicRow | null }) {
  const entries = rows.map((row, index) => toEntry(row, String(index), false));
  if (me) entries.push(toEntry(me, "me", true));
  return <LeaderboardTable entries={entries} ariaLabel="Leaderboard" className="max-h-[min(60dvh,32rem)]" />;
}
