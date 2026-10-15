import type { LeaderboardData, PublicRow } from "@/server/solo/leaderboard";

const MAX_MOCK_ROWS = 200;
/** Same cap as the real board; a viewer ranked below it is shown after a gap. */
const LIST_SIZE = 100;

export interface MockOptions {
  count: number;
  /** 1-based rank of the viewer, or null for a viewer who is not on the board. */
  mePosition: number | null;
}

function parsePositive(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `?mock=20&me=14` gives 20 fake rows with the viewer at rank 14. Returns null without `mock`. */
export function parseMock(params: { mock?: string | string[]; me?: string | string[] }): MockOptions | null {
  const count = parsePositive(params.mock);
  if (count === null) return null;
  return { count: Math.min(count, MAX_MOCK_ROWS), mePosition: parsePositive(params.me) };
}

function mockRow(rank: number, isMe: boolean): PublicRow {
  const points = Math.max(0, 5000 - rank * 37);
  const delta = (rank * 7) % 5 === 0 ? null : ((rank * 3) % 7) - 3;
  return {
    name: isMe ? "You" : `Player ${rank}`,
    avatarUrl: null,
    rank,
    points,
    correct: Math.max(0, 40 - rank),
    delta,
    isMe,
  };
}

export function mockLeaderboard({ count, mePosition }: MockOptions, today: string): LeaderboardData {
  const shown = Math.min(count, LIST_SIZE);
  const rows = Array.from({ length: shown }, (_, i) => mockRow(i + 1, i + 1 === mePosition));
  const me = mePosition !== null && mePosition > shown ? mockRow(mePosition, true) : null;
  return { rows, me, today };
}

export function mockParams({ count, mePosition }: MockOptions): Record<string, string> {
  return mePosition === null ? { mock: String(count) } : { mock: String(count), me: String(mePosition) };
}
