import { hash, mulberry32, shuffle } from "@/lib/rng";

export type LayoutKind = "board" | "choices";

/**
 * A player's own tile order for a round. Same items for everyone, different placement, so a
 * neighbour's screen is useless. Derived from ids, so it needs no storage and survives reloads.
 */
export function layoutFor<T>(roundId: string, playerId: string, kind: LayoutKind, items: readonly T[]): T[] {
  return shuffle(items, mulberry32(hash(`${roundId}:${playerId}:${kind}`)));
}
