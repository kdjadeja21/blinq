"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { callMp } from "@/lib/multiplayer/api";
import { ensureSession, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_DIFFICULTY, DEFAULT_LEVELS, DEFAULT_PACING, DIFFICULTIES, MAX_ROOM_LEVELS, NAME_MAX } from "@/lib/multiplayer/config";
import type { Difficulty, Pacing } from "@/lib/multiplayer/types";
import { ErrorNote, Segmented, Spinner, TextField } from "./shared";

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTIES) as Difficulty[]).map((value) => ({
  value,
  label: DIFFICULTIES[value].label,
}));
const PACING_OPTIONS: { value: Pacing; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto" },
];

export function CreateRoom() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [pacing, setPacing] = useState<Pacing>(DEFAULT_PACING);
  const [requesting, setRequesting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const busy = requesting || navigating;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured()) void ensureSession().catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setRequesting(true);
    setError(null);
    try {
      const room = await callMp<{ roomId: string; code: string }>("create_room", {
        name,
        maxLevels: levels,
        difficulty,
        pacing,
      });
      startNavigation(() => router.push(`/room/${room.code}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the room.");
    } finally {
      setRequesting(false);
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
        <Segmented label="Pacing" value={pacing} options={PACING_OPTIONS} onChange={setPacing} />
        <p className="-mt-2 text-xs text-muted-foreground">
          Manual: you tap Next after each result. Auto: results advance on their own. You can switch any time.
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
