import { create } from "zustand";
import { getToday } from "@/lib/daily";
import { loadDailyState, saveDailyState, type DailyState, type GameStatus } from "@/lib/daily-state";
import type { GameMode } from "@/lib/game-config";
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

/** What is persisted in localStorage for today (daily mode only). */
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

/** In-memory copy of the daily game while a practice round is in progress. */
type DailySnapshot = MelodyDailyState & { current: Note[] };

interface MelodyStore extends MelodyDailyState {
  /** False until `init` or `startPractice` has run on the client. */
  hydrated: boolean;
  /** Practice puzzles are random and are never persisted or counted in stats. */
  mode: GameMode;
  answer: Note[];
  /** The row being typed (not persisted). */
  current: Note[];
  /** Restored by `init()` when leaving practice, so no daily progress is ever lost. */
  dailySnapshot: DailySnapshot | null;
  /** Loads today's daily puzzle and any saved progress. */
  init: () => void;
  /** Starts a practice round with the given melody. */
  startPractice: (answer: Note[]) => void;
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
  mode: "daily",
  dateKey: "",
  puzzleNumber: 0,
  status: "playing",
  guesses: [],
  marks: [],
  answer: [],
  current: [],
  dailySnapshot: null,

  init: () => {
    const { dateKey, puzzleNumber } = getToday();
    const previous = get();
    const answer = getDailyMelody(dateKey);

    // Coming back from practice on the same day: restore the daily game as it was.
    const snapshot = previous.dailySnapshot;
    if (snapshot && snapshot.dateKey === dateKey) {
      set({
        hydrated: true,
        mode: "daily",
        dateKey,
        puzzleNumber,
        answer,
        guesses: snapshot.guesses,
        marks: snapshot.marks,
        status: snapshot.status,
        current: snapshot.current,
        dailySnapshot: null,
      });
      return;
    }

    const saved = loadDailyState<MelodyDailyState>(GAME_ID, dateKey);
    // Marks are recomputed from the guesses so stored data can never disagree with the answer.
    const guesses = saved && isGuessList(saved.guesses) ? saved.guesses.slice(0, MAX_TRIES) : [];
    const marks = guesses.map((guess) => scoreGuess(guess, answer));
    const sameDailyGame =
      previous.hydrated && previous.mode === "daily" && previous.dateKey === dateKey;
    set({
      hydrated: true,
      mode: "daily",
      dateKey,
      puzzleNumber,
      answer,
      guesses,
      marks,
      status: statusFor(marks),
      current: sameDailyGame ? previous.current : [],
      dailySnapshot: null,
    });
  },

  startPractice: (answer) => {
    const previous = get();
    const dailySnapshot =
      previous.hydrated && previous.mode === "daily"
        ? {
            dateKey: previous.dateKey,
            puzzleNumber: previous.puzzleNumber,
            status: previous.status,
            guesses: previous.guesses,
            marks: previous.marks,
            current: previous.current,
          }
        : previous.dailySnapshot;
    set({
      hydrated: true,
      mode: "practice",
      answer,
      guesses: [],
      marks: [],
      status: "playing",
      current: [],
      dailySnapshot,
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
    if (state.mode === "daily") {
      saveDailyState<MelodyDailyState>(GAME_ID, {
        dateKey: state.dateKey,
        puzzleNumber: state.puzzleNumber,
        status,
        guesses,
        marks,
      });
    }

    return { guess, marks: rowMarks, status, tries: guesses.length };
  },
}));
