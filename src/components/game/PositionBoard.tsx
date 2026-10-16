"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import type { Item } from "@/lib/items";
import { itemAt, type Layout } from "@/lib/rounds/position";

export type PositionMode = "memorize" | "hide" | "recall" | "reveal";

interface PositionBoardProps {
  items: Item[];
  layout: Layout;
  mode: PositionMode;
  placedIds: string[];
  /** slots that just got a wrong placement */
  wrongSlots?: number[];
  canPlace?: boolean;
  onSlot?: (slot: number) => void;
}

export function positionColumns(slotCount: number): string {
  if (slotCount <= 12) return "grid-cols-4";
  return slotCount <= 20 ? "grid-cols-5" : "grid-cols-6";
}

export function PositionBoard({ items, layout, mode, placedIds, wrongSlots = [], canPlace = false, onSlot }: PositionBoardProps) {
  const reduce = useReducedMotion();
  const byId = new Map(items.map((item) => [item.id, item]));
  const dense = layout.slotCount > 20;

  return (
    <ul className={cn("grid w-full gap-2", positionColumns(layout.slotCount))} aria-label="Table spots">
      {Array.from({ length: layout.slotCount }, (_, slot) => {
        const id = itemAt(layout, slot);
        const item = id ? byId.get(id) : undefined;
        const placed = id !== null && placedIds.includes(id);
        const missed = mode === "reveal" && item !== undefined && !placed;
        const showItem = item !== undefined && (mode === "memorize" || placed || mode === "reveal");
        const wrong = wrongSlots.includes(slot);
        const open = mode === "recall" && !placed;
        const label = showItem
          ? `Spot ${slot + 1}: ${item.name}${placed && mode === "recall" ? ", correct" : ""}`
          : `Spot ${slot + 1}, empty${wrong ? ", wrong item" : ""}`;
        return (
          <motion.li
            key={slot}
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={wrong && !reduce ? { scale: 1, opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 20, delay: reduce ? 0 : slot * 0.02 }}
          >
            <button
              type="button"
              disabled={!open || !canPlace}
              onClick={() => onSlot?.(slot)}
              aria-label={label}
              className={cn(
                "relative flex aspect-square min-h-11 w-full items-center justify-center rounded-2xl border-2 outline-none transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                showItem ? "border-b-4 bg-card shadow-md" : "border-dashed border-muted-foreground/40 bg-muted/40",
                dense ? "text-3xl" : "text-4xl",
                placed && "border-success bg-success/20",
                missed && !reduce && "animate-pulse",
                missed && "border-gold bg-gold/15",
                wrong && "border-destructive bg-destructive/20",
                open && canPlace && "enabled:active:scale-95 enabled:hover:border-primary",
              )}
            >
              {showItem ? <span className="select-none leading-none">{item.emoji}</span> : null}
              {placed && mode === "recall" ? <span className="absolute right-1 top-0.5 text-sm text-success">✓</span> : null}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

interface PlaceTrayProps {
  items: Item[];
  placedIds: string[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
}

export function PlaceTray({ items, placedIds, selectedId, disabled = false, onSelect }: PlaceTrayProps) {
  const waiting = items.filter((item) => !placedIds.includes(item.id));
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Items to place. Pick one, then tap its spot.">
      {waiting.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.id)}
            aria-pressed={selectedId === item.id}
            aria-label={`${item.name}${selectedId === item.id ? ", selected" : ""}`}
            className={cn(
              "flex size-12 items-center justify-center rounded-xl border-2 border-b-4 bg-card text-3xl shadow-md outline-none transition-transform",
              "focus-visible:ring-3 focus-visible:ring-ring/50 enabled:active:translate-y-0.5",
              selectedId === item.id && "-translate-y-1 border-primary bg-primary/15",
              disabled && "opacity-40 grayscale",
            )}
          >
            <span className="select-none leading-none">{item.emoji}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
