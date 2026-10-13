import { ITEMS, ITEMS_BY_ID, LOOKALIKES, type Item } from "@/lib/items";
import { shuffle } from "@/lib/rng";
import { TRAINING_PRESET } from "./profiles";
import type { RoundSpec } from "./types";

export interface GeneratedRound {
  /** the targets shown during memorize */
  items: Item[];
  /** targets mixed with decoys, shuffled */
  choices: Item[];
}

const MAX_THEME_CATEGORIES = 2;

const CATEGORIES = [...new Set(ITEMS.map((item) => item.category))];

/** One or two categories, widened only if they cannot fill the table. */
function themePool(spec: RoundSpec, random: () => number): Item[] {
  const pool: Item[] = [];
  let used = 0;
  for (const category of shuffle(CATEGORIES, random)) {
    const enough = used >= MAX_THEME_CATEGORIES ? pool.length >= spec.itemCount : pool.length >= spec.choiceCount;
    if (enough) break;
    pool.push(...ITEMS.filter((item) => item.category === category));
    used += 1;
  }
  return pool;
}

function pickTargets(spec: RoundSpec, random: () => number): { items: Item[]; pool: Item[] } {
  if (spec.mode === "training") {
    const items = TRAINING_PRESET.itemIds.flatMap((id) => ITEMS_BY_ID.get(id) ?? []);
    return { items, pool: [] };
  }
  if (spec.modifiers.includes("themed")) {
    const pool = themePool(spec, random);
    return { items: shuffle(pool, random).slice(0, spec.itemCount), pool };
  }
  return { items: shuffle(ITEMS, random).slice(0, spec.itemCount), pool: [] };
}

/** Lookalikes of the targets first (up to the spec's share), then same-theme items, then anything. */
function pickDecoys(spec: RoundSpec, items: Item[], pool: Item[], random: () => number): Item[] {
  const decoyTarget = Math.max(0, spec.choiceCount - items.length);
  const lookalikeTarget = Math.round(decoyTarget * spec.lookalikeRatio);
  const taken = new Set(items.map((item) => item.id));
  const decoys: Item[] = [];
  const take = (item: Item) => {
    decoys.push(item);
    taken.add(item.id);
  };

  const candidates = shuffle(items, random).map((item) => shuffle(LOOKALIKES.get(item.id) ?? [], random));
  for (let added = true; added && decoys.length < lookalikeTarget; ) {
    added = false;
    for (const options of candidates) {
      if (decoys.length >= lookalikeTarget) break;
      const id = options.find((option) => !taken.has(option));
      const item = id ? ITEMS_BY_ID.get(id) : undefined;
      if (item) {
        take(item);
        added = true;
      }
    }
  }

  for (const filler of [...shuffle(pool, random), ...shuffle(ITEMS, random)]) {
    if (decoys.length >= decoyTarget) break;
    if (!taken.has(filler.id)) take(filler);
  }
  return decoys;
}

/** Builds the table and the choice grid for a spec. Deterministic for a seeded `random`. */
export function generateRound(spec: RoundSpec, random: () => number = Math.random): GeneratedRound {
  const { items, pool } = pickTargets(spec, random);
  const decoys = pickDecoys(spec, items, pool, random);
  return { items, choices: shuffle([...items, ...decoys], random) };
}
