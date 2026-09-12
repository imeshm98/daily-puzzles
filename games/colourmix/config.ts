import type { GameConfig } from "@/lib/game-config";
import {
  buildColourMixShareText,
  colourMixHook,
  COLOUR_MIX_PATH,
  COLOUR_MIX_NAME,
  generateRandomColour,
  MAX_TRIES,
  type ColourMixShareInput,
  type RGB,
} from "./logic";

export const colourMixConfig: GameConfig<ColourMixShareInput, RGB> = {
  id: "colourmix",
  name: COLOUR_MIX_NAME,
  emoji: "🎨",
  tagline: "Mix red, green and blue to match the colour.",
  path: COLOUR_MIX_PATH,
  maxTries: MAX_TRIES,
  howToPlay: {
    intro: ["Every day there is a target colour. Recreate it by mixing red, green and blue."],
    rules: [
      "Move the three sliders until your swatch looks like the target, then Submit.",
      "After each try the sliders show a hint: ▲ go higher, ▼ go lower, ✓ you are within 10.",
      "Your score is how close you got, in percent. Reach 95% or more to win.",
      "You have 3 tries. Your final score is your best try.",
    ],
    legend: [
      { square: "▲", label: "Move this slider higher" },
      { square: "▼", label: "Move this slider lower" },
      { square: "✓", label: "Within 10 of the target" },
    ],
  },
  buildShareText: buildColourMixShareText,
  buildHook: colourMixHook,
  generateRandomPuzzle: generateRandomColour,
};
