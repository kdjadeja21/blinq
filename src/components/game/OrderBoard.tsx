"use client";

import { cn } from "cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Item } from "@/lib/items";

interface OrderShowcaseProps {
  items: Item[];
  /** index of the item on screen, null while the sequence is hidden */
  index: number | null;
}

/** Shows the sequence one item at a time. */
export function OrderShowcase({ items, index }: OrderShowcaseProps) {
  const reduce = useReducedMotion();
  const item = index === null ? undefined : items[index];
  return (
    <div className="flex flex-col items-center gap-4" aria-label="Sequence of items">
      <div className="flex size-44 items-center justify-center rounded-3xl border-2 border-b-4 bg-card shadow-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={index ?? "hidden"}
            initial={reduce ? false : { scale: 0.4, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="flex flex-col items-center"
          >
            {item ? (
              <span role="img" aria-label={`Item ${(index ?? 0) + 1} of ${items.length}: ${item.name}`} className="select-none text-8xl leading-none">
                {item.emoji}
              </span>
            ) : (
              <span aria-hidden className="text-6xl font-bold text-muted-foreground">
                ?
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <ol className="flex flex-wrap justify-center gap-1.5" aria-hidden>
        {items.map((entry, i) => (
          <li
            key={entry.id}
            className={cn(
              "size-3 rounded-full bg-muted transition-colors",
              index !== null && i < index && "bg-primary/50",
              index === i && "bg-primary",
            )}
          />
        ))}
      </ol>
    </div>
  );
}

interface OrderSlotsProps {
  items: Item[];
  placedIds: string[];
  /** show every item in order, marking the ones that were missed */
  reveal?: boolean;
}

/** The numbered sequence the player is rebuilding. */
export function OrderSlots({ items, placedIds, reveal = false }: OrderSlotsProps) {
  const dense = items.length > 10;
  return (
    <ol className={cn("grid w-full gap-2", dense ? "grid-cols-5" : "grid-cols-4")} aria-label="Your sequence">
      {items.map((item, index) => {
        const placed = index < placedIds.length && placedIds[index] === item.id;
        const showItem = placed || reveal;
        const missed = reveal && !placed;
        return (
          <li
            key={item.id}
            aria-label={showItem ? `${index + 1}: ${item.name}${missed ? ", missed" : ", correct"}` : `${index + 1}: empty`}
            className={cn(
              "relative flex aspect-square min-h-11 items-center justify-center rounded-2xl border-2 text-3xl",
              showItem ? "border-b-4 bg-card shadow-md" : "border-dashed border-muted-foreground/40 bg-muted/40",
              placed && "border-success bg-success/20",
              missed && "border-gold bg-gold/15",
            )}
          >
            <span className="absolute left-1.5 top-0.5 text-xs font-bold text-muted-foreground">{index + 1}</span>
            {showItem ? <span className="select-none leading-none">{item.emoji}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
