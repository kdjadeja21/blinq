"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import type { Item } from "@/lib/items";

export type BoardMode = "memorize" | "hide" | "recall" | "reveal";

interface BoardProps {
  items: Item[];
  mode: BoardMode;
  recalledIds: string[];
  hintLetters: boolean;
}

export function Board({ items, mode, recalledIds, hintLetters }: BoardProps) {
  const reduce = useReducedMotion();
  const cols = items.length <= 6 ? "grid-cols-3" : "grid-cols-4";
  return (
    <ul className={cn("grid w-full gap-2 sm:gap-3", cols)} aria-label="Table of items">
      {items.map((item, index) => {
        const recalled = recalledIds.includes(item.id);
        const faceUp = mode === "memorize" || mode === "reveal" || recalled;
        const missed = mode === "reveal" && !recalled;
        return (
          <motion.li
            key={item.id}
            className="aspect-square [perspective:700px]"
            initial={reduce ? false : { scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18, delay: reduce ? 0 : index * 0.05 }}
          >
            <motion.div
              className="relative size-full [transform-style:preserve-3d]"
              initial={false}
              animate={{ rotateY: faceUp ? 0 : 180 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 20 }}
            >
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 bg-card shadow-md [backface-visibility:hidden]",
                  recalled && "border-success bg-success/15 shadow-success/40",
                  missed && "animate-pulse border-gold bg-gold/15",
                )}
              >
                <span
                  role="img"
                  aria-label={faceUp ? item.name : `Hidden item ${index + 1}`}
                  className="select-none text-5xl leading-none drop-shadow sm:text-6xl"
                >
                  {item.emoji}
                </span>
                {(recalled || missed) && (
                  <span className="mt-1 text-xs font-semibold capitalize sm:text-sm">{item.name}</span>
                )}
              </div>
              <div
                aria-hidden
                className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary to-fuchsia-500 text-3xl font-bold text-primary-foreground shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                {hintLetters && mode === "recall" ? `${item.name[0].toUpperCase()}…` : "?"}
              </div>
            </motion.div>
          </motion.li>
        );
      })}
    </ul>
  );
}
