import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";
import { LeaderboardContent, LeaderboardShell } from "@/components/leaderboard/LeaderboardView";
import { parseScope, type LeaderboardScope } from "@/lib/solo/leaderboard";
import { getLeaderboard, type LeaderboardData } from "@/server/solo/leaderboard";

export const metadata: Metadata = { title: "Leaderboard - Blinq" };

async function LeaderboardSection({ scope }: { scope: LeaderboardScope }) {
  const { userId } = await auth();
  let data: LeaderboardData | null = null;
  try {
    data = await getLeaderboard(scope, userId);
  } catch (error) {
    console.error("leaderboard failed", error);
  }
  return <LeaderboardContent scope={scope} data={data} signedIn={Boolean(userId)} />;
}

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const scope = parseScope((await searchParams).scope);
  return (
    <LeaderboardShell scope={scope}>
      <Suspense key={scope} fallback={<LeaderboardSkeleton />}>
        <LeaderboardSection scope={scope} />
      </Suspense>
    </LeaderboardShell>
  );
}
