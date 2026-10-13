"use client";

import { Flame, GraduationCap, Play, Share2, Swords } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SOLO_DIFFICULTY, getRoundSpec } from "@/lib/engine";
import { playCue } from "@/lib/feedback";
import { currentStreak, shareText } from "@/lib/progress";
import type { Stats } from "@/lib/storage";
import { StatTile } from "./StatTile";

interface HomeScreenProps {
  stats: Stats;
  today: string;
  onPlayLevel: () => void;
  onPlayDaily: () => void;
  onTraining: () => void;
}

const FLOATERS = [
  { emoji: "🍎", className: "left-2 top-2", delay: 0 },
  { emoji: "🎧", className: "right-3 top-6", delay: 0.6 },
  { emoji: "🔑", className: "left-0 top-24", delay: 1.2 },
  { emoji: "☕", className: "right-0 top-24", delay: 1.8 },
];

function useResetCountdown(): string {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const s = Math.floor((next - now.getTime()) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setText(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);
  return text;
}

export function HomeScreen({ stats, today, onPlayLevel, onPlayDaily, onTraining }: HomeScreenProps) {
  const [copied, setCopied] = useState(false);
  const countdown = useResetCountdown();
  const playedToday = stats.daily?.date === today ? stats.daily : null;
  const accuracy = stats.totalItems ? Math.round((stats.correctItems / stats.totalItems) * 100) : null;
  const streak = currentStreak(stats, today);

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
      <div className="relative py-6 text-center">
        {FLOATERS.map((f) => (
          <motion.span
            key={f.emoji}
            aria-hidden
            className={`absolute text-3xl opacity-80 ${f.className}`}
            animate={{ y: [0, -10, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: f.delay }}
          >
            {f.emoji}
          </motion.span>
        ))}
        <motion.p
          className="text-7xl"
          aria-hidden
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
        >
          🧠
        </motion.p>
        <h1 className="mt-2 bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent">
          Blinq
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
          Memorize the table. Recall it against the clock. Come back tomorrow for a new one.
        </p>
      </div>

      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Button
          variant="game"
          className="h-16 w-full rounded-3xl text-xl"
          onClick={() => {
            playCue("tap");
            onPlayLevel();
          }}
        >
          <Play className="size-6 fill-current" /> Play level {stats.level}
          <span className="text-sm font-normal opacity-80">({getRoundSpec({ mode: "level", difficulty: SOLO_DIFFICULTY, level: stats.level }).itemCount} items)</span>
        </Button>
      </motion.div>

      <Link
        href="/multiplayer"
        className={buttonVariants({ variant: "secondary", className: "h-14 w-full rounded-3xl text-lg font-bold" })}
      >
        <Swords className="size-5" /> Multiplayer
        <span className="text-sm font-normal opacity-80">(team battle)</span>
      </Link>

      <section
        className="rounded-3xl border-2 bg-card p-4 shadow-lg"
        aria-labelledby="daily-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="daily-title" className="text-lg font-bold">
            Daily challenge
          </h2>
          <span
            className="flex items-center gap-1 rounded-full bg-flame/20 px-3 py-1 text-sm font-bold"
            aria-label={`Streak: ${streak} days`}
          >
            <Flame className="size-4 fill-flame text-flame" /> {streak}
          </span>
        </div>
        {playedToday ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Done: {playedToday.correct}/{playedToday.total} remembered, {playedToday.score} pts.
            </p>
            <p className="mt-1 text-sm">
              Next table in <span className="font-bold tabular-nums">{countdown}</span>
            </p>
            <Button variant="secondary" className="mt-3 h-12 w-full rounded-2xl" onClick={share}>
              <Share2 className="size-4" /> {copied ? "Copied!" : "Share result"}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              One table for everyone. One attempt. Resets in{" "}
              <span className="font-bold tabular-nums">{countdown}</span>
            </p>
            <Button variant="success" className="mt-3 h-12 w-full rounded-2xl text-base" onClick={onPlayDaily}>
              Play today&apos;s table
            </Button>
          </>
        )}
      </section>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <StatTile label="Best level" value={String(stats.bestLevel)} />
        <StatTile label="Accuracy" value={accuracy === null ? "–" : `${accuracy}%`} />
        <StatTile label="Best score" value={String(stats.bestScore)} />
      </dl>

      <Button variant="ghost" className="mt-auto h-11" onClick={onTraining}>
        <GraduationCap className="size-4" /> {stats.trainingDone ? "Replay training" : "Practice round"}
      </Button>
    </div>
  );
}
