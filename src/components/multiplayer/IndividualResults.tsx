"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { Confetti } from "@/components/game/Confetti";
import { Button, buttonVariants } from "@/components/ui/button";
import { cumulativeStandings, levelStandings, type RoundScore } from "@/lib/multiplayer/leaderboard";
import { ErrorNote, Segmented } from "./shared";
import { useAction } from "./LobbyView";
import { Leaderboard, Podium } from "./Leaderboard";
import { NextControl, useResultCue } from "./ResultViews";
import type { RoomState } from "./useRoom";

type View = "overall" | "level";

function useStandings(state: RoomState) {
  const { room, players, roundResults } = state;
  return useMemo(() => {
    if (!room) return null;
    const humans = players.filter((p) => !p.is_bot).map((p) => ({ id: p.id, name: p.name }));
    const scores: RoundScore[] = roundResults.map((r) => ({
      playerId: r.player_id,
      level: r.level,
      points: r.points,
      correct: r.correct_count,
      finishedMs: r.finished_ms,
    }));
    return {
      overall: cumulativeStandings(humans, scores, room.level),
      level: levelStandings(humans, scores, room.level),
    };
  }, [room, players, roundResults]);
}

export function RoundResultView({ state }: { state: RoomState }) {
  const { room, players, me } = state;
  const [view, setView] = useState<View>("overall");
  const standings = useStandings(state);
  const rows = standings ? (view === "overall" ? standings.overall : standings.level) : [];
  const leaders = rows.filter((r) => r.rank === 1);
  const celebrate = leaders.some((r) => r.points > 0);
  const iLead = celebrate && leaders.some((r) => r.playerId === me?.id);
  useResultCue(iLead ? "win" : null);
  if (!room || !standings) return null;
  const last = room.level >= room.max_levels;
  return (
    <div className="flex flex-col gap-3">
      {celebrate && <Confetti />}
      <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 text-center shadow-lg" aria-labelledby="round-result-title">
        <p className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Level {room.level} of {room.max_levels}
        </p>
        <h2 id="round-result-title" className="text-2xl font-extrabold">
          {view === "overall" ? "Overall leaderboard" : `Level ${room.level} results`}
        </h2>
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
          meId={me?.id}
          showLevelGain={view === "overall"}
          showChanges={view === "overall" && room.level > 1}
        />
      </section>
      <NextControl state={state} label={last ? "See final result" : "Next level"} />
    </div>
  );
}

export function IndividualFinalView({ state }: { state: RoomState }) {
  const { room, players, me, isAdmin } = state;
  const { busy, error, run } = useAction();
  const standings = useStandings(state);
  const mine = standings?.overall.find((r) => r.playerId === me?.id);
  const won = mine?.rank === 1 && mine.points > 0;
  useResultCue(won ? "win" : null);
  if (!room || !standings) return null;
  const winners = standings.overall.filter((r) => r.rank === 1);
  const celebrate = winners.some((r) => r.points > 0);
  const title = winners.length > 1 ? "It's a tie at the top!" : `${winners[0]?.name ?? "Nobody"} wins!`;
  return (
    <div className="flex flex-col gap-3 text-center">
      {celebrate && <Confetti />}
      <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 shadow-lg">
        <Trophy className="mx-auto size-14 text-gold" aria-hidden />
        <h2 className="text-3xl font-extrabold">{title}</h2>
        <Podium rows={standings.overall} players={players} />
      </section>
      <Leaderboard rows={standings.overall} players={players} meId={me?.id} showLevelGain={false} showChanges={room.level > 1} />
      <ErrorNote message={error} />
      {isAdmin ? (
        <Button variant="game" className="h-14 rounded-3xl text-lg" disabled={busy} onClick={() => run("play_again", { roomId: room.id })}>
          Play again
        </Button>
      ) : (
        <p className="rounded-2xl bg-muted px-4 py-3 text-center text-muted-foreground" role="status">
          Waiting for the admin to start another game...
        </p>
      )}
      <Link href="/" className={buttonVariants({ variant: "ghost", className: "h-11" })}>
        Back to home
      </Link>
    </div>
  );
}
