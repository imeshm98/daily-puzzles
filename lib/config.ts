/**
 * Site-wide constants. Every game and shared component reads from here.
 */

/** Shown in the hub header and in page titles. */
export const SITE_NAME = "Daily Puzzles";

export const SITE_TAGLINE = "A new little puzzle every day.";

/**
 * Public URL of the site. It is appended to every share text.
 * Change it here once when you have a domain.
 */
export const SITE_URL = "https://example.com";

/** Puzzle #1 is this local calendar date; each following day adds one. */
export const EPOCH_DATE = { year: 2026, month: 9, day: 14 } as const;

/** Prefix for every localStorage key so games never collide. */
export const STORAGE_PREFIX = "dp";
