/**
 * Colour Mix rules. Pure functions only (no React, no DOM).
 */
import { createRng, randomInt, type Rng } from "@/lib/random";
import { buildShareText } from "@/lib/share";

export const COLOUR_MIX_NAME = "Colour Mix";
export const MAX_TRIES = 3;
/** A try scoring at least this is a win. */
export const WIN_SCORE = 95;
/** A channel within this distance of the target gets a ✓ hint. */
export const HINT_TOLERANCE = 10;
/** Daily targets avoid very dark and very light colours. */
export const CHANNEL_MIN = 30;
export const CHANNEL_MAX = 225;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type Channel = keyof RGB;
export const CHANNELS: readonly Channel[] = ["r", "g", "b"];
export const CHANNEL_LABELS: Record<Channel, string> = { r: "Red", g: "Green", b: "Blue" };

/** Where the sliders start. */
export const DEFAULT_GUESS: RGB = { r: 128, g: 128, b: 128 };

export function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function isRGB(value: unknown): value is RGB {
  if (!value || typeof value !== "object") return false;
  const colour = value as Record<string, unknown>;
  return CHANNELS.every(
    (channel) =>
      typeof colour[channel] === "number" &&
      Number.isInteger(colour[channel]) &&
      (colour[channel] as number) >= 0 &&
      (colour[channel] as number) <= 255,
  );
}

export function toCss(colour: RGB): string {
  return `rgb(${colour.r}, ${colour.g}, ${colour.b})`;
}

export function toHex(colour: RGB): string {
  return "#" + CHANNELS.map((c) => colour[c].toString(16).padStart(2, "0")).join("");
}

/** A colour with every channel in [CHANNEL_MIN, CHANNEL_MAX]. */
export function generateColour(rng: Rng): RGB {
  const span = CHANNEL_MAX - CHANNEL_MIN + 1;
  return {
    r: CHANNEL_MIN + randomInt(rng, span),
    g: CHANNEL_MIN + randomInt(rng, span),
    b: CHANNEL_MIN + randomInt(rng, span),
  };
}

/** The one target colour everyone gets on a given local date. */
export function getDailyColour(dateKey: string): RGB {
  return generateColour(createRng(`colourmix:${dateKey}`));
}

/** A random target for practice mode. Math.random is fine here: practice is not shared. */
export function generateRandomColour(): RGB {
  return generateColour(Math.random);
}

export type Hint = "higher" | "lower" | "close";

export const HINT_SYMBOLS: Record<Hint, string> = { higher: "▲", lower: "▼", close: "✓" };
export const HINT_LABELS: Record<Hint, string> = {
  higher: "go higher",
  lower: "go lower",
  close: "close",
};

/** ✓ within HINT_TOLERANCE of the target, otherwise which way to move. */
export function hintFor(guess: number, target: number): Hint {
  if (Math.abs(guess - target) <= HINT_TOLERANCE) return "close";
  return guess < target ? "higher" : "lower";
}

/** One hint per channel, in R G B order. */
export function hintsFor(guess: RGB, target: RGB): Hint[] {
  return CHANNELS.map((channel) => hintFor(guess[channel], target[channel]));
}

/** Largest possible RGB distance: black to white. */
export const MAX_DISTANCE = Math.sqrt(3 * 255 * 255);

export function distance(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** Accuracy in percent: 100 minus the distance as a share of the maximum, rounded. */
export function scoreColour(guess: RGB, target: RGB): number {
  return Math.round(100 - (distance(guess, target) / MAX_DISTANCE) * 100);
}

export function isWinningScore(score: number): boolean {
  return score >= WIN_SCORE;
}

export function bestScore(scores: readonly number[]): number {
  return scores.length === 0 ? 0 : Math.max(...scores);
}

export function hintsToSymbols(hints: readonly Hint[]): string {
  return hints.map((hint) => HINT_SYMBOLS[hint]).join("");
}

export interface ColourMixShareInput {
  puzzleNumber: number;
  /** True for a practice puzzle: the heading becomes "Colour Mix Practice". */
  practice?: boolean;
  won: boolean;
  /** Best accuracy over all tries. */
  bestScore: number;
  /** Hints of every submitted try, in order. */
  hints: readonly (readonly Hint[])[];
  /** The try that won (1-based). Only used when `won` is true. */
  winningTry?: number;
}

export function buildColourMixShareText(input: ColourMixShareInput): string {
  return buildShareText({
    gameName: COLOUR_MIX_NAME,
    puzzleNumber: input.puzzleNumber,
    practice: input.practice,
    won: input.won,
    tries: input.winningTry ?? input.hints.length,
    maxTries: MAX_TRIES,
    detail: `${input.bestScore}%`,
    rows: input.hints.map(hintsToSymbols),
  });
}
