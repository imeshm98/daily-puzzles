import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/config";
import { createRng } from "@/lib/random";
import {
  buildMelodyShareText,
  generateMelody,
  generateRandomMelody,
  getDailyMelody,
  isWinningMarks,
  MELODY_LENGTH,
  NOTES,
  scoreGuess,
  type Mark,
  type Note,
} from "./logic";

/** "C4 D4 E4" → ["C4", "D4", "E4"] */
const notes = (text: string) => text.split(" ") as Note[];
/** "gyb" → ["correct", "present", "absent"] */
const marks = (text: string) =>
  text.split("").map((c) => ({ g: "correct", y: "present", b: "absent" })[c] as Mark);

describe("scoreGuess (Wordle colouring)", () => {
  it("marks every note green when the guess is exact", () => {
    expect(scoreGuess(notes("C4 D4 E4 F4 G4"), notes("C4 D4 E4 F4 G4"))).toEqual(marks("ggggg"));
  });

  it("marks every note grey when none is in the melody", () => {
    expect(scoreGuess(notes("A4 A4 B4 B4 C5"), notes("C4 D4 E4 F4 G4"))).toEqual(marks("bbbbb"));
  });

  it("marks a note yellow when it is in the melody at another position", () => {
    expect(scoreGuess(notes("D4 C4 A4 A4 A4"), notes("C4 D4 E4 F4 G4"))).toEqual(marks("yybbb"));
  });

  it("colours a repeated guess note only as often as it appears in the melody", () => {
    // Melody has one C4, guess has two: only the first can be yellow.
    expect(scoreGuess(notes("C4 C4 A4 A4 A4"), notes("D4 E4 C4 F4 G4"))).toEqual(marks("ybbbb"));
  });

  it("gives green priority over yellow for a repeated guess note", () => {
    // Melody has one C4 at position 2. The C4 at position 1 is grey, not yellow.
    expect(scoreGuess(notes("C4 C4 A4 A4 A4"), notes("D4 C4 E4 F4 G4"))).toEqual(marks("bgbbb"));
  });

  it("handles two copies in the melody with three in the guess", () => {
    expect(scoreGuess(notes("C4 C4 C4 A4 A4"), notes("C4 E4 C4 F4 G4"))).toEqual(marks("gbgbb"));
  });

  it("handles a mix of green, yellow and grey with repeated notes", () => {
    expect(scoreGuess(notes("C4 D4 C4 C4 G4"), notes("C4 C4 D4 E4 F4"))).toEqual(marks("gyybb"));
    expect(scoreGuess(notes("E4 F4 E4 A4 E4"), notes("E4 E4 E4 F4 G4"))).toEqual(marks("gygby"));
  });

  it("does not mutate its inputs", () => {
    const guess = notes("C4 D4 E4 F4 G4");
    const answer = notes("G4 F4 E4 D4 C4");
    scoreGuess(guess, answer);
    expect(guess).toEqual(notes("C4 D4 E4 F4 G4"));
    expect(answer).toEqual(notes("G4 F4 E4 D4 C4"));
  });
});

describe("isWinningMarks", () => {
  it("is true only when every mark is green", () => {
    expect(isWinningMarks(marks("ggggg"))).toBe(true);
    expect(isWinningMarks(marks("ggggy"))).toBe(false);
    expect(isWinningMarks([])).toBe(false);
  });
});

