import type { PickEvent } from "@/lib/scoring";
import { shuffle } from "@/lib/rng";
import type { BotPlan } from "./types";

/**
 * A bot recalls 70-90% of the items (never all, so it cannot end a duel early),
 * finishing between 60% and 90% of the recall time. Slightly better at higher levels.
 */
export function makeBotPlan(level: number, itemCount: number, recallMs: number, random: () => number): BotPlan {
  const bonus = Math.min(0.1, (level - 1) * 0.03);
  const ratio = Math.min(0.9, 0.7 + random() * 0.2 + bonus * 0.5);
  const correct = Math.min(itemCount - 1, Math.max(1, Math.round(itemCount * ratio)));
  const finishMs = Math.round(recallMs * (0.6 + random() * 0.3));
  return { correct, finishMs };
}

/** Evenly spaced correct picks, so the bot is scored by the same `scoreRecall` as humans. */
export function botPicks(plan: BotPlan): PickEvent[] {
  const step = plan.finishMs / plan.correct;
  return Array.from({ length: plan.correct }, (_, i) => ({ correct: true, at: Math.round(step * (i + 1)) }));
}

export function botTargets(itemKeys: readonly string[], plan: BotPlan, random: () => number): string[] {
  return shuffle(itemKeys, random).slice(0, plan.correct);
}
