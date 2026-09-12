import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/config";
import { createRng } from "@/lib/random";
import {
  applyOperator,
  BIG_TILES,
  buildNumbersShareText,
  exploreResults,
  findSolution,
  formatStep,
  generatePuzzle,
  getDailyPuzzle,
  hasWon,
  isSmallTile,
  MAX_STEPS,
  MIN_PAR,
  minimumSteps,
  operationError,
  replaySteps,
  TARGET_MAX,
  TARGET_MIN,
  type Step,
} from "./logic";

describe("applyOperator", () => {
  it("adds, subtracts, multiplies and divides", () => {
    expect(applyOperator(7, "+", 5)).toBe(12);
    expect(applyOperator(7, "-", 5)).toBe(2);
    expect(applyOperator(7, "×", 5)).toBe(35);
    expect(applyOperator(10, "÷", 5)).toBe(2);
  });

  it("refuses negative results and inexact division", () => {
    expect(applyOperator(5, "-", 7)).toBeNull();
    expect(applyOperator(5, "-", 5)).toBe(0);
    expect(applyOperator(7, "÷", 2)).toBeNull();
    expect(applyOperator(7, "÷", 0)).toBeNull();
    expect(operationError(5, "-", 7)).toMatch(/negative/);
    expect(operationError(7, "÷", 2)).toMatch(/divide/);
    expect(operationError(7, "+", 2)).toBeNull();
  });
});

describe("solver", () => {
  it("finds every reachable value from two tiles with the minimum operations", () => {
    expect(exploreResults([2, 3])).toEqual(
      new Map([
        [2, 0],
        [3, 0],
        [5, 1],
        [6, 1],
        [1, 1],
      ]),
    );
  });

  it("never uses negative intermediate results or inexact division", () => {
    const values = [...exploreResults([2, 5, 7]).keys()];
    expect(values.every((value) => Number.isInteger(value) && value > 0)).toBe(true);
    expect(values).not.toContain(-3);
    expect(values).not.toContain(3.5);
  });

  it("uses each tile at most once", () => {
    // 2 + 2 would need the single 2 twice.
    expect(exploreResults([2]).has(4)).toBe(false);
    expect(exploreResults([2, 2]).get(4)).toBe(1);
  });

  it("reports the minimum number of operations", () => {
    const tiles = [1, 2, 3, 4, 5];
    expect(minimumSteps(tiles, 5)).toBe(0);
    expect(minimumSteps(tiles, 9)).toBe(1); // 4 + 5
    expect(minimumSteps(tiles, 60)).toBe(2); // 5 × 4 × 3
    expect(minimumSteps(tiles, 120)).toBe(3); // 5 × 4 × 3 × 2
    expect(minimumSteps(tiles, 300)).toBeNull();
  });

  it("returns one shortest solution that replays to the target", () => {
    const tiles = [3, 7, 10, 2, 25];
    const results = exploreResults(tiles);
    // Every search walks the whole state space, and this tile set reaches
    // over 900 targets, so checking all of them takes seconds on a slow CI
    // runner. Check every 2-step target and a fixed sample of the deeper ones.
    const targets = [...results].filter(([, ops]) => ops >= 2).sort((x, y) => x[0] - y[0]);
    const sample = targets.filter(([, ops], index) => ops === 2 || index % 12 === 0);
    expect(sample.length).toBeGreaterThan(100);
    expect(sample.some(([, ops]) => ops === 4)).toBe(true);
    for (const [target, ops] of sample) {
      const solution = findSolution(tiles, target);
      expect(solution).not.toBeNull();
      expect(solution).toHaveLength(ops);
      const states = replaySteps(tiles, solution!);
      expect(states).toHaveLength(ops);
      expect(hasWon(states[states.length - 1], target)).toBe(true);
    }
  });

  it("returns an empty solution when a tile already equals the target, null when unreachable", () => {
    expect(findSolution([1, 2, 3, 4, 5], 4)).toEqual([]);
    expect(findSolution([1, 1, 1, 1, 1], 300)).toBeNull();
  });
});

