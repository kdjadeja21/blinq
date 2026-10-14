"use client";

import { cn } from "cn";
import { useMemo, useState } from "react";
import { cumulativeStandings, duelScores, levelStandings } from "@/lib/multiplayer/leaderboard";
import { Leaderboard, Podium } from "./Leaderboard";
import { Segmented } from "./shared";
import type { RoomState } from "./useRoom";

type View = "overall" | "level";

/** Squad standings include the bot, because its points count for its team. */
export function useSquadStandings(state: RoomState) {
  const { room, players, duels, results } = state;
  return useMemo(() => {
    if (!room) return null;
    const board = players.map((p) => ({ id: p.id, name: p.name }));
    const scores = duelScores(duels, results);
    return {
      overall: cumulativeStandings(board, scores, room.level),
      level: levelStandings(board, scores, room.level),
    };
  }, [room, players, duels, results]);
}

function DuelList({ state }: { state: RoomState }) {
  const { room, duels, results, players, me } = state;
  if (!room) return null;
  const ofLevel = duels.filter((d) => d.level === room.level);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const pointsOf = (duelId: string, playerId: string) =>
    results.find((r) => r.duel_id === duelId && r.player_id === playerId)?.points ?? 0;
  return (
    <ul className="flex flex-col gap-1.5 text-left text-sm" aria-label="Duels this level">
      {ofLevel.map((duel) => {
        const mine = me ? duel.player_a === me.id || duel.player_b === me.id : false;
        return (
          <li
            key={duel.id}
            className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2", mine ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/50")}
          >
            {[duel.player_a, duel.player_b].map((id, i) => (
              <span key={id} className={cn("flex min-w-0 flex-1 items-center gap-1", i === 1 && "flex-row-reverse text-right")}>
                <span className={cn("truncate", duel.winner_id === id ? "font-extrabold" : "font-medium")}>
                  {nameOf(id)}
                  {id === me?.id ? " (you)" : ""}
                </span>
                {duel.winner_id === id && <span aria-label="Duel winner">🏆</span>}
                <span className="font-bold tabular-nums">{pointsOf(duel.id, id)}</span>
              </span>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

/** Squad level result: every duel of the level, then the individual standings. */
export function SquadLevelDetails({ state }: { state: RoomState }) {
  const { room, players, teams, me } = state;
  const [view, setView] = useState<View>("overall");
  const standings = useSquadStandings(state);
  if (!room || !standings) return null;
  const rows = view === "overall" ? standings.overall : standings.level;
  return (
    <>
      <section className="flex flex-col gap-2 rounded-3xl border-2 bg-card p-4 shadow-lg" aria-labelledby="squad-duels-title">
        <h3 id="squad-duels-title" className="text-center text-lg font-extrabold">
          Level {room.level} duels
        </h3>
        <DuelList state={state} />
      </section>
      <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 text-center shadow-lg" aria-labelledby="squad-board-title">
        <h3 id="squad-board-title" className="text-lg font-extrabold">
          {view === "overall" ? "Overall leaderboard" : `Level ${room.level} leaderboard`}
        </h3>
        <Segmented
          label="View"
          value={view}
          options={[
            { value: "overall", label: "Overall" },
            { value: "level", label: "This level" },
          ]}
          onChange={setView}
        />
        <Leaderboard
          key={view}
          rows={rows}
          players={players}
          teams={teams}
          meId={me?.id}
          showLevelGain={view === "overall"}
          showChanges={view === "overall" && room.level > 1}
        />
      </section>
    </>
  );
}

/** Squad final: podium and the full individual table, with team markers. */
export function SquadFinalStandings({ state }: { state: RoomState }) {
  const { room, players, teams, me } = state;
  const standings = useSquadStandings(state);
  if (!room || !standings) return null;
  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 shadow-lg" aria-label="Final standings">
      <Podium rows={standings.overall} players={players} />
      <Leaderboard rows={standings.overall} players={players} teams={teams} meId={me?.id} showLevelGain={false} showChanges={room.level > 1} />
    </section>
  );
}
