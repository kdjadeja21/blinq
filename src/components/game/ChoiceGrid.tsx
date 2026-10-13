"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import type { Item } from "@/lib/items";

interface ChoiceGridProps {
  choices: Item[];
  recalledIds: string[];
  wrongIds: string[];
  hintId: string | null;
  onPick: (id: string) => void;
}

export function ChoiceGrid({ choices, recalledIds, wrongIds, hintId, onPick }: ChoiceGridProps) {
  const reduce = useReducedMotion();
  const cols = choices.length <= 12 ? "grid-cols-4" : "grid-cols-5";
  return (
    <ul className={cn("grid w-full gap-2", cols)} aria-label="Tap the items you saw">
      {choices.map((item, index) => {
        const right = recalledIds.includes(item.id);
        const wrong = wrongIds.includes(item.id);
        const used = right || wrong;
        return (
          <motion.li
            key={item.id}
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={wrong && !reduce ? { scale: 1, opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 20, delay: reduce ? 0 : index * 0.025 }}
          >
            <button
              type="button"
              disabled={used}
              onClick={() => onPick(item.id)}
              aria-label={`${item.name}${right ? ", correct" : wrong ? ", not on the table" : ""}`}
              className={cn(
                "relative flex aspect-square w-full min-h-11 items-center justify-center rounded-2xl border-2 border-b-4 bg-card text-4xl shadow-md outline-none transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 enabled:active:translate-y-0.5 enabled:active:border-b-2",
                right && "border-success bg-success/20 shadow-success/40",
                wrong && "border-destructive bg-destructive/15 opacity-60 grayscale",
                hintId === item.id && !used && "animate-pulse border-gold",
              )}
            >
              <span className="select-none leading-none">{item.emoji}</span>
              {right && <span className="absolute right-1 top-0.5 text-sm text-success">✓</span>}
              {wrong && <span className="absolute right-1 top-0.5 text-sm text-destructive">✕</span>}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
