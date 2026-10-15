"use client";

import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, type MouseEvent, type ReactNode } from "react";
import { SlidingOptions } from "@/components/ui/sliding-options";
import type { LeaderboardScope } from "@/lib/solo/leaderboard";

const TABS: { value: LeaderboardScope; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "all", label: "All time" },
];

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Tabs plus the panel they control; the pill moves on tap and the panel dims until the new scope arrives. */
interface LeaderboardTabsProps {
  scope: LeaderboardScope;
  /** Extra query params kept when switching tabs (the dev mock params). */
  keepParams?: Record<string, string>;
  children: ReactNode;
}

export function LeaderboardTabs({ scope, keepParams, children }: LeaderboardTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticScope, setOptimisticScope] = useOptimistic(scope);

  function hrefFor(value: LeaderboardScope): string {
    const next = new URLSearchParams(keepParams);
    next.set("scope", value);
    return `/leaderboard?${next.toString()}`;
  }

  function select(event: MouseEvent<HTMLAnchorElement>, value: LeaderboardScope) {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    if (value === optimisticScope) return;
    startTransition(() => {
      setOptimisticScope(value);
      router.replace(hrefFor(value));
    });
  }

  return (
    <>
      <nav aria-label="Leaderboard period">
        <SlidingOptions
          value={optimisticScope}
          options={TABS}
          className="grid-cols-3 rounded-2xl border-2 bg-card"
          renderOption={({ option, selected, className, children: label }) => (
            <Link
              href={hrefFor(option.value)}
              replace
              onClick={(event) => select(event, option.value)}
              aria-current={selected ? "page" : undefined}
              className={className}
            >
              {label}
            </Link>
          )}
        />
      </nav>
      <div aria-busy={isPending} className={cn("transition-opacity duration-200", isPending && "opacity-60")}>
        {children}
      </div>
    </>
  );
}
