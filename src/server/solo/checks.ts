import { mergeChecks, type MemoryCheck } from "@/lib/skillProgress";
import { ApiError, db, must } from "@/server/multiplayer/db";
import { ensureProfile } from "./stats";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SENT = 50;

function parseChecks(value: unknown): MemoryCheck[] {
  if (!Array.isArray(value) || value.length > MAX_SENT) throw new ApiError(400, "Invalid memory check data.");
  return value.map((entry) => {
    const raw = entry as Partial<MemoryCheck> | null;
    const date = raw?.date;
    const accuracy = raw?.accuracy;
    if (typeof date !== "string" || !DATE.test(date)) throw new ApiError(400, "Invalid memory check data.");
    if (typeof accuracy !== "number" || !Number.isInteger(accuracy) || accuracy < 0 || accuracy > 100) {
      throw new ApiError(400, "Invalid memory check data.");
    }
    return { date, accuracy };
  });
}

/** Stores the checks the device has, then returns the account's full list, oldest first. */
export async function syncChecks(userId: string, body: Record<string, unknown>): Promise<MemoryCheck[]> {
  const sent = parseChecks(body.checks ?? []);
  await ensureProfile(userId);
  if (sent.length > 0) {
    must(
      await db()
        .from("solo_memory_checks")
        .upsert(
          sent.map((c) => ({ user_id: userId, check_date: c.date, accuracy: c.accuracy })),
          { onConflict: "user_id,check_date", ignoreDuplicates: true },
        )
        .select("user_id"),
    );
  }
  const rows = must(
    await db().from("solo_memory_checks").select("check_date, accuracy").eq("user_id", userId).order("check_date"),
  ) as { check_date: string; accuracy: number }[];
  return mergeChecks(
    [],
    rows.map((r) => ({ date: r.check_date, accuracy: r.accuracy })),
  );
}
