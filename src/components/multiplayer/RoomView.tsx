"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SoundToggle } from "@/components/game/SoundToggle";
import type { RoomPhase, TeamRow } from "@/lib/multiplayer/types";
import { DuelView } from "./DuelView";
import { LobbyView, TeamsReadyView, useAction } from "./LobbyView";
import { DuelResultView, FinalView, LevelResultView } from "./ResultViews";
import { useServerNow } from "./shared";
import { AdminDialog } from "./AdminDialog";
import { useRoom, type RoomState } from "./useRoom";
import { useRoomMusic } from "./useRoomMusic";

const DUEL_PHASES: RoomPhase[] = ["duel_intro", "memorize", "recall", "duel_result"];

function MatchupBanner({ state }: { state: RoomState }) {
  const { duel, players, teams, me } = state;
  if (!duel) return null;
  const a = players.find((p) => p.id === duel.player_a);
  const b = players.find((p) => p.id === duel.player_b);
  const teamName = (teamId: string | null | undefined) => teams.find((t) => t.id === teamId)?.name;
  const tag = (id: string) => (id === me?.id ? " (you)" : "");
  return (
    <section
      aria-label="Current matchup"
      className="flex items-center justify-between gap-2 rounded-3xl border-2 bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-2 text-primary-foreground shadow-lg"
    >
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-base font-extrabold">{a?.name}{tag(duel.player_a)}</p>
        <p className="text-xs opacity-80">{teamName(a?.team_id)}</p>
      </div>
      <span className="text-2xl font-black" aria-label="versus">
        X
      </span>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-base font-extrabold">{b?.name}{tag(duel.player_b)}</p>
        <p className="text-xs opacity-80">{teamName(b?.team_id)}</p>
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
      {teams.map((team, i) => (
        <span key={team.id} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>-</span>}
          <span className="max-w-16 truncate">{team.name}</span> <span className="text-foreground">{team.score}</span>
        </span>
      ))}
    </p>
  );
}

function Screen({ state }: { state: RoomState }) {
  const phase = state.room?.phase;
  switch (phase) {
    case "lobby":
      return <LobbyView state={state} />;
    case "teams_ready":
      return <TeamsReadyView state={state} />;
    case "duel_intro":
    case "memorize":
    case "recall":
      return <DuelView state={state} />;
    case "duel_result":
      return <DuelResultView state={state} />;
    case "level_result":
      return <LevelResultView state={state} />;
    case "finished":
      return <FinalView state={state} />;
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
      <main className="flex flex-1 items-center justify-center p-4" aria-busy="true">
        <p className="animate-bounce text-6xl" aria-hidden>
          🧠
        </p>
      </main>
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

  const showBanner = state.duel !== null && DUEL_PHASES.includes(room.phase) && room.phase !== "duel_intro";
  const showScores = teams.length > 0 && room.phase !== "lobby" && room.phase !== "teams_ready";
  const inGame = room.phase !== "lobby" && room.phase !== "teams_ready" && room.phase !== "finished";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
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
