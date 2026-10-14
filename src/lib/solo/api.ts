import type { RoundSummary } from "@/lib/progress";
import type { Stats } from "@/lib/stats";

async function post(action: string, body: unknown): Promise<Stats> {
  const response = await fetch(`/api/solo/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { stats?: Stats; error?: string };
  if (!response.ok || !data.stats) throw new Error(data.error ?? "Could not save your progress.");
  return data.stats;
}

export function syncSoloStats(stats: Stats): Promise<Stats> {
  return post("sync", { stats });
}

export function recordSoloRound(round: RoundSummary): Promise<Stats> {
  return post("record_round", {
    mode: round.mode,
    level: round.level,
    result: round.result,
    recalledIds: round.recalled.map((r) => r.id),
    itemIds: round.items.map((i) => i.id),
  });
}
