/**
 * Order rules: picking items, checking positions and locked-aware moves.
 * Pure functions only (no React, no DOM).
 */
import { createRng, pickOne, shuffle, type Rng } from "@/lib/random";
import { buildShareText, SQUARES } from "@/lib/share";
import { CATEGORIES, type OrderCategory, type OrderItem } from "./categories";

export type { OrderCategory, OrderItem } from "./categories";

export const ORDER_NAME = "Order";
export const ITEM_COUNT = 5;
export const MAX_TRIES = 3;
/** Two items are far enough apart when their ratio is at least this, or their gap is at least the category's minGap. */
export const MIN_RATIO = 1.2;

export interface OrderPuzzle {
  categoryId: string;
  /** The five items in the shuffled order first shown to the player. */
  items: OrderItem[];
}

export type Mark = "correct" | "wrong";

export function getCategory(id: string): OrderCategory | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

/** True when the two values are clearly different (never "almost equal"). */
export function farEnough(a: number, b: number, minGap: number): boolean {
  const [low, high] = a < b ? [a, b] : [b, a];
  if (low > 0 && high / low >= MIN_RATIO) return true;
  return high - low >= minGap;
}

/**
 * Picks ITEM_COUNT items from a category, none of which are almost equal to
 * another. Returns null if the category cannot provide enough.
 */
export function pickItems(rng: Rng, category: OrderCategory): OrderItem[] | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const picked: OrderItem[] = [];
    for (const candidate of shuffle(rng, category.items)) {
      if (picked.every((other) => farEnough(other.value, candidate.value, category.minGap))) {
        picked.push(candidate);
        if (picked.length === ITEM_COUNT) return picked;
      }
    }
  }
  return null;
}

/** Item indices sorted by value, lowest first: the answer. */
export function correctOrder(items: readonly OrderItem[]): number[] {
  return items
    .map((item, index) => ({ index, value: item.value }))
    .sort((a, b) => a.value - b.value)
    .map(({ index }) => index);
}

export function isSorted(items: readonly OrderItem[]): boolean {
  return items.every((item, index) => index === 0 || items[index - 1].value < item.value);
}

/** Picks a category and five items, shuffled so they never start in the right order. */
export function generatePuzzle(rng: Rng, categories: readonly OrderCategory[] = CATEGORIES): OrderPuzzle {
  for (let attempt = 0; attempt < 50; attempt++) {
    const category = pickOne(rng, categories);
    const picked = pickItems(rng, category);
    if (!picked) continue;
    let items = shuffle(rng, picked);
    for (let reshuffle = 0; reshuffle < 10 && isSorted(items); reshuffle++) {
      items = shuffle(rng, items);
    }
    if (isSorted(items)) continue;
    return { categoryId: category.id, items };
  }
  throw new Error("Could not generate an Order puzzle");
}

/** The one puzzle everyone gets on a given local date. */
export function getDailyPuzzle(dateKey: string): OrderPuzzle {
  return generatePuzzle(createRng(`order:${dateKey}`));
}

/** A random puzzle for practice mode. Math.random is fine here: practice is not shared. */
export function generateRandomPuzzle(): OrderPuzzle {
  return generatePuzzle(Math.random);
}

/** Position by position: green when the item sits where it belongs. */
export function checkOrder(order: readonly number[], correct: readonly number[]): Mark[] {
  return order.map((itemIndex, position) => (itemIndex === correct[position] ? "correct" : "wrong"));
}

export function isWinningMarks(marks: readonly Mark[]): boolean {
  return marks.length > 0 && marks.every((mark) => mark === "correct");
}

/** Positions that have been green in any try so far stay locked. */
export function lockedPositions(marksPerTry: readonly (readonly Mark[])[], count = ITEM_COUNT): boolean[] {
  return Array.from({ length: count }, (_, position) =>
    marksPerTry.some((marks) => marks[position] === "correct"),
  );
}

/**
 * Moves the item at position `from` to position `to`, leaving locked
 * positions untouched. Only unlocked items shift; the moved item lands in
 * the unlocked slot nearest to `to`.
 */
export function moveItem(
  order: readonly number[],
  locked: readonly boolean[],
  from: number,
  to: number,
): number[] {
  if (from === to || locked[from] || from < 0 || from >= order.length) return order.slice();
  const target = Math.max(0, Math.min(order.length - 1, to));
  const positions = order.map((_, index) => index).filter((index) => !locked[index]);
  const items = positions.map((index) => order[index]);
  const fromRank = positions.indexOf(from);
  // Land on the nearest unlocked slot in the direction of the move.
  const landing =
    target > from
      ? (positions.find((index) => index >= target) ?? positions[positions.length - 1])
      : (positions.filter((index) => index <= target).pop() ?? positions[0]);
  const toRank = positions.indexOf(landing);
  if (fromRank === toRank) return order.slice();

  const [moved] = items.splice(fromRank, 1);
  items.splice(toRank, 0, moved);
  const next = order.slice();
  positions.forEach((index, rank) => {
    next[index] = items[rank];
  });
  return next;
}

/** Moves an item one unlocked slot up (-1) or down (+1). */
export function moveStep(
  order: readonly number[],
  locked: readonly boolean[],
  from: number,
  direction: -1 | 1,
): number[] {
  let to = from + direction;
  while (to >= 0 && to < order.length && locked[to]) to += direction;
  if (to < 0 || to >= order.length) return order.slice();
  return moveItem(order, locked, from, to);
}

export function isPuzzle(value: unknown): value is OrderPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as Record<string, unknown>;
  return (
    typeof puzzle.categoryId === "string" &&
    Array.isArray(puzzle.items) &&
    puzzle.items.length === ITEM_COUNT &&
    puzzle.items.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as OrderItem).name === "string" &&
        typeof (item as OrderItem).value === "number",
    )
  );
}

/** True for a permutation of 0..count-1. */
export function isOrder(value: unknown, count = ITEM_COUNT): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === count &&
    new Set(value).size === count &&
    value.every((index) => Number.isInteger(index) && index >= 0 && index < count)
  );
}

export function formatValue(value: number, category: Pick<OrderCategory, "unit" | "plain">): string {
  const number = category.plain ? String(value) : value.toLocaleString("en-US");
  return category.unit ? `${number} ${category.unit}` : number;
}

export function marksToSquares(marks: readonly Mark[]): string {
  return marks.map((mark) => (mark === "correct" ? SQUARES.correct : SQUARES.absent)).join("");
}

export interface OrderShareInput {
  puzzleNumber: number;
  /** True for a practice puzzle: the heading becomes "Order Practice". */
  practice?: boolean;
  won: boolean;
  /** Marks of every submitted try, in order. */
  marks: readonly (readonly Mark[])[];
}

/**
 *   Order #6  2/3
 *   🟩⬛⬛🟩⬛
 *   🟩🟩🟩🟩🟩
 *   https://example.com
 */
export function buildOrderShareText(input: OrderShareInput): string {
  return buildShareText({
    gameName: ORDER_NAME,
    puzzleNumber: input.puzzleNumber,
    practice: input.practice,
    won: input.won,
    tries: input.marks.length,
    maxTries: MAX_TRIES,
    rows: input.marks.map(marksToSquares),
  });
}
