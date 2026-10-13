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

export type Cue = "correct" | "wrong" | "duplicate" | "tick" | "win" | "lose" | "tap";

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

export function playCue(cue: Cue) {
  if (typeof window === "undefined" || !readEnabled()) return;
  const { notes, vibrate } = CUES[cue];
  if (vibrate && typeof navigator.vibrate === "function") navigator.vibrate(vibrate);
  try {
    ctx ??= new AudioContext();
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

let music: { gain: GainNode; stop: () => void } | null = null;

const MUSIC_CHORDS = [
  [196, 246.94, 293.66],
  [174.61, 220, 261.63],
  [164.81, 196, 246.94],
  [196, 233.08, 293.66],
];
const CHORD_SECONDS = 4;

export function startMusic() {
  if (typeof window === "undefined" || !readEnabled() || music) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const audio = ctx;
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, audio.currentTime);
    master.gain.linearRampToValueAtTime(0.05, audio.currentTime + 2);
    master.connect(audio.destination);

    let chord = 0;
    const playChord = () => {
      const t0 = audio.currentTime;
      for (const freq of MUSIC_CHORDS[chord % MUSIC_CHORDS.length]) {
        const osc = audio.createOscillator();
        const g = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.5, t0 + 1.5);
        g.gain.linearRampToValueAtTime(0.0001, t0 + CHORD_SECONDS + 1);
        osc.connect(g).connect(master);
        osc.start(t0);
        osc.stop(t0 + CHORD_SECONDS + 1.1);
      }
      chord += 1;
    };
    playChord();
    const timer = window.setInterval(playChord, CHORD_SECONDS * 1000);
    music = {
      gain: master,
      stop: () => {
        window.clearInterval(timer);
        const t = audio.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
        master.gain.linearRampToValueAtTime(0.0001, t + 0.6);
        window.setTimeout(() => master.disconnect(), 800);
      },
    };
  } catch {
    music = null;
  }
}

export function stopMusic() {
  music?.stop();
  music = null;
}
