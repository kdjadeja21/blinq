"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TrainingPromptProps {
  onStart: () => void;
  onSkip: () => void;
}

export function TrainingPrompt({ onStart, onSkip }: TrainingPromptProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const reduce = useReducedMotion();
  const item = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.35 } };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-[2px] sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onSkip}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-prompt-title"
        aria-describedby="training-prompt-body"
        className="w-full max-w-sm rounded-3xl border-2 bg-card p-6 text-center shadow-lg"
        initial={reduce ? false : { y: 140, scale: 0.85, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={reduce ? undefined : { y: 80, scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto flex size-16 items-center justify-center">
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/30"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <motion.span
            initial={reduce ? false : { scale: 0, rotate: -40 }}
            animate={reduce ? undefined : { scale: 1, rotate: [0, -10, 10, -6, 0] }}
            transition={{ scale: { type: "spring", stiffness: 400, damping: 12, delay: 0.2 }, rotate: { delay: 0.5, duration: 0.7 } }}
            className="relative flex size-16 items-center justify-center rounded-full bg-primary/15"
          >
            <Brain className="size-9 text-primary" aria-hidden />
          </motion.span>
        </div>
        <motion.h2 id="training-prompt-title" className="mt-3 text-2xl font-extrabold" {...item(0.25)}>
          Try a practice round?
        </motion.h2>
        <motion.p id="training-prompt-body" className="mt-2 text-muted-foreground" {...item(0.35)}>
          A short practice round walks through memorize and recall. It starts only when you choose it.
        </motion.p>
        <motion.div className="mt-5 flex flex-col gap-2" {...item(0.45)}>
          <motion.div animate={reduce ? undefined : { scale: [1, 1.03, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: 1 }}>
            <Button variant="game" className="h-14 w-full rounded-2xl text-lg" autoFocus onClick={onStart}>
              Start training
            </Button>
          </motion.div>
          <Button variant="ghost" className="h-12 rounded-2xl" onClick={onSkip}>
            Not now
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
