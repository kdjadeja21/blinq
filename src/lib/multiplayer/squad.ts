import type { DuelRow } from "./types";

type DuelLike = Pick<DuelRow, "level" | "player_a" | "player_b" | "resolved">;

/** The duel a player takes part in during a level (Squad: every duel of the level is live). */
export function myDuel<T extends DuelLike>(duels: readonly T[], level: number, playerId: string | null | undefined): T | undefined {
  if (!playerId) return undefined;
  return duels.find((d) => d.level === level && (d.player_a === playerId || d.player_b === playerId));
}

/** How many duels of a level are finished, for the "x of N duels done" waiting text. */
export function duelProgress(duels: readonly DuelLike[], level: number): { done: number; total: number } {
  const ofLevel = duels.filter((d) => d.level === level);
  return { done: ofLevel.filter((d) => d.resolved).length, total: ofLevel.length };
}

export function allDuelsResolved(duels: readonly DuelLike[], level: number): boolean {
  const { done, total } = duelProgress(duels, level);
  return total > 0 && done === total;
}

/**
 * Duel stores progress on every pick so the opponent can watch. Squad runs up to six duels at
 * once, so it only stores the final "done" row to keep realtime traffic flat.
 */
export function writesLiveProgress(squad: boolean, selfDone: boolean): boolean {
  return !squad || selfDone;
}

/**
 * In Duel a finished duel moves the room on, so late picks hit a closed phase. In Squad the
 * room stays in recall while other duels continue, so a resolved duel must refuse picks itself.
 */
export function duelRefusesPicks(squad: boolean, duel: Pick<DuelRow, "resolved">): boolean {
  return squad && duel.resolved;
}
