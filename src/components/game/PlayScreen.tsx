"use client";

import { Lightbulb, SkipForward } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type Action, type Round } from "@/lib/game";
import { playCue } from "@/lib/feedback";
import { musicHit } from "@/lib/music";
import { ROUND_TYPE_LABELS } from "@/lib/levelConfig";
import { comboMultiplier } from "@/lib/scoring";
import { Board, type BoardMode } from "./Board";
import { ChoiceGrid } from "./ChoiceGrid";
import { PlaceTray, PositionBoard } from "./PositionBoard";
import { Lives } from "./Lives";
import { TimerRing } from "./TimerRing";

interface PlayScreenProps {
  round: Round;
  now: number;
  dispatch: (action: Action) => void;
  onSkipTraining: () => void;
}

function formatSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

function announcement(seconds: number): string {
  if (seconds > 0 && (seconds % 10 === 0 || seconds <= 5)) return `${seconds} seconds left`;
  return "";
}

export function PlayScreen({ round, now, dispatch, onSkipTraining }: PlayScreenProps) {
  const [hintId, setHintId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastWrongSlot, setLastWrongSlot] = useState<number | null>(null);
  const training = round.mode === "training";

  const phase = round.phase;
  const totalMs = phase === "memorize" ? round.spec.memorizeMs : round.spec.recallMs;
  const remainingMs = Math.min(totalMs, Math.max(0, round.phaseEndsAt - now));
  const seconds = formatSeconds(remainingMs);
  const progress = phase === "hide" ? 0 : Math.min(1, remainingMs / totalMs);

  const ticking = (phase === "memorize" || phase === "recall") && seconds > 0 && seconds <= 5;
  useEffect(() => {
    if (ticking) playCue("tick");
  }, [ticking, seconds]);

  const lastRecalled = round.recalled[round.recalled.length - 1];

  function pick(id: string) {
    const correct = round.items.some((i) => i.id === id);
    if (!correct) playCue("wrong");
    else if (!musicHit(round.combo)) playCue("correct");
    dispatch({ type: "pick", id, now: Date.now() });
  }

  function place(slot: number) {
    if (!selectedId || !round.layout) return;
    const correct = round.layout.slots[selectedId] === slot;
    if (!correct) {
      playCue("wrong");
      setLastWrongSlot(slot);
    } else if (!musicHit(round.combo)) {
      playCue("correct");
    }
    if (correct) setLastWrongSlot(null);
    setSelectedId(null);
    dispatch({ type: "place", id: selectedId, slot, now: Date.now() });
  }

  function showHint() {
    const missing = round.items.find((i) => !round.recalled.some((r) => r.id === i.id));
    setHintId(missing?.id ?? null);
  }

  const boardMode: BoardMode = phase === "memorize" ? "memorize" : "hide";
  const total = round.items.length;
  const layout = round.spec.roundType === "position" ? round.layout : null;
  const label =
    phase === "memorize"
      ? layout
        ? "Remember where each item sits"
        : "Memorize the table"
      : phase === "hide"
        ? "Get ready..."
        : layout
          ? "Put each item back in its spot"
          : "Tap what you saw";
  const tip = !training
    ? null
    : phase === "memorize"
      ? "Tip: watch the timer above, then try to picture each item."
      : phase === "recall"
        ? "Tip: tap the items you saw. Lookalikes are traps, but wrong taps are free in training. Stuck? Use Hint."
        : null;

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {training ? "Training" : round.mode === "daily" ? "Daily challenge" : `Level ${round.level}, ${ROUND_TYPE_LABELS[round.spec.roundType]}`}
          </p>
          <h2 className="text-xl font-bold">{label}</h2>
        </div>
        {training && (
          <Button variant="ghost" className="h-11 px-3" onClick={onSkipTraining}>
            <SkipForward className="size-4" /> Skip
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <TimerRing
          seconds={seconds}
          progress={progress}
          label="Time remaining"
          hidden={phase === "hide"}
        />
        <AnimatePresence mode="popLayout">
          {round.combo >= 2 && phase === "recall" && (
            <motion.div
              key={round.combo}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
              className="rounded-full bg-flame px-4 py-2 text-lg font-bold text-black shadow-lg shadow-flame/40"
            >
              🔥 x{comboMultiplier(round.combo)} combo
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="sr-only" aria-live="polite">
        {phase === "hide" ? "" : announcement(seconds)}
      </p>
      {tip && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">{tip}</p>}

      <div className="relative">
        {layout ? (
          <div className="flex flex-col gap-4">
            <PositionBoard
              items={round.items}
              layout={layout}
              mode={phase === "memorize" ? "memorize" : phase === "hide" ? "hide" : "recall"}
              placedIds={round.recalled.map((r) => r.id)}
              wrongSlots={lastWrongSlot !== null && phase === "recall" ? [lastWrongSlot] : []}
              canPlace={phase === "recall" && round.lives > 0 && selectedId !== null}
              onSlot={place}
            />
            {phase === "recall" ? (
              <PlaceTray
                items={round.items}
                placedIds={round.recalled.map((r) => r.id)}
                selectedId={selectedId}
                disabled={round.lives <= 0}
                onSelect={(id) => {
                  setLastWrongSlot(null);
                  setSelectedId((current) => (current === id ? null : id));
                }}
              />
            ) : null}
          </div>
        ) : phase === "recall" ? (
          <ChoiceGrid
            choices={round.choices}
            recalledIds={round.recalled.map((r) => r.id)}
            wrongIds={round.wrong}
            hintId={hintId}
            disabled={round.lives <= 0}
            onPick={pick}
          />
        ) : (
          <Board items={round.items} mode={boardMode} recalledIds={[]} />
        )}
        <AnimatePresence>
          {phase === "recall" && lastRecalled && (
            <motion.div
              key={round.recalled.length}
              aria-hidden
              initial={{ y: 10, opacity: 1, scale: 0.7 }}
              animate={{ y: -50, opacity: 0, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 text-3xl font-extrabold text-success drop-shadow-lg"
            >
              +{lastRecalled.points}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {phase === "recall" && !training && round.wrong.length > 0 && (
            <motion.div
              key={round.wrong.length}
              aria-hidden
              initial={{ y: 0, opacity: 1, scale: 0.7 }}
              animate={{ y: -50, opacity: 0, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-3xl font-extrabold text-destructive drop-shadow-lg"
            >
              {round.spec.rules.wrongPenaltyMs > 0 ? `-${round.spec.rules.wrongPenaltyMs / 1000}s` : "Miss"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "recall" ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {round.recalled.length}/{total} found
          </span>
          {!training && (
            <Lives lives={round.lives} max={round.spec.rules.lives} />
          )}
          <div className="flex gap-2">
            {training && (
              <Button variant="outline" className="h-11 px-4" onClick={showHint} disabled={hintId !== null}>
                <Lightbulb className="size-4" /> Hint
              </Button>
            )}
            <Button variant="secondary" className="h-11 px-4" onClick={() => dispatch({ type: "submit", now: Date.now() })}>
              I&apos;m done
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {phase === "memorize" ? `Remember all ${total} items - you'll pick them out of a crowd next.` : " "}
        </p>
      )}
    </div>
  );
}
