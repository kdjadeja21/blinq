import type { Item } from "@/lib/items";
import { shuffle } from "@/lib/rng";

/** Where each target sits on the table: item id to slot index, out of `slotCount` slots. */
export interface Layout {
  slots: Record<string, number>;
  slotCount: number;
}

export function buildLayout(items: readonly Item[], slotCount: number, random: () => number = Math.random): Layout {
  const count = Math.max(slotCount, items.length);
  const spots = shuffle(Array.from({ length: count }, (_, i) => i), random);
  const slots: Record<string, number> = {};
  items.forEach((item, index) => {
    slots[item.id] = spots[index];
  });
  return { slots, slotCount: count };
}

/** The item that belongs in a slot, if any. */
export function itemAt(layout: Layout, slot: number): string | null {
  for (const [id, at] of Object.entries(layout.slots)) if (at === slot) return id;
  return null;
}

export function isCorrectPlacement(layout: Layout, id: string, slot: number): boolean {
  return layout.slots[id] === slot;
}

/** Key used to remember a wrong placement, so the same item can be tried in another slot. */
export function placementKey(id: string, slot: number): string {
  return `${id}@${slot}`;
}
