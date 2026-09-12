import { useMemo } from "react";
import { create } from "zustand";
import {
  createEmptyStats,
  loadStats,
  recordResult,
  saveStats,
  type GameResult,
  type GameStats,
} from "./stats";

/**
 * Client-side stats for every game, keyed by game id.
 * Loaded lazily from localStorage on the client (call `hydrate` in an effect)
 * so server-rendered HTML always shows empty stats and hydration never mismatches.
 */
interface StatsStore {
  byGame: Record<string, GameStats>;
  hydrate: (gameId: string, maxTries: number) => void;
  record: (gameId: string, maxTries: number, result: GameResult) => GameStats;
}

export const useStatsStore = create<StatsStore>()((set, get) => ({
  byGame: {},

  hydrate: (gameId, maxTries) => {
    if (get().byGame[gameId]) return;
    set((state) => ({ byGame: { ...state.byGame, [gameId]: loadStats(gameId, maxTries) } }));
  },

  record: (gameId, maxTries, result) => {
    const current = get().byGame[gameId] ?? loadStats(gameId, maxTries);
    const next = recordResult(current, result);
    if (next !== current) {
      saveStats(gameId, next);
      set((state) => ({ byGame: { ...state.byGame, [gameId]: next } }));
    }
    return next;
  },
}));

/** Stats for one game. Empty until hydrated on the client. */
export function useGameStats(gameId: string, maxTries: number): GameStats {
  const stats = useStatsStore((state) => state.byGame[gameId]);
  const empty = useMemo(() => createEmptyStats(maxTries), [maxTries]);
  return stats ?? empty;
}
