"use client";

import { Check, Copy, RotateCcw, Star } from "lucide-react";
import { cn } from "cn";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Round } from "@/lib/game";
import { shareText } from "@/lib/progress";
import type { Stats } from "@/lib/storage";
import { Board } from "./Board";

interface ResultScreenProps {
  round: Round;
  stats: Stats;
  onRetry: () => void;
  onNextLevel: () => void;
  onHome: () => void;
  onStartPlaying: () => void;
}

export function ResultScreen({ round, stats, onRetry, onNextLevel, onHome, onStartPlaying }: ResultScreenProps) {
  const [copied, setCopied] = useState(false);
  const result = round.result;
  if (!result) return null;

  const training = round.mode === "training";
  const missed = result.total - result.correct;
  const trainingRetry = training && !result.perfect && round.attempt < 2;
  const leveledUp = round.mode === "level" && result.stars === 3;

  let headline: string;
  let sub: string;
  if (result.perfect) {
    headline = "Perfect recall!";
    sub = result.speedBonus > 0 ? `+${result.speedBonus} speed bonus` : "Every item remembered.";
  } else if (missed === 1) {
    headline = "So close!";
    sub = "You missed just 1 item. Here it is:";
  } else if (result.won) {
    headline = "Nice round!";
    sub = `You missed ${missed} items. Here they are:`;
  } else {
    headline = "Not this time";
    sub = training ? "No worries, here's what was on the table:" : `You missed ${missed} items. Here's the table:`;
  }

  async function share() {
    if (!stats.daily) return;
    const text = shareText(stats.daily);
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled share or clipboard unavailable
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-5">
      <div className="text-center">
        <div className="mb-2 flex justify-center gap-1" role="img" aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={cn("size-9", n <= result.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
            />
          ))}
        </div>
        <h2 className="text-2xl font-bold">{headline}</h2>
        <p className="text-muted-foreground">{sub}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Recalled" value={`${result.correct}/${result.total}`} />
        <Stat label="Score" value={String(result.score)} />
        <Stat label="Wrong" value={String(result.wrongCount)} />
      </dl>

      <Board items={round.items} mode="reveal" recalledIds={round.recalled.map((r) => r.id)} hintLetters={false} />

      {round.mode === "daily" && (
        <p className="text-center text-sm text-muted-foreground">
          Streak: <strong>{stats.streak}</strong> day{stats.streak === 1 ? "" : "s"}. Come back tomorrow for a new table.
        </p>
      )}
      {leveledUp && (
        <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Level {round.level + 1} unlocked!
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {training ? (
          trainingRetry ? (
            <>
              <Button className="h-12 text-base" onClick={onRetry}>
                <RotateCcw className="size-4" /> Try once more
              </Button>
              <Button variant="ghost" className="h-11" onClick={onStartPlaying}>
                Start playing
              </Button>
            </>
          ) : (
            <Button className="h-12 text-base" onClick={onStartPlaying}>
              Start playing
            </Button>
          )
        ) : round.mode === "daily" ? (
          <>
            <Button className="h-12 text-base" onClick={share}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied!" : "Share result"}
            </Button>
            <Button variant="outline" className="h-12 text-base" onClick={onHome}>
              Home
            </Button>
          </>
        ) : (
          <>
            <Button className="h-12 text-base" onClick={leveledUp ? onNextLevel : onRetry}>
              {leveledUp ? "Next level" : (<><RotateCcw className="size-4" /> Play again</>)}
            </Button>
            {leveledUp && (
              <Button variant="outline" className="h-12 text-base" onClick={onRetry}>
                Replay level
              </Button>
            )}
            <Button variant="ghost" className="h-11" onClick={onHome}>
              Home
            </Button>
          </>
        )}
      </div>
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
