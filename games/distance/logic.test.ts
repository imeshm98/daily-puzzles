import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/config";
import { createRng } from "@/lib/random";
import { CITIES } from "./cities";
import {
  buildDistanceShareText,
  errorPercent,
  generatePuzzle,
  getDailyPuzzle,
  guessToKm,
  haversineKm,
  kmToMiles,
  milesToKm,
  MIN_PAIR_KM,
  parseGuess,
  pointsForError,
  ROUNDS,
  scoreBucket,
  scoreRound,
  squareForError,
  totalPoints,
  type RoundResult,
} from "./logic";

const city = (name: string) => CITIES.find((c) => c.name === name)!;

describe("haversineKm", () => {
  it("matches known distances", () => {
    expect(haversineKm(city("London"), city("Paris"))).toBeCloseTo(343, -1);
    expect(haversineKm(city("New York"), city("London"))).toBeCloseTo(5570, -2);
    expect(haversineKm(city("Sydney"), city("Auckland"))).toBeCloseTo(2155, -2);
    expect(haversineKm(city("Tokyo"), city("São Paulo"))).toBeCloseTo(18530, -2);
  });

  it("is zero for the same point and symmetric", () => {
    expect(haversineKm(city("Cairo"), city("Cairo"))).toBe(0);
    expect(haversineKm(city("Lima"), city("Nairobi"))).toBeCloseTo(haversineKm(city("Nairobi"), city("Lima")), 6);
  });

  it("caps at half the Earth's circumference for antipodes", () => {
    const distance = haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 });
    expect(distance).toBeCloseTo(20015, -1);
    expect(haversineKm({ lat: 90, lon: 0 }, { lat: -90, lon: 0 })).toBeCloseTo(distance, 0);
  });
});

describe("scoring", () => {
  it("gives full points up to 5% error", () => {
    expect(pointsForError(0)).toBe(100);
    expect(pointsForError(5)).toBe(100);
  });

  it("gives nothing from 50% error", () => {
    expect(pointsForError(50)).toBe(0);
    expect(pointsForError(300)).toBe(0);
  });

  it("falls in a straight line between 5% and 50%, rounded", () => {
    expect(pointsForError(27.5)).toBe(50);
    expect(pointsForError(14)).toBe(80);
    expect(pointsForError(41)).toBe(20);
    expect(pointsForError(6)).toBe(98); // 100 × 44 / 45 = 97.8
    expect(pointsForError(10)).toBe(89); // 100 × 40 / 45 = 88.9
  });

  it("computes error as a percentage of the real distance", () => {
    expect(errorPercent(900, 1000)).toBeCloseTo(10, 6);
    expect(errorPercent(1100, 1000)).toBeCloseTo(10, 6);
    expect(errorPercent(2000, 1000)).toBe(100);
  });

  it("scores a round end to end and totals", () => {
    const perfect = scoreRound(1020, 1000);
    expect(perfect.points).toBe(100);
    const poor = scoreRound(1600, 1000); // 60% error
    expect(poor.points).toBe(0);
    const middle = scoreRound(1275, 1000); // 27.5% error
    expect(middle.points).toBe(50);
    expect(totalPoints([perfect, poor, middle])).toBe(150);
  });

  it("maps error to share squares at 10% and 25%", () => {
    expect(squareForError(10)).toBe("🟩");
    expect(squareForError(10.01)).toBe("🟨");
    expect(squareForError(25)).toBe("🟨");
    expect(squareForError(25.01)).toBe("🟥");
  });

  it("buckets totals into five stats rows", () => {
    expect(scoreBucket(0)).toBe(1);
    expect(scoreBucket(100)).toBe(1);
    expect(scoreBucket(101)).toBe(2);
    expect(scoreBucket(412)).toBe(5);
    expect(scoreBucket(500)).toBe(5);
  });
});

