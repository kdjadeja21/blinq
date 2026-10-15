"use client";

import { Star } from "lucide-react";
import Image from "next/image";
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
      className="w-full rounded-[2rem] bg-gradient-to-br from-[#5b2bd6] to-[#c13fd8] p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-5 text-left text-[#2a1a63] sm:p-8">
        <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
          <p className="flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            <Image src="/icon.svg" alt="" width={56} height={56} priority className="size-10 rounded-xl shadow-md sm:size-14" />
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-[length:170%_100%] bg-center bg-clip-text text-transparent">Blinq</span>
          </p>
          <p className="text-xs font-semibold text-[#7a6bb0] sm:text-base">Daily Challenge · {when}</p>
          <div className="flex gap-1" role="img" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={cn(
                  "size-6 sm:size-8",
                  i < stars ? "fill-[#ffc531] text-[#ffc531]" : "fill-[#ddd5f5] text-[#ddd5f5]",
                )}
              />
            ))}
          </div>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-4xl font-extrabold sm:text-6xl">
              {correct}/{total}
            </span>
            <span className="text-xs font-bold sm:text-lg">remembered</span>
          </p>
          <p className="text-xs font-bold text-[#5b2bd6] sm:text-base">Can you beat me?</p>
        </div>
        <div className="grid w-[38%] max-w-44 shrink-0 grid-cols-4 gap-1.5 sm:gap-2.5" aria-hidden>
          {cells.map((hit, i) => (
            <motion.span
              key={i}
              className={cn("aspect-square w-full rounded-md sm:rounded-xl", hit ? "bg-[#2ecb70]" : "bg-[#e4defa]")}
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
