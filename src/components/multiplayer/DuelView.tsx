"use client";

import { cn } from "cn";
import { useMemo, useRef, useState } from "react";
import { Board } from "@/components/game/Board";
import { ChoiceGrid } from "@/components/game/ChoiceGrid";
import { TimerRing } from "@/components/game/TimerRing";
import { playCue } from "@/lib/feedback";
import { ITEMS_BY_ID, type Item } from "@/lib/items";
import { callMp } from "@/lib/multiplayer/api";
import { MAX_LIVES } from "@/lib/scoring";
import type { DuelRow, PlayerRow } from "@/lib/multiplayer/types";
import type { RoomState } from "./useRoom";
import { useServerNow } from "./shared";

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

function DuelProgress({ state, duel, elapsedMs }: { state: RoomState; duel: DuelRow; elapsedMs: number }) {
  const { players, progress, me } = state;
  const count = (playerId: string): number => {
    const player = players.find((p) => p.id === playerId);
    if (player?.is_bot && duel.bot_plan) {
      return Math.floor(duel.bot_plan.correct * Math.min(1, Math.max(0, elapsedMs) / duel.bot_plan.finishMs));
    }
    return progress.find((p) => p.player_id === playerId)?.correct_count ?? 0;
  };
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-3">
      {[duel.player_a, duel.player_b].map((id) => (
        <ProgressBar key={id} player={players.find((p) => p.id === id)} count={count(id)} total={duel.item_count} mine={id === me?.id} />
      ))}
    </div>
  );
}

function Recall({ state, duel }: { state: RoomState; duel: DuelRow }) {
  const choices = useMemo(() => toItems(state.choiceKeys), [state.choiceKeys]);
  const [right, setRight] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const sent = useRef(new Set<string>());
  const out = wrong.length >= MAX_LIVES;

  async function pick(id: string) {
    if (sent.current.has(id) || out) return;
    sent.current.add(id);
    playCue("tap");
    setPending((list) => [...list, id]);
    try {
      const result = await callMp<{ correct?: boolean }>("submit_guess", { duelId: duel.id, itemKey: id });
      if (result.correct === false) {
        playCue("wrong");
        setWrong((list) => [...list, id]);
      } else {
        playCue("correct");
        setRight((list) => [...list, id]);
      }
    } catch {
      sent.current.delete(id);
    } finally {
      setPending((list) => list.filter((key) => key !== id));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ChoiceGrid choices={choices} recalledIds={right} wrongIds={wrong} hintId={null} pendingIds={pending} onPick={pick} />
      <p className="text-center text-xl" role="img" aria-label={`${MAX_LIVES - wrong.length} mistakes left`}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (i < MAX_LIVES - wrong.length ? "❤️" : "🖤")).join(" ")}
      </p>
      {out && <p className="text-center text-sm text-muted-foreground">Out of mistakes. Watch your opponent finish.</p>}
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
  const progressFraction = durationMs ? Math.min(1, remaining / durationMs) : 0;
  const items = toItems(state.itemKeys);
  const opponent = players.find((p) => p.id === (duel.player_a === me?.id ? duel.player_b : duel.player_a));

  if (room.phase === "duel_intro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center" role="status">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Level {room.level} - duel {room.duel_index + 1}
        </p>
        <p className="text-5xl font-extrabold tabular-nums">{seconds}</p>
        <p className="text-muted-foreground">
          {playing ? `Get ready to face ${opponent?.name ?? "your opponent"}` : "Watch the duel"}
        </p>
      </div>
    );
  }

  const label = room.phase === "memorize" ? "Memorize the table" : playing ? "Tap what you saw" : "Players are recalling";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{label}</h2>
        <TimerRing seconds={seconds} progress={progressFraction} label="Time remaining" />
      </div>
      {room.phase === "memorize" && <Board items={items} mode="memorize" recalledIds={[]} />}
      {room.phase === "recall" && playing && <Recall key={duel.id} state={state} duel={duel} />}
      {room.phase === "recall" && !playing && (
        <p className="rounded-2xl bg-muted px-4 py-6 text-center text-muted-foreground">
          Hang tight, this duel is not yours.
        </p>
      )}
      {room.phase === "recall" && (
        <DuelProgress state={state} duel={duel} elapsedMs={clock - started} />
      )}
    </div>
  );
}
