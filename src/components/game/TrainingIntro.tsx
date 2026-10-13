"use client";

import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

const CARDS = [
  { emoji: "👀", title: "Memorize the table", body: "A few items appear for a short time. Look closely." },
  { emoji: "⌨️", title: "Type what you remember", body: "The items vanish. Type their names before time runs out." },
];

interface TrainingIntroProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TrainingIntro({ step, onNext, onSkip }: TrainingIntroProps) {
  const card = CARDS[step];
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Training {step + 1}/{CARDS.length}
        </p>
        <Button variant="ghost" className="h-11 px-3" onClick={onSkip}>
          <SkipForward className="size-4" /> Skip
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border bg-card p-8 text-center">
        <p className="text-7xl" aria-hidden>
          {card.emoji}
        </p>
        <h2 className="text-2xl font-bold">{card.title}</h2>
        <p className="text-muted-foreground">{card.body}</p>
      </div>
      <Button className="h-12 text-base" onClick={onNext}>
        {step < CARDS.length - 1 ? "Next" : "Let's go"}
      </Button>
    </div>
  );
}
