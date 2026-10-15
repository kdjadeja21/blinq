import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaderboardSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";
import { LeaderboardContent, LeaderboardShell } from "@/components/leaderboard/LeaderboardView";
import { parseScope, type LeaderboardScope } from "@/lib/solo/leaderboard";
import { mockLeaderboard, mockParams, parseMock, type MockOptions } from "@/lib/solo/leaderboardMock";
import { getLeaderboard, type LeaderboardData } from "@/server/solo/leaderboard";

export const metadata: Metadata = { title: "Leaderboard - Blinq" };

async function LeaderboardSection({ scope, mock }: { scope: LeaderboardScope; mock: MockOptions | null }) {
  if (mock) {
    return <LeaderboardContent scope={scope} data={mockLeaderboard(mock, new Date().toISOString().slice(0, 10))} signedIn />;
  }
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
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const mock = process.env.NODE_ENV === "production" ? null : parseMock(params);
  const keepParams = mock ? mockParams(mock) : undefined;
  return (
    <LeaderboardShell scope={scope} keepParams={keepParams}>
      <Suspense key={scope} fallback={<LeaderboardSkeleton />}>
        <LeaderboardSection scope={scope} mock={mock} />
      </Suspense>
    </LeaderboardShell>
  );
}
