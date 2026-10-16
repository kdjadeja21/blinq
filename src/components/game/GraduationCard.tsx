"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy } from "lucide-react";
import { ROUND_TYPE_LABELS, getComboStageTypes, getLevelConfig } from "@/lib/levelConfig";

interface GraduationCardProps {
  level: number;
  graduated: boolean;
  score: number;
  correct: number;
  total: number;
  kids?: boolean;
}

export function GraduationCard({ level, graduated, score, correct, total, kids = false }: GraduationCardProps) {
  const reduce = useReducedMotion();
  const block = getLevelConfig(level, "medium", 0, kids).block + 1;
  const skill = ROUND_TYPE_LABELS[getComboStageTypes(level, kids)[1]];
  const next = ROUND_TYPE_LABELS[getLevelConfig(level + 1, "medium", 0, kids).roundType];
  return (
    <motion.section
      aria-label={graduated ? `Block ${block} graduation` : `Block ${block} boss`}
      initial={reduce ? false : { scale: 0.9, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-3xl border-2 bg-card p-5 text-center shadow-lg",
        graduated && "border-gold bg-gold/10 shadow-gold/30",
      )}
    >
      <Trophy className={cn("size-12", graduated ? "fill-gold text-gold" : "text-muted-foreground")} aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Block {block} boss</p>
      <h3 className="text-2xl font-extrabold">{graduated ? `${skill} graduate` : `${skill} boss`}</h3>
      <dl className="mt-1 grid w-full grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted/60 p-2">
          <dt className="text-muted-foreground">Recalled</dt>
          <dd className="font-bold">
            {correct}/{total}
          </dd>
        </div>
        <div className="rounded-xl bg-muted/60 p-2">
          <dt className="text-muted-foreground">Score</dt>
          <dd className="font-bold">{score}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        {graduated ? `Next up: ${next}` : "Recall everything in both stages to graduate."}
      </p>
    </motion.section>
  );
}
