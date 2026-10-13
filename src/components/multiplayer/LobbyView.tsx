"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callMp, shareUrl } from "@/lib/multiplayer/api";
import { MAX_PLAYERS, MIN_HUMANS } from "@/lib/multiplayer/config";
import type { RoomState } from "./useRoom";
import { ErrorNote, PlayerChip } from "./shared";

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
    <section className="flex items-center gap-3 rounded-3xl border-2 bg-card p-3 shadow-lg" aria-label="Room code">
      <div className="shrink-0 rounded-2xl bg-white p-2">
        <QRCodeSVG value={shareUrl(code)} size={112} level="M" title={`Scan to join room ${code}`} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scan or enter code</p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{code}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="secondary" className="h-11 rounded-xl px-2" onClick={copyCode}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="secondary" className="h-11 rounded-xl px-2" onClick={share}>
            <Share2 className="size-4" /> Share
          </Button>
        </div>
      </div>
    </section>
  );
}

export function LobbyView({ state }: { state: RoomState }) {
  const { room, players, me, isAdmin, online } = state;
  const { busy, error, run } = useAction();
  if (!room) return null;
  const humans = players.filter((p) => !p.is_bot).length;
  const odd = humans % 2 === 1;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ShareCard code={room.code} />
      <section className="rounded-3xl border-2 bg-card p-3 shadow-lg" aria-labelledby="players-title">
        <h2 id="players-title" className="text-base font-bold">
          Players{" "}
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {humans}/{MAX_PLAYERS}
          </span>
        </h2>
        <ul className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto overscroll-contain" aria-live="polite">
          {players.map((player) => (
            <li key={player.id}>
              <PlayerChip player={player} online={online.has(player.id)} you={player.id === me?.id} />
            </li>
          ))}
        </ul>
        {odd && humans >= MIN_HUMANS && (
          <p className="mt-2 text-xs text-muted-foreground">Odd number of players: a computer player will fill the gap.</p>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        {isAdmin ? (
          <>
            <ErrorNote message={error} />
            <Button
              variant="game"
              className="h-14 rounded-3xl text-lg"
              disabled={busy || humans < MIN_HUMANS}
              onClick={() => run("create_teams", { roomId: room.id })}
            >
              {humans < MIN_HUMANS ? `Waiting for ${MIN_HUMANS - humans} more` : "Create teams"}
            </Button>
          </>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-3 text-center text-muted-foreground" role="status">
            Waiting for the admin to create teams...
          </p>
        )}
      </div>
    </div>
  );
}

export function TeamsReadyView({ state }: { state: RoomState }) {
  const { room, players, teams, me, isAdmin, online } = state;
  const { busy, error, run } = useAction();
  if (!room) return null;
  return (
    <div className="flex flex-1 flex-col gap-3">
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
        <div className="mt-auto flex flex-col gap-2">
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
