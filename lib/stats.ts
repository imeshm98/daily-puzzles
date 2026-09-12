import { readJSON, storageKey, writeJSON } from "./storage";

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[i] = number of wins that took i + 1 tries. */
  distribution: number[];
  /** Puzzle numbers: used to skip double-recording and to compute streaks. */
  lastPlayedPuzzle: number | null;
  lastWonPuzzle: number | null;
}

export interface GameResult {
  puzzleNumber: number;
  won: boolean;
  /** Tries used, 1-based. For a loss pass maxTries. */
  tries: number;
}

export function createEmptyStats(maxTries: number): GameStats {
  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: Array.from({ length: maxTries }, () => 0),
    lastPlayedPuzzle: null,
    lastWonPuzzle: null,
  };
}

export function winPercent(stats: GameStats): number {
  return stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
}

/**
 * Pure function: returns updated stats for a finished puzzle.
 * A streak continues only when the previous day's puzzle was won.
 * Recording the same puzzle number twice is ignored.
 */
export function recordResult(stats: GameStats, result: GameResult): GameStats {
  if (stats.lastPlayedPuzzle === result.puzzleNumber) return stats;

  const continuesStreak = stats.lastWonPuzzle === result.puzzleNumber - 1;
  const currentStreak = result.won ? (continuesStreak ? stats.currentStreak + 1 : 1) : 0;

  const distribution = stats.distribution.slice();
  if (result.won) {
    const slot = Math.max(0, result.tries - 1);
    distribution[slot] = (distribution[slot] ?? 0) + 1;
  }

  return {
    played: stats.played + 1,
    won: stats.won + (result.won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastPlayedPuzzle: result.puzzleNumber,
    lastWonPuzzle: result.won ? result.puzzleNumber : stats.lastWonPuzzle,
  };
}

const statsKey = (gameId: string) => storageKey(gameId, "stats");

/** Loads stats from localStorage, tolerating missing or older fields. */
export function loadStats(gameId: string, maxTries: number): GameStats {
  const empty = createEmptyStats(maxTries);
  const saved = readJSON<Partial<GameStats>>(statsKey(gameId));
  if (!saved) return empty;
  const distribution = empty.distribution.map((_, i) => saved.distribution?.[i] ?? 0);
  return { ...empty, ...saved, distribution };
}

export function saveStats(gameId: string, stats: GameStats): void {
  writeJSON(statsKey(gameId), stats);
}
