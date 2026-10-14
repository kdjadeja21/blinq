"use client";

import { Flame, GraduationCap, Lock, Play, Share2, Sword } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { SOLO_DIFFICULTY, getRoundSpec } from "@/lib/engine";
import { playCue } from "@/lib/feedback";
import { currentStreak, shareText } from "@/lib/progress";
import { isGuestLocked } from "@/lib/solo/guest";
import type { Stats } from "@/lib/storage";
import { GuestHint } from "./SoloAuth";
import { StatTile } from "./StatTile";

interface HomeScreenProps {
  stats: Stats;
  today: string;
  guest: boolean;
  onSignIn: () => void;
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

const CLASH_TIMES = [0, 0.3, 0.4, 0.55, 1];

const ACTION_TILE =
  "min-h-16 w-full flex-col gap-1 rounded-3xl px-2 py-2.5 text-center text-base font-extrabold leading-tight whitespace-normal shadow-lg ring-1 ring-black/10";

function ClashingSwords({ reduce }: { reduce: boolean }) {
  const transition = { duration: 2.2, times: CLASH_TIMES, repeat: Infinity, repeatDelay: 0.8 };
  return (
    <span aria-hidden className="relative inline-flex size-7 items-center justify-center">
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={{ x: -8, rotate: -40 }}
        animate={reduce ? undefined : { x: [-8, -8, 1, -1, -8], rotate: [-40, -40, 0, -6, -40] }}
        transition={transition}
      >
        <Sword className="size-6 text-gold drop-shadow-sm" />
      </motion.span>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={{ x: 8, rotate: 40 }}
        animate={reduce ? undefined : { x: [8, 8, -1, 1, 8], rotate: [40, 40, 0, 6, 40] }}
        transition={transition}
      >
        <Sword className="size-6 -scale-x-100 text-white drop-shadow-sm" />
      </motion.span>
      {reduce ? null : (
        <motion.span
          className="absolute size-3 rounded-full bg-gold blur-[2px]"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0, 1, 0, 0], scale: [0.4, 0.4, 1.8, 2.4, 0.4] }}
          transition={transition}
        />
      )}
    </span>
  );
}

export function HomeScreen({ stats, today, guest, onSignIn, onPlayLevel, onPlayDaily, onTraining }: HomeScreenProps) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const countdown = useResetCountdown();
  const playedToday = stats.daily?.date === today ? stats.daily : null;
  const accuracy = stats.totalItems ? Math.round((stats.correctItems / stats.totalItems) * 100) : null;
  const streak = currentStreak(stats, today);
  const locked = isGuestLocked(guest, stats.level);

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
            animate={reduce ? undefined : { y: [0, -10, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: f.delay }}
          >
            {f.emoji}
          </motion.span>
        ))}
        <motion.p
          className="text-7xl"
          aria-hidden
          initial={reduce ? false : { scale: 0, rotate: -30 }}
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

      <div className="flex flex-col gap-2">
        <motion.div
          className="grid grid-cols-2 gap-2.5"
          animate={reduce || locked ? undefined : { scale: [1, 1.02, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <Button
            variant="game"
            className={cn(ACTION_TILE, "min-w-0")}
            onClick={() => {
              playCue("tap");
              if (locked) onSignIn();
              else onPlayLevel();
            }}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 shadow-inner">
              {locked ? <Lock className="size-4" aria-hidden /> : <Play className="size-5 fill-current" aria-hidden />}
            </span>
            <span className="tracking-tight">{locked ? "Unlock" : "Play"}</span>
            <span className="text-[0.6875rem] font-semibold tabular-nums text-primary-foreground/85">
              Level {stats.level}
              {locked ? null : (
                <>
                  {" · "}
                  {getRoundSpec({ mode: "level", difficulty: SOLO_DIFFICULTY, level: stats.level }).itemCount} items
                </>
              )}
            </span>
          </Button>
          <Link
            href="/multiplayer"
            onClick={() => playCue("battle")}
            aria-label="Multiplayer team battle"
            className={buttonVariants({
              variant: "battle",
              className: cn(ACTION_TILE, "min-w-0 gap-1.5"),
            })}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 shadow-inner">
              <ClashingSwords reduce={!!reduce} />
            </span>
            <span className="tracking-tight">Multiplayer</span>
            <span className="rounded-full bg-black/30 px-2 py-px text-[0.625rem] font-extrabold uppercase tracking-widest text-gold">
              Team battle
            </span>
          </Link>
        </motion.div>
        {guest ? <GuestHint locked={locked} /> : null}
      </div>

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
            <Button
              variant="success"
              className="mt-3 h-12 w-full rounded-2xl text-base"
              onClick={() => {
                playCue("tap");
                onPlayDaily();
              }}
            >
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

      <Button
        variant="ghost"
        className="mt-auto h-11"
        onClick={() => {
          playCue("tap");
          onTraining();
        }}
      >
        <GraduationCap className="size-4" /> {stats.trainingDone ? "Replay training" : "Practice round"}
      </Button>
    </div>
  );
}
