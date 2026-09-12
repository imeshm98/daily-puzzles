import type { GameConfig } from "@/lib/game-config";
import {
  buildDistanceShareText,
  distanceHook,
  DISTANCE_PATH,
  DISTANCE_NAME,
  generateRandomPuzzle,
  ROUNDS,
  type DistancePuzzle,
  type DistanceShareInput,
} from "./logic";

export const distanceConfig: GameConfig<DistanceShareInput, DistancePuzzle> = {
  id: "distance",
  name: DISTANCE_NAME,
  emoji: "🌍",
  tagline: "Guess how far apart two cities are.",
  path: DISTANCE_PATH,
  maxTries: ROUNDS,
  distributionLabel: "Score, in hundreds",
  howToPlay: {
    intro: ["Five rounds. Each round shows two cities: guess the distance between them."],
    rules: [
      "Type your guess in kilometres (or switch to miles) and press Submit.",
      "You get 100 points if you are within 5%, falling to 0 points at 50% off or more.",
      "After each guess you see the real distance and how far off you were.",
      "Your total out of 500 is your score for the day. 350 or more counts as a win.",
    ],
    legend: [
      { square: "🟩", label: "Within 10%" },
      { square: "🟨", label: "Within 25%" },
      { square: "🟥", label: "More than 25% off" },
    ],
  },
  buildShareText: buildDistanceShareText,
  buildHook: distanceHook,
  generateRandomPuzzle,
};
