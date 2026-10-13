import { ITEMS, type Item } from "./items";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickItems(count: number, random: () => number = Math.random): Item[] {
  const pool = [...ITEMS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function dailyItems(dateKey: string, count: number): Item[] {
  return pickItems(count, mulberry32(hash(`blinq:${dateKey}`)));
}

export function utcDateKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function previousDateKey(dateKey: string): string {
  return utcDateKey(Date.parse(`${dateKey}T00:00:00Z`) - 86_400_000);
}
