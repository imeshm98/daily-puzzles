/**
 * Distance rules: great-circle distance, scoring and puzzle generation.
 * Pure functions only (no React, no DOM).
 */
import { createRng, randomInt, type Rng } from "@/lib/random";
import { buildShareText } from "@/lib/share";
import { CITIES, type City } from "./cities";

export type { City } from "./cities";

export const DISTANCE_NAME = "Distance";
export const ROUNDS = 5;
export const POINTS_PER_ROUND = 100;
export const MAX_SCORE = ROUNDS * POINTS_PER_ROUND;
/** Cities in a round are always at least this far apart. */
export const MIN_PAIR_KM = 300;
/** Full points up to this error, zero points from FLOOR_ERROR_PERCENT on. */
export const PERFECT_ERROR_PERCENT = 5;
export const FLOOR_ERROR_PERCENT = 50;
/** A daily total at or above this counts as a win in the stats. */
export const WIN_SCORE = 350;
export const KM_PER_MILE = 1.609344;
/** Mean Earth radius in kilometres. */
export const EARTH_RADIUS_KM = 6371;

export type Unit = "km" | "mi";

export interface Round {
  from: City;
  to: City;
  /** Great-circle distance in km, rounded to a whole km. */
  distanceKm: number;
}

export interface DistancePuzzle {
  rounds: Round[];
}

export interface RoundResult {
  guessKm: number;
  actualKm: number;
  errorPercent: number;
  points: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points using the haversine formula. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/** Error as a percentage of the real distance. */
export function errorPercent(guessKm: number, actualKm: number): number {
  return (Math.abs(guessKm - actualKm) / actualKm) * 100;
}

/**
 * 100 points at 5% error or less, falling in a straight line to 0 at 50% or
 * more, rounded to whole points.
 */
export function pointsForError(error: number): number {
  if (error <= PERFECT_ERROR_PERCENT) return POINTS_PER_ROUND;
  if (error >= FLOOR_ERROR_PERCENT) return 0;
  const span = FLOOR_ERROR_PERCENT - PERFECT_ERROR_PERCENT;
  return Math.round((POINTS_PER_ROUND * (FLOOR_ERROR_PERCENT - error)) / span);
}

export function scoreRound(guessKm: number, actualKm: number): RoundResult {
  const error = errorPercent(guessKm, actualKm);
  return { guessKm, actualKm, errorPercent: error, points: pointsForError(error) };
}

export function totalPoints(results: readonly RoundResult[]): number {
  return results.reduce((sum, result) => sum + result.points, 0);
}

export function isWinningScore(total: number): boolean {
  return total >= WIN_SCORE;
}

export type Square = "🟩" | "🟨" | "🟥";

/** 🟩 within 10%, 🟨 within 25%, 🟥 beyond that. */
export function squareForError(error: number): Square {
  if (error <= 10) return "🟩";
  if (error <= 25) return "🟨";
  return "🟥";
}

/**
 * Parses what the player typed: digits with optional separators and a
 * decimal point. Returns null for anything that is not a positive number.
 */
export function parseGuess(text: string): number | null {
  const cleaned = text.replace(/[^\d.]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Whole km the player meant, given their number and unit. */
export function guessToKm(value: number, unit: Unit): number {
  return Math.round(unit === "mi" ? milesToKm(value) : value);
}

/**
 * Picks ROUNDS pairs of different cities at least MIN_PAIR_KM apart.
 * No city appears twice in a puzzle.
 */
export function generatePuzzle(rng: Rng, cities: readonly City[] = CITIES): DistancePuzzle {
  const used = new Set<number>();
  const rounds: Round[] = [];
  let guard = 0;
  while (rounds.length < ROUNDS && guard++ < 10_000) {
    const i = randomInt(rng, cities.length);
    const j = randomInt(rng, cities.length);
    if (i === j || used.has(i) || used.has(j)) continue;
    const distance = haversineKm(cities[i], cities[j]);
    if (distance < MIN_PAIR_KM) continue;
    used.add(i);
    used.add(j);
    rounds.push({ from: cities[i], to: cities[j], distanceKm: Math.round(distance) });
  }
  if (rounds.length < ROUNDS) throw new Error("Could not generate a Distance puzzle");
  return { rounds };
}

/** The one puzzle everyone gets on a given local date. */
export function getDailyPuzzle(dateKey: string): DistancePuzzle {
  return generatePuzzle(createRng(`distance:${dateKey}`));
}

/** A random puzzle for practice mode. Math.random is fine here: practice is not shared. */
export function generateRandomPuzzle(): DistancePuzzle {
  return generatePuzzle(Math.random);
}

export interface DistanceShareInput {
  puzzleNumber: number;
  /** True for a practice puzzle: the heading becomes "Distance Practice". */
  practice?: boolean;
  results: readonly RoundResult[];
}

/**
 *   Distance #4  412/500
 *   🟩🟩🟨🟩🟥
 *   https://example.com
 */
export function buildDistanceShareText(input: DistanceShareInput): string {
  const total = totalPoints(input.results);
  return buildShareText({
    gameName: DISTANCE_NAME,
    puzzleNumber: input.puzzleNumber,
    practice: input.practice,
    won: isWinningScore(total),
    tries: input.results.length,
    maxTries: ROUNDS,
    scoreLabel: `${total}/${MAX_SCORE}`,
    rows: [input.results.map((result) => squareForError(result.errorPercent)).join("")],
  });
}

/** Stats bucket 1-5 for a total score: 0-100 → 1, ..., 401-500 → 5. */
export function scoreBucket(total: number): number {
  return Math.min(ROUNDS, Math.max(1, Math.ceil(total / POINTS_PER_ROUND)));
}
