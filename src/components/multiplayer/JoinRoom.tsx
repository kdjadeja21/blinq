"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callMp } from "@/lib/multiplayer/api";
import { NAME_MAX, ROOM_CODE_LENGTH } from "@/lib/multiplayer/config";
import { ErrorNote, TextField } from "./shared";

export function JoinRoom({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const room = await callMp<{ code: string }>("join_room", { code, name });
      router.push(`/room/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the room.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <Link href="/multiplayer" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Join a room</h1>
      <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border-2 bg-card p-4 shadow-lg">
        <TextField
          label="Room code"
          value={code}
          onChange={(value) => setCode(value.toUpperCase())}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="h-14 text-center font-mono text-2xl tracking-[0.3em]"
          required
        />
        <TextField label="Your name" value={name} onChange={setName} maxLength={NAME_MAX} autoComplete="nickname" required />
        <ErrorNote message={error} />
        <Button type="submit" variant="success" className="h-14 rounded-3xl text-lg" disabled={busy || code.length !== ROOM_CODE_LENGTH}>
          {busy ? "Joining..." : "Join"}
        </Button>
      </form>
    </main>
  );
}
