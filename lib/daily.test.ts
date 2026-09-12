import { describe, expect, it } from "vitest";
import { formatCountdown, getLocalDateKey, getPuzzleNumber, msUntilLocalMidnight } from "./daily";

describe("getPuzzleNumber", () => {
  it("makes 2026-09-14 puzzle #1", () => {
    expect(getPuzzleNumber("2026-09-14")).toBe(1);
  });

  it("adds one per calendar day", () => {
    expect(getPuzzleNumber("2026-09-15")).toBe(2);
    expect(getPuzzleNumber("2026-10-14")).toBe(31);
    expect(getPuzzleNumber("2027-09-14")).toBe(366);
  });

  it("is 0 the day before launch", () => {
    expect(getPuzzleNumber("2026-09-13")).toBe(0);
  });
});

describe("getLocalDateKey", () => {
  it("uses the local calendar date, zero-padded", () => {
    expect(getLocalDateKey(new Date(2026, 8, 14, 23, 59, 59))).toBe("2026-09-14");
    expect(getLocalDateKey(new Date(2026, 0, 5, 0, 0, 1))).toBe("2026-01-05");
  });
});

describe("msUntilLocalMidnight", () => {
  it("counts down to the next local midnight", () => {
    expect(msUntilLocalMidnight(new Date(2026, 8, 14, 23, 59, 0))).toBe(60_000);
    expect(msUntilLocalMidnight(new Date(2026, 8, 14, 0, 0, 0))).toBe(86_400_000);
  });
});

describe("formatCountdown", () => {
  it("formats as HH:MM:SS and clamps at zero", () => {
    expect(formatCountdown(3_661_000)).toBe("01:01:01");
    expect(formatCountdown(59_999)).toBe("00:00:59");
    expect(formatCountdown(-5)).toBe("00:00:00");
  });
});
