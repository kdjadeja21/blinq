import { DIFFICULTY_LEVELS, MODIFIER_LABELS, getRoundSpec } from "@/lib/engine";

const maxLevel = Number(process.argv[2] ?? 30);
const seconds = (ms: number) => (ms / 1000).toFixed(1);

for (const difficulty of DIFFICULTY_LEVELS) {
  console.log(`\n${difficulty.toUpperCase()}`);
  console.table(
    Array.from({ length: maxLevel }, (_, i) => {
      const spec = getRoundSpec({ mode: "duel", difficulty, level: i + 1 });
      return {
        level: spec.level,
        tier: spec.tier,
        items: spec.itemCount,
        choices: spec.choiceCount,
        "memorize s": seconds(spec.memorizeMs),
        "recall s": seconds(spec.recallMs),
        "lookalike %": Math.round(spec.lookalikeRatio * 100),
        lives: spec.rules.lives,
        "penalty s": seconds(spec.rules.wrongPenaltyMs),
        "bot %": `${Math.round(spec.bot.minRatio * 100)}-${Math.round(spec.bot.maxRatio * 100)}`,
        twists: spec.modifiers.map((m) => MODIFIER_LABELS[m]).join(", "),
      };
    }),
  );
}
