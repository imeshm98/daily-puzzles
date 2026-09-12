import type { ReactNode } from "react";

/** Content of the "How to play" dialog. Plain strings keep configs simple. */
export interface HowToPlayContent {
  /** Short paragraphs shown at the top. */
  intro: string[];
  /** Bullet list of rules. */
  rules: string[];
  /** Colour legend rows, e.g. { square: "🟩", label: "Right note, right spot" }. */
  legend?: { square: string; label: string }[];
  /** Optional extra content rendered below the text. */
  extra?: ReactNode;
}

/** "daily" is the one shared puzzle of the day; "practice" is unlimited random puzzles. */
export type GameMode = "daily" | "practice";

/**
 * Every game registers one of these in games/index.ts.
 * TShare is the game-specific input of its share text builder.
 * TPuzzle is the type returned by generateRandomPuzzle (practice mode).
 */
export interface GameConfig<TShare = never, TPuzzle = unknown> {
  /** URL slug and localStorage namespace. Never change it after launch. */
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** Route of the game page, e.g. "/games/melody". */
  path: string;
  maxTries: number;
  howToPlay: HowToPlayContent;
  /** Builds the spoiler-free share text (emoji squares + numbers + site URL). */
  buildShareText: (input: TShare) => string;
  /**
   * Optional. Returns a fresh random puzzle for practice mode (Math.random is
   * fine here, unlike the daily puzzle). When present, the game shell adds the
   * Practice link and the "Keep playing (practice)" button automatically.
   * Practice never touches stats or streaks.
   */
  generateRandomPuzzle?: () => TPuzzle;
}
