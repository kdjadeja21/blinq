"use client";

import { SkipForward } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 bg-card p-8 text-center shadow-xl"
        >
          <motion.p
            className="text-8xl"
            aria-hidden
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {card.emoji}
          </motion.p>
          <h2 className="text-3xl font-extrabold">{card.title}</h2>
          <p className="text-lg text-muted-foreground">{card.body}</p>
        </motion.div>
      </AnimatePresence>
      <Button variant="game" className="h-14 rounded-2xl text-lg" onClick={onNext}>
        {step < CARDS.length - 1 ? "Next" : "Let's go"}
      </Button>
    </div>
  );
}
