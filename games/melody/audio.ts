/**
 * Web Audio synth for Melody. No audio files: every note is a triangle wave
 * with a short attack and an exponential decay, about 0.4 s long.
 */
import { NOTE_FREQUENCIES, type Note } from "./logic";

/** Seconds a single note sounds. */
export const NOTE_DURATION = 0.4;
/** Seconds between note starts when playing a sequence. */
export const NOTE_SPACING = 0.45;
/** Small lead-in so the first note is never clipped by a resuming context. */
const LEAD_IN = 0.05;

let context: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Creates the AudioContext lazily (must happen inside a user gesture on iOS). */
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function scheduleNote(ac: AudioContext, note: Note, when: number, duration = NOTE_DURATION) {
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = NOTE_FREQUENCIES[note];

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.45, when + 0.015); // attack
  gain.gain.exponentialRampToValueAtTime(0.18, when + 0.13); // decay
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration); // release

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + duration + 0.05);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  return osc;
}

/** Plays one note right now (used when a piano key is pressed). */
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
  const oscillators: OscillatorNode[] = [];
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
    if (ac) oscillators.push(scheduleNote(ac, note, startAt + index * spacing));
    timers.push(window.setTimeout(() => onNote?.(index), (LEAD_IN + index * spacing) * 1000));
  });
  const totalMs = (LEAD_IN + Math.max(0, notes.length - 1) * spacing + NOTE_DURATION) * 1000;
  timers.push(window.setTimeout(finish, totalMs));

  return {
    done,
    cancel: () => {
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      });
      finish();
    },
  };
}
