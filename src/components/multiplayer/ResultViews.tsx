"use client";

import { Handshake, Star, Trophy } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";
import { useEffect } from "react";
import Link from "next/link";
import { Board } from "@/components/game/Board";
import { Confetti } from "@/components/game/Confetti";
import { useCountUp } from "@/components/game/useCountUp";
import { Button, buttonVariants } from "@/components/ui/button";
import { playCue } from "@/lib/feedback";
import { starsFor } from "@/lib/scoring";
import { teamThemeFor, type TeamTheme } from "@/lib/multiplayer/teamTheme";
import type { DuelResultRow, DuelRow, PlayerRow, TeamRow } from "@/lib/multiplayer/types";
import { toItems } from "./DuelView";
import { ErrorNote, useServerNow } from "./shared";
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
  const { room, duel, players, results, itemKeys, me, teams } = state;
  const mine = Boolean(duel && me && (duel.player_a === me.id || duel.player_b === me.id));
  const outcome = !duel || !mine ? null : duel.winner_id === me?.id ? "win" : duel.winner_id ? "lose" : null;
  useResultCue(outcome);
  if (!room || !duel) return null;
  const teamName = (teamId: string | null | undefined) => teams.find((t) => t.id === teamId)?.name;
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
            <div key={player?.id} className={cn("rounded-2xl border-2 p-3", teamThemeFor(player?.team_id, teams)?.border ?? "border-transparent", teamThemeFor(player?.team_id, teams)?.soft ?? "bg-muted")}>
              <dt className="text-sm font-semibold">
                {player?.name}
                {player?.id === me?.id ? " (you)" : ""}
              </dt>
              <dd className="text-xs text-muted-foreground">{teamName(player?.team_id) ?? "No team"}</dd>
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

function TeamScoreCard({
  name,
  points,
  share,
  isWinner,
  isMine,
  index,
  theme,
}: {
  name: string;
  points: number;
  share: number;
  isWinner: boolean;
  isMine: boolean;
  index: number;
  theme: TeamTheme | null;
}) {
  const Icon = theme?.icon;
  const reduce = useReducedMotion();
  const shown = useCountUp(points);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 18, delay: 0.15 + index * 0.1 }}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-2xl border-2 p-4",
        theme ? [theme.border, theme.soft] : "bg-muted",
        isWinner && "shadow-lg shadow-gold/30 ring-2 ring-gold",
      )}
    >
      {isWinner && (
        <span className="absolute -top-3 flex items-center gap-1 rounded-full bg-gold px-3 py-0.5 text-xs font-bold text-black">
          <Trophy className="size-3" aria-hidden /> Winner
        </span>
      )}
      <dt className="flex items-center gap-1.5 text-sm font-semibold">
        {Icon && <Icon className={cn("size-4", theme?.text)} aria-hidden />}
        {name}
        {isMine && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold">You</span>}
      </dt>
      <dd className="text-4xl font-extrabold tabular-nums">{shown}</dd>
      <dd className="mt-1 h-2 w-full overflow-hidden rounded-full bg-background/60" aria-hidden>
        <motion.span
          className={cn("block h-full rounded-full", theme?.bar ?? "bg-primary")}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${share}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </dd>
    </motion.div>
  );
}

export function LevelResultView({ state }: { state: RoomState }) {
  const { room, duels, results, players, teams, me } = state;
  const reduce = useReducedMotion();
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
  const sum = totals.reduce((acc, t) => acc + t.points, 0);
  const margin = tie ? 0 : first.points - second.points;
  const myWin = !tie && first.team.id === myTeamId;
  const Icon = tie ? Handshake : Trophy;
  return (
    <div className="flex flex-col gap-3">
      {myWin && <Confetti />}
      <section
        className="relative overflow-hidden rounded-3xl border-2 bg-card p-5 text-center shadow-lg"
        aria-labelledby="level-result-title"
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-64 rounded-full bg-gold/20 blur-3xl" />
        <p className="relative mx-auto flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Level {room.level} of {room.max_levels}
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: room.max_levels }, (_, i) => (
              <span key={i} className={cn("size-1.5 rounded-full", i < room.level ? "bg-primary" : "bg-muted-foreground/30")} />
            ))}
          </span>
        </p>
        <motion.div
          className="relative mx-auto mt-4 flex size-20 items-center justify-center rounded-full bg-gold text-black shadow-lg shadow-gold/30"
          initial={reduce ? false : { scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 12 }}
        >
          <Icon className="size-10" aria-hidden />
        </motion.div>
        <h2 id="level-result-title" className="relative mt-3 text-3xl font-extrabold">
          {tie ? "Level tied" : `${first.team.name} wins the level`}
        </h2>
        <p className="relative mt-1 text-sm text-muted-foreground">
          {tie ? "Dead even. Everything is still to play for." : `Ahead by ${margin} ${margin === 1 ? "point" : "points"}`}
        </p>
        <dl className="relative mt-6 grid grid-cols-2 gap-3">
          {totals.map(({ team, points }, i) => (
            <TeamScoreCard
              key={team.id}
              name={team.name}
              points={points}
              share={sum > 0 ? Math.round((points / sum) * 100) : 0}
              isWinner={!tie && team.id === first.team.id}
              isMine={team.id === myTeamId}
              index={i}
              theme={teamThemeFor(team.id, teams)}
            />
          ))}
        </dl>
      </section>
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
  const winnerTheme = teamThemeFor(first?.id, teams);
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
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 p-4 shadow-lg",
          !tie && winnerTheme ? [winnerTheme.border, winnerTheme.soft] : "bg-card",
        )}
      >
        {!tie && winnerTheme && <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-64 rounded-full opacity-40 blur-3xl", winnerTheme.blob)} />}
        <Trophy className="relative mx-auto size-14 text-gold" aria-hidden />
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
