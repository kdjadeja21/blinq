"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import type { ChangeTable } from "@/lib/rounds/change";

export type ChangeMode = "memorize" | "hide" | "recall" | "reveal";

interface ChangeBoardProps {
  table: ChangeTable;
  mode: ChangeMode;
  /** ids of the original items whose change was found */
  foundIds: string[];
  /** ids of unchanged items the player tapped by mistake */
  wrongIds: string[];
  disabled?: boolean;
  onPick?: (id: string) => void;
}

export function ChangeBoard({ table, mode, foundIds, wrongIds, disabled = false, onPick }: ChangeBoardProps) {
  const reduce = useReducedMotion();
  const cols = table.before.length <= 6 ? "grid-cols-3" : "grid-cols-4";
  return (
    <ul className={cn("grid w-full gap-2 sm:gap-3", cols)} aria-label={mode === "recall" ? "Table after the change" : "Table of items"}>
      {table.before.map((original, slot) => {
        const changed = table.changed.includes(slot);
        const found = foundIds.includes(original.id);
        const wrong = wrongIds.includes(original.id);
        const shown = mode === "recall" ? table.after[slot] : mode === "hide" ? undefined : original;
        const missed = mode === "reveal" && changed && !found;
        const now = table.after[slot];
        const name = shown?.name ?? "empty spot";
        const label =
          mode === "hide"
            ? `Hidden item ${slot + 1}`
            : mode === "reveal"
              ? `${original.name}${changed ? (now ? `, became ${now.name}` : ", was removed") : ", unchanged"}${found ? ", found" : missed ? ", missed" : ""}`
              : `${name}${found ? ", changed, found" : wrong ? ", not changed" : ""}`;
        return (
          <motion.li
            key={slot}
            className="aspect-square"
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={wrong && !reduce ? { scale: 1, opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 20,
              delay: reduce ? 0 : slot * 0.03,
              x: { type: "tween", duration: 0.4, delay: 0 },
            }}
          >
            <button
              type="button"
              disabled={mode !== "recall" || disabled || found || wrong}
              onClick={() => onPick?.(original.id)}
              aria-label={label}
              className={cn(
                "relative flex size-full min-h-11 items-center justify-center rounded-2xl border-2 text-5xl outline-none transition-colors sm:text-6xl",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                mode === "hide" && "border-primary/40 bg-gradient-to-br from-primary to-fuchsia-500 text-3xl font-bold text-primary-foreground",
                mode !== "hide" && shown && "border-b-4 bg-card shadow-md",
                mode === "recall" && !shown && "border-dashed border-muted-foreground/40 bg-muted/40",
                mode === "recall" && !disabled && !found && !wrong && "enabled:active:scale-95 enabled:hover:border-primary",
                found && "border-success bg-success/20",
                wrong && "border-destructive bg-destructive/20",
                missed && "border-gold bg-gold/15",
                missed && !reduce && "animate-pulse",
              )}
            >
              {mode === "hide" ? (
                <span aria-hidden>?</span>
              ) : shown ? (
                <span className="select-none leading-none">{shown.emoji}</span>
              ) : null}
              {found || missed ? (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 right-1 rounded-full bg-background/90 px-1.5 text-sm leading-tight shadow"
                >
                  {now ? now.emoji : "✕"}
                </span>
              ) : null}
              {found && mode === "recall" ? <span className="absolute right-1 top-0.5 text-sm text-success">✓</span> : null}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
