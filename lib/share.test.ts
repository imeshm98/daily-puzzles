import { describe, expect, it } from "vitest";
import { buildShareText } from "./share";

describe("buildShareText", () => {
  it("formats title, score, rows and URL", () => {
    const text = buildShareText({
      gameName: "Melody",
      puzzleNumber: 1,
      won: true,
      tries: 3,
      maxTries: 6,
      rows: ["🟩🟨⬛⬛🟩", "⬛🟩🟩🟨🟩", "🟩🟩🟩🟩🟩"],
      url: "https://example.com",
    });
    expect(text).toBe("Melody #1  3/6\n🟩🟨⬛⬛🟩\n⬛🟩🟩🟨🟩\n🟩🟩🟩🟩🟩\nhttps://example.com");
  });

  it("labels practice puzzles instead of numbering them", () => {
    const text = buildShareText({
      gameName: "Melody",
      puzzleNumber: 7,
      practice: true,
      won: true,
      tries: 4,
      maxTries: 6,
      rows: ["🟩🟩🟩🟩🟩"],
      url: "https://example.com",
    });
    expect(text).toBe("Melody Practice  4/6\n🟩🟩🟩🟩🟩\nhttps://example.com");
    expect(text).not.toContain("#");
  });

  it("inserts an optional detail between the heading and the tries", () => {
    const text = buildShareText({
      gameName: "Colour Mix",
      puzzleNumber: 3,
      won: true,
      tries: 2,
      maxTries: 3,
      detail: "96%",
      rows: ["▲▼✓", "✓✓✓"],
      url: "https://example.com",
    });
    expect(text).toBe("Colour Mix #3  96%  2/3\n▲▼✓\n✓✓✓\nhttps://example.com");
  });

  it("uses X for a loss", () => {
    const text = buildShareText({
      gameName: "Melody",
      puzzleNumber: 9,
      won: false,
      tries: 6,
      maxTries: 6,
      rows: ["⬛⬛⬛⬛⬛"],
      url: "https://example.com",
    });
    expect(text.split("\n")[0]).toBe("Melody #9  X/6");
  });
});
