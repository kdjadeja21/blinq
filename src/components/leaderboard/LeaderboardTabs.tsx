import { cn } from "cn";
import Link from "next/link";
import type { LeaderboardScope } from "@/lib/solo/leaderboard";

const TABS: { scope: LeaderboardScope; label: string }[] = [
  { scope: "daily", label: "Daily" },
  { scope: "weekly", label: "Weekly" },
  { scope: "all", label: "All time" },
];

export function LeaderboardTabs({ scope }: { scope: LeaderboardScope }) {
  return (
    <nav aria-label="Leaderboard period" className="grid grid-cols-3 gap-1 rounded-2xl border-2 bg-card p-1">
      {TABS.map((tab) => {
        const active = tab.scope === scope;
        return (
          <Link
            key={tab.scope}
            href={`/leaderboard?scope=${tab.scope}`}
            replace
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-xl px-3 py-2 text-center text-sm font-bold transition-colors",
              active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