describe("replaySteps", () => {
  it("stops at the first impossible step", () => {
    const steps: Step[] = [
      { a: 10, op: "×", b: 3, result: 30 },
      { a: 30, op: "-", b: 99, result: -69 },
    ];
    const states = replaySteps([3, 10, 7], steps);
    expect(states).toEqual([[7, 30]]);
  });

  it("requires two distinct tiles for a step", () => {
    expect(replaySteps([4, 5], [{ a: 4, op: "+", b: 4, result: 8 }])).toEqual([]);
  });
});

describe("hasWon", () => {
  it("is true when any tile equals the target", () => {
    expect(hasWon([3, 120, 7], 120)).toBe(true);
    expect(hasWon([3, 121, 7], 120)).toBe(false);
    expect(hasWon([], 120)).toBe(false);
  });
});

describe("generatePuzzle", () => {
  const puzzles = Array.from({ length: 40 }, (_, i) => generatePuzzle(createRng(`test:${i}`)));

  it("draws four small tiles and one big tile", () => {
    for (const { tiles } of puzzles) {
      expect(tiles).toHaveLength(5);
      expect(tiles.filter(isSmallTile)).toHaveLength(4);
      expect(tiles.filter((tile) => BIG_TILES.includes(tile))).toHaveLength(1);
    }
  });

  it("picks a reachable target between 20 and 300 that needs at least 3 operations", () => {
    for (const { tiles, target, par } of puzzles) {
      expect(target).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(target).toBeLessThanOrEqual(TARGET_MAX);
      expect(par).toBeGreaterThanOrEqual(MIN_PAR);
      expect(par).toBeLessThanOrEqual(MAX_STEPS);
      expect(minimumSteps(tiles, target)).toBe(par);
      expect(findSolution(tiles, target)).toHaveLength(par);
    }
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(generatePuzzle(createRng("same"))).toEqual(generatePuzzle(createRng("same")));
    const distinct = new Set(puzzles.map((p) => `${p.tiles.join(",")}>${p.target}`));
    expect(distinct.size).toBeGreaterThan(30);
  });

  it("is pinned for launch day (changing the generator would change every past puzzle)", () => {
    expect(getDailyPuzzle("2026-09-14")).toEqual({ tiles: [5, 2, 7, 20, 6], target: 245, par: 3 });
  });
});

describe("buildNumbersShareText", () => {
  const steps: Step[] = [
    { a: 25, op: "×", b: 4, result: 100 },
    { a: 100, op: "+", b: 7, result: 107 },
    { a: 107, op: "-", b: 3, result: 104 },
  ];

  it("matches the share format exactly on a win", () => {
    const text = buildNumbersShareText({ puzzleNumber: 5, won: true, steps, par: 3 });
    expect(text).toBe(
      `Numbers #5  ✓ 3 steps (par 3)\n✖️➕➖\nSolved in 3 steps. Your turn.\n${SITE_URL}/games/numbers/?s=share`,
    );
  });

  it("shows ✗ and black squares on a loss, and the practice heading in practice", () => {
    const lost = buildNumbersShareText({ puzzleNumber: 5, won: false, steps: [], par: 3 });
    expect(lost).toBe(
      `Numbers #5  ✗\n⬛⬛⬛\nThis one beat me. Can you crack it?\n${SITE_URL}/games/numbers/?s=share`,
    );
    const practice = buildNumbersShareText({ puzzleNumber: 5, practice: true, won: true, steps, par: 3 });
    expect(practice.split("\n")[0]).toBe("Numbers Practice  ✓ 3 steps (par 3)");
  });

  it("formats a step for the history", () => {
    expect(formatStep(steps[0])).toBe("25 × 4 = 100");
  });
});
