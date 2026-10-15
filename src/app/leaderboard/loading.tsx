import { LeaderboardSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";
import { LeaderboardShell } from "@/components/leaderboard/LeaderboardView";

export default function Loading() {
  return (
    <LeaderboardShell scope="daily">
      <LeaderboardSkeleton />
    </LeaderboardShell>
  );
}
