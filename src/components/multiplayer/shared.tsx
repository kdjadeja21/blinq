"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";
import type { PlayerRow, TeamRow } from "@/lib/multiplayer/types";

/** Re-renders every `intervalMs` with the server-corrected time. */
export function useServerNow(now: () => number, intervalMs = 250): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const tick = () => setValue(now());
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [now, intervalMs]);
  return value;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function Segmented<T extends string>({ label, value, options, onChange, disabled }: SegmentedProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-xl px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
              value === option.value ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function TextField({
  label,
  value,
  onChange,
  className,
  ...rest
}: { label: string; value: string; onChange: (value: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 rounded-2xl border-2 bg-card px-4 text-base font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      />
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export function PlayerChip({ player, online, you }: { player: PlayerRow; online?: boolean; you?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 bg-card px-3 py-1.5 text-sm font-semibold">
      <span
        aria-label={player.is_bot ? "Computer player" : online ? "Online" : "Offline"}
        className={cn("size-2.5 rounded-full", player.is_bot || online ? "bg-success" : "bg-muted-foreground/40")}
      />
      {player.is_bot ? "🤖 " : ""}
      {player.name}
      {you && <span className="text-xs text-muted-foreground">(you)</span>}
    </span>
  );
}

export function TeamScores({ teams, highlight }: { teams: TeamRow[]; highlight?: string | null }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-center">
      {teams.map((team) => (
        <div
          key={team.id}
          className={cn("rounded-2xl border-2 bg-card p-3 shadow-sm", highlight === team.id && "border-gold bg-gold/15")}
        >
          <dt className="text-xs font-medium text-muted-foreground">{team.name}</dt>
          <dd className="text-2xl font-extrabold tabular-nums">{team.score}</dd>
        </div>
      ))}
    </dl>
  );
}
