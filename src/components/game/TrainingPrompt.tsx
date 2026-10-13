"use client";

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      onClick={onSkip}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-prompt-title"
        aria-describedby="training-prompt-body"
        className="w-full max-w-sm rounded-3xl border-2 bg-card p-6 text-center shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <Brain className="mx-auto size-10 text-primary" aria-hidden />
        <h2 id="training-prompt-title" className="mt-3 text-2xl font-extrabold">
          Try a practice round?
        </h2>
        <p id="training-prompt-body" className="mt-2 text-muted-foreground">
          A short practice round walks through memorize and recall. It starts only when you choose it.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="game" className="h-14 rounded-2xl text-lg" autoFocus onClick={onStart}>
            Start training
          </Button>
          <Button variant="ghost" className="h-12 rounded-2xl" onClick={onSkip}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
