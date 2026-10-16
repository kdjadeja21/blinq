import { ITEMS, ITEMS_BY_ID, LOOKALIKES, type Item } from "@/lib/items";
import { shuffle } from "@/lib/rng";

/** How long the table stays hidden between the two views. */
export const CHANGE_HIDE_MS = 1_500;
export const MAX_CHANGES = 3;
const LEVELS_PER_EXTRA_CHANGE = 4;
const BLOCK_SIZE = 10;

/** The table as first shown, as shown again, and which tiles differ. */
export interface ChangeTable {
  before: Item[];
  /** same slots as `before`; always filled, since an empty spot would give the answer away */
  after: (Item | null)[];
  /** slot indexes that changed */
  changed: number[];
}

/** 1 change early in a block, up to 3 near the end. */
export function changeCountFor(level: number): number {
  const pos = (Math.max(1, Math.floor(level)) - 1) % BLOCK_SIZE;
  return Math.min(MAX_CHANGES, 1 + Math.floor(pos / LEVELS_PER_EXTRA_CHANGE));
}

function pickReplacement(original: Item, taken: Set<string>, lookAlikeShare: number, random: () => number): Item {
  const free = (item: Item | undefined): item is Item => item !== undefined && !taken.has(item.id);
  if (random() < lookAlikeShare) {
    const similar = shuffle(LOOKALIKES.get(original.id) ?? [], random).map((id) => ITEMS_BY_ID.get(id));
    const found = similar.find(free);
    if (found) return found;
  }
  const sameCategory = shuffle(ITEMS.filter((item) => item.category === original.category), random).find(free);
  return sameCategory ?? shuffle(ITEMS, random).find(free) ?? original;
}

export function buildChangeTable(
  before: readonly Item[],
  count: number,
  lookAlikeShare: number,
  random: () => number = Math.random,
): ChangeTable {
  const changes = Math.max(1, Math.min(count, before.length - 1));
  const changed = shuffle(Array.from({ length: before.length }, (_, i) => i), random)
    .slice(0, changes)
    .sort((a, b) => a - b);
  const taken = new Set(before.map((item) => item.id));
  const after: (Item | null)[] = [...before];
  for (const slot of changed) {
    const replacement = pickReplacement(before[slot], taken, lookAlikeShare, random);
    taken.add(replacement.id);
    after[slot] = replacement;
  }
  return { before: [...before], after, changed };
}
