"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callMp, shareUrl } from "@/lib/multiplayer/api";
import { MAX_PLAYERS, MIN_HUMANS } from "@/lib/multiplayer/config";
import type { RoomState } from "./useRoom";
import { ErrorNote, PlayerChip, Spinner } from "./shared";
import { GameStartOverlay } from "./GameStartOverlay";

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

function CodeCard({ code }: { code: string }) {
  return (
    <section className="rounded-3xl border-2 bg-gradient-to-b from-primary/25 to-card p-4 text-center shadow-lg" aria-label="Room code">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room code</p>
      <p className="font-mono text-4xl font-extrabold tracking-[0.25em]">{code}</p>
    </section>
  );
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
    <section
      className="flex flex-col items-center gap-3 rounded-3xl border-2 bg-gradient-to-b from-primary/25 to-card p-4 shadow-lg"
      aria-label="Room code"
    >
      <div className="rounded-3xl border-b-4 border-primary/60 bg-[#f4efff] p-3 shadow-lg shadow-primary/30">
        <QRCodeSVG
          value={shareUrl(code)}
          size={200}
          level="Q"
          fgColor="#2b1566"
          bgColor="#f4efff"
          title={`Scan to join room ${code}`}
          className="block size-[min(52vw,200px)]"
        />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scan or enter code</p>
        <p className="font-mono text-3xl font-extrabold tracking-[0.25em]">{code}</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <Button variant="secondary" className="h-11 rounded-2xl" onClick={copyCode}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy code"}
        </Button>
        <Button variant="secondary" className="h-11 rounded-2xl" onClick={share}>
          <Share2 className="size-4" /> Share link
        </Button>
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
      {isAdmin ? <ShareCard code={room.code} /> : <CodeCard code={room.code} />}
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
              {busy ? (
                <>
                  <Spinner /> Creating teams...
                </>
              ) : humans < MIN_HUMANS ? (
                `Waiting for ${MIN_HUMANS - humans} more`
              ) : (
                "Create teams"
              )}
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
  const { room, players, teams, me, isAdmin, online, refresh } = state;
  const { busy, error, run } = useAction();
  const [starting, setStarting] = useState(false);
  if (!room) return null;
  async function startGame() {
    if (!room) return;
    setStarting(true);
    const result = await run("start_game", { roomId: room.id });
    if (result === null) setStarting(false);
    else await refresh().catch(() => undefined);
  }
  return (
    <div className="flex flex-1 flex-col gap-3">
      {starting && <GameStartOverlay />}
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
          <Button variant="game" className="h-14 rounded-3xl text-lg" disabled={busy || starting} onClick={startGame}>
            {starting && <Spinner />} Start game
          </Button>
          <Button variant="secondary" className="h-12 rounded-2xl" disabled={busy} onClick={() => run("create_teams", { roomId: room.id })}>
            {busy && <Spinner className="size-4" />} Shuffle teams again
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