describe("units and input", () => {
  it("converts miles and kilometres", () => {
    expect(milesToKm(100)).toBeCloseTo(160.93, 2);
    expect(kmToMiles(160.9344)).toBeCloseTo(100, 6);
    expect(guessToKm(100, "mi")).toBe(161);
    expect(guessToKm(999.6, "km")).toBe(1000);
  });

  it("parses typed guesses leniently", () => {
    expect(parseGuess("1,200")).toBe(1200);
    expect(parseGuess(" 3 500 ")).toBe(3500);
    expect(parseGuess("12.5")).toBe(12.5);
    expect(parseGuess("")).toBeNull();
    expect(parseGuess("abc")).toBeNull();
    expect(parseGuess("0")).toBeNull();
  });
});

describe("cities", () => {
  it("has at least 200 famous cities with unique names and valid data", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(200);
    const names = new Set(CITIES.map((c) => `${c.name}, ${c.country}`));
    expect(names.size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(c.lat).toBeGreaterThanOrEqual(-90);
      expect(c.lat).toBeLessThanOrEqual(90);
      expect(c.lon).toBeGreaterThanOrEqual(-180);
      expect(c.lon).toBeLessThanOrEqual(180);
      expect([...c.flag]).toHaveLength(2); // two regional indicator symbols
    }
  });

  it("covers every continent", () => {
    for (const name of ["London", "Tokyo", "Cairo", "New York", "São Paulo", "Sydney"]) {
      expect(city(name)).toBeDefined();
    }
  });
});

describe("generatePuzzle", () => {
  const puzzles = Array.from({ length: 200 }, (_, i) => generatePuzzle(createRng(`test:${i}`)));

  it("makes 5 rounds of two different cities at least 300 km apart, no city twice", () => {
    for (const { rounds } of puzzles) {
      expect(rounds).toHaveLength(ROUNDS);
      const names = rounds.flatMap((r) => [r.from.name, r.to.name]);
      expect(new Set(names).size).toBe(ROUNDS * 2);
      for (const round of rounds) {
        expect(round.distanceKm).toBeGreaterThanOrEqual(MIN_PAIR_KM);
        expect(round.distanceKm).toBe(Math.round(haversineKm(round.from, round.to)));
      }
    }
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(generatePuzzle(createRng("same"))).toEqual(generatePuzzle(createRng("same")));
    expect(new Set(puzzles.map((p) => p.rounds[0].from.name)).size).toBeGreaterThan(50);
  });

  it("is pinned for launch day (changing the generator would change every past puzzle)", () => {
    const { rounds } = getDailyPuzzle("2026-09-14");
    expect(rounds.map((r) => `${r.from.name}>${r.to.name}=${r.distanceKm}`)).toEqual([
      "Bucharest>New Delhi=4805",
      "Salvador>Port Moresby=17445",
      "Djibouti>Ulaanbaatar=7109",
      "Novosibirsk>Nicosia=4346",
      "Porto>Suva=17370",
    ]);
  });
});

describe("buildDistanceShareText", () => {
  const result = (error: number): RoundResult => ({
    guessKm: 1000,
    actualKm: 1000,
    errorPercent: error,
    points: pointsForError(error),
  });

  it("matches the share format exactly", () => {
    // 100 (3%) + 100 (5%) + 80 (14%) + 100 (5%) + 32 (35.6%) = 412
    const results = [result(3), result(5), result(14), result(5), result(35.6)];
    expect(totalPoints(results)).toBe(412);
    const text = buildDistanceShareText({ puzzleNumber: 4, results });
    expect(text).toBe(
      `Distance #4  412/500\n🟩🟩🟨🟩🟥\n412/500. How good is your geography?\n${SITE_URL}/games/distance/?s=share`,
    );
  });

  it("uses the practice heading in practice", () => {
    const text = buildDistanceShareText({ puzzleNumber: 4, practice: true, results: [result(60)] });
    expect(text.split("\n")[0]).toBe("Distance Practice  0/500");
  });
});
