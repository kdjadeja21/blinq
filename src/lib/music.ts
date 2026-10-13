import { getAudioContext, isFeedbackEnabled } from "./feedback";

export type Mood = "calm" | "focus" | "drive" | "rush";

interface MoodSpec {
  bpm: number;
  beat: 0 | 1 | 2;
  arpEvery: number;
  volume: number;
}

const MOODS: Record<Mood, MoodSpec> = {
  calm: { bpm: 78, beat: 0, arpEvery: 4, volume: 0.9 },
  focus: { bpm: 84, beat: 1, arpEvery: 2, volume: 1 },
  drive: { bpm: 92, beat: 2, arpEvery: 2, volume: 1.05 },
  rush: { bpm: 104, beat: 2, arpEvery: 1, volume: 1.1 },
};

// Am - F - C - G, a warm and familiar loop. Notes are MIDI numbers.
const CHORDS = [
  { root: 45, tones: [57, 60, 64, 67] },
  { root: 41, tones: [53, 57, 60, 64] },
  { root: 48, tones: [55, 60, 64, 67] },
  { root: 43, tones: [55, 59, 62, 67] },
];

const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 2, 3];
const MASTER_LEVEL = 0.2;
const LOOKAHEAD_S = 0.25;

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

let bus: GainNode | null = null;
let wet: GainNode | null = null;
let noise: AudioBuffer | null = null;
let timer: number | null = null;
let mood: Mood = "calm";
let step = 0;
let nextTime = 0;
let wantPlaying = false;

function buildBus(ctx: AudioContext) {
  if (bus && wet) return;
  bus = ctx.createGain();
  bus.gain.value = 0;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 5200;
  bus.connect(tone).connect(ctx.destination);

  wet = ctx.createGain();
  wet.gain.value = 0.5;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.375;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 2200;
  wet.connect(delay);
  delay.connect(damp).connect(feedback).connect(delay);
  damp.connect(bus);

  noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function tone(
  ctx: AudioContext,
  freq: number,
  at: number,
  dur: number,
  opts: { type?: OscillatorType; peak: number; attack?: number; send?: number; detune?: number },
) {
  if (!bus || !wet) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.value = freq;
  if (opts.detune) osc.detune.value = opts.detune;
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(opts.peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(bus);
  if (opts.send) {
    const s = ctx.createGain();
    s.gain.value = opts.send;
    g.connect(s).connect(wet);
  }
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function kick(ctx: AudioContext, at: number, peak: number) {
  if (!bus) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(130, at);
  osc.frequency.exponentialRampToValueAtTime(42, at + 0.14);
  g.gain.setValueAtTime(peak, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  osc.connect(g).connect(bus);
  osc.start(at);
  osc.stop(at + 0.25);
}

function hat(ctx: AudioContext, at: number, peak: number) {
  if (!bus || !noise) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  src.connect(hp).connect(g).connect(bus);
  src.start(at);
  src.stop(at + 0.08);
}

function scheduleStep(ctx: AudioContext, s: number, at: number, stepDur: number) {
  const spec = MOODS[mood];
  const bar = Math.floor(s / 16) % CHORDS.length;
  const pos = s % 16;
  const chord = CHORDS[bar];
  const barDur = stepDur * 16;

  if (pos === 0) {
    for (const [i, note] of chord.tones.slice(0, 3).entries()) {
      tone(ctx, mtof(note - 12), at, barDur * 1.05, {
        type: "triangle",
        peak: 0.05,
        attack: barDur * 0.3,
        send: 0.3,
        detune: (i - 1) * 7,
      });
    }
  }

  const bassSteps = spec.beat === 0 ? [0, 10] : spec.beat === 1 ? [0, 6, 10] : [0, 3, 6, 8, 11, 14];
  if (bassSteps.includes(pos)) {
    tone(ctx, mtof(chord.root), at, stepDur * (pos === 0 ? 5 : 2.5), { type: "triangle", peak: 0.2, attack: 0.02 });
  }

  if (pos % spec.arpEvery === 0) {
    const idx = ARP_PATTERN[(pos / spec.arpEvery) % ARP_PATTERN.length];
    const octave = pos % 8 === 6 ? 12 : 0;
    const accent = pos % 4 === 0 ? 1 : 0.7;
    tone(ctx, mtof(chord.tones[idx] + 12 + octave), at, stepDur * 3, {
      type: "triangle",
      peak: 0.09 * accent,
      send: 0.55,
    });
  }

  if (spec.beat >= 1) {
    if (pos === 0 || pos === 8) kick(ctx, at, spec.beat === 2 ? 0.34 : 0.24);
    if (spec.beat === 2 && (pos === 4 || pos === 12)) kick(ctx, at, 0.2);
    if (pos % 4 === 2) hat(ctx, at, 0.05);
    if (spec.beat === 2 && pos % 2 === 1) hat(ctx, at, 0.025);
  }

  if (spec.beat === 2 && pos === 12) {
    tone(ctx, mtof(chord.tones[3] + 24), at, stepDur * 4, { type: "sine", peak: 0.05, send: 0.7 });
  }
}

function pump() {
  const ctx = getAudioContext();
  if (!ctx || !wantPlaying) return;
  const stepDur = 60 / MOODS[mood].bpm / 4;
  while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
    if (nextTime < ctx.currentTime - 0.1) nextTime = ctx.currentTime + 0.05;
    scheduleStep(ctx, step, nextTime, stepDur);
    step += 1;
    nextTime += stepDur;
  }
}

function applyVolume(ctx: AudioContext) {
  if (!bus) return;
  const target = wantPlaying && isFeedbackEnabled() ? MASTER_LEVEL * MOODS[mood].volume : 0;
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
}

export function startMusic(next: Mood) {
  if (typeof window === "undefined") return;
  mood = next;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (wantPlaying) {
    applyVolume(ctx);
    return;
  }
  wantPlaying = true;
  buildBus(ctx);
  if (ctx.state === "suspended") void ctx.resume();
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  applyVolume(ctx);
  timer = window.setInterval(pump, 60);
}

export function stopMusic() {
  wantPlaying = false;
  const ctx = getAudioContext();
  if (ctx) applyVolume(ctx);
  if (timer !== null) {
    const t = timer;
    timer = null;
    window.setTimeout(() => window.clearInterval(t), 1800);
  }
}

export function refreshMusic() {
  const ctx = getAudioContext();
  if (ctx) applyVolume(ctx);
}

/** A bell note tuned to the current chord; climbs with the player's combo. */
export function musicHit(combo: number): boolean {
  const ctx = getAudioContext();
  if (!ctx || !bus || !wantPlaying || !isFeedbackEnabled()) return false;
  if (typeof navigator.vibrate === "function") navigator.vibrate(15);
  const chord = CHORDS[Math.floor(step / 16) % CHORDS.length];
  const idx = Math.min(chord.tones.length - 1, Math.max(0, combo) % chord.tones.length);
  const lift = 12 + Math.min(2, Math.floor(combo / chord.tones.length)) * 12;
  tone(ctx, mtof(chord.tones[idx] + lift), ctx.currentTime + 0.01, 0.7, { type: "sine", peak: 0.16, send: 0.6 });
  return true;
}
