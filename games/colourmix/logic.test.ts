import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/config";
import { createRng } from "@/lib/random";
import {
  bestScore,
  buildColourMixShareText,
  CHANNEL_MAX,
  CHANNEL_MIN,
  clampChannel,
  generateColour,
  generateRandomColour,
  getDailyColour,
  hintFor,
  hintsFor,
  hintsToSymbols,
  isRGB,
  isWinningScore,
  scoreColour,
  toCss,
  toHex,
  type Hint,
  type RGB,
} from "./logic";

const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b });

describe("scoreColour", () => {
  it("is 100 for an exact match and 0 for black vs white", () => {
    expect(scoreColour(rgb(120, 45, 200), rgb(120, 45, 200))).toBe(100);
    expect(scoreColour(rgb(0, 0, 0), rgb(255, 255, 255))).toBe(0);
  });

  it("is symmetric and rounds to a whole percent", () => {
    const a = rgb(100, 100, 100);
    const b = rgb(130, 90, 110);
    expect(scoreColour(a, b)).toBe(scoreColour(b, a));
    expect(Number.isInteger(scoreColour(a, b))).toBe(true);
    // distance = sqrt(900 + 100 + 100) = 33.17; 33.17 / 441.67 = 7.51% → 92
    expect(scoreColour(a, b)).toBe(92);
  });

  it("drops as the colour moves away", () => {
    const target = rgb(128, 128, 128);
    expect(scoreColour(rgb(128, 128, 138), target)).toBeGreaterThan(scoreColour(rgb(128, 128, 178), target));
    expect(scoreColour(rgb(128, 128, 178), target)).toBeGreaterThan(scoreColour(rgb(0, 0, 0), target));
  });

  it("wins at 95 or more", () => {
    expect(isWinningScore(95)).toBe(true);
    expect(isWinningScore(94)).toBe(false);
    expect(isWinningScore(100)).toBe(true);
    // 10 off on every channel: distance 17.3 → 96%
    expect(scoreColour(rgb(110, 110, 110), rgb(120, 120, 120))).toBe(96);
    // 22 off on every channel: distance 38.1 → 91%
    expect(isWinningScore(scoreColour(rgb(98, 98, 98), rgb(120, 120, 120)))).toBe(false);
  });

  it("bestScore takes the highest try", () => {
    expect(bestScore([])).toBe(0);
    expect(bestScore([72, 96, 88])).toBe(96);
  });
});

describe("hints", () => {
  it("says higher, lower or close per channel", () => {
    expect(hintFor(50, 100)).toBe("higher");
    expect(hintFor(150, 100)).toBe("lower");
    expect(hintFor(100, 100)).toBe("close");
  });

  it("treats exactly 10 away as close and 11 away as a direction", () => {
    expect(hintFor(90, 100)).toBe("close");
    expect(hintFor(110, 100)).toBe("close");
    expect(hintFor(89, 100)).toBe("higher");
    expect(hintFor(111, 100)).toBe("lower");
  });

  it("returns one hint per channel in R G B order", () => {
    expect(hintsFor(rgb(10, 200, 128), rgb(100, 100, 130))).toEqual(["higher", "lower", "close"]);
  });

  it("renders symbols", () => {
    expect(hintsToSymbols(["higher", "lower", "close"])).toBe("▲▼✓");
  });
});

describe("colour generation", () => {
  it("keeps every channel between 30 and 225 across many seeds", () => {
    for (let i = 0; i < 1000; i++) {
      const colour = generateColour(createRng(`test:${i}`));
      for (const value of [colour.r, colour.g, colour.b]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(CHANNEL_MIN);
        expect(value).toBeLessThanOrEqual(CHANNEL_MAX);
      }
    }
  });

  it("reaches both ends of the allowed range", () => {
    const values = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const colour = generateColour(createRng(`range:${i}`));
      values.add(colour.r);
    }
    expect(values.has(CHANNEL_MIN)).toBe(true);
    expect(values.has(CHANNEL_MAX)).toBe(true);
    expect(values.has(CHANNEL_MIN - 1)).toBe(false);
    expect(values.has(CHANNEL_MAX + 1)).toBe(false);
  });

  it("is the same for the same date and different across days", () => {
    expect(getDailyColour("2026-09-14")).toEqual(getDailyColour("2026-09-14"));
    const week = Array.from({ length: 7 }, (_, i) => toHex(getDailyColour(`2026-09-${14 + i}`)));
    expect(new Set(week).size).toBeGreaterThan(1);
  });

  it("is pinned for launch day (changing the generator would change every past puzzle)", () => {
    expect(getDailyColour("2026-09-14")).toEqual(rgb(60, 211, 60));
  });

  it("practice colours respect the same range", () => {
    for (let i = 0; i < 300; i++) {
      const colour = generateRandomColour();
      expect(isRGB(colour)).toBe(true);
      for (const value of [colour.r, colour.g, colour.b]) {
        expect(value).toBeGreaterThanOrEqual(CHANNEL_MIN);
        expect(value).toBeLessThanOrEqual(CHANNEL_MAX);
      }
    }
  });
});

describe("helpers", () => {
  it("clamps and rounds channel values", () => {
    expect(clampChannel(-5)).toBe(0);
    expect(clampChannel(300)).toBe(255);
    expect(clampChannel(12.6)).toBe(13);
    expect(clampChannel(Number.NaN)).toBe(0);
  });

  it("validates saved colours", () => {
    expect(isRGB(rgb(0, 128, 255))).toBe(true);
    expect(isRGB({ r: 1, g: 2 })).toBe(false);
    expect(isRGB({ r: 1, g: 2, b: 256 })).toBe(false);
    expect(isRGB({ r: 1.5, g: 2, b: 3 })).toBe(false);
    expect(isRGB(null)).toBe(false);
  });

  it("formats css and hex", () => {
    expect(toCss(rgb(1, 2, 3))).toBe("rgb(1, 2, 3)");
    expect(toHex(rgb(255, 0, 16))).toBe("#ff0010");
  });
});

describe("buildColourMixShareText", () => {
  const hints: Hint[][] = [
    ["higher", "lower", "close"],
    ["close", "close", "close"],
  ];

  it("matches the share format exactly", () => {
    const text = buildColourMixShareText({
      puzzleNumber: 3,
      won: true,
      bestScore: 96,
      hints,
      winningTry: 2,
    });
    expect(text).toBe(`Colour Mix #3  96%  2/3\n▲▼✓\n✓✓✓\n${SITE_URL}`);
  });

  it("shows X on a loss and the practice heading in practice", () => {
    const lost = buildColourMixShareText({
      puzzleNumber: 3,
      won: false,
      bestScore: 81,
      hints: [...hints, ["lower", "close", "higher"]],
    });
    expect(lost.split("\n")[0]).toBe("Colour Mix #3  81%  X/3");

    const practice = buildColourMixShareText({
      puzzleNumber: 3,
      practice: true,
      won: true,
      bestScore: 99,
      hints: [["close", "close", "close"]],
      winningTry: 1,
    });
    expect(practice.split("\n")[0]).toBe("Colour Mix Practice  99%  1/3");
  });
});
