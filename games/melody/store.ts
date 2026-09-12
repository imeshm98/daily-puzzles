import { create } from "zustand";
import { getToday } from "@/lib/daily";
import { loadDailyState, saveDailyState, type DailyState, type GameStatus } from "@/lib/daily-state";
import { melodyConfig } from "./config";
import {
  getDailyMelody,
  isNote,
  isWinningMarks,
  MAX_TRIES,
  MELODY_LENGTH,
  scoreGuess,
  type Mark,
  type Note,
} from "./logic";

/** What is persisted in localStorage for today. */
export interface MelodyDailyState extends DailyState {
  guesses: Note[][];
  marks: Mark[][];
}

export interface SubmitResult {
  guess: Note[];
  marks: Mark[];
  status: GameStatus;
  /** Tries used so far, including this one. */
  tries: number;
}

interface MelodyStore extends MelodyDailyState {
  /** False until `init` has run on the client. */
  hydrated: boolean;
  answer: Note[];
  /** The row being typed (not persisted). */
  current: Note[];
  /** Loads today's puzzle and any saved progress. Call once on mount. */
  init: () => void;
  pressNote: (note: Note) => void;
  undo: () => void;
  /** Submits the current row. Returns null if the row is not complete. */
  submit: () => SubmitResult | null;
}

const GAME_ID = melodyConfig.id;

function statusFor(marks: Mark[][]): GameStatus {
  if (marks.some(isWinningMarks)) return "won";
  return marks.length >= MAX_TRIES ? "lost" : "playing";
}

function isGuessList(value: unknown): value is Note[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (guess) => Array.isArray(guess) && guess.length === MELODY_LENGTH && guess.every(isNote),
    )
  );
}

export const useMelodyStore = create<MelodyStore>()((set, get) => ({
  hydrated: false,
  dateKey: "",
  puzzleNumber: 0,
  status: "playing",
  guesses: [],
  marks: [],
  answer: [],
  current: [],

  init: () => {
    const { dateKey, puzzleNumber } = getToday();
    const previous = get();
    const answer = getDailyMelody(dateKey);
    const saved = loadDailyState<MelodyDailyState>(GAME_ID, dateKey);
    // Marks are recomputed from the guesses so stored data can never disagree with the answer.
    const guesses = saved && isGuessList(saved.guesses) ? saved.guesses.slice(0, MAX_TRIES) : [];
    const marks = guesses.map((guess) => scoreGuess(guess, answer));
    const sameDay = previous.hydrated && previous.dateKey === dateKey;
    set({
      hydrated: true,
      dateKey,
      puzzleNumber,
      answer,
      guesses,
      marks,
      status: statusFor(marks),
      current: sameDay ? previous.current : [],
    });
  },

  pressNote: (note) => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;
    if (state.current.length >= MELODY_LENGTH) return;
    set({ current: [...state.current, note] });
  },

  undo: () => {
    const state = get();
    if (state.current.length === 0) return;
    set({ current: state.current.slice(0, -1) });
  },

  submit: () => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return null;
    if (state.current.length !== MELODY_LENGTH) return null;

    const guess = state.current;
    const rowMarks = scoreGuess(guess, state.answer);
    const guesses = [...state.guesses, guess];
    const marks = [...state.marks, rowMarks];
    const status = statusFor(marks);

    set({ guesses, marks, status, current: [] });
    saveDailyState<MelodyDailyState>(GAME_ID, {
      dateKey: state.dateKey,
      puzzleNumber: state.puzzleNumber,
      status,
      guesses,
      marks,
    });

    return { guess, marks: rowMarks, status, tries: guesses.length };
  },
}));
