"use client";

import { Heart, HeartCrack } from "lucide-react";
import { cn } from "cn";
import { motion } from "framer-motion";

export function Lives({ lives, max }: { lives: number; max: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${lives} of ${max} mistakes left`}>
      {Array.from({ length: max }, (_, i) => {
        const alive = i < lives;
        return (
          <motion.span
            key={alive ? "alive" : "lost"}
            initial={alive ? false : { scale: 1.6, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 14 }}
          >
            {alive ? (
              <Heart className="size-7 fill-destructive text-destructive drop-shadow" aria-hidden />
            ) : (
              <HeartCrack className={cn("size-7 text-muted-foreground")} aria-hidden />
            )}
          </motion.span>
        );
      })}
    </span>
  );
}
