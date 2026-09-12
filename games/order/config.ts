import type { GameConfig } from "@/lib/game-config";
import {
  buildOrderShareText,
  orderHook,
  ORDER_PATH,
  generateRandomPuzzle,
  MAX_TRIES,
  ORDER_NAME,
  type OrderPuzzle,
  type OrderShareInput,
} from "./logic";

export const orderConfig: GameConfig<OrderShareInput, OrderPuzzle> = {
  id: "order",
  name: ORDER_NAME,
  emoji: "📊",
  tagline: "Sort five things from smallest to largest.",
  path: ORDER_PATH,
  maxTries: MAX_TRIES,
  howToPlay: {
    intro: ["Every day there are five things to put in order: animals by weight, rivers by length, and so on."],
    rules: [
      "Drag the handle on an item, or use its arrows, to move it up or down. The list runs from lowest at the top to highest at the bottom.",
      "Press Submit. Items in the right position turn green and stay locked; the rest turn grey.",
      "You have 3 tries. When the game ends you see the correct order with the real values.",
    ],
    legend: [
      { square: "🟩", label: "Right position (locked)" },
      { square: "⬛", label: "Wrong position" },
    ],
  },
  buildShareText: buildOrderShareText,
  buildHook: orderHook,
  generateRandomPuzzle,
};
