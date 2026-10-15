const ROWS = 8;

export function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Loading leaderboard">
      <div className="mx-auto h-5 w-48 animate-pulse rounded-full bg-muted" />
      <ol className="flex flex-col gap-1.5 rounded-2xl border-2 bg-card p-2" aria-hidden>
        {Array.from({ length: ROWS }, (_, index) => (
          <li key={index} className="flex items-center gap-2 rounded-xl bg-muted/50 px-2 py-2">
            <span className="size-6 w-7 animate-pulse rounded-full bg-muted" />
            <span className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <span className="h-4 flex-1 animate-pulse rounded-full bg-muted" />
            <span className="h-5 w-12 animate-pulse rounded-full bg-muted" />
          </li>
        ))}
      </ol>
      <span className="sr-only">Loading leaderboard</span>
    </div>
  );
}
