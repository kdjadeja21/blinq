"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_PROFILES, addProfile, saveProfiles, selectProfile, type ProfileState } from "@/lib/profile";

/** Switch between local player profiles. Each profile keeps its own level, stats and skill progress. */
export function ProfileBar({ state }: { state: ProfileState }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kids, setKids] = useState(false);

  function create() {
    const next = addProfile(state, name, kids, crypto.randomUUID().slice(0, 8));
    if (next === state) return;
    saveProfiles(next);
    setAdding(false);
    setName("");
    setKids(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Player profile" className="flex flex-wrap items-center justify-center gap-2">
        {state.profiles.map((profile) => (
          <Button
            key={profile.id}
            variant={profile.id === state.active ? "game" : "outline"}
            size="sm"
            className="h-9 rounded-full px-4"
            aria-pressed={profile.id === state.active}
            onClick={() => saveProfiles(selectProfile(state, profile.id))}
          >
            {profile.name}
            {profile.kids ? <span className="text-xs opacity-80">Kids</span> : null}
          </Button>
        ))}
        {state.profiles.length < MAX_PROFILES && !adding ? (
          <Button variant="ghost" size="sm" className="h-9 rounded-full" onClick={() => setAdding(true)} aria-label="Add profile">
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>
      {adding ? (
        <form
          className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={16}
              autoFocus
              className="h-11 rounded-xl border-2 bg-background px-3 text-base"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={kids} onChange={(event) => setKids(event.target.checked)} className="size-5" />
            Kids profile (easier, smaller tables)
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="game" className="h-11 flex-1 rounded-xl" disabled={!name.trim()}>
              Create
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
