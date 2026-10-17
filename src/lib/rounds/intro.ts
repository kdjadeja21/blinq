import type { RoundType } from "@/lib/levelConfig";

export interface IntroCard {
  emoji: string;
  title: string;
  body: string;
}

const HOW_TO: Record<RoundType, [IntroCard, IntroCard]> = {
  item: [
    { emoji: "👀", title: "Memorize the table", body: "A few items appear for a short time. Look closely." },
    { emoji: "👆", title: "Tap what you saw", body: "The items vanish and get mixed with lookalikes. Tap only the ones that were on the table." },
  ],
  position: [
    { emoji: "📍", title: "Where things sit", body: "Items appear on spots of the table. Remember each item and its spot." },
    { emoji: "👆", title: "Put them back", body: "The spots empty out. Tap an item in the tray, then tap the spot where it was." },
  ],
  order: [
    { emoji: "🔢", title: "Watch the order", body: "Items appear one at a time. Remember the sequence they came in." },
    { emoji: "👆", title: "Rebuild the sequence", body: "Tap the items in the same order. A tap out of order counts as a mistake." },
  ],
  change: [
    { emoji: "🔍", title: "Spot the difference", body: "You see the table, it hides for a moment, then comes back with 1 to 3 items swapped or missing." },
    { emoji: "👆", title: "Tap what changed", body: "Tap the tiles that are different. An empty spot counts as a change too." },
  ],
  delayed: [
    { emoji: "⏳", title: "Remember through a pause", body: "Items appear, then a quick tapping game fills the gap. Try not to lose them." },
    { emoji: "👆", title: "Then recall", body: "When the game ends, pick out the items you saw." },
  ],
  combo: [
    { emoji: "🏆", title: "Boss round", body: "Two stages: item recall, then the skill of this block. Your mistakes carry over." },
    { emoji: "⭐", title: "Graduate", body: "Finish both stages with a perfect score to graduate and move to the next block." },
  ],
};

/** Emoji and memorize how-to for a round type. */
export function roundHowTo(type: RoundType): IntroCard {
  return HOW_TO[type][0];
}

/** The cards of a guided intro: how the round works, then the block's strategy tip. */
export function introCards(type: RoundType, tip: string | undefined): IntroCard[] {
  const [first, second] = HOW_TO[type];
  return [first, second, { emoji: "💡", title: "Strategy tip", body: tip ?? "Picture each item clearly and tie it to the others." }];
}

/** Hints on non-item rounds nudge a way of remembering instead of giving the answer away. */
const NUDGES: Record<RoundType, string> = {
  item: "Try grouping what you saw by category.",
  position: "Try walking through the table in your mind, one spot at a time.",
  order: "Try linking the items into a short story, in order.",
  change: "Try scanning the table in zones, left to right.",
  delayed: "Try repeating one vivid picture of the table while you wait.",
  combo: "Try tackling one stage at a time, and breathe.",
};

export function hintNudge(type: RoundType): string {
  return NUDGES[type];
}
