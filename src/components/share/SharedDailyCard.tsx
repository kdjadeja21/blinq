"use client";

import { Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SharedDailyCardProps {
  when: string;
  correct: number;
  total: number;
  stars: number;
  grid: boolean[];
}

const TILE_STAGGER = 0.06;

export function SharedDailyCard({ when, correct, total, stars, grid }: SharedDailyCardProps) {
  const reduce = useReducedMotion();
  const cells = grid.length > 0 ? grid : Array.from({ length: total }, (_, i) => i < correct);

  return (
    <section
      aria-label={`Remembered ${correct} of ${total} on ${when}`}
      className="w-full rounded-[2rem] bg-gradient-to-br from-primary to-fuchsia-500 p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-card p-6 text-left">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Daily Challenge · {when}</p>
          <div className="flex gap-1" role="img" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={cn("size-8", i < stars ? "fill-gold text-gold" : "text-muted-foreground/40")}
              />
            ))}
          </div>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold">
              {correct}/{total}
            </span>
            <span className="text-sm font-semibold">remembered</span>
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2" aria-hidden>
          {cells.map((hit, i) => (
            <motion.span
              key={i}
              className={cn("size-9 rounded-xl sm:size-10", hit ? "bg-success" : "bg-muted")}
              initial={reduce ? false : { scale: 0, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.15 + i * TILE_STAGGER }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
