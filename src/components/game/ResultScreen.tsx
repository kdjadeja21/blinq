"use client";

import { ArrowRight, Check, House, LogIn, RotateCcw, Share2, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { getRoundSpec } from "@/lib/engine";
import type { Round } from "@/lib/game";
import { playCue } from "@/lib/feedback";
import { sharePath, shareText } from "@/lib/progress";
import type { Stats } from "@/lib/storage";
import { isGuestLocked } from "@/lib/solo/guest";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { StatTile } from "./StatTile";
import { useCountUp } from "./useCountUp";

interface ResultScreenProps {
  round: Round;
  stats: Stats;
  onRetry: () => void;
  onNextLevel: () => void;
  guest: boolean;
  onHome: () => void;
  onStartPlaying: () => void;
}

export function ResultScreen({ round, stats, guest, onRetry, onNextLevel, onHome, onStartPlaying }: ResultScreenProps) {
  const [copied, setCopied] = useState(false);
  const result = round.result;
  const won = result?.won ?? false;
  const score = useCountUp(result?.score ?? 0);

  useEffect(() => {
    playCue(won ? "win" : "lose");
  }, [won]);

  if (!result) return null;

  const training = round.mode === "training";
  const missed = result.total - result.correct;
  const trainingRetry = training && !result.perfect && round.attempt < 2;
  const leveledUp = round.mode === "level" && result.stars === 3;
  const nextLocked = leveledUp && isGuestLocked(guest, round.level + 1);

  const isNewBest = !training && result.score > 0 && result.score >= stats.bestScore;
  const nextStarNeed = nextStarGap(result.correct, result.total);

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
    const query = sharePath(stats.daily);
    const url = `${window.location.origin}/share/daily?${query}`;
    const message = `${shareText(stats.daily)}\n${url}`;
    try {
      let files: File[] = [];
      try {
        const res = await fetch(`/api/share/daily?${query}`);
        if (res.ok) files = [new File([await res.blob()], "blinq-daily.png", { type: "image/png" })];
      } catch {
        // fall back to text and link only
      }
      if (navigator.share) {
        if (files.length > 0 && navigator.canShare?.({ files })) await navigator.share({ files, text: message });
        else await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled share or clipboard unavailable
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-5">
      {result.stars === 3 && <Confetti />}
      <div className="text-center">
        <div className="mb-2 flex justify-center gap-1" role="img" aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <motion.span
              key={n}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.2 + n * 0.25 }}
            >
              <Star
                className={cn(
                  "size-14",
                  n <= result.stars ? "fill-gold text-gold drop-shadow-[0_0_12px_var(--gold)]" : "text-muted-foreground/40",
                )}
              />
            </motion.span>
          ))}
        </div>
        <h2 className="text-3xl font-extrabold">{headline}</h2>
        {isNewBest && (
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 1, stiffness: 400, damping: 12 }}
            className="mx-auto mt-1 w-fit rounded-full bg-gold px-3 py-1 text-sm font-bold text-black"
          >
            New best score!
          </motion.p>
        )}
        <p className="text-muted-foreground">{sub}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <StatTile label="Recalled" value={`${result.correct}/${result.total}`} />
        <StatTile label="Score" value={String(score)} />
        <StatTile label="Wrong" value={String(result.wrongCount)} />
      </dl>

      <Board items={round.items} mode="reveal" recalledIds={round.recalled.map((r) => r.id)} />

      {!result.perfect && result.stars < 3 && (
        <p className="text-center text-sm text-muted-foreground">
          Just <strong>{nextStarNeed}</strong> more item{nextStarNeed === 1 ? "" : "s"} for the next star.
        </p>
      )}
      {round.mode === "daily" && (
        <p className="text-center text-sm text-muted-foreground">
          Streak: <strong>{stats.streak}</strong> day{stats.streak === 1 ? "" : "s"}. Come back tomorrow for a new table.
        </p>
      )}
      {leveledUp && (
        <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {nextLocked ? `You cleared the guest levels! Sign in to play level ${round.level + 1}.` : <>Level {round.level + 1} unlocked! ({getRoundSpec({ mode: "level", difficulty: round.spec.difficulty, level: round.level + 1 }).itemCount} items)</>}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {training ? (
          trainingRetry ? (
            <>
              <Button variant="game" className="h-14 rounded-2xl text-lg" onClick={onRetry}>
                <RotateCcw className="size-4" /> Try once more
              </Button>
              <Button variant="ghost" className="h-11" onClick={onStartPlaying}>
                Start playing
              </Button>
            </>
          ) : (
            <Button variant="game" className="h-14 rounded-2xl text-lg" onClick={onStartPlaying}>
              Start playing
            </Button>
          )
        ) : round.mode === "daily" ? (
          <>
            <Button variant="game" className="h-14 rounded-2xl text-lg" onClick={share}>
              {copied ? <Check className="size-4" /> : <Share2 className="size-4" />} {copied ? "Copied!" : "Share result"}
            </Button>
            <Link href="/leaderboard" className={cn(buttonVariants({ variant: "secondary" }), "h-12 rounded-2xl text-base")}>
              <Trophy className="size-4" /> Leaderboard
            </Link>
            <Button variant="secondary" className="h-12 rounded-2xl text-base" onClick={onHome}>
              <House className="size-4" /> Home
            </Button>
          </>
        ) : leveledUp ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-12 rounded-2xl text-base" onClick={onRetry}>
                <RotateCcw className="size-4" /> Replay level
              </Button>
              <Button variant="success" className="h-12 rounded-2xl text-base" onClick={onNextLevel}>
                {nextLocked ? (
                  <>
                    <LogIn className="size-4" /> Sign in to continue
                  </>
                ) : (
                  <>
                    Next level <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
            <Button variant="ghost" className="h-11 w-full" onClick={onHome}>
              <House className="size-4" /> Home
            </Button>
          </>
        ) : (
          <>
            <Button variant="success" className="h-14 w-full rounded-2xl text-lg" onClick={onRetry}>
              <RotateCcw className="size-4" /> Play again
            </Button>
            <Button variant="ghost" className="h-11 w-full" onClick={onHome}>
              <House className="size-4" /> Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function nextStarGap(correct: number, total: number): number {
  const targets = [Math.ceil(total * 0.5), Math.ceil(total * 0.8), total];
  const next = targets.find((t) => t > correct);
  return next === undefined ? 0 : next - correct;
}
