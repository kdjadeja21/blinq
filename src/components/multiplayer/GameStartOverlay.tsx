"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const CARDS = ["🧠", "⚡", "🎯", "🔥"];
const MESSAGES = ["Shuffling the deck...", "Dealing the cards...", "Warming up the arena...", "Get ready to remember!"];

export function GameStartOverlay() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 1100);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Starting the game"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/85 p-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    >
      <div aria-hidden className="pointer-events-none absolute size-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="relative flex gap-3" aria-hidden>
        {CARDS.map((card, i) => (
          <motion.div
            key={card}
            className="flex size-16 items-center justify-center rounded-2xl border-2 bg-card text-3xl shadow-lg shadow-primary/30"
            initial={reduce ? false : { y: 24, opacity: 0, rotateY: 180 }}
            animate={
              reduce
                ? { opacity: 1 }
                : { y: [0, -14, 0], opacity: 1, rotateY: [180, 0, 0] }
            }
            transition={
              reduce
                ? { duration: 0 }
                : {
                    y: { duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 },
                    rotateY: { duration: 0.6, delay: i * 0.12 },
                    opacity: { duration: 0.3, delay: i * 0.12 },
                  }
            }
          >
            {card}
          </motion.div>
        ))}
      </div>
      <div className="relative flex w-full max-w-xs flex-col items-center gap-3">
        <p className="text-xl font-extrabold">{reduce ? "Starting the game..." : MESSAGES[index]}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.span
            className="block h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
            animate={reduce ? { x: "100%" } : { x: ["-100%", "300%"] }}
            transition={reduce ? { duration: 0 } : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
