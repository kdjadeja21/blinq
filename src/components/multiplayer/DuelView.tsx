"use client";

import { cn } from "cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { Board } from "@/components/game/Board";
import { ChoiceGrid } from "@/components/game/ChoiceGrid";
import { Lives } from "@/components/game/Lives";
import { TimerRing } from "@/components/game/TimerRing";
import { playCue } from "@/lib/feedback";
import { ITEMS_BY_ID, type Item } from "@/lib/items";
import { HIDE_MS } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { WRONG_PENALTY_MS, comboMultiplier } from "@/lib/scoring";
import type { DuelRow, PlayerRow } from "@/lib/multiplayer/types";
import type { RoomState } from "./useRoom";
import { useServerNow } from "./shared";
import { useDuelPicks } from "./useDuelPicks";
import { VersusIntro } from "./VersusIntro";

export function toItems(keys: string[]): Item[] {
  return keys.flatMap((key) => {
    const item = ITEMS_BY_ID.get(key);
    return item ? [item] : [];
  });
}

function ProgressBar({ player, count, total, mine }: { player: PlayerRow | undefined; count: number; total: number; mine: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm font-semibold">
        <span>{player?.name ?? "?"}{mine ? " (you)" : ""}</span>
        <span className="tabular-nums">
          {count} of {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count} aria-label={`${player?.name ?? "Player"} progress`}>
        <div className={cn("h-full rounded-full transition-all", mine ? "bg-primary" : "bg-fuchsia-500")} style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function correctCount(state: RoomState, duel: DuelRow, elapsedMs: number, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (player?.is_bot && duel.bot_plan) {
    return Math.floor(duel.bot_plan.correct * Math.min(1, Math.max(0, elapsedMs) / duel.bot_plan.finishMs));
  }
  return state.progress.find((p) => p.player_id === playerId)?.correct_count ?? 0;
}

function DuelProgress({ state, duel, elapsedMs }: { state: RoomState; duel: DuelRow; elapsedMs: number }) {
  const { players, me } = state;
  const count = (playerId: string): number => correctCount(state, duel, elapsedMs, playerId);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-3">
      {[duel.player_a, duel.player_b].map((id) => (
        <ProgressBar key={id} player={players.find((p) => p.id === id)} count={count(id)} total={duel.item_count} mine={id === me?.id} />
      ))}
    </div>
  );
}

function useTickCue(seconds: number, active: boolean) {
  const ticking = active && seconds > 0 && seconds <= 5;
  useEffect(() => {
    if (ticking) playCue("tick");
  }, [ticking, seconds]);
}

function Header({ label, seconds, progress, extra }: { label: string; seconds: number; progress: number; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-bold">{label}</h2>
        {extra}
      </div>
      <TimerRing seconds={seconds} progress={progress} label="Time remaining" />
    </div>
  );
}

function Popups({ kind, points, id }: { kind: "good" | "bad"; points: number; id: number }) {
  return (
    <motion.div
      key={id}
      aria-hidden
      initial={{ y: 10, opacity: 1, scale: 0.7 }}
      animate={{ y: -50, opacity: 0, scale: 1.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      className={cn(
        "pointer-events-none absolute left-1/2 -translate-x-1/2 text-3xl font-extrabold drop-shadow-lg",
        kind === "good" ? "top-1/2 text-success" : "top-1/3 text-destructive",
      )}
    >
      {kind === "good" ? `+${points}` : `-${WRONG_PENALTY_MS / 1000}s`}
    </motion.div>
  );
}

function RecallPanel({ state, duel, clock, startedAt }: { state: RoomState; duel: DuelRow; clock: number; startedAt: number }) {
  const choices = useMemo(() => toItems(state.choiceKeys), [state.choiceKeys]);
  const picks = useDuelPicks({ duel, startedAt, memorized: state.memorizedKeys, now: state.now });
  const { score } = picks;

  const current = clock || startedAt;
  const remaining = Math.max(0, startedAt + score.deadlineMs - current);
  const seconds = Math.ceil(remaining / 1000);
  const timeUp = remaining === 0;
  useTickCue(seconds, !picks.stopped && !timeUp);

  const waiting = picks.stopped || timeUp;
  const status = picks.out
    ? "Out of mistakes. Waiting for your opponent."
    : picks.complete || picks.finished
      ? "Done. Waiting for your opponent."
      : timeUp
        ? "Time is up."
        : null;

  return (
    <div className="flex flex-col gap-3">
      <Header
        label="Tap what you saw"
        seconds={seconds}
        progress={Math.min(1, remaining / duel.recall_ms)}
        extra={
          <div className="h-8">
            <AnimatePresence mode="popLayout">
              {score.combo >= 2 && !waiting && (
                <motion.span
                  key={score.combo}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14 }}
                  className="inline-block rounded-full bg-flame px-3 py-1 text-sm font-bold text-black shadow-lg shadow-flame/40"
                >
                  🔥 x{comboMultiplier(score.combo)} combo
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        }
      />
      <div className="relative">
        <ChoiceGrid
          choices={choices}
          recalledIds={picks.right}
          wrongIds={picks.wrong}
          hintId={null}
          pendingIds={picks.pending}
          disabled={waiting}
          onPick={picks.pick}
        />
        <AnimatePresence>
          {picks.popup && <Popups key={picks.popup.key} id={picks.popup.key} kind={picks.popup.kind} points={picks.popup.points} />}
        </AnimatePresence>
      </div>
      {status && (
        <p className="rounded-2xl bg-muted px-3 py-2 text-center text-sm font-medium" role="status">
          {status}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {picks.right.length}/{duel.item_count} found
        </span>
        <Lives lives={picks.lives} />
        <Button variant="secondary" className="h-11 px-4" disabled={waiting} onClick={picks.finish}>
          I&apos;m done
        </Button>
      </div>
      <DuelProgress state={state} duel={duel} elapsedMs={current - startedAt} />
    </div>
  );
}

function RacerCard({ player, teamName, count, total, isLeader, tone }: { player: PlayerRow | undefined; teamName: string | undefined; count: number; total: number; isLeader: boolean; tone: "primary" | "rival" }) {
  return (
    <div className={cn("flex flex-1 flex-col gap-2 rounded-2xl border-2 bg-card p-3", isLeader ? "border-primary" : "border-transparent")}>
      <div className="min-w-0">
        <p className="truncate text-base font-bold">{player?.name ?? "?"}</p>
        <p className="truncate text-xs text-muted-foreground">{teamName ?? "No team"}</p>
      </div>
      <p className="text-3xl font-extrabold tabular-nums">
        {count}
        <span className="text-base font-semibold text-muted-foreground"> / {total}</span>
      </p>
      <div className="h-4 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count} aria-label={`${player?.name ?? "Player"} progress`}>
        <div className={cn("h-full rounded-full transition-all duration-500", tone === "primary" ? "bg-primary" : "bg-fuchsia-500")} style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function SpectatorPanel({ state, duel, elapsedMs }: { state: RoomState; duel: DuelRow; elapsedMs: number }) {
  const { players, teams, me } = state;
  const reduceMotion = useReducedMotion();
  const a = players.find((p) => p.id === duel.player_a);
  const b = players.find((p) => p.id === duel.player_b);
  const teamName = (teamId: string | null | undefined) => teams.find((t) => t.id === teamId)?.name;
  const countA = correctCount(state, duel, elapsedMs, duel.player_a);
  const countB = correctCount(state, duel, elapsedMs, duel.player_b);

  const leader = countA === countB ? null : countA > countB ? a : b;
  const gap = Math.abs(countA - countB);
  const headline = leader ? `${leader.name} leads by ${gap}` : countA === 0 ? "Get ready, it's about to heat up" : "Neck and neck";

  const myTeamId = me?.team_id ?? null;
  const teammate = myTeamId ? [a, b].find((p) => p?.team_id === myTeamId) : undefined;
  const cheer = teammate ? `${teammate.name} is playing for your team. Cheer them on!` : "Rival duel. Scout the competition.";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-2 rounded-3xl border-2 bg-card px-4 py-4 text-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Watching live</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={leader?.id ?? "tie"}
            initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            className="text-xl font-extrabold"
            role="status"
          >
            {headline}
          </motion.p>
        </AnimatePresence>
        <p className={cn("text-sm", teammate ? "font-semibold text-primary" : "text-muted-foreground")}>{cheer}</p>
      </div>
      <div className="flex items-stretch gap-2">
        <RacerCard player={a} teamName={teamName(a?.team_id)} count={countA} total={duel.item_count} isLeader={leader?.id === duel.player_a} tone="primary" />
        <RacerCard player={b} teamName={teamName(b?.team_id)} count={countB} total={duel.item_count} isLeader={leader?.id === duel.player_b} tone="rival" />
      </div>
    </div>
  );
}

function TimesUp() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-sm"
      role="status"
    >
      <motion.p
        initial={{ scale: 2.2, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 14 }}
        className="text-5xl font-black"
      >
        Time&apos;s up!
      </motion.p>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="size-5 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden />
        Counting points...
      </div>
    </motion.div>
  );
}

function MemorizeView({ state, seconds, remaining, durationMs }: { state: RoomState; seconds: number; remaining: number; durationMs: number }) {
  useTickCue(seconds, true);
  const items = toItems(state.itemKeys);
  return (
    <div className="flex flex-col gap-3">
      <Header label="Memorize the table" seconds={seconds} progress={durationMs ? Math.min(1, remaining / durationMs) : 0} />
      <Board items={items} mode={remaining <= HIDE_MS ? "hide" : "memorize"} recalledIds={[]} />
    </div>
  );
}

export function DuelView({ state }: { state: RoomState }) {
  const { room, duel, me, now, players } = state;
  const clock = useServerNow(now);
  const playing = Boolean(duel && me && (duel.player_a === me.id || duel.player_b === me.id));
  if (!room || !duel) return null;

  const started = room.phase_started_at ? Date.parse(room.phase_started_at) : clock;
  const durationMs = room.phase_duration_ms ?? 0;
  const remaining = Math.max(0, started + durationMs - clock);
  const seconds = Math.ceil(remaining / 1000);

  if (room.phase === "duel_intro") {
    const a = players.find((p) => p.id === duel.player_a);
    const b = players.find((p) => p.id === duel.player_b);
    const teamName = (teamId: string | null | undefined) => state.teams.find((t) => t.id === teamId)?.name;
    return (
      <VersusIntro
        key={duel.id}
        a={a}
        b={b}
        teamA={teamName(a?.team_id)}
        teamB={teamName(b?.team_id)}
        meId={me?.id}
        seconds={seconds}
      />
    );
  }

  if (room.phase === "memorize") {
    return <MemorizeView state={state} seconds={seconds} remaining={remaining} durationMs={durationMs} />;
  }

  const timesUp = clock > 0 && remaining === 0;
  if (playing) {
    return (
      <>
        <RecallPanel key={duel.id} state={state} duel={duel} clock={clock} startedAt={started} />
        {timesUp && <TimesUp />}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {timesUp && <TimesUp />}
      <Header label="Players are recalling" seconds={seconds} progress={durationMs ? Math.min(1, remaining / durationMs) : 0} />
      <SpectatorPanel state={state} duel={duel} elapsedMs={clock - started} />
    </div>
  );
}
