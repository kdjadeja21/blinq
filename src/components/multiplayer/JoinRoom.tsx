"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Dices, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useLayoutEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { callMp } from "@/lib/multiplayer/api";
import { NAME_MAX, ROOM_CODE_LENGTH } from "@/lib/multiplayer/config";
import { ErrorNote, Spinner, TextField } from "./shared";

const ADJECTIVES = ["Swift", "Sneaky", "Brainy", "Lucky", "Fuzzy", "Cosmic", "Zesty", "Mighty", "Clever", "Sunny"];
const ANIMALS = ["Fox", "Owl", "Panda", "Otter", "Koala", "Tiger", "Falcon", "Gecko", "Lynx", "Whale"];

function randomName(): string {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}`.slice(0, NAME_MAX);
}

function CodeBoxes({ value, onChange, autoFocus }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, ROOM_CODE_LENGTH - 1);
          return (
            <div
              key={i}
              className={cn(
                "flex h-16 items-center justify-center rounded-2xl border-2 bg-background/60 font-mono text-3xl font-extrabold transition-all",
                value[i] && "border-primary bg-primary/15",
                active && "scale-105 border-gold ring-4 ring-gold/30",
              )}
            >
              {value[i] ?? (active ? <span className="h-7 w-0.5 animate-pulse bg-gold" /> : "")}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={ROOM_CODE_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        aria-label="Room code"
        className="absolute inset-0 size-full cursor-text opacity-0"
      />
    </div>
  );
}

export function JoinRoom({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const invited = initialCode.length === ROOM_CODE_LENGTH;
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [editingCode, setEditingCode] = useState(!invited);
  const [name, setName] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [navigating, startNavigation] = useTransition();
  // Next keeps this page mounted (hidden) after navigating away; clear transient state so coming back never shows a stuck button.
  useLayoutEffect(() => () => setRequesting(false), []);
  const busy = requesting || navigating;
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setRequesting(true);
    setError(null);
    try {
      const room = await callMp<{ code: string }>("join_room", { code, name });
      startNavigation(() => router.push(`/room/${room.code}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the room.");
    } finally {
      setRequesting(false);
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
            <CodeBoxes value={code} onChange={setCode} autoFocus={!invited} />
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
            autoFocus={invited}
            required
          />
          <Button type="button" variant="ghost" className="h-11 w-fit rounded-xl px-3" onClick={() => setName(randomName())}>
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
