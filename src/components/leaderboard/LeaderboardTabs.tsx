"use client";

import Link from "next/link";
import { SlidingOptions } from "@/components/ui/sliding-options";
import type { LeaderboardScope } from "@/lib/solo/leaderboard";

const TABS: { value: LeaderboardScope; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "all", label: "All time" },
];

export function LeaderboardTabs({ scope }: { scope: LeaderboardScope }) {
  return (
    <nav aria-label="Leaderboard period">
      <SlidingOptions
        value={scope}
        options={TABS}
        className="grid-cols-3 rounded-2xl border-2 bg-card"
        renderOption={({ option, selected, className, children }) => (
          <Link
            href={`/leaderboard?scope=${option.value}`}
            replace
            aria-current={selected ? "page" : undefined}
            className={className}
          >
            {children}
          </Link>
        )}
      />
    </nav>
  );
}
