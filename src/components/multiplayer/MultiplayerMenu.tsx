"use client";

import { ArrowLeft, DoorOpen, PlusCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { playCue } from "@/lib/feedback";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function MultiplayerMenu() {
  const ready = isSupabaseConfigured();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <Link href="/" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Home
      </Link>
      <div className="py-4 text-center">
        <p className="text-6xl" aria-hidden>
          🧠⚔️🧠
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Team battle</h1>
        <p className="mx-auto mt-2 max-w-xs text-muted-foreground">
          Play friends in a private room. Teams duel one-on-one, level by level.
        </p>
      </div>
      {!ready && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Multiplayer is not configured yet. Add the Supabase keys from docs/SUPABASE_SETUP.md.
        </p>
      )}
      <Link
        href="/room/create"
        onClick={() => playCue("tap")}
        className={buttonVariants({ variant: "game", className: "h-16 w-full rounded-3xl text-xl" })}
      >
        <PlusCircle className="size-6" /> Create a room
      </Link>
      <Link
        href="/join"
        onClick={() => playCue("tap")}
        className={buttonVariants({ variant: "success", className: "h-16 w-full rounded-3xl text-xl" })}
      >
        <DoorOpen className="size-6" /> Join a room
      </Link>
    </main>
  );
}
