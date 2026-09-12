import { create } from "zustand";
import { getToday } from "@/lib/daily";
import { loadDailyState, saveDailyState, type DailyState, type GameStatus } from "@/lib/daily-state";
import type { GameMode } from "@/lib/game-config";
import { readJSON, storageKey, writeJSON } from "@/lib/storage";
import { distanceConfig } from "./config";
import {
  getDailyPuzzle,
  guessToKm,
  isWinningScore,
  parseGuess,
  ROUNDS,
  scoreRound,
  totalPoints,
  type DistancePuzzle,
  type RoundResult,
  type Unit,
} from "./logic";

/** What is persisted in localStorage for today (daily mode only). */
export interface DistanceDailyState extends DailyState {
  /** Guesses in km, one per completed round. */
  guesses: number[];
}

/** In-memory copy of the daily game while a practice round is in progress. */
type DailySnapshot = DistanceDailyState;

interface DistanceStore extends DistanceDailyState {
  /** False until `init` or `startPractice` has run on the client. */
  hydrated: boolean;
  mode: GameMode;
  puzzle: DistancePuzzle;
  /** Derived from `guesses`, kept in sync on every change. */
  results: RoundResult[];
  /** "guessing" shows the input; "reviewing" shows the last round's result. */
  phase: "guessing" | "reviewing";
  /** What the player has typed for the current round. */
  input: string;
  /** Display unit. Guesses are always stored and scored in km. */
  unit: Unit;
  dailySnapshot: DailySnapshot | null;
  init: () => void;
  startPractice: (puzzle: DistancePuzzle) => void;
  setInput: (text: string) => void;
  setUnit: (unit: Unit) => void;
  /** Scores the typed guess. Returns null when the input is not a valid number. */
  submit: () => RoundResult | null;
  /** Leaves the review of the last round and moves on. */
  nextRound: () => void;
}

const GAME_ID = distanceConfig.id;
const UNIT_KEY = storageKey(GAME_ID, "unit");
const EMPTY_PUZZLE: DistancePuzzle = { rounds: [] };

function statusFor(results: RoundResult[]): GameStatus {
  if (results.length < ROUNDS) return "playing";
  return isWinningScore(totalPoints(results)) ? "won" : "lost";
}

function resultsFor(puzzle: DistancePuzzle, guesses: number[]): RoundResult[] {
  return guesses
    .slice(0, puzzle.rounds.length)
    .map((guess, index) => scoreRound(guess, puzzle.rounds[index].distanceKm));
}

function loadUnit(): Unit {
  return readJSON<Unit>(UNIT_KEY) === "mi" ? "mi" : "km";
}

export const useDistanceStore = create<DistanceStore>()((set, get) => ({
  hydrated: false,
  mode: "daily",
  dateKey: "",
  puzzleNumber: 0,
  status: "playing",
  puzzle: EMPTY_PUZZLE,
  guesses: [],
  results: [],
  phase: "guessing",
  input: "",
  unit: "km",
  dailySnapshot: null,

  init: () => {
    const { dateKey, puzzleNumber } = getToday();
    const previous = get();
    const puzzle = getDailyPuzzle(dateKey);

    const snapshot = previous.dailySnapshot;
    const saved =
      snapshot && snapshot.dateKey === dateKey
        ? snapshot
        : loadDailyState<DistanceDailyState>(GAME_ID, dateKey);
    const guesses =
      saved && Array.isArray(saved.guesses)
        ? saved.guesses.filter((g) => Number.isFinite(g) && g > 0).slice(0, ROUNDS)
        : [];
    const results = resultsFor(puzzle, guesses);
    const sameDailyGame =
      previous.hydrated && previous.mode === "daily" && previous.dateKey === dateKey;

    set({
      hydrated: true,
      mode: "daily",
      dateKey,
      puzzleNumber,
      puzzle,
      guesses,
      results,
      status: statusFor(results),
      phase: sameDailyGame ? previous.phase : "guessing",
      input: sameDailyGame ? previous.input : "",
      unit: previous.hydrated ? previous.unit : loadUnit(),
      dailySnapshot: null,
    });
  },

  startPractice: (puzzle) => {
    const previous = get();
    const dailySnapshot =
      previous.hydrated && previous.mode === "daily"
        ? {
            dateKey: previous.dateKey,
            puzzleNumber: previous.puzzleNumber,
            status: previous.status,
            guesses: previous.guesses,
          }
        : previous.dailySnapshot;
    set({
      hydrated: true,
      mode: "practice",
      puzzle,
      guesses: [],
      results: [],
      status: "playing",
      phase: "guessing",
      input: "",
      unit: previous.hydrated ? previous.unit : loadUnit(),
      dailySnapshot,
    });
  },

  setInput: (text) => set({ input: text }),

  setUnit: (unit) => {
    writeJSON(UNIT_KEY, unit);
    set({ unit });
  },

  submit: () => {
    const state = get();
    if (!state.hydrated || state.status !== "playing" || state.phase !== "guessing") return null;
    const value = parseGuess(state.input);
    if (value === null) return null;
    const round = state.puzzle.rounds[state.guesses.length];
    if (!round) return null;

    const guessKm = guessToKm(value, state.unit);
    const guesses = [...state.guesses, guessKm];
    const results = resultsFor(state.puzzle, guesses);
    const status = statusFor(results);
    set({ guesses, results, status, phase: "reviewing" });

    if (state.mode === "daily") {
      saveDailyState<DistanceDailyState>(GAME_ID, {
        dateKey: state.dateKey,
        puzzleNumber: state.puzzleNumber,
        status,
        guesses,
      });
    }
    return results[results.length - 1];
  },

  nextRound: () => {
    const state = get();
    if (state.phase !== "reviewing") return;
    set({ phase: "guessing", input: "" });
  },
}));
