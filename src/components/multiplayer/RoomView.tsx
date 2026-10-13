"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { RoomPhase } from "@/lib/multiplayer/types";
import { DuelView } from "./DuelView";
import { LobbyView, TeamsReadyView, useAction } from "./LobbyView";
import { DuelResultView, FinalView, LevelResultView } from "./ResultViews";
import { Segmented, TeamScores } from "./shared";
import { useRoom, type RoomState } from "./useRoom";

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
      className="flex items-center justify-between gap-2 rounded-3xl border-2 bg-gradient-to-r from-primary to-fuchsia-500 p-3 text-primary-foreground shadow-lg"
    >
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-lg font-extrabold">{a?.name}{tag(duel.player_a)}</p>
        <p className="text-xs opacity-80">{teamName(a?.team_id)}</p>
      </div>
      <span className="text-2xl font-black" aria-label="versus">
        X
      </span>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-lg font-extrabold">{b?.name}{tag(duel.player_b)}</p>
        <p className="text-xs opacity-80">{teamName(b?.team_id)}</p>
      </div>
    </section>
  );
}

function PacingControl({ state }: { state: RoomState }) {
  const { room } = state;
  const { run } = useAction();
  if (!room) return null;
  return (
    <details className="rounded-2xl border-2 bg-card px-3 py-2">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold leading-[2.75rem]">Admin panel</summary>
      <div className="pb-2">
        <Segmented
          label="Pacing"
          value={room.pacing}
          options={[
            { value: "manual", label: "Manual" },
            { value: "auto", label: "Auto" },
          ]}
          onChange={(pacing) => void run("update_settings", { roomId: room.id, pacing })}
        />
      </div>
    </details>
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

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center p-4" aria-busy="true">
        <p className="animate-bounce text-6xl" aria-hidden>
          🧠
        </p>
      </main>
    );
  }
  if (status === "not_member" || status === "error" || !room) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-5xl" aria-hidden>
          🚪
        </p>
        <h1 className="text-2xl font-bold">{status === "error" ? "Could not open the room" : "You're not in this room"}</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Link href={`/join/${code}`} className="text-primary underline-offset-4 hover:underline">
          Join room {code}
        </Link>
      </main>
    );
  }

  const showBanner = state.duel !== null && DUEL_PHASES.includes(room.phase);
  const showScores = teams.length > 0 && room.phase !== "lobby" && room.phase !== "finished";
  const inGame = room.phase !== "lobby" && room.phase !== "teams_ready" && room.phase !== "finished";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className={buttonVariants({ variant: "ghost", className: "h-11 px-2" })}
          onClick={() => {
            if (!inGame) void run("leave_room", { roomId: room.id });
          }}
        >
          <ArrowLeft className="size-4" /> Leave
        </Link>
        <p className="font-mono text-sm font-bold tracking-widest text-muted-foreground">
          {room.code} - Level {room.level}/{room.max_levels}
        </p>
      </header>
      {showBanner && <MatchupBanner state={state} />}
      {showScores && <TeamScores teams={teams} />}
      <Screen state={state} />
      {isAdmin && room.phase !== "finished" && <PacingControl state={state} />}
    </main>
  );
}

