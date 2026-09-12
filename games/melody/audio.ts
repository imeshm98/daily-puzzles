/**
 * Web Audio synth for Melody. No audio files.
 *
 * Signal chain, built once and shared by every note:
 *
 *   note voice ─▶ master GainNode (volume) ─▶ DynamicsCompressorNode ─▶ destination
 *
 * A note voice is three oscillators (the fundamental plus the octave and the
 * fifth above it) mixed into one envelope with a real sustain. Phone speakers
 * barely reproduce the fundamentals of these notes (262–523 Hz), so the
 * harmonics and the sustain are what make a note audible; the compressor then
 * raises the average level without letting peaks clip.
 */
import { readJSON, storageKey, writeJSON } from "@/lib/storage";
import { NOTE_FREQUENCIES, type Note } from "./logic";

/** Seconds a single note sounds. */
export const NOTE_DURATION = 0.45;
/** Seconds between note starts when playing a sequence. */
export const NOTE_SPACING = 0.5;
/** Small lead-in so the first note is never clipped by a resuming context. */
const LEAD_IN = 0.05;

/** Partials of one note voice: frequency ratio to the fundamental and linear gain. */
export const PARTIALS: readonly { ratio: number; gain: number; type: OscillatorType }[] = [
  { ratio: 1, gain: 1, type: "triangle" }, // fundamental
  { ratio: 2, gain: 0.5, type: "sine" }, // octave
  { ratio: 3, gain: 0.3, type: "sine" }, // fifth above the octave
];

/** Peak gain of the note envelope (applied to the mixed partials). */
export const NOTE_PEAK = 0.5;

/** Envelope timings in seconds; levels are relative to NOTE_PEAK. */
export const ENVELOPE = {
  attack: 0.012,
  decay: 0.08,
  decayLevel: 0.85,
  sustainLevel: 0.7,
  release: 0.09,
} as const;

/** Short musical notes: fast attack, moderate ratio, quick release. */
const COMPRESSOR = {
  threshold: -20,
  knee: 12,
  ratio: 4,
  attack: 0.003,
  release: 0.15,
} as const;

/** Volume slider range is 0..1. This is the master gain at 1. */
export const MAX_MASTER_GAIN = 1;
/** Loud, but with headroom below the clipping bound (see estimatePeakLevel). */
export const DEFAULT_VOLUME = 0.9;

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

/** Maps the 0..1 slider to a master gain. Squared so the slider feels linear to the ear. */
export function volumeToGain(volume: number): number {
  const v = clampVolume(volume);
  return v * v * MAX_MASTER_GAIN;
}

/**
 * Worst-case peak sample value (0 dBFS = 1) that one note sends into the
 * compressor at the given volume. Triangle and sine waves peak at 1, so the
 * bound is the sum of the partial gains times the envelope peak times the
 * master gain. It must stay at or below 1 at full volume; the test checks it.
 *
 * Nothing clips inside the graph (it runs in floating point); only the
 * destination clips. The compressor sits in front of it and pulls peaks down,
 * which also covers the brief overlap when a key is pressed while a previous
 * note is still fading out.
 */
export function estimatePeakLevel(volume: number): number {
  const partialSum = PARTIALS.reduce((sum, partial) => sum + partial.gain, 0);
  return partialSum * NOTE_PEAK * volumeToGain(volume);
}

// ---------------------------------------------------------------------------
// Volume setting (remembered in localStorage)
// ---------------------------------------------------------------------------

const VOLUME_KEY = storageKey("melody", "volume");
let volume: number | null = null;
const volumeListeners = new Set<() => void>();

/** Current volume (0..1). Reads localStorage once, then caches. */
export function getVolume(): number {
  if (volume === null) {
    const saved = readJSON<number>(VOLUME_KEY);
    volume =
      typeof saved === "number" && Number.isFinite(saved) ? clampVolume(saved) : DEFAULT_VOLUME;
  }
  return volume;
}

/** Sets and remembers the volume, and applies it to the running master gain. */
export function setVolume(next: number): void {
  volume = clampVolume(next);
  writeJSON(VOLUME_KEY, volume);
  if (context && master) {
    master.gain.setTargetAtTime(volumeToGain(volume), context.currentTime, 0.01);
  }
  volumeListeners.forEach((listener) => listener());
}

