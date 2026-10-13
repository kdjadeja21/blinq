"use client";

import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#fb7185"];

function pseudo(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function Confetti({ count = 44 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = pseudo(i + 1) * 100;
        const drift = (pseudo(i + 50) - 0.5) * 160;
        const size = 6 + pseudo(i + 99) * 8;
        return (
          <motion.span
            key={i}
            className="absolute top-0 block rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              background: COLORS[i % COLORS.length],
            }}
            initial={{ y: -40, opacity: 1, rotate: 0 }}
            animate={{ y: "105vh", x: drift, opacity: [1, 1, 0], rotate: 360 + pseudo(i) * 360 }}
            transition={{ duration: 2.2 + pseudo(i + 7) * 1.6, delay: pseudo(i + 3) * 0.5, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}
