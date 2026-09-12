/**
 * Content rules the development-only admin checks before saving, on top of
 * the zod schemas. Pure functions, unit tested in validate.test.ts.
 *
 * Errors block a save. Warnings do not, but the admin shows them so
 * questionable content is easy to spot.
 */
import { farEnough, ITEM_COUNT } from "@/games/order/logic";
import { citiesSchema, orderCategoriesSchema, type City, type OrderCategory } from "./schemas";

export interface ContentIssue {
  /** Where the problem is, e.g. "rivers-length › Nile › value". */
  path: string;
  message: string;
}

export interface ValidationReport<T> {
  ok: boolean;
  /** The parsed, typed data when ok. */
  data?: T;
  errors: ContentIssue[];
  warnings: ContentIssue[];
}

/** A category needs this many items so five clearly different ones can always be picked. */
export const MIN_ITEMS_PER_CATEGORY = 15;
/**
 * Two values whose gap is under this fraction of the category's minGap (and
 * whose ratio is small) are "almost the same": the order between them would
 * be a coin toss, so that is an error. E.g. 0.01 kg for animals (minGap 10)
 * or 400 km² for country areas (minGap 400,000).
 */
export const MIN_GAP_FRACTION = 0.001;
/** The Distance game pairs cities at least 300 km apart; it needs a decent pool. */
export const MIN_CITIES = 20;

const collator = new Intl.Collator("en", { sensitivity: "base" });
const same = (a: string, b: string) => collator.compare(a.trim(), b.trim()) === 0;

function label(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

type RawCategory = { id?: unknown; items?: { name?: unknown }[] };
type RawCity = { name?: unknown };

/** Turns a zod path like [0, "items", 3, "value"] into "animals-weight › Koala › value". */
function categoryPath(raw: unknown, path: PropertyKey[]): string {
  const [categoryIndex, itemsKey, itemIndex, ...rest] = path;
  const categories = (Array.isArray(raw) ? raw : []) as RawCategory[];
  if (typeof categoryIndex !== "number") return path.map(String).join(" › ");
  const category = categories[categoryIndex];
  const parts = [label(category?.id, `category ${categoryIndex + 1}`)];
  if (itemsKey === "items" && typeof itemIndex === "number") {
    parts.push(label(category?.items?.[itemIndex]?.name, `item ${itemIndex + 1}`), ...rest.map(String));
  } else {
    parts.push(...[itemsKey, itemIndex, ...rest].filter((p) => p !== undefined).map(String));
  }
  return parts.join(" › ");
}

function cityPath(raw: unknown, path: PropertyKey[]): string {
  const [index, ...rest] = path;
  const cities = (Array.isArray(raw) ? raw : []) as RawCity[];
  if (typeof index !== "number") return path.map(String).join(" › ");
  return [label(cities[index]?.name, `city ${index + 1}`), ...rest.map(String)].join(" › ");
}

/** Two values the ordering game cannot tell apart at all (see MIN_GAP_FRACTION). */
export function almostEqual(a: number, b: number, minGap: number): boolean {
  if (a === b) return true;
  return !farEnough(a, b, minGap) && Math.abs(a - b) < minGap * MIN_GAP_FRACTION;
}

type Pair<T> = [T, T];

/** Adjacent pairs (sorted by value) that the game will never show together. */
export function closePairs<T extends { value: number }>(items: readonly T[], minGap: number): Pair<T>[] {
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const pairs: Pair<T>[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (!farEnough(sorted[i - 1].value, sorted[i].value, minGap)) pairs.push([sorted[i - 1], sorted[i]]);
  }
  return pairs;
}

/**
 * How many items the game can tell apart at once: a greedy pass over the
 * values in order, keeping every item that is far enough from the last kept
 * one. The game needs at least ITEM_COUNT.
 */
export function distinguishableCount(items: readonly { value: number }[], minGap: number): number {
  const sorted = items.map((item) => item.value).sort((a, b) => a - b);
  let count = 0;
  let last: number | null = null;
  for (const value of sorted) {
    if (last === null || farEnough(last, value, minGap)) {
      count++;
      last = value;
    }
  }
  return count;
}

export function validateCategories(raw: unknown): ValidationReport<OrderCategory[]> {
  const parsed = orderCategoriesSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: categoryPath(raw, issue.path),
        message: issue.message,
      })),
      warnings: [],
    };
  }

  const errors: ContentIssue[] = [];
  const warnings: ContentIssue[] = [];
  const categories = parsed.data;

  if (categories.length === 0) errors.push({ path: "categories", message: "Add at least one category" });

  categories.forEach((category, index) => {
    const at = (rest?: string) => [category.id, rest].filter(Boolean).join(" › ");
    if (categories.findIndex((other) => other.id === category.id) !== index) {
      errors.push({ path: at(), message: `Duplicate category id "${category.id}"` });
    }
    if (category.items.length < MIN_ITEMS_PER_CATEGORY) {
      errors.push({
        path: at(),
        message: `Needs at least ${MIN_ITEMS_PER_CATEGORY} items (has ${category.items.length})`,
      });
    }
    category.items.forEach((item, itemIndex) => {
      if (category.items.findIndex((other) => same(other.name, item.name)) !== itemIndex) {
        errors.push({ path: at(item.name.trim()), message: `Duplicate item name "${item.name}"` });
      }
    });
    for (const [low, high] of closePairs(category.items, category.minGap)) {
      const path = at(`${low.name} / ${high.name}`);
      if (almostEqual(low.value, high.value, category.minGap)) {
        errors.push({
          path,
          message:
            low.value === high.value
              ? `"${low.name}" and "${high.name}" have the same value (${low.value})`
              : `"${low.name}" (${low.value}) and "${high.name}" (${high.value}) are almost the same value`,
        });
      } else {
        warnings.push({
          path,
          message: `"${low.name}" (${low.value}) and "${high.name}" (${high.value}) are too close to appear together`,
        });
      }
    }
    const distinct = distinguishableCount(category.items, category.minGap);
    if (distinct < ITEM_COUNT) {
      errors.push({
        path: at(),
        message: `Only ${distinct} items are clearly different (gap ${category.minGap} or ratio 1.2); the game needs ${ITEM_COUNT}`,
      });
    }
  });

  return { ok: errors.length === 0, data: errors.length === 0 ? categories : undefined, errors, warnings };
}

export function validateCities(raw: unknown): ValidationReport<City[]> {
  const parsed = citiesSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: cityPath(raw, issue.path),
        message: issue.message,
      })),
      warnings: [],
    };
  }

  const errors: ContentIssue[] = [];
  const cities = parsed.data;
  if (cities.length < MIN_CITIES) {
    errors.push({ path: "cities", message: `Needs at least ${MIN_CITIES} cities (has ${cities.length})` });
  }
  cities.forEach((city, index) => {
    const first = cities.findIndex(
      (other) => same(other.name, city.name) && same(other.country, city.country),
    );
    if (first !== index) {
      errors.push({ path: city.name, message: `Duplicate city "${city.name}, ${city.country}"` });
    }
  });

  return { ok: errors.length === 0, data: errors.length === 0 ? cities : undefined, errors, warnings: [] };
}
