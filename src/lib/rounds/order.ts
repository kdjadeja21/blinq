import type { Item } from "@/lib/items";

/** The item the player must tap next, given how many are already placed. `items` is the sequence. */
export function expectedItem(items: readonly Item[], placed: number): Item | null {
  return items[placed] ?? null;
}

export function isCorrectNext(items: readonly Item[], placed: number, id: string): boolean {
  return expectedItem(items, placed)?.id === id;
}

/** Key for a wrong tap, so the same item can be tried again at a later position. */
export function orderKey(id: string, position: number): string {
  return `${id}#${position}`;
}

/** Which item of the sequence is on screen `elapsedMs` into memorize. */
export function shownIndex(total: number, memorizeMs: number, elapsedMs: number): number {
  if (total <= 0) return 0;
  const per = memorizeMs / total;
  return Math.min(total - 1, Math.max(0, Math.floor(elapsedMs / per)));
}
