"use client";

import { Star, Trophy } from "lucide-react";
import { cn } from "cn";
import { useEffect } from "react";
import Link from "next/link";
import { Board } from "@/components/game/Board";
import { Confetti } from "@/components/game/Confetti";
import { Button, buttonVariants } from "@/components/ui/button";
import { playCue } from "@/lib/feedback";
import { starsFor } from "@/lib/scoring";
import type { DuelResultRow, DuelRow, PlayerRow, TeamRow } from "@/lib/multiplayer/types";
import { toItems } from "./DuelView";
import { ErrorNote, TeamScores, useServerNow } from "./shared";
import { useAction } from "./LobbyView";
import type { RoomState } from "./useRoom";

function NextControl({ state, label }: { state: RoomState; label: string }) {
  const { room, isAdmin, now } = state;
  const clock = useServerNow(now);
  const { busy, error, run } = useAction();
  if (!room) return null;
  const deadline =
    room.phase_started_at && room.phase_duration_ms !== null
      ? Date.parse(room.phase_started_at) + room.phase_duration_ms
      : null;
  return (
    <div className="flex flex-col gap-3">
      <ErrorNote message={error} />
      {deadline !== null && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          Auto mode: moving on in <span className="font-bold tabular-nums">{Math.max(0, Math.ceil((deadline - clock) / 1000))}</span>s
        </p>
      )}
      {isAdmin ? (
        <Button
          variant="game"
          className="h-14 rounded-3xl text-lg"
          disabled={busy}
          onClick={() => run("next_step", { roomId: room.id, expectedVersion: room.phase_version })}
        >
          {label}
        </Button>
      ) : (
        deadline === null && (
          <p className="rounded-2xl bg-muted px-4 py-3 text-center text-muted-foreground" role="status">
            Waiting for the admin...
          </p>
        )
      )}
    </div>
  );
}

function useResultCue(outcome: "win" | "lose" | null) {
  useEffect(() => {
    if (outcome) playCue(outcome);
  }, [outcome]);
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex justify-center gap-0.5" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={cn("size-5", n <= count ? "fill-gold text-gold" : "text-muted-foreground/40")} aria-hidden />
      ))}
    </span>
  );
}

function nameOf(players: PlayerRow[], id: string | null): string {
  return players.find((p) => p.id === id)?.name ?? "Nobody";
}

