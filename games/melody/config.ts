import type { GameConfig } from "@/lib/game-config";
import {
  buildMelodyShareText,
  melodyHook,
  MELODY_PATH,
  generateRandomMelody,
  MAX_TRIES,
  MELODY_NAME,
  type MelodyShareInput,
  type Note,
} from "./logic";

export const melodyConfig: GameConfig<MelodyShareInput, Note[]> = {
  id: "melody",
  name: MELODY_NAME,
  emoji: "🎹",
  tagline: "Hear five notes, then play them back.",
  path: MELODY_PATH,
  maxTries: MAX_TRIES,
  howToPlay: {
    intro: [
      "Every day there is a hidden melody of five notes. Listen to it, then play it back on the piano.",
    ],
    rules: [
      "Press Play melody to hear it, as many times as you like.",
      "Tap the piano keys (or press A S D F G H J K on a keyboard) to enter five notes, then Submit.",
      "After each try the notes are coloured to show how close you were, and your try is played back so you can hear the difference.",
      "You have 6 tries. Notes can repeat. C′ is the high C.",
    ],
    legend: [
      { square: "🟩", label: "Right note, right position" },
      { square: "🟨", label: "In the melody, but in another position" },
      { square: "⬛", label: "Not in the melody" },
    ],
  },
  buildShareText: buildMelodyShareText,
  buildHook: melodyHook,
  generateRandomPuzzle: generateRandomMelody,
};
