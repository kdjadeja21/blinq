"use client";

import { Check, Copy, Share2, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callMp, shareUrl } from "@/lib/multiplayer/api";
import { DIFFICULTIES, MAX_PLAYERS, MAX_ROOM_LEVELS, MIN_HUMANS } from "@/lib/multiplayer/config";
import type { Difficulty } from "@/lib/multiplayer/types";
import type { RoomState } from "./useRoom";
import { ErrorNote, PlayerChip, Segmented } from "./shared";

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTIES) as Difficulty[]).map((value) => ({
  value,
  label: DIFFICULTIES[value].label,
}));

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      return await callMp(action, body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function ShareCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = shareUrl(code);
    try {
      if (navigator.share) await navigator.share({ title: "Join my Blinq room", text: `Room ${code}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share cancelled
    }
  }
  async function copyCode() {
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <section className="rounded-3xl border-2 bg-card p-4 text-center shadow-lg" aria-label="Room code">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room code</p>
      <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.3em]">{code}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-12 rounded-2xl" onClick={copyCode}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy code"}
        </Button>
        <Button variant="secondary" className="h-12 rounded-2xl" onClick={share}>
          <Share2 className="size-4" /> Share link
        </Button>
      </div>
    </section>
  );
}

export function LobbyView({ state }: { state: RoomState }) {
  const { room, players, me, isAdmin, online } = state;
  const { busy, error, run } = useAction();
  const [levels, setLevels] = useState<number | null>(null);
  if (!room) return null;
  const shownLevels = levels ?? room.max_levels;
  const commitLevels = () => {
    if (levels !== null && levels !== room.max_levels) void run("update_settings", { roomId: room.id, maxLevels: levels });
    setLevels(null);
  };
  const humans = players.filter((p) => !p.is_bot).length;
  const odd = humans % 2 === 1;

  return (
    <div className="flex flex-col gap-5">
      <ShareCard code={room.code} />
      <section className="rounded-3xl border-2 bg-card p-4 shadow-lg" aria-labelledby="players-title">
        <h2 id="players-title" className="text-lg font-bold">
          Players{" "}
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {humans}/{MAX_PLAYERS}
          </span>
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {players.map((player) => (
            <li key={player.id} className="flex items-center gap-1">
              <PlayerChip player={player} online={online.has(player.id)} you={player.id === me?.id} />
              {isAdmin && player.id !== me?.id && (
                <button
                  type="button"
                  aria-label={`Remove ${player.name}`}
                  disabled={busy}
                  onClick={() => run("kick_player", { roomId: room.id, playerId: player.id })}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <UserX className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {odd && humans >= MIN_HUMANS && (
          <p className="mt-3 text-sm text-muted-foreground">Odd number of players: a computer player will fill the gap.</p>
        )}
      </section>

      {isAdmin ? (
        <section className="flex flex-col gap-4 rounded-3xl border-2 bg-card p-4 shadow-lg">
          <h2 className="text-lg font-bold">Game settings</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="max-levels" className="text-sm font-semibold">
              Levels: <span className="tabular-nums">{shownLevels}</span>
            </label>
            <input
              id="max-levels"
              type="range"
              min={1}
              max={MAX_ROOM_LEVELS}
              value={shownLevels}
              onChange={(e) => setLevels(Number(e.target.value))}
              onPointerUp={commitLevels}
              onKeyUp={commitLevels}
              onBlur={commitLevels}
              className="h-11 accent-primary"
            />
          </div>
          <Segmented
            label="Difficulty"
            value={room.difficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={(difficulty) => void run("update_settings", { roomId: room.id, difficulty })}
          />
          <ErrorNote message={error} />
          <Button
            variant="game"
            className="h-14 rounded-3xl text-lg"
            disabled={busy || humans < MIN_HUMANS}
            onClick={() => run("create_teams", { roomId: room.id })}
          >
            {humans < MIN_HUMANS ? `Waiting for ${MIN_HUMANS - humans} more` : "Create teams"}
          </Button>
        </section>
      ) : (
        <p className="rounded-2xl bg-muted px-4 py-3 text-center text-muted-foreground" role="status">
          Waiting for the admin to create teams...
        </p>
      )}
    </div>
  );
}

export function TeamsReadyView({ state }: { state: RoomState }) {
  const { room, players, teams, me, isAdmin, online } = state;
  const { busy, error, run } = useAction();
  if (!room) return null;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => (
          <section key={team.id} className="rounded-3xl border-2 bg-card p-3 shadow-lg" aria-label={team.name}>
            <h2 className="mb-2 text-center text-lg font-bold">{team.name}</h2>
            <ul className="flex flex-col items-center gap-2">
              {players
                .filter((p) => p.team_id === team.id)
                .map((p) => (
                  <li key={p.id}>
                    <PlayerChip player={p} online={online.has(p.id)} you={p.id === me?.id} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      {isAdmin ? (
        <div className="flex flex-col gap-3">
          <ErrorNote message={error} />
          <Button variant="game" className="h-14 rounded-3xl text-lg" disabled={busy} onClick={() => run("start_game", { roomId: room.id })}>
            Start game
          </Button>
          <Button variant="secondary" className="h-12 rounded-2xl" disabled={busy} onClick={() => run("create_teams", { roomId: room.id })}>
            Shuffle teams again
          </Button>
        </div>
      ) : (
        <p className="rounded-2xl bg-muted px-4 py-3 text-center text-muted-foreground" role="status">
          Teams are ready. Waiting for the admin to start...
        </p>
      )}
    </div>
  );
}
