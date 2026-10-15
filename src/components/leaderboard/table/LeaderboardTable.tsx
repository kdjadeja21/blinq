"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";
import { useEffect, useState } from "react";
import { LeaderboardRowCells, rowClassName } from "./LeaderboardRowCells";
import { stickySide, type StickySide } from "./stickySide";
import type { LeaderboardEntry } from "./types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  ariaLabel: string;
  /** Rows slide to their new position when the order changes. */
  animateLayout?: boolean;
  /** Height cap that makes the list scroll. */
  className?: string;
}

/**
 * Scrollable standings. The viewer's row keeps its place in the list; while it is scrolled out of
 * view, a copy of it is pinned to the edge it left from, and hidden again once the real row shows.
 */
export function LeaderboardTable({ entries, ariaLabel, animateLayout = false, className }: LeaderboardTableProps) {
  const reduce = useReducedMotion();
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [mineRow, setMineRow] = useState<HTMLElement | null>(null);
  const [side, setSide] = useState<StickySide | null>(null);

  useEffect(() => {
    if (!scroller || !mineRow) return;
    const observer = new IntersectionObserver(
      (records) => {
        const record = records[records.length - 1];
        const rootTop = record.rootBounds?.top ?? scroller.getBoundingClientRect().top;
        setSide(stickySide(record.intersectionRatio, record.boundingClientRect.top, rootTop));
      },
      { root: scroller, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(mineRow);
    return () => observer.disconnect();
  }, [scroller, mineRow]);

  const mine = entries.find((entry) => entry.isMe);
  const mineId = mine?.id;

  return (
    <div className="relative">
      <ol
        ref={setScroller}
        className={cn("flex flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-2xl border-2 bg-card p-2 text-left", className)}
        aria-label={ariaLabel}
      >
        {entries.map((entry) => (
          <motion.li
            key={entry.id}
            ref={entry.id === mineId ? setMineRow : undefined}
            layout={animateLayout && !reduce}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(rowClassName(entry.isMe), entry.gapBefore && "mt-3")}
          >
            <LeaderboardRowCells entry={entry} />
          </motion.li>
        ))}
      </ol>
      {mine && mineRow && side ? (
        <div
          aria-hidden
          inert
          data-testid="sticky-me"
          className={cn("pointer-events-none absolute inset-x-2", side === "top" ? "top-2" : "bottom-2")}
        >
          <div className="rounded-xl bg-card shadow-lg">
            <div className={rowClassName(true)}>
              <LeaderboardRowCells entry={mine} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
