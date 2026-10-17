"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Settings, UserX, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DIFFICULTIES, MAX_ROOM_LEVELS, PACING_INFO } from "@/lib/multiplayer/config";
import { ROOM_ROUND_TYPES, ROUND_TYPE_OPTIONS } from "@/lib/multiplayer/roundTypes";
import type { Difficulty } from "@/lib/multiplayer/types";
import { useAction } from "./LobbyView";
import { ErrorNote, PlayerChip, Segmented } from "./shared";
import type { RoomState } from "./useRoom";

const ROUND_TYPE_CHOICES = ROOM_ROUND_TYPES.map((value) => ({ value, label: ROUND_TYPE_OPTIONS[value].label }));

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTIES) as Difficulty[]).map((value) => ({
  value,
  label: DIFFICULTIES[value].label,
}));

const PACING_OPTIONS = (["manual", "auto"] as const).map((value) => ({
  value,
  label: PACING_INFO[value].label,
}));

export function AdminDialog({ state }: { state: RoomState }) {
  const { room, players, me, online } = state;
  const { busy, error, run } = useAction();
  const [levels, setLevels] = useState<number | null>(null);
  if (!room) return null;

  const preGame = room.phase === "lobby" || room.phase === "teams_ready";
  const shownLevels = levels ?? room.max_levels;
  const commitLevels = () => {
    if (levels !== null && levels !== room.max_levels) void run("update_settings", { roomId: room.id, maxLevels: levels });
    setLevels(null);
  };
  const others = players.filter((p) => p.id !== me?.id && !p.is_bot);

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Admin settings"
        className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Settings className="size-4" /> Settings
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-x-3 top-1/2 z-50 mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-md -translate-y-1/2 flex-col gap-4 overflow-y-auto overscroll-contain rounded-3xl border-2 bg-card p-4 shadow-2xl outline-none transition-all data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold">Admin settings</Dialog.Title>
            <Dialog.Close aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-muted">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {preGame && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="max-levels" className="text-sm font-semibold">
                  Levels: <span className="tabular-nums">{shownLevels}</span>
                </label>
                <input
                  id="max-levels"
                  type="range"
                  min={1}
                  max={MAX_ROOM_LEVELS}
                  value={shownLevels}
                  onChange={(e) => setLevels(Number(e.target.value))}
                  onPointerUp={commitLevels}
                  onKeyUp={commitLevels}
                  onBlur={commitLevels}
                  className="h-11 accent-primary"
                />
              </div>
              <Segmented
                label="Difficulty"
                value={room.difficulty}
                options={DIFFICULTY_OPTIONS}
                onChange={(difficulty) => void run("update_settings", { roomId: room.id, difficulty })}
              />
              {room.mode === "individual" && (
                <Segmented
                  label="Round type"
                  value={room.round_type}
                  options={ROUND_TYPE_CHOICES}
                  onChange={(roundType) => void run("update_settings", { roomId: room.id, roundType })}
                />
              )}
            </>
          )}

          <Segmented
            label={room.mode === "individual" ? "Pacing between levels" : "Pacing between duels"}
            value={room.pacing}
            options={PACING_OPTIONS}
            onChange={(pacing) => void run("update_settings", { roomId: room.id, pacing })}
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            {PACING_INFO[room.pacing].description} You can switch any time.
          </p>

          {preGame && others.length > 0 && (
            <section aria-labelledby="remove-title" className="flex flex-col gap-2">
              <h3 id="remove-title" className="text-sm font-semibold">
                Remove a player
              </h3>
              <ul className="flex flex-col gap-1">
                {others.map((player) => (
                  <li key={player.id} className="flex items-center justify-between gap-2">
                    <PlayerChip player={player} online={online.has(player.id)} />
                    <Button
                      variant="destructive"
                      className="h-11 rounded-xl px-3"
                      disabled={busy}
                      aria-label={`Remove ${player.name}`}
                      onClick={() => run("kick_player", { roomId: room.id, playerId: player.id })}
                    >
                      <UserX className="size-4" /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ErrorNote message={error} />
          <Dialog.Close render={<Button variant="game" className="h-12 rounded-2xl" />}>Done</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
