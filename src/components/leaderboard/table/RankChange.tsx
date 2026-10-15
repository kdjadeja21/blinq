import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "cn";

export function RankChange({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="w-10" aria-hidden />;
  if (delta === 0) {
    return (
      <span className="flex w-10 items-center justify-end gap-0.5 text-xs font-bold text-muted-foreground" role="img" aria-label="Rank unchanged">
        <Minus className="size-3.5" aria-hidden />
      </span>
    );
  }
  const up = delta > 0;
  const places = Math.abs(delta);
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn("flex w-10 items-center justify-end gap-0.5 text-xs font-extrabold tabular-nums", up ? "text-success" : "text-destructive")}
      role="img"
      aria-label={`${up ? "Up" : "Down"} ${places} ${places === 1 ? "place" : "places"}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {places}
    </span>
  );
}
