"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";

interface TimerRingProps {
  seconds: number;
  progress: number;
  label: string;
  hidden?: boolean;
}

const R = 34;
const C = 2 * Math.PI * R;

export function TimerRing({ seconds, progress, label, hidden }: TimerRingProps) {
  const reduce = useReducedMotion();
  const low = !hidden && seconds <= 5;
  return (
    <motion.div
      className="relative size-20 shrink-0"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuenow={seconds}
      animate={low && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={low ? { duration: 1, repeat: Infinity } : undefined}
    >
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          className={cn("transition-colors", low ? "stroke-flame" : "stroke-primary")}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums",
          low && "text-flame",
        )}
      >
        {hidden ? "·" : seconds}
      </span>
    </motion.div>
  );
}
