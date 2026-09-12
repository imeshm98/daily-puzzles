/**
 * Melody game rules. Pure functions only (no React, no DOM) so they are easy
 * to unit test and reuse.
 */
import { createRng, pickOne, type Rng } from "@/lib/random";
import { buildShareText, SQUARES } from "@/lib/share";

export const MELODY_NAME = "Melody";
export const MELODY_LENGTH = 5;
export const MAX_TRIES = 6;

/** The 8 white keys, low to high. */
export const NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] as const;
export type Note = (typeof NOTES)[number];

/** Short labels for keys and board cells. The high C gets a prime mark. */
export const NOTE_LABELS: Record<Note, string> = {
  C4: "C",
  D4: "D",
  E4: "E",
  F4: "F",
  G4: "G",
  A4: "A",
  B4: "B",
  C5: "C′",
};

export const NOTE_FREQUENCIES: Record<Note, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
};

/** Computer keyboard row: A S D F G H J K → C4 … C5. */
export const KEY_TO_NOTE: Record<string, Note> = {
  a: "C4",
  s: "D4",
  d: "E4",
  f: "F4",
  g: "G4",
  h: "A4",
  j: "B4",
  k: "C5",
};

export const NOTE_TO_KEY: Record<Note, string> = Object.fromEntries(
  Object.entries(KEY_TO_NOTE).map(([key, note]) => [note, key.toUpperCase()]),
) as Record<Note, string>;

export function isNote(value: unknown): value is Note {
  return typeof value === "string" && (NOTES as readonly string[]).includes(value);
}

export type Mark = "correct" | "present" | "absent";

/**
 * Wordle-exact colouring.
 * Pass 1 marks exact matches green. Pass 2 marks a remaining guess note yellow
 * only while unmatched copies of that note are left in the answer, so a note
 * guessed more often than it appears is coloured at most that many times.
 */
export function scoreGuess(guess: readonly Note[], answer: readonly Note[]): Mark[] {
  const marks: Mark[] = new Array<Mark>(answer.length).fill("absent");
  const unmatched = new Map<Note, number>();

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      marks[i] = "correct";
    } else {
      unmatched.set(answer[i], (unmatched.get(answer[i]) ?? 0) + 1);
    }
  }

  for (let i = 0; i < answer.length; i++) {
    if (marks[i] === "correct") continue;
    const left = unmatched.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = "present";
      unmatched.set(guess[i], left - 1);
    }
  }

  return marks;
}

export function isWinningMarks(marks: readonly Mark[]): boolean {
  return marks.length > 0 && marks.every((mark) => mark === "correct");
}

const START_INDICES = [0, 2, 4]; // C4, E4, G4
const LEAP_CHANCE = 0.22;
const REPEAT_CHANCE = 0.12;

function inRange(index: number): boolean {
  return index >= 0 && index < NOTES.length;
}

/** Tries `prev ± size` in the preferred direction first, then the other. */
function stepFrom(prev: number, size: number, direction: 1 | -1): number | null {
  const preferred = prev + size * direction;
  if (inRange(preferred)) return preferred;
  const other = prev - size * direction;
  return inRange(other) ? other : null;
}

/**
 * Generates a musical melody from a seeded RNG:
 * - starts on C4, E4 or G4
 * - moves mostly by step (to a neighbouring key)
 * - at most one bigger leap (2 to 4 keys)
 * - may repeat a note, but never the same note three times in a row
 */
export function generateMelody(rng: Rng, length = MELODY_LENGTH): Note[] {
  const indices: number[] = [pickOne(rng, START_INDICES)];
  let leapUsed = false;

  while (indices.length < length) {
    const prev = indices[indices.length - 1];
    const beforePrev = indices[indices.length - 2];
    const roll = rng();
    const direction: 1 | -1 = rng() < 0.5 ? 1 : -1;
    let next: number | null = null;

    if (!leapUsed && roll < LEAP_CHANCE) {
      const size = 2 + Math.floor(rng() * 3); // 2, 3 or 4 keys
      next = stepFrom(prev, size, direction);
      if (next !== null) leapUsed = true;
    } else if (roll < LEAP_CHANCE + REPEAT_CHANCE && prev !== beforePrev) {
      next = prev;
    }

    if (next === null) next = stepFrom(prev, 1, direction) ?? prev;
    indices.push(next);
  }

  return indices.map((index) => NOTES[index]);
}

/** The one melody everyone gets on a given local date. */
export function getDailyMelody(dateKey: string): Note[] {
  return generateMelody(createRng(`melody:${dateKey}`));
}

export function marksToSquares(marks: readonly Mark[]): string {
  return marks.map((mark) => SQUARES[mark]).join("");
}

export interface MelodyShareInput {
  puzzleNumber: number;
  won: boolean;
  /** Marks of every submitted try, in order. */
  marks: readonly (readonly Mark[])[];
}

export function buildMelodyShareText(input: MelodyShareInput): string {
  return buildShareText({
    gameName: MELODY_NAME,
    puzzleNumber: input.puzzleNumber,
    won: input.won,
    tries: input.marks.length,
    maxTries: MAX_TRIES,
    rows: input.marks.map(marksToSquares),
  });
}
