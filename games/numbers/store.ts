import { create } from "zustand";
import { getToday } from "@/lib/daily";
import { loadDailyState, saveDailyState, type DailyState, type GameStatus } from "@/lib/daily-state";
import type { GameMode } from "@/lib/game-config";
import { numbersConfig } from "./config";
import {
  applyOperator,
  findSolution,
  getDailyPuzzle,
  hasWon,
  isStep,
  operationError,
  type NumbersPuzzle,
  type Operator,
  type Step,
} from "./logic";

/** A tile on the board. Ids stay stable so React can animate tiles. */
export interface Tile {
  id: number;
  value: number;
}

/** What is persisted in localStorage for today (daily mode only). */
export interface NumbersDailyState extends DailyState {
  steps: Step[];
}

/** In-memory copy of the daily game while a practice round is in progress. */
type DailySnapshot = NumbersDailyState;

interface NumbersStore extends NumbersDailyState {
  /** False until `init` or `startPractice` has run on the client. */
  hydrated: boolean;
  mode: GameMode;
  puzzle: NumbersPuzzle;
  tiles: Tile[];
  /** Tiles before each step, for Undo. */
  history: Tile[][];
  selectedTile: number | null;
  selectedOp: Operator | null;
  /** Why the last attempted operation was refused. */
  error: string | null;
  /** One shortest solution, set when the player gives up. */
  solution: Step[] | null;
  nextId: number;
  dailySnapshot: DailySnapshot | null;
  init: () => void;
  startPractice: (puzzle: NumbersPuzzle) => void;
  tapTile: (id: number) => void;
  tapOperator: (op: Operator) => void;
  clearSelection: () => void;
  undo: () => void;
  reset: () => void;
  /** Ends the puzzle as a loss and returns one shortest solution. */
  showSolution: () => Step[];
}

const GAME_ID = numbersConfig.id;

const EMPTY_PUZZLE: NumbersPuzzle = { tiles: [], target: 0, par: 0 };

function initialTiles(puzzle: NumbersPuzzle): Tile[] {
  return puzzle.tiles.map((value, id) => ({ id, value }));
}

/**
 * Rebuilds the board from the puzzle and a list of steps, dropping any step
 * that cannot be applied (used for saved games and snapshots).
 */
function buildBoard(puzzle: NumbersPuzzle, steps: readonly Step[]) {
  let tiles = initialTiles(puzzle);
  let nextId = tiles.length;
  const history: Tile[][] = [];
  const applied: Step[] = [];
  for (const step of steps) {
    const a = tiles.find((tile) => tile.value === step.a);
    const b = tiles.find((tile) => tile.value === step.b && tile !== a);
    if (!a || !b || applyOperator(step.a, step.op, step.b) !== step.result) break;
    history.push(tiles);
    tiles = tiles
      .filter((tile) => tile.id !== b.id)
      .map((tile) => (tile.id === a.id ? { id: nextId, value: step.result } : tile));
    nextId++;
    applied.push(step);
  }
  return { tiles, history, steps: applied, nextId };
}

function statusFor(tiles: Tile[], target: number, gaveUp: boolean): GameStatus {
  if (hasWon(tiles.map((tile) => tile.value), target)) return "won";
  return gaveUp ? "lost" : "playing";
}

