import { create } from "zustand";
import { getToday } from "@/lib/daily";
import { loadDailyState, saveDailyState, type DailyState, type GameStatus } from "@/lib/daily-state";
import type { GameMode } from "@/lib/game-config";
import { orderConfig } from "./config";
import {
  checkOrder,
  correctOrder,
  getDailyPuzzle,
  isOrder,
  isWinningMarks,
  lockedPositions,
  MAX_TRIES,
  moveItem,
  moveStep,
  type Mark,
  type OrderPuzzle,
} from "./logic";

/** What is persisted in localStorage for today (daily mode only). */
export interface OrderDailyState extends DailyState {
  /** Each try: item indices in the order the player submitted. */
  guesses: number[][];
  /** The current arrangement, so a reload keeps it. */
  order: number[];
}

export interface SubmitResult {
  marks: Mark[];
  status: GameStatus;
  tries: number;
}

/** In-memory copy of the daily game while a practice round is in progress. */
type DailySnapshot = OrderDailyState;

interface OrderStore extends OrderDailyState {
  /** False until `init` or `startPractice` has run on the client. */
  hydrated: boolean;
  mode: GameMode;
  puzzle: OrderPuzzle;
  /** Item indices sorted by value: the answer. */
  correct: number[];
  /** Derived from `guesses`. */
  marks: Mark[][];
  locked: boolean[];
  dailySnapshot: DailySnapshot | null;
  init: () => void;
  startPractice: (puzzle: OrderPuzzle) => void;
  /** Drag and drop: move the item at position `from` to position `to`. */
  move: (from: number, to: number) => void;
  /** Arrow buttons: move the item at `from` one unlocked slot up (-1) or down (+1). */
  step: (from: number, direction: -1 | 1) => void;
  /** Checks the current arrangement. Returns null when the game is over. */
  submit: () => SubmitResult | null;
}

const GAME_ID = orderConfig.id;
const EMPTY_PUZZLE: OrderPuzzle = { categoryId: "", items: [] };

function derive(puzzle: OrderPuzzle, guesses: number[][]) {
  const correct = correctOrder(puzzle.items);
  const marks = guesses.map((guess) => checkOrder(guess, correct));
  const last = marks[marks.length - 1];
  const status: GameStatus =
    last && isWinningMarks(last) ? "won" : guesses.length >= MAX_TRIES ? "lost" : "playing";
  return { correct, marks, locked: lockedPositions(marks, puzzle.items.length), status };
}

const initialOrder = (puzzle: OrderPuzzle) => puzzle.items.map((_, index) => index);

export const useOrderStore = create<OrderStore>()((set, get) => ({
  hydrated: false,
  mode: "daily",
  dateKey: "",
  puzzleNumber: 0,
  status: "playing",
  puzzle: EMPTY_PUZZLE,
  correct: [],
  order: [],
  guesses: [],
  marks: [],
  locked: [],
  dailySnapshot: null,

  init: () => {
    const { dateKey, puzzleNumber } = getToday();
    const previous = get();
    const puzzle = getDailyPuzzle(dateKey);

    const snapshot = previous.dailySnapshot;
    const saved =
      snapshot && snapshot.dateKey === dateKey
        ? snapshot
        : loadDailyState<OrderDailyState>(GAME_ID, dateKey);
    const guesses =
      saved && Array.isArray(saved.guesses)
        ? saved.guesses.filter((guess) => isOrder(guess)).slice(0, MAX_TRIES)
        : [];
    const order = saved && isOrder(saved.order) ? saved.order : initialOrder(puzzle);

    set({
      hydrated: true,
      mode: "daily",
      dateKey,
      puzzleNumber,
      puzzle,
      order,
      guesses,
      ...derive(puzzle, guesses),
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
            order: previous.order,
          }
        : previous.dailySnapshot;
    set({
      hydrated: true,
      mode: "practice",
      puzzle,
      order: initialOrder(puzzle),
      guesses: [],
      ...derive(puzzle, []),
      dailySnapshot,
    });
  },

  move: (from, to) => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;
    set({ order: moveItem(state.order, state.locked, from, to) });
  },

  step: (from, direction) => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;
    set({ order: moveStep(state.order, state.locked, from, direction) });
  },

  submit: () => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return null;
    const guesses = [...state.guesses, state.order.slice()];
    const derived = derive(state.puzzle, guesses);
    set({ guesses, ...derived });

    if (state.mode === "daily") {
      saveDailyState<OrderDailyState>(GAME_ID, {
        dateKey: state.dateKey,
        puzzleNumber: state.puzzleNumber,
        status: derived.status,
        guesses,
        order: state.order,
      });
    }
    return {
      marks: derived.marks[derived.marks.length - 1],
      status: derived.status,
      tries: guesses.length,
    };
  },
}));
