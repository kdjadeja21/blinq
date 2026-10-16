"use client";

import { Check, Star } from "lucide-react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { SHARE_BACKGROUND, SHARE_COLORS, SHARE_TILE_MISS_BACKGROUND, tileTilt } from "@/lib/share-design";

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
      className="relative w-full overflow-hidden rounded-[2rem] p-6 shadow-lg sm:p-10"
      style={{ background: SHARE_BACKGROUND }}
    >
      <div
        aria-hidden
        className="absolute -left-16 -top-24 size-72 rounded-full"
        style={{ background: SHARE_COLORS.circleLarge }}
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-16 size-60 rounded-full"
        style={{ background: SHARE_COLORS.circleSmall }}
      />
      <div className="relative flex items-center justify-between gap-4 text-left">
        <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
          <p className="flex items-center gap-3 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            <Image src="/icon.svg" alt="" width={64} height={64} priority className="size-10 rounded-xl sm:size-16" />
            Blinq
          </p>
          <p className="text-2xl font-bold leading-tight text-white sm:text-5xl">
            I remembered
            <br />
            {correct}/{total}
          </p>
          <p className="text-sm font-bold sm:text-xl" style={{ color: SHARE_COLORS.accent }}>
            Daily Challenge · {when}
          </p>
          <div className="flex gap-1" role="img" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className="size-6 sm:size-9"
                style={{
                  color: i < stars ? SHARE_COLORS.accent : SHARE_COLORS.starOff,
                  fill: i < stars ? SHARE_COLORS.accent : SHARE_COLORS.starOff,
                }}
              />
            ))}
          </div>
        </div>
        <div className="grid w-[40%] max-w-52 shrink-0 grid-cols-4 gap-1.5 sm:gap-3" aria-hidden>
          {cells.map((hit, i) => (
            <motion.span
              key={i}
              className="flex aspect-square w-full items-center justify-center rounded-md border-2 border-b-4 text-[10px] font-bold text-white sm:rounded-xl sm:text-lg"
              style={{
                background: hit ? SHARE_COLORS.tileHitFace : SHARE_TILE_MISS_BACKGROUND,
                borderColor: hit ? SHARE_COLORS.tileHitEdge : SHARE_COLORS.tileMissBorder,
              }}
              initial={reduce ? { rotate: tileTilt(i) } : { scale: 0, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: tileTilt(i), opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.15 + i * TILE_STAGGER }}
            >
              {hit ? <Check className="size-3/5" style={{ color: SHARE_COLORS.hitMark }} strokeWidth={4} /> : "?"}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
