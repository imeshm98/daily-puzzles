/**
 * Numbers rules: puzzle generation, the solver and the win check.
 * Pure functions only (no React, no DOM).
 */
import { createRng, pickOne, randomInt, shuffle, type Rng } from "@/lib/random";
import { buildShareText } from "@/lib/share";

export const NUMBERS_NAME = "Numbers";
export const TILE_COUNT = 5;
export const SMALL_MIN = 1;
export const SMALL_MAX = 10;
export const BIG_TILES: readonly number[] = [15, 20, 25, 50, 75, 100];
export const TARGET_MIN = 20;
export const TARGET_MAX = 300;
/** The daily target always needs at least this many operations. */
export const MIN_PAR = 3;
/** With 5 tiles a solution can never take more than 4 operations. */
export const MAX_STEPS = TILE_COUNT - 1;

export type Operator = "+" | "-" | "×" | "÷";
export const OPERATORS: readonly Operator[] = ["+", "-", "×", "÷"];

export const OPERATOR_EMOJI: Record<Operator, string> = {
  "+": "➕",
  "-": "➖",
  "×": "✖️",
  "÷": "➗",
};

export interface Step {
  a: number;
  op: Operator;
  b: number;
  result: number;
}

export interface NumbersPuzzle {
  tiles: number[];
  target: number;
  /** Minimum number of operations needed to reach the target. */
  par: number;
}

/**
 * Applies an operator. Returns null when the move is not allowed:
 * a negative result, or a division that is not exact.
 */
export function applyOperator(a: number, op: Operator, b: number): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "×":
      return a * b;
    case "-":
      return a - b >= 0 ? a - b : null;
    case "÷":
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

/** Why an operation is not allowed, for the UI. */
export function operationError(a: number, op: Operator, b: number): string | null {
  if (applyOperator(a, op, b) !== null) return null;
  return op === "-" ? "The result can't be negative" : "That doesn't divide exactly";
}

export function formatStep(step: Step): string {
  return `${step.a} ${step.op} ${step.b} = ${step.result}`;
}

/** Any tile equal to the target wins. */
export function hasWon(tiles: readonly number[], target: number): boolean {
  return tiles.includes(target);
}

function stateKey(nums: readonly number[]): string {
  return nums
    .slice()
    .sort((x, y) => x - y)
    .join(",");
}

interface Expansion {
  nums: number[];
  step: Step;
}

/** Every state reachable from `nums` with one operation on two distinct tiles. */
function expansions(nums: readonly number[]): Expansion[] {
  const out: Expansion[] = [];
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const rest = nums.filter((_, k) => k !== i && k !== j);
      const tried = new Set<string>();
      for (const [x, y] of [
        [nums[i], nums[j]],
        [nums[j], nums[i]],
      ]) {
        for (const op of OPERATORS) {
          const result = applyOperator(x, op, y);
          // A 0 can never help reach a target, so it is pruned from the search.
          if (result === null || result <= 0) continue;
          const signature = `${x}${op}${y}`;
          if (tried.has(signature)) continue;
          tried.add(signature);
          out.push({ nums: [...rest, result], step: { a: x, op, b: y, result } });
        }
      }
    }
  }
  return out;
}

/**
 * Solver: every value reachable from the tiles (each used at most once) mapped
 * to the minimum number of operations needed to make it. Initial tiles are 0.
 * Breadth-first over tile multisets, so the first time a value appears is at
 * its minimum depth.
 */
export function exploreResults(tiles: readonly number[]): Map<number, number> {
  const best = new Map<number, number>();
  const seen = new Set<string>([stateKey(tiles)]);
  let frontier: number[][] = [tiles.slice()];

  for (let depth = 0; frontier.length > 0; depth++) {
    const next: number[][] = [];
    for (const nums of frontier) {
      for (const value of nums) if (!best.has(value)) best.set(value, depth);
      if (nums.length < 2) continue;
      for (const { nums: child } of expansions(nums)) {
        const key = stateKey(child);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(child);
      }
    }
    frontier = next;
  }
  return best;
}

/** Minimum operations to reach the target, or null if it cannot be reached. */
export function minimumSteps(tiles: readonly number[], target: number): number | null {
  return exploreResults(tiles).get(target) ?? null;
}

/**
 * One shortest solution as a list of steps (empty when a tile already equals
 * the target), or null when the target is unreachable.
 */
