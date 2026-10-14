import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { parseScope } from "@/lib/solo/leaderboard";
import { getLeaderboard, type LeaderboardData } from "@/server/solo/leaderboard";

export const metadata: Metadata = { title: "Daily leaderboard - Blinq" };

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const scope = parseScope((await searchParams).scope);
  const { userId } = await auth();
  let data: LeaderboardData | null = null;
  try {
    data = await getLeaderboard(scope, userId);
  } catch (error) {
    console.error("leaderboard failed", error);
  }
  return <LeaderboardView scope={scope} data={data} signedIn={Boolean(userId)} />;
}
