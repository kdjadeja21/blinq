import { shuffle } from "@/lib/rng";

export interface Pairing {
  a: string;
  b: string;
}

const MAX_ATTEMPTS = 300;

export function pairKey(a: string, b: string): string {
  return `${a}:${b}`;
}

/** Splits ids into two teams, as even as possible. The first team gets the extra one. */
export function splitTeams<T>(ids: readonly T[], random: () => number): [T[], T[]] {
  const shuffled = shuffle(ids, random);
  const half = Math.ceil(shuffled.length / 2);
  return [shuffled.slice(0, half), shuffled.slice(half)];
}

/**
 * Pairs team A against team B (equal sizes), avoiding pairs already in `history`
 * (keys from `pairKey`, team A first). Falls back to the fewest repeats once
 * every fresh pairing is used up. The duel order is shuffled too.
 */
export function drawPairings(
  teamA: readonly string[],
  teamB: readonly string[],
  history: ReadonlySet<string>,
  random: () => number,
): Pairing[] {
  if (teamA.length !== teamB.length) throw new Error("Teams must be the same size");
  let best: string[] | null = null;
  let bestRepeats = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && bestRepeats > 0; attempt++) {
    const order = shuffle(teamB, random);
    const repeats = teamA.reduce((n, a, i) => n + (history.has(pairKey(a, order[i])) ? 1 : 0), 0);
    if (repeats < bestRepeats) {
      best = order;
      bestRepeats = repeats;
    }
  }
  const chosen = best ?? [...teamB];
  return shuffle(
    teamA.map((a, i) => ({ a, b: chosen[i] })),
    random,
  );
}
