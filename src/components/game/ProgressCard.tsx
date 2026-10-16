import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUND_TYPE_LABELS } from "@/lib/levelConfig";
import { RETEST_AFTER_DAYS, type SkillTrend } from "@/lib/skillProgress";

interface ProgressCardProps {
  trends: SkillTrend[];
  /** points gained since the day-1 baseline, null before the first re-test */
  checkChange: number | null;
  checkDue: boolean;
  hasBaseline: boolean;
  onStartCheck: () => void;
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

export function ProgressCard({ trends, checkChange, checkDue, hasBaseline, onStartCheck }: ProgressCardProps) {
  if (trends.length === 0 && !checkDue && checkChange === null) return null;
  return (
    <section className="rounded-3xl border-2 bg-card p-4 shadow-lg" aria-labelledby="progress-title">
      <h2 id="progress-title" className="flex items-center gap-2 text-lg font-bold">
        <TrendingUp className="size-5 text-primary" aria-hidden /> Your progress
      </h2>
      {trends.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {trends.slice(0, 3).map((trend) => (
            <li key={trend.type} className="flex items-center justify-between gap-2">
              <span>{ROUND_TYPE_LABELS[trend.type]}</span>
              <span className="font-bold tabular-nums">
                {trend.delta === null ? `${Math.round(trend.recent ?? 0)}% accuracy` : `${signed(trend.delta)}% this month`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {checkChange !== null ? (
        <p className="mt-2 text-sm text-muted-foreground">Memory check: {signed(checkChange)} points since day 1.</p>
      ) : null}
      {checkDue ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasBaseline
              ? `It has been ${RETEST_AFTER_DAYS} days. Re-test to see how far you have come.`
              : "A one-minute check sets your starting point, so you can see your progress."}
          </p>
          <Button variant="secondary" className="mt-2 h-12 w-full rounded-2xl" onClick={onStartCheck}>
            {hasBaseline ? "Take the re-test" : "Take the memory check"}
          </Button>
        </>
      ) : null}
    </section>
  );
}
