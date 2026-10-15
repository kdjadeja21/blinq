import { Medal } from "lucide-react";
import { cn } from "cn";

export const MEDAL_TONES = ["text-gold", "text-slate-300", "text-amber-600"] as const;

export function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="flex w-7 justify-center" role="img" aria-label={`Rank ${rank}`}>
        <Medal className={cn("size-6", MEDAL_TONES[rank - 1])} aria-hidden />
      </span>
    );
  }
  return <span className="w-7 text-center text-sm font-bold tabular-nums text-muted-foreground">{rank}</span>;
}
