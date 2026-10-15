"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SoundToggle } from "@/components/game/SoundToggle";
import type { RoomPhase, TeamRow } from "@/lib/multiplayer/types";
import { DuelView } from "./DuelView";
import { IndividualFinalView, RoundResultView } from "./IndividualResults";
import { RoundView } from "./RoundView";
import { LobbyView, TeamsReadyView, useAction } from "./LobbyView";
import { DuelResultView, FinalView, LevelResultView } from "./ResultViews";
import { useServerNow } from "./shared";
import { AdminDialog } from "./AdminDialog";
import { RoomLoading } from "./RoomLoading";
import { useRoom, type RoomState } from "./useRoom";
import { useRoomMusic } from "./useRoomMusic";
import { TeamAmbient } from "./TeamAmbient";
import { teamThemeFor } from "@/lib/multiplayer/teamTheme";

const DUEL_PHASES: RoomPhase[] = ["duel_intro", "memorize", "recall", "duel_result"];

function MatchupBanner({ state }: { state: RoomState }) {
  const { duel, players, teams } = state;
  if (!duel) return null;
  const a = players.find((p) => p.id === duel.player_a);
  const b = players.find((p) => p.id === duel.player_b);
  const teamName = (teamId: string | null | undefined) => teams.find((t) => t.id === teamId)?.name;
  const themeA = teamThemeFor(a?.team_id, teams);
  const themeB = teamThemeFor(b?.team_id, teams);
  const IconA = themeA?.icon;
  const IconB = themeB?.icon;
  return (
    <section
      aria-label="Current matchup"
      className="flex items-center justify-between gap-2 overflow-hidden rounded-3xl border-2 bg-card p-1 shadow-lg"
    >
      <div className={cn("min-w-0 flex-1 rounded-l-3xl rounded-r-lg px-2 py-2 text-center", themeA?.gradient ?? "bg-primary text-primary-foreground")}>
        <p className="truncate text-base font-extrabold">{a?.name}</p>
        <p className="flex items-center justify-center gap-1 text-xs opacity-90">
          {IconA && <IconA className="size-3" aria-hidden />}
          {teamName(a?.team_id)}
        </p>
      </div>
      <span className="text-2xl font-black" aria-label="versus">
        X
      </span>
      <div className={cn("min-w-0 flex-1 rounded-l-lg rounded-r-3xl px-2 py-2 text-center", themeB?.gradientReverse ?? "bg-fuchsia-500 text-white")}>
        <p className="truncate text-base font-extrabold">{b?.name}</p>
        <p className="flex items-center justify-center gap-1 text-xs opacity-90">
          {IconB && <IconB className="size-3" aria-hidden />}
          {teamName(b?.team_id)}
        </p>
      </div>
    </section>
  );
}

function RoomMusic({ state }: { state: RoomState }) {
  const { room, now } = state;
  const clock = useServerNow(now, 1000);
  const started = room?.phase_started_at ? Date.parse(room.phase_started_at) : clock;
  const remaining = Math.max(0, started + (room?.phase_duration_ms ?? 0) - clock);
  useRoomMusic(room?.phase, remaining);
  return null;
}

function ScoreStrip({ teams }: { teams: TeamRow[] }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold tabular-nums text-muted-foreground" aria-label="Team scores">
      {teams.map((team, i) => {
        const theme = teamThemeFor(team.id, teams);
        return (
          <span key={team.id} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>-</span>}
            <span aria-hidden className={cn("size-2 rounded-full", theme?.bar)} />
            <span className="max-w-16 truncate">{team.name}</span> <span className="text-foreground">{team.score}</span>
          </span>
        );
      })}
    </p>
  );
}

function MyTeamPill({ state }: { state: RoomState }) {
  const { teams, me, players } = state;
  const team = teams.find((t) => t.id === players.find((p) => p.id === me?.id)?.team_id);
  const theme = teamThemeFor(team?.id, teams);
  if (!team || !theme) return null;
  const Icon = theme.icon;
  return (
    <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm", theme.pill)}>
      <Icon className="size-3" aria-hidden /> {team.name}
    </span>
  );
}

function Screen({ state }: { state: RoomState }) {
  const phase = state.room?.phase;
  const individual = state.room?.mode === "individual";
  switch (phase) {
    case "lobby":
      return <LobbyView state={state} />;
    case "teams_ready":
      return <TeamsReadyView state={state} />;
    case "duel_intro":
    case "memorize":
    case "recall":
      return individual ? <RoundView state={state} /> : <DuelView state={state} />;
    case "duel_result":
      return <DuelResultView state={state} />;
    case "level_result":
      return individual ? <RoundResultView state={state} /> : <LevelResultView state={state} />;
    case "finished":
      return individual ? <IndividualFinalView state={state} /> : <FinalView state={state} />;
    case undefined:
      return null;
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

export function RoomView({ code }: { code: string }) {
  const state = useRoom(code);
  const { status, room, error, teams, isAdmin } = state;
  const { run } = useAction();
  const router = useRouter();

  useEffect(() => {
    if (status === "not_member") router.replace(`/join/${code}`);
  }, [status, code, router]);

  if (status === "loading" || status === "not_member") {
    return (
      <RoomLoading />
    );
  }
  if (status === "error" || !room) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-5xl" aria-hidden>
          🚪
        </p>
        <h1 className="text-2xl font-bold">Could not open the room</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Link href={`/join/${code}`} className={buttonVariants({ variant: "game", className: "h-12 rounded-2xl px-6" })}>
          Join room {code}
        </Link>
      </main>
    );
  }

  const showBanner = state.duel !== null && DUEL_PHASES.includes(room.phase) && room.phase !== "duel_intro" && room.phase !== "duel_result";
  const showScores = teams.length > 0 && room.phase !== "lobby" && room.phase !== "teams_ready";
  const inGame = room.phase !== "lobby" && room.phase !== "teams_ready" && room.phase !== "finished";
  const myTeamId = state.players.find((p) => p.id === state.me?.id)?.team_id;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
      <TeamAmbient theme={teamThemeFor(myTeamId, teams)} phase={room.phase} />
      <RoomMusic state={state} />
      <header className="flex items-center justify-between gap-1">
        <Link
          href="/"
          aria-label="Leave room"
          className={buttonVariants({ variant: "ghost", className: "h-11 px-2" })}
          onClick={() => {
            if (!inGame) void run("leave_room", { roomId: room.id });
          }}
        >
          <ArrowLeft className="size-4" /> Leave
        </Link>
        <div className="flex min-w-0 flex-col items-center leading-tight">
          <p className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
            {room.code} - Level {room.level}/{room.max_levels}
          </p>
          {showScores && <ScoreStrip teams={teams} />}
          {room.phase !== "lobby" && <MyTeamPill state={state} />}
        </div>
        <div className="flex items-center">
          {isAdmin && room.phase !== "finished" && <AdminDialog state={state} />}
          <SoundToggle />
        </div>
      </header>
      {showBanner && <MatchupBanner state={state} />}
      <Screen state={state} />
    </main>
  );
}
