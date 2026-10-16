import type { RoundType } from "@/lib/levelConfig";
import type { RoomMode } from "./types";

/** Round types a room can play. Position and order rounds are single player only for now. */
export const ROOM_ROUND_TYPES = ["item", "change", "delayed", "mixed"] as const;
export type RoomRoundType = (typeof ROOM_ROUND_TYPES)[number];
export const DEFAULT_ROUND_TYPE: RoomRoundType = "item";

export type PlayedRoundType = Exclude<RoomRoundType, "mixed">;
const MIXED_ROTATION: readonly PlayedRoundType[] = ["item", "change", "delayed"];

export const ROUND_TYPE_OPTIONS: Record<RoomRoundType, { label: string; description: string }> = {
  item: { label: "Items", description: "Tap the items you saw." },
  change: { label: "Change", description: "Spot what changed between two views of the table." },
  delayed: { label: "Delayed", description: "A short tapping game before you recall." },
  mixed: { label: "Mixed", description: "Items, change and delayed rounds take turns." },
};

/** The type played at a level. Mixed rooms rotate, so every player sees the same type at the same level. */
export function roundTypeForLevel(setting: RoomRoundType, level: number): PlayedRoundType {
  if (setting !== "mixed") return setting;
  const index = (Math.max(1, Math.floor(level)) - 1) % MIXED_ROTATION.length;
  return MIXED_ROTATION[index];
}

export function validRoundType(raw: unknown, mode: RoomMode): { ok: true; type: RoomRoundType } | { ok: false; error: string } {
  const type = raw ?? DEFAULT_ROUND_TYPE;
  const found = ROOM_ROUND_TYPES.find((t) => t === type);
  if (!found) return { ok: false, error: "Pick items, change, delayed or mixed." };
  if (mode === "team" && found !== DEFAULT_ROUND_TYPE) return { ok: false, error: "Team rooms play item rounds." };
  return { ok: true, type: found };
}

/** Placeholder stored in `round_choices` for a spot that is empty after the change. */
export const GONE_KEY = "-";

/** Originals whose spot differs between the first and second view of a change round. */
export function changedOriginals(before: readonly string[], after: readonly string[]): string[] {
  return before.filter((key, index) => after[index] !== key);
}

export interface PickFacts {
  inItems: boolean;
  inChoices: boolean;
  inChanged: boolean;
}

/**
 * The single judgement for a recall pick, used by the server. Item and delayed rounds pick from the
 * choice grid and are right when the item was on the table. Change rounds pick an original from the
 * table and are right when its spot changed.
 */
export function judgePick(type: RoundType | undefined, facts: PickFacts): { valid: boolean; correct: boolean } {
  if (type === "change") return { valid: facts.inItems, correct: facts.inChanged };
  return { valid: facts.inChoices, correct: facts.inItems };
}