export function findSolution(tiles: readonly number[], target: number): Step[] | null {
  const parents = new Map<string, { parent: string | null; step: Step | null }>();
  const startKey = stateKey(tiles);
  parents.set(startKey, { parent: null, step: null });
  let frontier: { nums: number[]; key: string }[] = [{ nums: tiles.slice(), key: startKey }];

  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { nums, key } of frontier) {
      if (hasWon(nums, target)) {
        const steps: Step[] = [];
        let cursor: string | null = key;
        while (cursor !== null) {
          const entry: { parent: string | null; step: Step | null } = parents.get(cursor)!;
          if (entry.step) steps.unshift(entry.step);
          cursor = entry.parent;
        }
        return steps;
      }
      if (nums.length < 2) continue;
      for (const { nums: child, step } of expansions(nums)) {
        const childKey = stateKey(child);
        if (parents.has(childKey)) continue;
        parents.set(childKey, { parent: key, step });
        next.push({ nums: child, key: childKey });
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Replays steps against the starting tiles. Returns the tiles after each step,
 * stopping at the first step that is not possible (used to validate saved games).
 */
export function replaySteps(tiles: readonly number[], steps: readonly Step[]): number[][] {
  const states: number[][] = [];
  let current = tiles.slice();
  for (const step of steps) {
    const i = current.indexOf(step.a);
    if (i === -1) break;
    const j = current.findIndex((value, index) => value === step.b && index !== i);
    if (j === -1) break;
    if (applyOperator(step.a, step.op, step.b) !== step.result) break;
    current = current.filter((_, index) => index !== i && index !== j);
    current.push(step.result);
    states.push(current);
  }
  return states;
}

export function isSmallTile(value: number): boolean {
  return Number.isInteger(value) && value >= SMALL_MIN && value <= SMALL_MAX;
}

export function isPuzzle(value: unknown): value is NumbersPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as Record<string, unknown>;
  return (
    Array.isArray(puzzle.tiles) &&
    puzzle.tiles.length === TILE_COUNT &&
    puzzle.tiles.every((tile) => Number.isInteger(tile) && tile > 0) &&
    typeof puzzle.target === "number" &&
    typeof puzzle.par === "number"
  );
}

export function isStep(value: unknown): value is Step {
  if (!value || typeof value !== "object") return false;
  const step = value as Record<string, unknown>;
  return (
    typeof step.a === "number" &&
    typeof step.b === "number" &&
    typeof step.result === "number" &&
    (OPERATORS as readonly unknown[]).includes(step.op)
  );
}

/**
 * Draws tiles and a reachable target that needs at least MIN_PAR operations.
 * Four small tiles (1-10, repeats allowed), one big tile, shuffled.
 */
export function generatePuzzle(rng: Rng): NumbersPuzzle {
  for (let attempt = 0; attempt < 100; attempt++) {
    const smalls = Array.from(
      { length: TILE_COUNT - 1 },
      () => SMALL_MIN + randomInt(rng, SMALL_MAX - SMALL_MIN + 1),
    );
    const tiles = shuffle(rng, [...smalls, pickOne(rng, BIG_TILES)]);
    const candidates = [...exploreResults(tiles)].filter(
      ([value, ops]) => value >= TARGET_MIN && value <= TARGET_MAX && ops >= MIN_PAR,
    );
    if (candidates.length === 0) continue;
    const [target, par] = pickOne(rng, candidates);
    return { tiles, target, par };
  }
  throw new Error("Could not generate a Numbers puzzle");
}

/** The one puzzle everyone gets on a given local date. */
export function getDailyPuzzle(dateKey: string): NumbersPuzzle {
  return generatePuzzle(createRng(`numbers:${dateKey}`));
}

/** A random puzzle for practice mode. Math.random is fine here: practice is not shared. */
export function generateRandomPuzzle(): NumbersPuzzle {
  return generatePuzzle(Math.random);
}

export interface NumbersShareInput {
  puzzleNumber: number;
  /** True for a practice puzzle: the heading becomes "Numbers Practice". */
  practice?: boolean;
  won: boolean;
  /** The operations the player used, in order (only used when won). */
  steps: readonly Step[];
  par: number;
}

/**
 *   Numbers #5  ✓ 3 steps (par 3)
 *   ✖️➕➖
 *   https://example.com
 *
 * A loss reads "Numbers #5  ✗" with one ⬛ per par step instead of the operators.
 */
export function buildNumbersShareText(input: NumbersShareInput): string {
  const count = input.steps.length;
  const scoreLabel = input.won ? `✓ ${count} ${count === 1 ? "step" : "steps"} (par ${input.par})` : "✗";
  const row = input.won
    ? input.steps.map((step) => OPERATOR_EMOJI[step.op]).join("")
    : "⬛".repeat(input.par);
  return buildShareText({
    gameName: NUMBERS_NAME,
    puzzleNumber: input.puzzleNumber,
    practice: input.practice,
    won: input.won,
    tries: count,
    maxTries: MAX_STEPS,
    scoreLabel,
    rows: [row],
  });
}
