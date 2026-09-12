import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/config";
import { createRng } from "@/lib/random";
import { CATEGORIES } from "./categories";
import {
  buildOrderShareText,
  checkOrder,
  correctOrder,
  farEnough,
  formatValue,
  generatePuzzle,
  getCategory,
  getDailyPuzzle,
  isSorted,
  isWinningMarks,
  ITEM_COUNT,
  lockedPositions,
  moveItem,
  moveStep,
  pickItems,
  type Mark,
} from "./logic";

const marks = (text: string) => text.split("").map((c) => (c === "g" ? "correct" : "wrong") as Mark);

describe("categories", () => {
  it("has at least 10 categories with 15+ items each, in strictly increasing order", () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(10);
    for (const category of CATEGORIES) {
      expect(category.items.length).toBeGreaterThanOrEqual(15);
      expect(category.question.length).toBeGreaterThan(10);
      expect(isSorted(category.items)).toBe(true);
      expect(new Set(category.items.map((i) => i.name)).size).toBe(category.items.length);
    }
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
  });
});

describe("item picking", () => {
  it("treats close values as almost equal unless their ratio is large", () => {
    expect(farEnough(68, 68, 5)).toBe(false);
    expect(farEnough(59, 60, 5)).toBe(false);
    expect(farEnough(224, 240, 5)).toBe(true); // gap 16 ≥ 5
    expect(farEnough(0.02, 0.1, 10)).toBe(true); // ratio 5, tiny gap
    expect(farEnough(1912, 1914, 15)).toBe(false);
    expect(farEnough(1969, 1989, 15)).toBe(true);
  });

  it("picks 5 distinct items that are never almost equal", () => {
    for (const category of CATEGORIES) {
      for (let seed = 0; seed < 30; seed++) {
        const picked = pickItems(createRng(`${category.id}:${seed}`), category)!;
        expect(picked).toHaveLength(ITEM_COUNT);
        expect(new Set(picked.map((i) => i.name)).size).toBe(ITEM_COUNT);
        for (let a = 0; a < picked.length; a++) {
          for (let b = a + 1; b < picked.length; b++) {
            expect(farEnough(picked[a].value, picked[b].value, category.minGap)).toBe(true);
          }
        }
      }
    }
  });

  it("returns null when a category cannot provide five distinct-enough items", () => {
    const tiny = { ...CATEGORIES[0], items: [{ name: "a", value: 1 }, { name: "b", value: 1 }] };
    expect(pickItems(createRng("x"), tiny)).toBeNull();
  });

  it("generates puzzles from a real category that never start already sorted", () => {
    for (let seed = 0; seed < 100; seed++) {
      const puzzle = generatePuzzle(createRng(`p:${seed}`));
      expect(getCategory(puzzle.categoryId)).toBeDefined();
      expect(puzzle.items).toHaveLength(ITEM_COUNT);
      expect(isSorted(puzzle.items)).toBe(false);
    }
  });

  it("is deterministic per date and pinned for launch day", () => {
    expect(getDailyPuzzle("2026-09-14")).toEqual(getDailyPuzzle("2026-09-14"));
    const puzzle = getDailyPuzzle("2026-09-14");
    expect(`${puzzle.categoryId}: ${puzzle.items.map((i) => i.name).join(", ")}`).toBe(
      "planets-diameter: Titan, Venus, Triton, Mars, The Moon",
    );
  });
});

describe("position checking", () => {
  const items = [
    { name: "c", value: 30 },
    { name: "a", value: 10 },
    { name: "e", value: 50 },
    { name: "b", value: 20 },
    { name: "d", value: 40 },
  ];

  it("derives the correct order from values", () => {
    expect(correctOrder(items)).toEqual([1, 3, 0, 4, 2]);
  });

  it("marks each position independently", () => {
    const correct = correctOrder(items);
    expect(checkOrder([1, 3, 0, 4, 2], correct)).toEqual(marks("ggggg"));
    expect(checkOrder([1, 0, 3, 4, 2], correct)).toEqual(marks("gbbgg"));
    expect(checkOrder([2, 4, 0, 3, 1], correct)).toEqual(marks("bbgbb"));
    expect(isWinningMarks(marks("ggggg"))).toBe(true);
    expect(isWinningMarks(marks("ggggb"))).toBe(false);
  });

  it("keeps a position locked once it has been green", () => {
    expect(lockedPositions([marks("gbbgb"), marks("gbgbb")])).toEqual([true, false, true, true, false]);
    expect(lockedPositions([])).toEqual([false, false, false, false, false]);
  });
});

describe("moving items", () => {
  const order = [10, 11, 12, 13, 14];
  const none = [false, false, false, false, false];

  it("moves an item to a new position when nothing is locked", () => {
    expect(moveItem(order, none, 0, 2)).toEqual([11, 12, 10, 13, 14]);
    expect(moveItem(order, none, 4, 0)).toEqual([14, 10, 11, 12, 13]);
    expect(moveItem(order, none, 2, 2)).toEqual(order);
  });

  it("never disturbs locked positions", () => {
    const locked = [false, true, false, false, false];
    expect(moveItem(order, locked, 0, 2)).toEqual([12, 11, 10, 13, 14]);
    expect(moveItem(order, locked, 4, 0)).toEqual([14, 11, 10, 12, 13]);
    // A locked item cannot be moved.
    expect(moveItem(order, locked, 1, 3)).toEqual(order);
    // Moving onto a locked slot lands in the nearest unlocked one in that direction.
    expect(moveItem(order, locked, 0, 1)).toEqual([12, 11, 10, 13, 14]);
    expect(moveItem(order, locked, 2, 1)).toEqual([12, 11, 10, 13, 14]);
  });

  it("steps up and down over locked positions", () => {
    const locked = [false, true, false, true, false];
    expect(moveStep(order, locked, 0, 1)).toEqual([12, 11, 10, 13, 14]);
    expect(moveStep(order, locked, 2, 1)).toEqual([10, 11, 14, 13, 12]);
    expect(moveStep(order, locked, 4, -1)).toEqual([10, 11, 14, 13, 12]);
    expect(moveStep(order, locked, 0, -1)).toEqual(order);
    expect(moveStep(order, locked, 4, 1)).toEqual(order);
  });
});

describe("formatting and share text", () => {
  it("formats values with the unit", () => {
    expect(formatValue(1500, { unit: "kg" })).toBe("1,500 kg");
    expect(formatValue(1969, { unit: "", plain: true })).toBe("1969");
    expect(formatValue(79, { unit: "" })).toBe("79");
  });

  it("matches the share format exactly", () => {
    const text = buildOrderShareText({
      puzzleNumber: 6,
      won: true,
      marks: [marks("gbbgb"), marks("ggggg")],
    });
    expect(text).toBe(`Order #6  2/3\n🟩⬛⬛🟩⬛\n🟩🟩🟩🟩🟩\n${SITE_URL}`);
  });

  it("shows X on a loss and the practice heading in practice", () => {
    const lost = buildOrderShareText({ puzzleNumber: 6, won: false, marks: [marks("bbbbb"), marks("gbbbb"), marks("gbbbb")] });
    expect(lost.split("\n")[0]).toBe("Order #6  X/3");
    const practice = buildOrderShareText({ puzzleNumber: 6, practice: true, won: true, marks: [marks("ggggg")] });
    expect(practice.split("\n")[0]).toBe("Order Practice  1/3");
  });
});
