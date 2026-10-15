"use client";

import { motion, useReducedMotion } from "framer-motion";
import { User } from "lucide-react";
import { cn } from "cn";

const VARIANTS = {
  solid: "bg-primary text-primary-foreground",
  onColor: "bg-background text-foreground",
} as const;

interface YouBadgeProps {
  /** `onColor` keeps the badge readable on team gradients and other saturated backgrounds. */
  variant?: keyof typeof VARIANTS;
  className?: string;
}

/** Marks the viewer's own entry. The icon and text mean it never relies on colour alone. */
export function YouBadge({ variant = "solid", className }: YouBadgeProps) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-label="This is you"
      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 18 }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[0.65rem] font-extrabold uppercase leading-none tracking-wide",
        VARIANTS[variant],
        className,
      )}
    >
      <User className="size-3" aria-hidden />
      <span aria-hidden>You</span>
    </motion.span>
  );
}

/** Row treatment for the viewer's own entry, shared by every list that shows one. */
export function youRowClass(isMe: boolean): string {
  return isMe ? "bg-primary/15 ring-2 ring-primary shadow-md shadow-primary/20" : "bg-muted/50";
}
