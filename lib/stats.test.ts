import { describe, expect, it } from "vitest";
import { createEmptyStats, recordResult, winPercent } from "./stats";

describe("recordResult", () => {
  it("records a first win", () => {
    const stats = recordResult(createEmptyStats(6), { puzzleNumber: 1, won: true, tries: 3 });
    expect(stats).toMatchObject({ played: 1, won: 1, currentStreak: 1, maxStreak: 1 });
    expect(stats.distribution).toEqual([0, 0, 1, 0, 0, 0]);
    expect(stats.lastPlayedPuzzle).toBe(1);
    expect(stats.lastWonPuzzle).toBe(1);
  });

  it("extends the streak on consecutive days", () => {
    let stats = createEmptyStats(6);
    stats = recordResult(stats, { puzzleNumber: 1, won: true, tries: 2 });
    stats = recordResult(stats, { puzzleNumber: 2, won: true, tries: 6 });
    stats = recordResult(stats, { puzzleNumber: 3, won: true, tries: 1 });
    expect(stats.currentStreak).toBe(3);
    expect(stats.maxStreak).toBe(3);
    expect(stats.distribution).toEqual([1, 1, 0, 0, 0, 1]);
  });

  it("resets the streak on a loss but keeps the max streak", () => {
    let stats = createEmptyStats(6);
    stats = recordResult(stats, { puzzleNumber: 1, won: true, tries: 2 });
    stats = recordResult(stats, { puzzleNumber: 2, won: true, tries: 2 });
    stats = recordResult(stats, { puzzleNumber: 3, won: false, tries: 6 });
    expect(stats).toMatchObject({ played: 3, won: 2, currentStreak: 0, maxStreak: 2 });
    expect(stats.distribution).toEqual([0, 2, 0, 0, 0, 0]);
    expect(stats.lastWonPuzzle).toBe(2);
  });

  it("restarts the streak at 1 after a skipped day", () => {
    let stats = createEmptyStats(6);
    stats = recordResult(stats, { puzzleNumber: 1, won: true, tries: 2 });
    stats = recordResult(stats, { puzzleNumber: 3, won: true, tries: 2 });
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(1);
  });

  it("starts a new streak after a loss", () => {
    let stats = createEmptyStats(6);
    stats = recordResult(stats, { puzzleNumber: 1, won: false, tries: 6 });
    stats = recordResult(stats, { puzzleNumber: 2, won: true, tries: 4 });
    expect(stats.currentStreak).toBe(1);
  });

  it("ignores the same puzzle recorded twice", () => {
    let stats = createEmptyStats(6);
    stats = recordResult(stats, { puzzleNumber: 5, won: true, tries: 2 });
    const again = recordResult(stats, { puzzleNumber: 5, won: false, tries: 6 });
    expect(again).toBe(stats);
  });

  it("does not mutate the previous stats object", () => {
    const before = createEmptyStats(6);
    recordResult(before, { puzzleNumber: 1, won: true, tries: 1 });
    expect(before.played).toBe(0);
    expect(before.distribution).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("winPercent", () => {
  it("rounds to a whole number and is 0 with no games", () => {
    expect(winPercent(createEmptyStats(6))).toBe(0);
    expect(winPercent({ ...createEmptyStats(6), played: 3, won: 2 })).toBe(67);
  });
});