/** For useSyncExternalStore. */
export function subscribeVolume(listener: () => void): () => void {
  volumeListeners.add(listener);
  return () => volumeListeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Audio context and master chain (created once)
// ---------------------------------------------------------------------------

let context: AudioContext | null = null;
let master: GainNode | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Returns the shared AudioContext, creating it and the master chain on first
 * use, and resumes it if the browser suspended it (autoplay policy, iOS
 * interruptions). Resuming only succeeds inside a user gesture.
 */
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = COMPRESSOR.threshold;
    compressor.knee.value = COMPRESSOR.knee;
    compressor.ratio.value = COMPRESSOR.ratio;
    compressor.attack.value = COMPRESSOR.attack;
    compressor.release.value = COMPRESSOR.release;
    compressor.connect(context.destination);

    master = context.createGain();
    master.gain.value = volumeToGain(getVolume());
    master.connect(compressor);
  }
  if (context.state !== "running") {
    context.resume().catch(() => {
      // Not inside a user gesture yet; the next gesture will try again.
    });
  }
  return context;
}

/**
 * Creates and resumes the audio context. Call it from the first user gesture
 * (pointer up, touch end or key down) so later playback starts instantly.
 */
export function unlockAudio(): void {
  getContext();
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

interface Voice {
  /** Fades the voice out over a few milliseconds and stops it (no click). */
  stop: () => void;
}

function scheduleNote(ac: AudioContext, note: Note, when: number, duration = NOTE_DURATION): Voice {
  if (!master) throw new Error("audio chain not initialised");
  const frequency = NOTE_FREQUENCIES[note];

  // One envelope for the whole voice.
  const envelope = ac.createGain();
  const gain = envelope.gain;
  const attackEnd = when + ENVELOPE.attack;
  const decayEnd = attackEnd + ENVELOPE.decay;
  const sustainEnd = Math.max(decayEnd, when + duration - ENVELOPE.release);
  gain.setValueAtTime(0.0001, when);
  gain.exponentialRampToValueAtTime(NOTE_PEAK, attackEnd);
  gain.exponentialRampToValueAtTime(NOTE_PEAK * ENVELOPE.decayLevel, decayEnd);
  gain.exponentialRampToValueAtTime(NOTE_PEAK * ENVELOPE.sustainLevel, sustainEnd);
  gain.exponentialRampToValueAtTime(0.0001, when + duration);
  envelope.connect(master);

  const stopAt = when + duration + 0.02;
  const nodes = PARTIALS.map((partial) => {
    const osc = ac.createOscillator();
    osc.type = partial.type;
    osc.frequency.value = frequency * partial.ratio;
    const level = ac.createGain();
    level.gain.value = partial.gain;
    osc.connect(level);
    level.connect(envelope);
    osc.start(when);
    osc.stop(stopAt);
    return { osc, level };
  });

  let remaining = nodes.length;
  nodes.forEach(({ osc, level }) => {
    osc.onended = () => {
      osc.disconnect();
      level.disconnect();
      if (--remaining === 0) envelope.disconnect();
    };
  });

  return {
    stop: () => {
      const now = ac.currentTime;
      try {
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
        gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        nodes.forEach(({ osc }) => osc.stop(now + 0.04));
      } catch {
        // already stopped
      }
    },
  };
}

/** Plays one note right now (used when a piano key is pressed, and by "Test sound"). */
export function playNote(note: Note): void {
  const ac = getContext();
  if (!ac) return;
  scheduleNote(ac, note, ac.currentTime);
}

export interface SequenceHandle {
  /** Resolves when the last note has finished (or on cancel). */
  done: Promise<void>;
  cancel: () => void;
}

/**
 * Plays notes one after another. `onNote(i)` fires as note i starts and
 * `onNote(null)` when the sequence ends, so the UI can highlight keys.
 */
export function playSequence(
  notes: readonly Note[],
  onNote?: (index: number | null) => void,
  spacing = NOTE_SPACING,
): SequenceHandle {
  const ac = getContext();
  const timers: number[] = [];
  const voices: Voice[] = [];
  let finished = false;
  let resolveDone: () => void = () => {};

  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    onNote?.(null);
    resolveDone();
  };

  const startAt = ac ? ac.currentTime + LEAD_IN : 0;
  notes.forEach((note, index) => {
    if (ac) voices.push(scheduleNote(ac, note, startAt + index * spacing));
    timers.push(window.setTimeout(() => onNote?.(index), (LEAD_IN + index * spacing) * 1000));
  });
  const totalMs = (LEAD_IN + Math.max(0, notes.length - 1) * spacing + NOTE_DURATION) * 1000;
  timers.push(window.setTimeout(finish, totalMs));

  return {
    done,
    cancel: () => {
      voices.forEach((voice) => voice.stop());
      finish();
    },
  };
}
