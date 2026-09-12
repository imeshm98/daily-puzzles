/**
 * Well-known world cities for the Distance game, loaded from
 * content/cities.json and checked against the shared zod schema at load time.
 * Edit the JSON with the development-only admin at /admin/distance (see
 * README), not by hand.
 *
 * Coordinates are the city centre to two decimals (good to about 1 km).
 * Keep names and countries short: they are shown on a phone screen.
 */
import citiesJson from "@/content/cities.json";
import { citiesSchema, type City } from "@/lib/content/schemas";

export type { City };

export const CITIES: readonly City[] = citiesSchema.parse(citiesJson);
