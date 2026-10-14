import { DEFAULT_TEAM_STYLE, SQUAD_ENABLED } from "./config";
import { TEAM_STYLES, type RoomMode, type TeamStyle } from "./types";

export type TeamStyleResult = { ok: true; style: TeamStyle } | { ok: false; error: string };

/**
 * Validates a requested team style. Omitted means the default. Individual rooms have no
 * teams, so they always store Duel and the input is ignored.
 */
export function resolveTeamStyle(raw: unknown, mode: RoomMode, squadEnabled: boolean = SQUAD_ENABLED): TeamStyleResult {
  if (mode !== "team") return { ok: true, style: "duel" };
  const requested = raw ?? (squadEnabled ? DEFAULT_TEAM_STYLE : "duel");
  const style = TEAM_STYLES.find((s) => s === requested);
  if (!style) return { ok: false, error: "Pick squad or duel." };
  if (style === "squad" && !squadEnabled) return { ok: false, error: "Squad is not available yet." };
  return { ok: true, style };
}