describe("generateMelody", () => {
  const seeds = Array.from({ length: 1000 }, (_, i) => `test:${i}`);
  const melodies = seeds.map((seed) => generateMelody(createRng(seed)));
  const indexOf = (note: Note) => NOTES.indexOf(note);

  it("is deterministic for a seed", () => {
    expect(generateMelody(createRng("same"))).toEqual(generateMelody(createRng("same")));
  });

  it("has 5 white-key notes and starts on C4, E4 or G4", () => {
    for (const melody of melodies) {
      expect(melody).toHaveLength(MELODY_LENGTH);
      expect(["C4", "E4", "G4"]).toContain(melody[0]);
      for (const note of melody) expect(NOTES).toContain(note);
    }
  });

  it("moves mostly by step with at most one bigger leap", () => {
    let steps = 0;
    let leaps = 0;
    for (const melody of melodies) {
      let leapsHere = 0;
      for (let i = 1; i < melody.length; i++) {
        const interval = Math.abs(indexOf(melody[i]) - indexOf(melody[i - 1]));
        if (interval >= 2) leapsHere++;
        else if (interval === 1) steps++;
      }
      expect(leapsHere).toBeLessThanOrEqual(1);
      leaps += leapsHere;
    }
    expect(steps).toBeGreaterThan(leaps * 2);
  });

  it("never repeats the same note three times in a row", () => {
    for (const melody of melodies) {
      for (let i = 2; i < melody.length; i++) {
        expect(melody[i] === melody[i - 1] && melody[i] === melody[i - 2]).toBe(false);
      }
    }
  });

  it("produces many different melodies across seeds", () => {
    const distinct = new Set(melodies.map((melody) => melody.join(" ")));
    expect(distinct.size).toBeGreaterThan(200);
  });
});

describe("getDailyMelody", () => {
  it("gives the same melody for the same date and different melodies on other days", () => {
    expect(getDailyMelody("2026-09-14")).toEqual(getDailyMelody("2026-09-14"));
    const week = Array.from({ length: 7 }, (_, i) => getDailyMelody(`2026-09-${14 + i}`).join(" "));
    expect(new Set(week).size).toBeGreaterThan(1);
  });

  it("is pinned for launch day (changing the generator would change every past puzzle)", () => {
    expect(getDailyMelody("2026-09-14")).toEqual(notes("G4 G4 F4 E4 F4"));
    expect(getDailyMelody("2026-09-15")).toEqual(notes("E4 F4 F4 E4 F4"));
  });
});

describe("generateRandomMelody (practice)", () => {
  it("follows the same musical rules as the daily melody", () => {
    const indexOf = (note: Note) => NOTES.indexOf(note);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const melody = generateRandomMelody();
      seen.add(melody.join(" "));
      expect(melody).toHaveLength(MELODY_LENGTH);
      expect(["C4", "E4", "G4"]).toContain(melody[0]);
      let leaps = 0;
      for (let j = 1; j < melody.length; j++) {
        expect(NOTES).toContain(melody[j]);
        if (Math.abs(indexOf(melody[j]) - indexOf(melody[j - 1])) >= 2) leaps++;
      }
      expect(leaps).toBeLessThanOrEqual(1);
    }
    expect(seen.size).toBeGreaterThan(20);
  });
});

describe("buildMelodyShareText", () => {
  it("uses 'Melody Practice' as the heading in practice mode", () => {
    const text = buildMelodyShareText({
      puzzleNumber: 12,
      practice: true,
      won: false,
      marks: Array.from({ length: 6 }, () => marks("bbbbb")),
    });
    expect(text.split("\n")[0]).toBe("Melody Practice  X/6");
    expect(text).not.toContain("#12");
  });

  it("matches the share format exactly", () => {
    const text = buildMelodyShareText({
      puzzleNumber: 1,
      won: true,
      marks: [marks("gybbg"), marks("bggyg"), marks("ggggg")],
    });
    expect(text).toBe(
      `Melody #1  3/6\n🟩🟨⬛⬛🟩\n⬛🟩🟩🟨🟩\n🟩🟩🟩🟩🟩\nCan you beat 3 tries?\n${SITE_URL}/games/melody/?s=share`,
    );
  });

  it("shows X for a loss and never includes note names", () => {
    const rows = Array.from({ length: 6 }, () => marks("bybyb"));
    const text = buildMelodyShareText({ puzzleNumber: 42, won: false, marks: rows });
    expect(text.startsWith("Melody #42  X/6\n")).toBe(true);
    expect(text.split("\n")).toHaveLength(9);
    expect(text.split("\n")[7]).toBe("I failed today. Your turn.");
    expect(text).not.toMatch(/[A-G][45]/);
  });
});
