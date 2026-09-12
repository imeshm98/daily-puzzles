import { EPOCH_DATE } from "./config";

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" in the player's local time zone (like Wordle). */
export function getLocalDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/**
 * Puzzle number for a local date key. EPOCH_DATE is #1, the next day #2, ...
 * Dates before the epoch give 0 or negative numbers (only during development).
 * Uses UTC arithmetic on the calendar date so DST never shifts the count.
 */
export function getPuzzleNumber(dateKey: string): number {
  const { year, month, day } = parseDateKey(dateKey);
  const target = Date.UTC(year, month - 1, day);
  const epoch = Date.UTC(EPOCH_DATE.year, EPOCH_DATE.month - 1, EPOCH_DATE.day);
  return Math.round((target - epoch) / DAY_MS) + 1;
}

/** Milliseconds until the next local midnight. */
export function msUntilLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Formats a duration in milliseconds as HH:MM:SS. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export interface Today {
  dateKey: string;
  puzzleNumber: number;
}

/** Everything a game needs to know about "today". */
export function getToday(now: Date = new Date()): Today {
  const dateKey = getLocalDateKey(now);
  return { dateKey, puzzleNumber: getPuzzleNumber(dateKey) };
}
