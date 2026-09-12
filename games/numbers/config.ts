import type { GameConfig } from "@/lib/game-config";
import {
  buildNumbersShareText,
  generateRandomPuzzle,
  MAX_STEPS,
  NUMBERS_NAME,
  type NumbersPuzzle,
  type NumbersShareInput,
} from "./logic";

export const numbersConfig: GameConfig<NumbersShareInput, NumbersPuzzle> = {
  id: "numbers",
  name: NUMBERS_NAME,
  emoji: "🔢",
  tagline: "Combine five numbers to hit the target.",
  path: "/games/numbers",
  maxTries: MAX_STEPS,
  distributionLabel: "Steps to solve",
  howToPlay: {
    intro: ["Every day there are five number tiles and a target. Reach the target by combining tiles."],
    rules: [
      "Tap a number, tap + − × ÷, then tap another number. The two tiles become one tile with the result.",
      "Each tile can be used once. No negative results, and division must be exact.",
      "You win as soon as any tile equals the target. Fewer steps is better: par is the minimum possible.",
      "Undo takes back the last step, Reset starts over, and Show a solution gives up and reveals one.",
    ],
  },
  buildShareText: buildNumbersShareText,
  generateRandomPuzzle,
};