export function DuelResultView({ state }: { state: RoomState }) {
  const { room, duel, players, results, teams, itemKeys, me } = state;
  const mine = Boolean(duel && me && (duel.player_a === me.id || duel.player_b === me.id));
  const outcome = !duel || !mine ? null : duel.winner_id === me?.id ? "win" : duel.winner_id ? "lose" : null;
  useResultCue(outcome);
  if (!room || !duel) return null;
  const rows = [duel.player_a, duel.player_b].map((id) => ({
    player: players.find((p) => p.id === id),
    result: results.find((r) => r.duel_id === duel.id && r.player_id === id),
  }));
  const found = new Set(
    rows.flatMap(({ player, result }) => (mine && player?.id !== me?.id ? [] : (result?.found_keys ?? []))),
  );
  const isLast = room.duel_index + 1 >= state.duels.filter((d) => d.level === room.level).length;
  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-3xl border-2 bg-card p-4 text-center shadow-lg" aria-live="polite">
        <p className="text-5xl" aria-hidden>
          {duel.winner_id ? "🏆" : "🤝"}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold">
          {duel.winner_id ? `${nameOf(players, duel.winner_id)} wins!` : "It's a draw"}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {rows.map(({ player, result }) => (
            <div key={player?.id} className="rounded-2xl bg-muted p-3">
              <dt className="text-sm font-semibold">{player?.name}</dt>
              <dd className="text-2xl font-extrabold tabular-nums">+{result?.points ?? 0}</dd>
              <dd>
                <Stars count={starsFor(result?.correct_count ?? 0, duel.item_count)} />
              </dd>
              <dd className="text-xs text-muted-foreground tabular-nums">
                {result?.correct_count ?? 0} of {duel.item_count} found
                {result && result.wrong_count > 0 ? ` - ${result.wrong_count} wrong` : ""}
                {result && result.speed_bonus > 0 ? ` - +${result.speed_bonus} speed` : ""}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <TeamScores teams={teams} />
      {itemKeys.length > 0 && <Board items={toItems(itemKeys)} mode="reveal" recalledIds={[...found]} />}
      <NextControl state={state} label={isLast ? "See level result" : "Next duel"} />
    </div>
  );
}

export function levelTotals(level: number, duels: DuelRow[], results: DuelResultRow[], players: PlayerRow[], teams: TeamRow[]) {
  const ids = new Set(duels.filter((d) => d.level === level).map((d) => d.id));
  const teamOf = new Map(players.map((p) => [p.id, p.team_id]));
  return teams.map((team) => ({
    team,
    points: results
      .filter((r) => ids.has(r.duel_id) && teamOf.get(r.player_id) === team.id)
      .reduce((sum, r) => sum + r.points, 0),
  }));
}

export function LevelResultView({ state }: { state: RoomState }) {
  const { room, duels, results, players, teams, me } = state;
  const myTeamId = players.find((p) => p.id === me?.id)?.team_id;
  const leader = [...teams].sort((a, b) => b.score - a.score);
  const levelOutcome =
    myTeamId && leader.length > 1 && leader[0].score !== leader[1].score ? (leader[0].id === myTeamId ? "win" : "lose") : null;
  useResultCue(levelOutcome);
  if (!room) return null;
  const totals = levelTotals(room.level, duels, results, players, teams);
  const [first, second] = [...totals].sort((a, b) => b.points - a.points);
  const tie = !second || first.points === second.points;
  const last = room.level >= room.max_levels;
  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-3xl border-2 bg-card p-4 text-center shadow-lg">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Level {room.level} of {room.max_levels}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold">{tie ? "Level tied" : `${first.team.name} wins the level`}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {totals.map(({ team, points }) => (
            <div key={team.id} className="rounded-2xl bg-muted p-3">
              <dt className="text-sm font-semibold">{team.name}</dt>
              <dd className="text-2xl font-extrabold tabular-nums">{points}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Total score</h3>
        <TeamScores teams={teams} />
      </div>
      <NextControl state={state} label={last ? "See final result" : "Next level"} />
    </div>
  );
}

export function FinalView({ state }: { state: RoomState }) {
  const { room, teams, players, results, me, isAdmin } = state;
  const { busy, error, run } = useAction();
  const [first, second] = [...teams].sort((a, b) => b.score - a.score);
  const tie = !second || first.score === second.score;
  const myTeam = players.find((p) => p.id === me?.id)?.team_id;
  const won = !tie && Boolean(myTeam) && myTeam === first.id;
  useResultCue(tie || !myTeam ? null : won ? "win" : "lose");

  const totals = players
    .filter((p) => !p.is_bot)
    .map((p) => ({
      player: p,
      points: results.filter((r) => r.player_id === p.id).reduce((sum, r) => sum + r.points, 0),
    }))
    .sort((a, b) => b.points - a.points);
  const mvp = totals[0] && totals[0].points > 0 ? totals[0] : null;
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name;

  return (
    <div className="flex flex-col gap-3 text-center">
      {won && <Confetti />}
      <section className="rounded-3xl border-2 bg-card p-4 shadow-lg">
        <Trophy className="mx-auto size-14 text-gold" aria-hidden />
        <h2 className="mt-2 text-3xl font-extrabold">{tie ? "It's a tie!" : `${first.name} wins!`}</h2>
        {!tie && myTeam && (
          <p className="mt-1 text-muted-foreground">{myTeam === first.id ? "Your team took the game." : "Better luck next time."}</p>
        )}
        {mvp && (
          <p className="mx-auto mt-2 w-fit rounded-full bg-gold px-3 py-1 text-sm font-bold text-black">
            MVP: {mvp.player.name} ({mvp.points})
          </p>
        )}
      </section>
      <TeamScores teams={teams} highlight={tie ? null : first.id} />
      <ul className="flex flex-col gap-1 rounded-2xl border-2 bg-card p-2 text-left text-sm" aria-label="Player points">
        {totals.map(({ player, points }) => (
          <li key={player.id} className="flex items-center justify-between gap-2 px-2 py-1">
            <span className="min-w-0 truncate font-semibold">
              {player.name}
              {player.id === me?.id ? " (you)" : ""}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{teamName(player.team_id)}</span>
            </span>
            <span className="font-bold tabular-nums">{points}</span>
          </li>
        ))}
      </ul>
      <ErrorNote message={error} />
      {isAdmin && room ? (
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
