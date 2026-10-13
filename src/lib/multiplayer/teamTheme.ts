import { Flame, Shield, type LucideIcon } from "lucide-react";
import type { TeamRow } from "./types";

export type TeamKey = "a" | "b";

export interface TeamTheme {
  key: TeamKey;
  icon: LucideIcon;
  /** Solid fill with readable white text. */
  solid: string;
  /** Left-to-right gradient fill with white text. */
  gradient: string;
  gradientReverse: string;
  /** Tinted surface for cards. */
  soft: string;
  border: string;
  text: string;
  bar: string;
  glow: string;
  blob: string;
  pill: string;
}

const THEME_A: TeamTheme = {
  key: "a",
  icon: Shield,
  solid: "bg-team-a-deep text-white",
  gradient: "bg-gradient-to-r from-team-a-deep to-team-a text-white",
  gradientReverse: "bg-gradient-to-l from-team-a-deep to-team-a text-white",
  soft: "bg-team-a/10",
  border: "border-team-a",
  text: "text-team-a",
  bar: "bg-team-a",
  glow: "shadow-team-a/25",
  blob: "bg-team-a",
  pill: "border-team-a bg-team-a-deep text-white",
};

const THEME_B: TeamTheme = {
  key: "b",
  icon: Flame,
  solid: "bg-team-b-deep text-white",
  gradient: "bg-gradient-to-r from-team-b-deep to-team-b text-white",
  gradientReverse: "bg-gradient-to-l from-team-b-deep to-team-b text-white",
  soft: "bg-team-b/10",
  border: "border-team-b",
  text: "text-team-b",
  bar: "bg-team-b",
  glow: "shadow-team-b/25",
  blob: "bg-team-b",
  pill: "border-team-b bg-team-b-deep text-white",
};

export function themeForKey(key: TeamKey): TeamTheme {
  switch (key) {
    case "a":
      return THEME_A;
    case "b":
      return THEME_B;
    default: {
      const unreachable: never = key;
      return unreachable;
    }
  }
}

/** Team A / Team B by name, otherwise by position in the room's team list. */
export function teamKeyFor(teamId: string | null | undefined, teams: readonly TeamRow[]): TeamKey | null {
  if (!teamId) return null;
  const index = teams.findIndex((t) => t.id === teamId);
  if (index < 0) return null;
  const name = teams[index].name;
  if (name === "Team A") return "a";
  if (name === "Team B") return "b";
  return index % 2 === 0 ? "a" : "b";
}

export function teamThemeFor(teamId: string | null | undefined, teams: readonly TeamRow[]): TeamTheme | null {
  const key = teamKeyFor(teamId, teams);
  return key ? themeForKey(key) : null;
}