export const useNumbersStore = create<NumbersStore>()((set, get) => ({
  hydrated: false,
  mode: "daily",
  dateKey: "",
  puzzleNumber: 0,
  status: "playing",
  puzzle: EMPTY_PUZZLE,
  tiles: [],
  history: [],
  steps: [],
  selectedTile: null,
  selectedOp: null,
  error: null,
  solution: null,
  nextId: 0,
  dailySnapshot: null,

  init: () => {
    const { dateKey, puzzleNumber } = getToday();
    const previous = get();
    const puzzle = getDailyPuzzle(dateKey);

    // Coming back from practice on the same day, or a saved game: rebuild from the steps.
    const snapshot = previous.dailySnapshot;
    const saved =
      snapshot && snapshot.dateKey === dateKey
        ? snapshot
        : loadDailyState<NumbersDailyState>(GAME_ID, dateKey);
    const savedSteps = saved && Array.isArray(saved.steps) ? saved.steps.filter(isStep) : [];
    const board = buildBoard(puzzle, savedSteps);
    const status = statusFor(board.tiles, puzzle.target, saved?.status === "lost");

    set({
      hydrated: true,
      mode: "daily",
      dateKey,
      puzzleNumber,
      puzzle,
      ...board,
      status,
      selectedTile: null,
      selectedOp: null,
      error: null,
      solution: status === "lost" ? findSolution(puzzle.tiles, puzzle.target) : null,
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
            steps: previous.steps,
          }
        : previous.dailySnapshot;
    set({
      hydrated: true,
      mode: "practice",
      puzzle,
      ...buildBoard(puzzle, []),
      status: "playing",
      selectedTile: null,
      selectedOp: null,
      error: null,
      solution: null,
      dailySnapshot,
    });
  },

  tapTile: (id) => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;

    if (state.selectedTile === null) {
      set({ selectedTile: id, error: null });
      return;
    }
    if (state.selectedTile === id) {
      set({ selectedTile: null, selectedOp: null, error: null });
      return;
    }
    if (state.selectedOp === null) {
      set({ selectedTile: id, error: null });
      return;
    }

    const a = state.tiles.find((tile) => tile.id === state.selectedTile);
    const b = state.tiles.find((tile) => tile.id === id);
    if (!a || !b) return;
    const error = operationError(a.value, state.selectedOp, b.value);
    if (error) {
      set({ error });
      return;
    }
    const result = applyOperator(a.value, state.selectedOp, b.value) as number;
    const step: Step = { a: a.value, op: state.selectedOp, b: b.value, result };
    const resultTile: Tile = { id: state.nextId, value: result };
    const tiles = state.tiles
      .filter((tile) => tile.id !== b.id)
      .map((tile) => (tile.id === a.id ? resultTile : tile));
    const steps = [...state.steps, step];
    const status = statusFor(tiles, state.puzzle.target, false);

    set({
      tiles,
      history: [...state.history, state.tiles],
      steps,
      nextId: state.nextId + 1,
      status,
      // The result stays selected so the player can chain the next operation.
      selectedTile: status === "playing" ? resultTile.id : null,
      selectedOp: null,
      error: null,
    });
    persist(get());
  },

  tapOperator: (op) => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;
    if (state.selectedTile === null) {
      set({ error: "Tap a number first" });
      return;
    }
    set({ selectedOp: state.selectedOp === op ? null : op, error: null });
  },

  clearSelection: () => set({ selectedTile: null, selectedOp: null, error: null }),

  undo: () => {
    const state = get();
    if (!state.hydrated || state.status !== "playing" || state.history.length === 0) return;
    set({
      tiles: state.history[state.history.length - 1],
      history: state.history.slice(0, -1),
      steps: state.steps.slice(0, -1),
      selectedTile: null,
      selectedOp: null,
      error: null,
    });
    persist(get());
  },

  reset: () => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;
    set({
      ...buildBoard(state.puzzle, []),
      selectedTile: null,
      selectedOp: null,
      error: null,
    });
    persist(get());
  },

  showSolution: () => {
    const state = get();
    if (state.solution) return state.solution;
    if (!state.hydrated || state.status !== "playing") return [];
    const solution = findSolution(state.puzzle.tiles, state.puzzle.target) ?? [];
    set({ status: "lost", solution, selectedTile: null, selectedOp: null, error: null });
    persist(get());
    return solution;
  },
}));

function persist(state: NumbersStore): void {
  if (state.mode !== "daily") return;
  saveDailyState<NumbersDailyState>(GAME_ID, {
    dateKey: state.dateKey,
    puzzleNumber: state.puzzleNumber,
    status: state.status,
    steps: state.steps,
  });
}
