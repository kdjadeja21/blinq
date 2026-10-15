import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import type { LeaderboardScope } from "@/lib/solo/leaderboard";
import type { LeaderboardData } from "@/server/solo/leaderboard";

function emptyText(scope: LeaderboardScope): string {
  switch (scope) {
    case "daily":
      return "No one has played today's table yet.";
    case "weekly":
      return "No one has played this week yet.";
    case "all":
      return "No daily results yet.";
    default: {
      const unreachable: never = scope;
      return unreachable;
    }
  }
}

export function LeaderboardShell({ scope, children }: { scope: LeaderboardScope; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Link href="/" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Home
      </Link>
      <div className="text-center">
        <Trophy className="mx-auto size-10 text-gold" aria-hidden />
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Leaderboard</h1>
      </div>
      <LeaderboardTabs scope={scope}>{children}</LeaderboardTabs>
    </main>
  );
}

interface LeaderboardContentProps {
  scope: LeaderboardScope;
  data: LeaderboardData | null;
  signedIn: boolean;
}

export function LeaderboardContent({ scope, data, signedIn }: LeaderboardContentProps) {
  if (data === null) {
    return (
      <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
        The leaderboard could not be loaded. Try again in a moment.
      </p>
    );
  }
  const mine = data.rows.find((row) => row.isMe) ?? data.me;
  return (
    <div className="flex flex-col gap-4">
      {mine ? (
        <p className="text-center text-sm font-semibold" role="status">
          You are <span className="font-extrabold">#{mine.rank}</span> with <span className="tabular-nums">{mine.points}</span> points
        </p>
      ) : signedIn ? (
        <p className="text-center text-sm text-muted-foreground">Play the daily challenge to join this board.</p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Sign in and play the daily challenge to join this board.</p>
      )}
      {data.rows.length === 0 ? (
        <p className="rounded-2xl border-2 bg-card p-6 text-center text-muted-foreground">{emptyText(scope)}</p>
      ) : (
        <LeaderboardList rows={data.rows} me={data.me} />
      )}
    </div>
  );
}
