export interface SharedDaily {
  date: string;
  correct: number;
  total: number;
  stars: number;
  grid: boolean[];
}

const MAX_CELLS = 40;

function int(value: string | null, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

export function parseSharedDaily(get: (key: string) => string | null): SharedDaily {
  const rawDate = get("d") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
  const grid = (get("g") ?? "")
    .slice(0, MAX_CELLS)
    .split("")
    .filter((ch) => ch === "0" || ch === "1")
    .map((ch) => ch === "1");
  const total = grid.length > 0 ? grid.length : int(get("t"), 0, MAX_CELLS);
  return {
    date,
    correct: int(get("c"), 0, total),
    total,
    stars: int(get("s"), 0, 3),
    grid,
  };
}
