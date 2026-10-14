import { useSyncExternalStore } from "react";

const KEY = "blinq:sound";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function useFeedbackEnabled(): boolean {
  return useSyncExternalStore(subscribe, readEnabled, () => true);
}

export function setFeedbackEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export type Cue = "correct" | "wrong" | "duplicate" | "tick" | "win" | "lose" | "tap" | "battle";

interface Note {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const CUES: Record<Cue, { notes: Note[]; vibrate: number | number[] }> = {
  correct: {
    notes: [
      { freq: 660, start: 0, duration: 0.09 },
      { freq: 880, start: 0.07, duration: 0.14 },
    ],
    vibrate: 15,
  },
  wrong: { notes: [{ freq: 160, start: 0, duration: 0.22, type: "sawtooth", gain: 0.08 }], vibrate: [30, 40, 30] },
  duplicate: { notes: [{ freq: 330, start: 0, duration: 0.1, type: "triangle" }], vibrate: 10 },
  tick: { notes: [{ freq: 1000, start: 0, duration: 0.04, type: "square", gain: 0.04 }], vibrate: 0 },
  tap: { notes: [{ freq: 520, start: 0, duration: 0.05, type: "triangle", gain: 0.07 }], vibrate: 8 },
  battle: {
    notes: [
      { freq: 587.33, start: 0, duration: 0.07, type: "triangle", gain: 0.09 },
      { freq: 880, start: 0.055, duration: 0.12, type: "triangle", gain: 0.11 },
    ],
    vibrate: [12, 30, 18],
  },
  win: {
    notes: [523, 659, 784, 1047].map((freq, i) => ({ freq, start: i * 0.11, duration: 0.2 })),
    vibrate: [30, 50, 30, 50, 80],
  },
  lose: {
    notes: [392, 330, 262].map((freq, i) => ({ freq, start: i * 0.15, duration: 0.22, type: "triangle" as const })),
    vibrate: 60,
  },
};

let ctx: AudioContext | null = null;

export function isFeedbackEnabled(): boolean {
  return typeof window !== "undefined" && readEnabled();
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export function playCue(cue: Cue) {
  if (typeof window === "undefined" || !readEnabled()) return;
  const { notes, vibrate } = CUES[cue];
  if (vibrate && typeof navigator.vibrate === "function") navigator.vibrate(vibrate);
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type ?? "sine";
      osc.frequency.value = note.freq;
      const peak = note.gain ?? 0.12;
      gain.gain.setValueAtTime(0.0001, t0 + note.start);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + note.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.start + note.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + note.start);
      osc.stop(t0 + note.start + note.duration + 0.02);
    }
  } catch {
    // audio unavailable
  }
}
