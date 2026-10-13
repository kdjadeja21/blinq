import type { RoundSpec } from "@/lib/engine";
import type { PickEvent } from "@/lib/scoring";
import { shuffle } from "@/lib/rng";
import type { BotPlan } from "./types";

/**
 * The bot's recall share and finish time come from the engine's `spec.bot`.
 * It never recalls every item, so it cannot end a duel early.
 */
export function makeBotPlan(spec: RoundSpec, random: () => number): BotPlan {
  const { bot, itemCount, recallMs } = spec;
  const ratio = bot.minRatio + random() * (bot.maxRatio - bot.minRatio);
  const correct = Math.min(itemCount - 1, Math.max(1, Math.round(itemCount * ratio)));
  const finishMs = Math.round(recallMs * (bot.minFinish + random() * (bot.maxFinish - bot.minFinish)));
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
