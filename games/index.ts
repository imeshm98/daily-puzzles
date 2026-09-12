import type { GameConfig } from "@/lib/game-config";
import { colourMixConfig } from "./colourmix/config";
import { distanceConfig } from "./distance/config";
import { melodyConfig } from "./melody/config";
import { numbersConfig } from "./numbers/config";
import { orderConfig } from "./order/config";

/**
 * Registry of every game on the site, in hub order.
 * To add a game: create games/<id>/config.ts and add it to this list.
 */
export const games: readonly GameConfig[] = [
  melodyConfig,
  colourMixConfig,
  numbersConfig,
  distanceConfig,
  orderConfig,
];

export function getGame(id: string): GameConfig | undefined {
  return games.find((game) => game.id === id);
}
