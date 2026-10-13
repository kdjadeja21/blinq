"use client";

import { Flame, GraduationCap, Play, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { currentStreak, shareText } from "@/lib/progress";
import { levelItemCount } from "@/lib/scoring";
import type { Stats } from "@/lib/storage";

interface HomeScreenProps {
  stats: Stats;
  today: string;
  onPlayLevel: () => void;
  onPlayDaily: () => void;
  onTraining: () => void;
}

export function HomeScreen({ stats, today, onPlayLevel, onPlayDaily, onTraining }: HomeScreenProps) {
  const [copied, setCopied] = useState(false);
  const playedToday = stats.daily?.date === today ? stats.daily : null;
  const accuracy = stats.totalItems ? Math.round((stats.correctItems / stats.totalItems) * 100) : null;

  async function share() {
    if (!playedToday) return;
    const text = shareText(playedToday);
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // cancelled or unavailable
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-5">
      <div className="py-4 text-center">
        <p className="text-6xl" aria-hidden>
          🧠
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Blinq</h1>
        <p className="mt-2 text-muted-foreground">
          Memorize the table. Recall it in 30 seconds. Come back tomorrow for a new one.
        </p>
      </div>

      <Button className="h-14 text-lg" onClick={onPlayLevel}>
        <Play className="size-5" /> Play level {stats.level}
        <span className="text-sm font-normal opacity-80">({levelItemCount(stats.level)} items)</span>
      </Button>

      <section className="rounded-2xl border bg-card p-4" aria-labelledby="daily-title">
        <div className="flex items-center justify-between">
          <h2 id="daily-title" className="font-semibold">
            Daily challenge
          </h2>
          <span className="flex items-center gap-1 text-sm font-medium" aria-label={`Streak: ${currentStreak(stats, today)} days`}>
            <Flame className="size-4 text-orange-500" /> {currentStreak(stats, today)}
          </span>
        </div>
        {playedToday ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Done for today: {playedToday.correct}/{playedToday.total} remembered, {playedToday.score} pts. New table tomorrow (UTC).
            </p>
            <Button variant="outline" className="mt-3 h-11 w-full" onClick={share}>
              <Share2 className="size-4" /> {copied ? "Copied!" : "Share result"}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">One table for everyone. One attempt per day.</p>
            <Button variant="secondary" className="mt-3 h-11 w-full" onClick={onPlayDaily}>
              Play today&apos;s table
            </Button>
          </>
        )}
      </section>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Best level" value={String(stats.bestLevel)} />
        <Stat label="Accuracy" value={accuracy === null ? "–" : `${accuracy}%`} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
      </dl>

      <Button variant="ghost" className="mt-auto h-11" onClick={onTraining}>
        <GraduationCap className="size-4" /> Replay training
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
