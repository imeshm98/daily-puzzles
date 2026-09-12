import { readJSON, storageKey, writeJSON } from "./storage";

export type GameStatus = "playing" | "won" | "lost";

/**
 * Every game's persisted "today" state extends this, so shared UI (hub badges,
 * result screens) can read status without knowing game-specific fields.
 */
export interface DailyState {
  dateKey: string;
  puzzleNumber: number;
  status: GameStatus;
}

const dailyKey = (gameId: string) => storageKey(gameId, "daily");

/** Returns the saved state only if it belongs to the given local date. */
export function loadDailyState<T extends DailyState>(gameId: string, dateKey: string): T | null {
  const saved = readJSON<T>(dailyKey(gameId));
  return saved && saved.dateKey === dateKey ? saved : null;
}

export function saveDailyState<T extends DailyState>(gameId: string, state: T): void {
  writeJSON(dailyKey(gameId), state);
}
