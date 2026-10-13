import { ITEMS, type Item } from "./items";

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ches|shes|sses|xes|oes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function canonical(input: string): string {
  return normalize(input).split(" ").map(singularize).join(" ");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

export function maxEdits(length: number): number {
  return length <= 3 ? 0 : length <= 6 ? 1 : 2;
}

const CANDIDATES = ITEMS.map((item) => ({
  item,
  forms: [item.name, ...item.synonyms].map(canonical),
}));

/** Best catalog match for the raw input, or null. Matches against the whole catalog so fuzzy
 *  matching can never snap a wrong answer onto an item that happens to be on the table. */
export function matchItem(raw: string): Item | null {
  const query = canonical(raw);
  if (!query) return null;
  let best: { item: Item; distance: number } | null = null;
  for (const { item, forms } of CANDIDATES) {
    for (const form of forms) {
      const distance = levenshtein(query, form);
      const allowed = Math.min(maxEdits(form.length), maxEdits(query.length));
      if (distance <= allowed && (!best || distance < best.distance)) {
        best = { item, distance };
      }
    }
  }
  return best?.item ?? null;
}

export function suggest(raw: string, limit = 4): Item[] {
  const query = normalize(raw);
  if (!query) return [];
  const scored: { item: Item; rank: number }[] = [];
  for (const item of ITEMS) {
    const names = [item.name, ...item.synonyms].map(normalize);
    if (names.some((n) => n.startsWith(query))) scored.push({ item, rank: 0 });
    else if (names.some((n) => n.split(" ").some((w) => w.startsWith(query)))) {
      scored.push({ item, rank: 1 });
    }
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((s) => s.item);
}
