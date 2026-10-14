import { utcDateKey } from "@/lib/rng";
import { leaderboard, loadFrom, type DailyEntry, type LeaderboardRow, type LeaderboardScope } from "@/lib/solo/leaderboard";
import { db, must } from "@/server/multiplayer/db";

const PAGE_SIZE = 1000;
const TOP_N = 100;
const ANONYMOUS = "Player";

interface RoundRow {
  user_id: string;
  daily_date: string;
  score: number;
  correct: number;
  solo_profiles: ProfileRow | ProfileRow[] | null;
}

interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
}

export interface PublicRow extends Omit<LeaderboardRow, "userId"> {
  isMe: boolean;
}

export interface LeaderboardData {
  rows: PublicRow[];
  /** The viewer's own row when they rank outside the top list. */
  me: PublicRow | null;
  today: string;
}

function toPublic({ userId, ...row }: LeaderboardRow, viewerId: string | null): PublicRow {
  return { ...row, isMe: userId === viewerId };
}

async function loadEntries(from: string | null, to: string): Promise<DailyEntry[]> {
  const entries: DailyEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = db()
      .from("solo_rounds")
      .select("user_id, daily_date, score, correct, solo_profiles(display_name, avatar_url)")
      .eq("mode", "daily")
      .not("daily_date", "is", null)
      .lte("daily_date", to)
      .order("daily_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (from !== null) query = query.gte("daily_date", from);
    const page = must(await query) as unknown as RoundRow[];
    for (const row of page) {
      const profile = Array.isArray(row.solo_profiles) ? row.solo_profiles[0] : row.solo_profiles;
      entries.push({
        userId: row.user_id,
        name: profile?.display_name?.trim() || ANONYMOUS,
        avatarUrl: profile?.avatar_url ?? null,
        date: row.daily_date,
        score: row.score,
        correct: row.correct,
      });
    }
    if (page.length < PAGE_SIZE) return entries;
  }
}

/** Only display name, avatar and totals leave the server. */
export async function getLeaderboard(scope: LeaderboardScope, viewerId: string | null): Promise<LeaderboardData> {
  const today = utcDateKey(Date.now());
  const entries = await loadEntries(loadFrom(scope, today), today);
  const all = leaderboard(entries, scope, today);
  const rows = all.slice(0, TOP_N);
  const me = viewerId && !rows.some((row) => row.userId === viewerId) ? (all.find((row) => row.userId === viewerId) ?? null) : null;
  return { rows: rows.map((row) => toPublic(row, viewerId)), me: me ? toPublic(me, viewerId) : null, today };
}
