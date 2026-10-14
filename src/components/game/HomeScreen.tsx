"use client";

import { Flame, GraduationCap, Lock, Play, Share2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SOLO_DIFFICULTY, getRoundSpec } from "@/lib/engine";
import { playCue } from "@/lib/feedback";
import { currentStreak, shareText } from "@/lib/progress";
import { isGuestLocked } from "@/lib/solo/guest";
import type { Stats } from "@/lib/storage";
import { ClashingSwords, HomeActionTile } from "./HomeActionTile";
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
  { emoji: "🍎", className: "left-2 top-1", delay: 0 },
  { emoji: "🎧", className: "right-3 top-4", delay: 0.6 },
  { emoji: "🔑", className: "left-0 top-16", delay: 1.2 },
  { emoji: "☕", className: "right-0 top-16", delay: 1.8 },
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

export function HomeScreen({ stats, today, guest, onSignIn, onPlayLevel, onPlayDaily, onTraining }: HomeScreenProps) {
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();
  const countdown = useResetCountdown();
  const playedToday = stats.daily?.date === today ? stats.daily : null;
  const accuracy = stats.totalItems ? Math.round((stats.correctItems / stats.totalItems) * 100) : null;
  const streak = currentStreak(stats, today);
  const locked = isGuestLocked(guest, stats.level);
  const itemCount = getRoundSpec({ mode: "level", difficulty: SOLO_DIFFICULTY, level: stats.level }).itemCount;

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
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="relative pt-2 pb-3 text-center">
        {FLOATERS.map((f) => (
          <motion.span
            key={f.emoji}
            aria-hidden
            className={`absolute text-2xl opacity-70 ${f.className}`}
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: f.delay }}
          >
            {f.emoji}
          </motion.span>
        ))}
        <motion.p
          className="text-6xl"
          aria-hidden
          initial={reduce ? false : { scale: 0.9, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          🧠
        </motion.p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Memorize the table, then recall it before time runs out.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <HomeActionTile
          variant="primary"
          pulse={!locked}
          icon={
            locked ? (
              <Lock className="size-5" aria-hidden />
            ) : (
              <Play className="size-5 fill-current" aria-hidden />
            )
          }
          title={locked ? "Unlock level" : "Play level"}
          subtitle={locked ? `Level ${stats.level}` : `Level ${stats.level} · ${itemCount} items`}
          onClick={() => {
            playCue("tap");
            if (locked) onSignIn();
            else onPlayLevel();
          }}
        />
        <HomeActionTile
          variant="secondary"
          icon={<ClashingSwords reduce={!!reduce} compact />}
          title="Multiplayer"
          subtitle="Team battle"
          href="/multiplayer"
          ariaLabel="Multiplayer team battle"
          onClick={() => playCue("battle")}
        />
        {guest ? <GuestHint locked={locked} /> : null}
      </div>

      <section
        className="rounded-3xl border-2 bg-card p-4 shadow-md"
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
              One shared table per day. Resets in{" "}
              <span className="font-bold tabular-nums">{countdown}</span>
            </p>
            <Button
              variant="outline"
              className="mt-3 h-12 w-full rounded-2xl border-2 font-bold"
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
