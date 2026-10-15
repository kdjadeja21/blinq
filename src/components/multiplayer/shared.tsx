"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";
import { YouBadge } from "@/components/game/YouBadge";
import { SlidingOptions } from "@/components/ui/sliding-options";
import { avatarFor } from "@/lib/multiplayer/avatars";
import type { PlayerRow, TeamRow } from "@/lib/multiplayer/types";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-5 animate-spin rounded-full border-[3px] border-current border-t-transparent", className)}
    />
  );
}

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
      <SlidingOptions
        value={value}
        options={options}
        renderOption={({ option, selected, className, children }) => (
          <button type="button" aria-pressed={selected} onClick={() => onChange(option.value)} className={className}>
            {children}
          </button>
        )}
      />
    </fieldset>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  className,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = rest.id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {hint ? <p className="text-xs font-normal text-muted-foreground">{hint}</p> : null}
      <input
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 rounded-2xl border-2 bg-card px-4 text-base font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      />
    </div>
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

export function Avatar({ player, className }: { player: PlayerRow | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg leading-none", className)}
    >
      {player ? avatarFor(player) : "?"}
    </span>
  );
}

export function PlayerChip({ player, online, you }: { player: PlayerRow; online?: boolean; you?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold", you ? "border-primary bg-primary/10 shadow-md shadow-primary/20" : "bg-card")}>
      <span className="relative">
        <Avatar player={player} className="size-7 text-base" />
        <span
          aria-label={player.is_bot ? "Computer player" : online ? "Online" : "Offline"}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card",
            player.is_bot || online ? "bg-success" : "bg-muted-foreground/40",
          )}
        />
      </span>
      {player.name}
      {you && <YouBadge />}
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
