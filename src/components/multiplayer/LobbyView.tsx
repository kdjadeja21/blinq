"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { callMp, shareUrl } from "@/lib/multiplayer/api";
import {
  roomInviteShareMessage,
  roomInviteShareText,
  roomInviteShareTitle,
} from "@/lib/multiplayer/share";
import { MIN_HUMANS, isSquad, maxPlayersFor } from "@/lib/multiplayer/config";
import type { RoomState } from "./useRoom";
import { ErrorNote, PlayerChip, Spinner } from "./shared";
import { GameStartOverlay } from "./GameStartOverlay";
import { teamThemeFor, type TeamTheme } from "@/lib/multiplayer/teamTheme";

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

function ShareCard({ code, hostName }: { code: string; hostName: string }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  async function share() {
    const url = shareUrl(code);
    const fullText = roomInviteShareText(code, hostName, url);
    try {
      if (navigator.share) {
        await navigator.share({
          title: roomInviteShareTitle(),
          text: roomInviteShareMessage(code, hostName),
          url,
        });
      } else {
        await navigator.clipboard.writeText(fullText);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
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
          {shareCopied ? <Check className="size-4" /> : <Share2 className="size-4" />}{" "}
          {shareCopied ? "Copied invite" : "Share link"}
        </Button>
      </div>
    </section>
  );
}

export function LobbyView({ state }: { state: RoomState }) {
  const { room, players, me, isAdmin, online, refresh } = state;
  const { busy, error, run } = useAction();
  const [starting, setStarting] = useState(false);
  if (!room) return null;
  async function startIndividual() {
    if (!room) return;
    setStarting(true);
    const result = await run("start_game", { roomId: room.id });
    if (result === null) setStarting(false);
    else await refresh().catch(() => undefined);
  }
  const humans = players.filter((p) => !p.is_bot).length;
  const individual = room.mode === "individual";
  const odd = !individual && humans % 2 === 1;

  return (
    <div className="flex flex-1 flex-col gap-3">
      {isAdmin ? <ShareCard code={room.code} hostName={me?.name ?? ""} /> : <CodeCard code={room.code} />}
      {starting && <GameStartOverlay />}
      <section className="rounded-3xl border-2 bg-card p-3 shadow-lg" aria-labelledby="players-title">
        <h2 id="players-title" className="text-base font-bold">
          Players{" "}
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {humans}/{maxPlayersFor(room.mode)}
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
              onClick={() => (individual ? startIndividual() : run("create_teams", { roomId: room.id }))}
            >
              {busy || starting ? (
                <>
                  <Spinner /> {individual ? "Starting..." : "Creating teams..."}
                </>
              ) : humans < MIN_HUMANS ? (
                `Waiting for ${MIN_HUMANS - humans} more`
              ) : individual ? (
                "Start game"
              ) : (
                "Create teams"
              )}
            </Button>
          </>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-3 text-center text-muted-foreground" role="status">
            {individual ? "Waiting for the admin to start..." : "Waiting for the admin to create teams..."}
          </p>
        )}
      </div>
    </div>
  );
}

function TeamReveal({ theme, name }: { theme: TeamTheme; name: string }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 1900);
    return () => clearTimeout(id);
  }, []);
  const Icon = theme.icon;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.35 }}
          className={cn("pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center gap-3", theme.gradient)}
        >
          <motion.span
            initial={reduce ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 12 }}
            className="flex size-24 items-center justify-center rounded-full bg-white/20"
          >
            <Icon className="size-14" aria-hidden />
          </motion.span>
          <motion.p
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.15 }}
            className="text-xs font-bold uppercase tracking-[0.3em] opacity-90"
          >
            You are on
          </motion.p>
          <motion.p
            initial={reduce ? false : { scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 14, delay: reduce ? 0 : 0.25 }}
            className="text-5xl font-black"
          >
            {name}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TeamsReadyView({ state }: { state: RoomState }) {
  const { room, players, teams, me, isAdmin, online, refresh } = state;
  const { busy, error, run } = useAction();
  const [starting, setStarting] = useState(false);
  if (!room) return null;
  const myTeamId = players.find((p) => p.id === me?.id)?.team_id;
  const myTeam = teams.find((t) => t.id === myTeamId);
  const myTheme = teamThemeFor(myTeamId, teams);
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
      {myTeam && myTheme && <TeamReveal key={myTeam.id} theme={myTheme} name={myTeam.name} />}
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => {
          const theme = teamThemeFor(team.id, teams);
          const Icon = theme?.icon;
          const mine = team.id === myTeamId;
          return (
          <section
            key={team.id}
            className={cn(
              "relative overflow-hidden rounded-3xl border-2 p-3 shadow-lg",
              theme ? [theme.border, theme.soft] : "bg-card",
              mine && theme && ["shadow-xl", theme.glow],
            )}
            aria-label={team.name}
          >
            <h2 className={cn("-mx-3 -mt-3 mb-3 flex items-center justify-center gap-1.5 px-3 py-2 text-lg font-bold", theme?.gradient)}>
              {Icon && <Icon className="size-5" aria-hidden />}
              {team.name}
            </h2>
            {mine && (
              <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-wider">Your team</p>
            )}
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
          );
        })}
      </div>
      {isSquad(room) && (
        <p className="text-center text-sm text-muted-foreground">Squad: every duel of a level starts at the same time.</p>
      )}
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
