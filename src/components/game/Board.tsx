import { cn } from "cn";
import type { Item } from "@/lib/items";

export type BoardMode = "memorize" | "hide" | "recall" | "reveal";

interface BoardProps {
  items: Item[];
  mode: BoardMode;
  recalledIds: string[];
  hintLetters: boolean;
}

export function Board({ items, mode, recalledIds, hintLetters }: BoardProps) {
  const cols = items.length <= 6 ? "grid-cols-3" : "grid-cols-4";
  return (
    <ul className={cn("grid w-full gap-2 sm:gap-3", cols)} aria-label="Table of items">
      {items.map((item, index) => {
        const recalled = recalledIds.includes(item.id);
        const showEmoji = mode === "memorize" || mode === "reveal" || recalled;
        const missed = mode === "reveal" && !recalled;
        return (
          <li
            key={item.id}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center rounded-2xl border bg-card text-card-foreground transition-colors duration-300",
              recalled && "border-emerald-500 bg-emerald-500/15",
              missed && "border-amber-500 bg-amber-500/15",
            )}
          >
            <span
              role="img"
              aria-label={showEmoji ? item.name : `Hidden item ${index + 1}`}
              className={cn(
                "select-none text-5xl leading-none transition-opacity duration-500 sm:text-6xl",
                showEmoji ? "opacity-100" : "opacity-0",
              )}
            >
              {item.emoji}
            </span>
            {!showEmoji && (
              <span
                aria-hidden
                className="absolute text-2xl font-semibold text-muted-foreground"
              >
                {hintLetters && mode === "recall" ? `${item.name[0].toUpperCase()}…` : "?"}
              </span>
            )}
            {(recalled || missed) && (
              <span className="mt-1 text-xs font-medium capitalize sm:text-sm">{item.name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
