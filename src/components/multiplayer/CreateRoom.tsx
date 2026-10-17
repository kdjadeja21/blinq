"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { callMp } from "@/lib/multiplayer/api";
import { ensureSession, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_LEVELS,
  DEFAULT_MODE,
  DEFAULT_PACING,
  DEFAULT_TEAM_STYLE,
  DIFFICULTIES,
  MAX_ROOM_LEVELS,
  MODES,
  NAME_MAX,
  PACING_INFO,
  TEAM_STYLES_INFO,
  maxPlayersFor,
} from "@/lib/multiplayer/config";
import { ROOM_ROUND_TYPES, ROUND_TYPE_OPTIONS, DEFAULT_ROUND_TYPE, type RoomRoundType } from "@/lib/multiplayer/roundTypes";
import { TEAM_STYLES, type Difficulty, type Pacing, type RoomMode, type TeamStyle } from "@/lib/multiplayer/types";
import { ErrorNote, Segmented, Spinner, TextField } from "./shared";

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTIES) as Difficulty[]).map((value) => ({
  value,
  label: DIFFICULTIES[value].label,
}));
const MODE_OPTIONS: { value: RoomMode; label: string }[] = [
  { value: "individual", label: MODES.individual.label },
  { value: "team", label: MODES.team.label },
];
const TEAM_STYLE_OPTIONS: { value: TeamStyle; label: string }[] = TEAM_STYLES.map((value) => ({
  value,
  label: TEAM_STYLES_INFO[value].label,
}));
const ROUND_TYPE_CHOICES: { value: RoomRoundType; label: string }[] = ROOM_ROUND_TYPES.map((value) => ({
  value,
  label: ROUND_TYPE_OPTIONS[value].label,
}));
const PACING_OPTIONS: { value: Pacing; label: string }[] = (["manual", "auto"] as const).map((value) => ({
  value,
  label: PACING_INFO[value].label,
}));

export function CreateRoom({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [pacing, setPacing] = useState<Pacing>(DEFAULT_PACING);
  const [mode, setMode] = useState<RoomMode>(DEFAULT_MODE);
  const [teamStyle, setTeamStyle] = useState<TeamStyle>(DEFAULT_TEAM_STYLE);
  const [roundType, setRoundType] = useState<RoomRoundType>(DEFAULT_ROUND_TYPE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) void ensureSession().catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const room = await callMp<{ roomId: string; code: string }>("create_room", {
        name,
        maxLevels: levels,
        difficulty,
        pacing,
        mode,
        ...(mode === "team" ? { teamStyle } : { roundType }),
      });
      router.push(`/room/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the room.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <Link href="/multiplayer" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Create a room</h1>
      <form onSubmit={submit} aria-busy={busy} className="flex flex-col gap-5 rounded-3xl border-2 bg-card p-4 shadow-lg">
        <TextField
          label="Your name"
          hint="Your player name in the lobby — not the room name. You get a share code after creating."
          value={name}
          onChange={setName}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          required
        />
        <Segmented label="Mode" value={mode} options={MODE_OPTIONS} onChange={setMode} />
        <p className="-mt-2 text-xs text-muted-foreground">
          {MODES[mode].description} Up to {maxPlayersFor(mode)} players.
        </p>
        {mode === "team" && (
          <>
            <Segmented label="Team style" value={teamStyle} options={TEAM_STYLE_OPTIONS} onChange={setTeamStyle} />
            <p className="-mt-2 text-xs text-muted-foreground">{TEAM_STYLES_INFO[teamStyle].description}</p>
          </>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="levels" className="text-sm font-semibold">
            Levels: <span className="tabular-nums">{levels}</span>
          </label>
          <input
            id="levels"
            type="range"
            min={1}
            max={MAX_ROOM_LEVELS}
            value={levels}
            onChange={(e) => setLevels(Number(e.target.value))}
            className="h-11 accent-primary"
          />
        </div>
        <Segmented label="Difficulty" value={difficulty} options={DIFFICULTY_OPTIONS} onChange={setDifficulty} />
        {mode === "individual" && (
          <>
            <Segmented label="Round type" value={roundType} options={ROUND_TYPE_CHOICES} onChange={setRoundType} />
            <p className="-mt-2 text-xs text-muted-foreground">{ROUND_TYPE_OPTIONS[roundType].description}</p>
          </>
        )}
        <Segmented label="Pacing" value={pacing} options={PACING_OPTIONS} onChange={setPacing} />
        <p className="-mt-2 text-xs text-muted-foreground">
          {PACING_INFO[pacing].description} You can switch any time.
        </p>
        <ErrorNote message={error} />
        <Button type="submit" variant="game" className="h-14 rounded-3xl text-lg" disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Creating room...
            </>
          ) : (
            "Create room"
          )}
        </Button>
      </form>
    </main>
  );
}
