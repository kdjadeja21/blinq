import { ITEMS, LOOKALIKES, type Item } from "./items";
import { shuffle } from "./rng";

export const MAX_CHOICES = 20;

export function choiceCount(itemCount: number): number {
  return Math.min(itemCount * 2, MAX_CHOICES);
}

/** The real items mixed with decoys; lookalikes of real items are picked first. */
export function buildChoices(items: Item[], random: () => number = Math.random): Item[] {
  const decoyTarget = choiceCount(items.length) - items.length;
  const taken = new Set(items.map((i) => i.id));
  const decoys: Item[] = [];
  const byId = new Map(ITEMS.map((i) => [i.id, i]));

  for (const item of shuffle(items, random)) {
    if (decoys.length >= decoyTarget) break;
    const options = shuffle(LOOKALIKES.get(item.id) ?? [], random).filter((id) => !taken.has(id));
    const pick = options[0] && byId.get(options[0]);
    if (pick) {
      decoys.push(pick);
      taken.add(pick.id);
    }
  }
  for (const filler of shuffle(ITEMS, random)) {
    if (decoys.length >= decoyTarget) break;
    if (taken.has(filler.id)) continue;
    decoys.push(filler);
    taken.add(filler.id);
  }
  return shuffle([...items, ...decoys], random);
}
