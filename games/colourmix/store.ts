import { create } from "zustand";
import { getToday } from "@/lib/daily";
import { loadDailyState, saveDailyState, type DailyState, type GameStatus } from "@/lib/daily-state";
import type { GameMode } from "@/lib/game-config";
import { colourMixConfig } from "./config";
import {
  clampChannel,
  DEFAULT_GUESS,
  getDailyColour,
  hintsFor,
  isRGB,
  isWinningScore,
  MAX_TRIES,
  scoreColour,
  type Channel,
  type Hint,
  type RGB,
} from "./logic";

/** What is persisted in localStorage for today (daily mode only). */
export interface ColourMixDailyState extends DailyState {
  guesses: RGB[];
  /** Slider positions, so they stay where the player left them. */
  current: RGB;
}

export interface SubmitResult {
  guess: RGB;
  hints: Hint[];
  score: number;
  status: GameStatus;
  /** Tries used so far, including this one. */
  tries: number;
}

/** In-memory copy of the daily game while a practice round is in progress. */
type DailySnapshot = ColourMixDailyState;

interface ColourMixStore extends ColourMixDailyState {
  /** False until `init` or `startPractice` has run on the client. */
  hydrated: boolean;
  mode: GameMode;
  target: RGB;
  /** Derived from `guesses`, kept in sync on every change. */
  hints: Hint[][];
  scores: number[];
  dailySnapshot: DailySnapshot | null;
  init: () => void;
  startPractice: (target: RGB) => void;
  setChannel: (channel: Channel, value: number) => void;
  /** Submits the current sliders. Returns null when the game is over. */
  submit: () => SubmitResult | null;
}

const GAME_ID = colourMixConfig.id;

function statusFor(scores: number[]): GameStatus {
  if (scores.some(isWinningScore)) return "won";
  return scores.length >= MAX_TRIES ? "lost" : "playing";
}

function derive(guesses: RGB[], target: RGB) {
  const hints = guesses.map((guess) => hintsFor(guess, target));
  const scores = guesses.map((guess) => scoreColour(guess, target));
  return { hints, scores, status: statusFor(scores) };
}

export const useColourMixStore = create<ColourMixStore>()((set, get) => ({
  hydrated: false,
  mode: "daily",
  dateKey: "",
  puzzleNumber: 0,
  status: "playing",
  target: DEFAULT_GUESS,
  guesses: [],
  hints: [],
  scores: [],
  current: DEFAULT_GUESS,
  dailySnapshot: null,

  init: () => {
    const { dateKey, puzzleNumber } = getToday();
    const previous = get();
    const target = getDailyColour(dateKey);

    // Coming back from practice on the same day: restore the daily game as it was.
    const snapshot = previous.dailySnapshot;
    if (snapshot && snapshot.dateKey === dateKey) {
      set({
        hydrated: true,
        mode: "daily",
        dateKey,
        puzzleNumber,
        target,
        guesses: snapshot.guesses,
        current: snapshot.current,
        ...derive(snapshot.guesses, target),
        dailySnapshot: null,
      });
      return;
    }

    const saved = loadDailyState<ColourMixDailyState>(GAME_ID, dateKey);
    const guesses = saved && Array.isArray(saved.guesses) ? saved.guesses.filter(isRGB).slice(0, MAX_TRIES) : [];
    const sameDailyGame =
      previous.hydrated && previous.mode === "daily" && previous.dateKey === dateKey;
    const current = sameDailyGame
      ? previous.current
      : saved && isRGB(saved.current)
        ? saved.current
        : DEFAULT_GUESS;
    set({
      hydrated: true,
      mode: "daily",
      dateKey,
      puzzleNumber,
      target,
      guesses,
      current,
      ...derive(guesses, target),
      dailySnapshot: null,
    });
  },

  startPractice: (target) => {
    const previous = get();
    const dailySnapshot =
      previous.hydrated && previous.mode === "daily"
        ? {
            dateKey: previous.dateKey,
            puzzleNumber: previous.puzzleNumber,
            status: previous.status,
            guesses: previous.guesses,
            current: previous.current,
          }
        : previous.dailySnapshot;
    set({
      hydrated: true,
      mode: "practice",
      target,
      guesses: [],
      hints: [],
      scores: [],
      status: "playing",
      current: DEFAULT_GUESS,
      dailySnapshot,
    });
  },

  setChannel: (channel, value) => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return;
    set({ current: { ...state.current, [channel]: clampChannel(value) } });
  },

  submit: () => {
    const state = get();
    if (!state.hydrated || state.status !== "playing") return null;

    const guess = { ...state.current };
    const guesses = [...state.guesses, guess];
    const derived = derive(guesses, state.target);
    set({ guesses, ...derived });

    if (state.mode === "daily") {
      saveDailyState<ColourMixDailyState>(GAME_ID, {
        dateKey: state.dateKey,
        puzzleNumber: state.puzzleNumber,
        status: derived.status,
        guesses,
        current: guess,
      });
    }

    return {
      guess,
      hints: derived.hints[derived.hints.length - 1],
      score: derived.scores[derived.scores.length - 1],
      status: derived.status,
      tries: guesses.length,
    };
  },
}));
