/**
 * Deterministic randomness for daily puzzles.
 *
 * Never use Math.random when generating a puzzle: every player must get the
 * same puzzle on the same local date, so everything derives from a seed
 * string such as `${gameId}:${dateKey}`.
 */

/** Returns a float in [0, 1). */
export type Rng = () => number;

/** 32-bit FNV-1a hash of a string with a final avalanche mix. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Extra mixing so nearby strings ("2026-09-14" vs "2026-09-15") land far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32: a small, fast, good-quality 32-bit seeded PRNG. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded RNG from any string, e.g. createRng(`melody:${dateKey}`). */
export function createRng(seed: string): Rng {
  return mulberry32(hashString(seed));
}

/** Integer in [0, max). */
export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  return items[randomInt(rng, items.length)];
}

/** Fisher-Yates shuffle. Returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
