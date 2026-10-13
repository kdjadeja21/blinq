"use client";

import { Lightbulb, SkipForward } from "lucide-react";
import { cn } from "cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TIMINGS, guessOutcome, type Action, type Round } from "@/lib/game";
import { suggest } from "@/lib/match";
import { Board, type BoardMode } from "./Board";

interface PlayScreenProps {
  round: Round;
  now: number;
  dispatch: (action: Action) => void;
  onSkipTraining: () => void;
}

const FEEDBACK_STYLE = {
  correct: "text-emerald-600 dark:text-emerald-400",
  duplicate: "text-amber-600 dark:text-amber-400",
  wrong: "text-rose-600 dark:text-rose-400",
} as const;

function formatSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

function announcement(seconds: number): string {
  if (seconds > 0 && (seconds % 10 === 0 || seconds <= 5)) return `${seconds} seconds left`;
  return "";
}

export function PlayScreen({ round, now, dispatch, onSkipTraining }: PlayScreenProps) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<{ kind: keyof typeof FEEDBACK_STYLE; text: string } | null>(null);
  const [hints, setHints] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const training = round.mode === "training";

  const phase = round.phase;
  const totalMs = phase === "memorize" ? TIMINGS[round.mode].memorizeMs : TIMINGS[round.mode].recallMs;
  const remainingMs = Math.min(totalMs, Math.max(0, round.phaseEndsAt - now));
  const seconds = formatSeconds(remainingMs);
  const progress = phase === "hide" ? 0 : Math.min(1, remainingMs / totalMs);
  const low = seconds <= 5;

  useEffect(() => {
    if (phase === "recall") inputRef.current?.focus();
  }, [phase]);

  const suggestions = useMemo(
    () => suggest(text).filter((s) => !round.recalled.some((r) => r.id === s.id)),
    [text, round.recalled],
  );

  function submitGuess(raw: string) {
    const { outcome, item } = guessOutcome(round, raw);
    if (outcome === "empty") return;
    dispatch({ type: "guess", raw, now: Date.now() });
    if (outcome === "correct") setFeedback({ kind: "correct", text: `${item?.name} - nice!` });
    else if (outcome === "duplicate") setFeedback({ kind: "duplicate", text: `Already got ${item?.name}` });
    else setFeedback({ kind: "wrong", text: `"${raw.trim()}" isn't on the table` });
    setText("");
    inputRef.current?.focus();
  }

  const boardMode: BoardMode = phase === "memorize" ? "memorize" : phase === "hide" ? "hide" : "recall";
  const total = round.items.length;
  const label =
    phase === "memorize" ? "Memorize the table" : phase === "hide" ? "Get ready..." : "Type what you remember";
  const tip = !training
    ? null
    : phase === "memorize"
      ? "Tip: watch the timer above, then try to picture each item."
      : phase === "recall"
        ? "Tip: type a name and tap a suggestion if you like."
        : null;

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {training ? "Training" : round.mode === "daily" ? "Daily challenge" : `Level ${round.level}`}
          </p>
          <h2 className="text-lg font-semibold">{label}</h2>
        </div>
        {training && (
          <Button variant="ghost" className="h-11 px-3" onClick={onSkipTraining}>
            <SkipForward className="size-4" /> Skip
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Time remaining"
          aria-valuemin={0}
          aria-valuemax={Math.round(totalMs / 1000)}
          aria-valuenow={seconds}
        >
          <div
            className={cn("h-full rounded-full bg-primary", low && "bg-amber-500")}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={cn("w-12 text-right text-2xl font-bold tabular-nums", low && "text-amber-600 dark:text-amber-400")}>
          {phase === "hide" ? "–" : `${seconds}s`}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {phase === "hide" ? "" : announcement(seconds)}
      </p>
      {tip && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{tip}</p>}

      <Board
        items={round.items}
        mode={boardMode}
        recalledIds={round.recalled.map((r) => r.id)}
        hintLetters={hints}
      />

      {phase === "recall" ? (
        <div className="flex flex-col gap-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitGuess(text);
            }}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Type an item you remember"
              placeholder="Type an item..."
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" className="h-12 px-5 text-base">
              Add
            </Button>
          </form>

          <div className="flex min-h-11 flex-wrap gap-2" aria-label="Suggestions">
            {suggestions.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                className="h-11 px-4 text-base capitalize"
                onClick={() => submitGuess(s.name)}
              >
                {s.name}
              </Button>
            ))}
          </div>

          <p className={cn("min-h-6 text-sm font-medium", feedback && FEEDBACK_STYLE[feedback.kind])} aria-live="polite">
            {feedback?.text}
          </p>

          {round.wrong.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Not on the table: <span className="line-through">{round.wrong.join(", ")}</span>
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {round.recalled.length}/{total} remembered
            </span>
            <div className="flex gap-2">
              {training && (
                <Button variant="outline" className="h-11 px-4" onClick={() => setHints(true)} disabled={hints}>
                  <Lightbulb className="size-4" /> Hint
                </Button>
              )}
              <Button variant="secondary" className="h-11 px-4" onClick={() => dispatch({ type: "submit", now: Date.now() })}>
                I&apos;m done
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {phase === "memorize" ? `Remember all ${total} items - you'll type them next.` : " "}
        </p>
      )}
    </div>
  );
}
