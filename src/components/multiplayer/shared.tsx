"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";
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
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="relative grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-muted p-1">
        {options.length > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-primary shadow transition-transform duration-base ease-out-soft motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem - ${(options.length - 1) * 0.25}rem) / ${options.length})`,
              transform: `translateX(calc(${selectedIndex} * (100% + 0.25rem)))`,
            }}
          />
        ) : null}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative min-h-11 rounded-xl px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
              value === option.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
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
    <span className="inline-flex items-center gap-2 rounded-full border-2 bg-card px-3 py-1.5 text-sm font-semibold">
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
