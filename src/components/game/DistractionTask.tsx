"use client";

import { cn } from "cn";
import { useState } from "react";

const CELLS = 9;

interface DistractionTaskProps {
  onTap?: () => void;
}

/** A simple tapping game that keeps the player busy so the table fades from short-term memory. */
export function DistractionTask({ onTap }: DistractionTaskProps) {
  const [active, setActive] = useState(4);
  const [taps, setTaps] = useState(0);

  function hit(cell: number) {
    if (cell !== active) return;
    setTaps((count) => count + 1);
    setActive((current) => {
      const next = Math.floor(Math.random() * (CELLS - 1));
      return next >= current ? next + 1 : next;
    });
    onTap?.();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <ul className="grid w-full max-w-72 grid-cols-3 gap-3" aria-label="Distraction game">
        {Array.from({ length: CELLS }, (_, cell) => (
          <li key={cell}>
            <button
              type="button"
              onClick={() => hit(cell)}
              aria-label={cell === active ? "Glowing dot, tap it" : "Empty"}
              className={cn(
                "aspect-square min-h-11 w-full rounded-full border-2 outline-none transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                cell === active
                  ? "border-gold bg-gold shadow-lg shadow-gold/50 active:scale-95"
                  : "border-muted-foreground/30 bg-muted/40",
              )}
            />
          </li>
        ))}
      </ul>
      <p className="text-sm font-medium text-muted-foreground" aria-live="off">
        Taps: {taps}
      </p>
    </div>
  );
}
