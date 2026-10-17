"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Dices, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { callMp } from "@/lib/multiplayer/api";
import { surprisePersona } from "@/lib/multiplayer/avatars";
import { NAME_MAX, ROOM_CODE_LENGTH } from "@/lib/multiplayer/config";
import { ErrorNote, Spinner, TextField } from "./shared";

function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
}

function CodeBoxes({ value, onChange, autoFocus }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [startIndex] = useState(() => (value.length === 0 ? 0 : Math.min(value.length, ROOM_CODE_LENGTH - 1)));

  function boxAt(index: number): HTMLInputElement | null {
    const boxes = groupRef.current?.querySelectorAll("input");
    const box = boxes?.[Math.max(0, Math.min(index, ROOM_CODE_LENGTH - 1))];
    return box instanceof HTMLInputElement ? box : null;
  }

  function focusAt(index: number) {
    const input = boxAt(index);
    input?.focus();
    input?.select();
  }

  useEffect(() => {
    if (!autoFocus) return;
    const input = boxAt(startIndex);
    input?.focus();
    input?.select();
  }, [autoFocus, startIndex]);

  function writeAt(index: number, raw: string) {
    const cleaned = cleanCode(raw);
    if (!cleaned) {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    const chars = value.split("");
    for (let offset = 0; offset < cleaned.length && index + offset < ROOM_CODE_LENGTH; offset++) {
      chars[index + offset] = cleaned[offset] ?? "";
    }
    onChange(cleanCode(chars.join("")));
    focusAt(Math.min(index + cleaned.length, ROOM_CODE_LENGTH - 1));
  }

  return (
    <div ref={groupRef} className="grid grid-cols-6 gap-2" role="group" aria-label="Room code">
      {Array.from({ length: ROOM_CODE_LENGTH }, (_, index) => {
        const char = value[index] ?? "";
        return (
          <div key={index} className="relative">
            <input
              value={char}
              onChange={(event) => writeAt(index, event.target.value)}
              onPaste={(event) => {
                event.preventDefault();
                writeAt(index, event.clipboardData.getData("text"));
              }}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === "Backspace") {
                  event.preventDefault();
                  if (char) onChange(value.slice(0, index) + value.slice(index + 1));
                  else if (index > 0) {
                    onChange(value.slice(0, index - 1) + value.slice(index));
                    focusAt(index - 1);
                  }
                  return;
                }
                if (event.key === "ArrowLeft" && index > 0) {
                  event.preventDefault();
                  focusAt(index - 1);
                } else if (event.key === "ArrowRight" && index < ROOM_CODE_LENGTH - 1) {
                  event.preventDefault();
                  focusAt(index + 1);
                }
              }}
              maxLength={ROOM_CODE_LENGTH}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus={autoFocus && index === startIndex}
              aria-label={`Room code character ${index + 1} of ${ROOM_CODE_LENGTH}`}
              className={cn(
                "peer h-16 w-full rounded-2xl border-2 bg-background/60 text-center font-mono text-3xl font-extrabold outline-none transition-all focus:scale-105 focus:border-gold focus:ring-4 focus:ring-gold/30",
                char && "border-primary bg-primary/15",
              )}
            />
            {char ? null : (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden items-center justify-center peer-focus:flex motion-reduce:peer-focus:hidden"
              >
                <span className="h-7 w-0.5 animate-pulse bg-gold motion-reduce:animate-none" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function JoinRoom({ initialCode = "", defaultName = "" }: { initialCode?: string; defaultName?: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const invited = initialCode.length === ROOM_CODE_LENGTH;
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [editingCode, setEditingCode] = useState(!invited);
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const room = await callMp<{ code: string }>("join_room", { code, name, ...(avatar ? { avatar } : {}) });
      router.push(`/room/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the room.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <Link href="/multiplayer" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="text-center">
        <motion.p
          aria-hidden
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 12 }}
          className="text-6xl"
        >
          🎟️
        </motion.p>
        <h1 className="mt-1 bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          {invited && !editingCode ? "You're invited!" : "Join the battle"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {invited && !editingCode ? "Pick a name and jump into the room." : "Enter the 6-character code from your host."}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-3xl border-2 bg-gradient-to-b from-primary/15 to-card p-4 shadow-lg"
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Room code</span>
          {editingCode ? (
            <CodeBoxes value={code} onChange={setCode} autoFocus />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-primary/50 bg-primary/10 px-4 py-3">
              <span className="font-mono text-3xl font-extrabold tracking-[0.25em]">{code}</span>
              <button
                type="button"
                onClick={() => setEditingCode(true)}
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                Change
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <TextField
            label="Your name"
            hint="Your player name in this room."
            value={name}
            onChange={setName}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            autoFocus={invited && !editingCode}
            required
            prefix={avatar ? <span aria-label="Avatar">{avatar}</span> : undefined}
          />
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-fit rounded-xl px-3"
            onClick={() => {
              const persona = surprisePersona();
              setName(persona.name);
              setAvatar(persona.avatar);
            }}
          >
            <Dices className="size-4" /> Surprise me
          </Button>
        </div>

        <ErrorNote message={error} />
        <Button
          type="submit"
          variant="success"
          className="h-14 rounded-3xl text-lg"
          disabled={busy || code.length !== ROOM_CODE_LENGTH || !name.trim()}
        >
          {busy ? <Spinner /> : <LogIn className="size-5" />} {busy ? "Joining..." : "Join room"}
        </Button>
      </form>
    </main>
  );
}
