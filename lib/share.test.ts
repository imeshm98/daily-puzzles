import { describe, expect, it } from "vitest";
import { SITE_URL } from "./config";
import { buildShareText, buildShareUrl, buildWhatsAppUrl } from "./share";

const melody = {
  gameName: "Melody",
  puzzleNumber: 1,
  won: true,
  tries: 3,
  maxTries: 6,
  rows: ["🟩🟨⬛⬛🟩", "⬛🟩🟩🟨🟩", "🟩🟩🟩🟩🟩"],
  hook: "Can you beat 3 tries?",
  path: "/games/melody",
};

describe("buildShareUrl", () => {
  it("points at the game page, not the hub, and tags the visit as a share", () => {
    expect(buildShareUrl("/games/melody")).toBe(`${SITE_URL}/games/melody/?s=share`);
  });

  it("tolerates slashes at either end of the path", () => {
    expect(buildShareUrl("games/order/")).toBe(`${SITE_URL}/games/order/?s=share`);
  });
});

describe("buildShareText", () => {
  it("formats heading, grid, hook and game link in that order", () => {
    expect(buildShareText(melody)).toBe(
      [
        "Melody #1  3/6",
        "🟩🟨⬛⬛🟩",
        "⬛🟩🟩🟨🟩",
        "🟩🟩🟩🟩🟩",
        "Can you beat 3 tries?",
        `${SITE_URL}/games/melody/?s=share`,
      ].join("\n"),
    );
  });

  it("keeps practice results plain: no puzzle number and no hook", () => {
    const text = buildShareText({ ...melody, puzzleNumber: 7, practice: true, tries: 4 });
    expect(text).toBe(
      `Melody Practice  4/6\n🟩🟨⬛⬛🟩\n⬛🟩🟩🟨🟩\n🟩🟩🟩🟩🟩\n${SITE_URL}/games/melody/?s=share`,
    );
    expect(text).not.toContain("#");
    expect(text).not.toContain("Can you beat");
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
      hook: "Beat 96% if you can.",
      path: "/games/colourmix",
      url: "https://example.com",
    });
    expect(text).toBe("Colour Mix #3  96%  2/3\n▲▼✓\n✓✓✓\nBeat 96% if you can.\nhttps://example.com");
  });

  it("lets a game replace the tries score with its own label", () => {
    const text = buildShareText({
      gameName: "Numbers",
      puzzleNumber: 5,
      won: true,
      tries: 3,
      maxTries: 4,
      scoreLabel: "✓ 3 steps (par 3)",
      rows: ["✖️➕➖"],
      hook: "Solved in 3 steps. Your turn.",
      path: "/games/numbers",
      url: "https://example.com",
    });
    expect(text).toBe(
      "Numbers #5  ✓ 3 steps (par 3)\n✖️➕➖\nSolved in 3 steps. Your turn.\nhttps://example.com",
    );
  });

  it("uses X for a loss", () => {
    const text = buildShareText({ ...melody, puzzleNumber: 9, won: false, tries: 6 });
    expect(text.split("\n")[0]).toBe("Melody #9  X/6");
  });

  it("collapses a multi-line or padded hook to one clean line, and drops an empty one", () => {
    const padded = buildShareText({ ...melody, hook: "  Can you\nbeat 3   tries?  " });
    expect(padded.split("\n")[4]).toBe("Can you beat 3 tries?");
    const none = buildShareText({ ...melody, hook: "" });
    expect(none.split("\n")).toHaveLength(5);
    expect(none.split("\n")[4]).toBe(`${SITE_URL}/games/melody/?s=share`);
  });

  it("uses \\n line breaks only, with no blank or trailing lines, so chat apps keep the layout", () => {
    const text = buildShareText(melody);
    expect(text).not.toContain("\r");
    expect(text).not.toMatch(/\n\n/);
    expect(text.startsWith("\n")).toBe(false);
    expect(text.endsWith("\n")).toBe(false);
    for (const line of text.split("\n")) expect(line).toBe(line.trim());
    // The link is the last line so chat apps unfurl it.
    expect(text.split("\n").at(-1)).toMatch(/^https:\/\//);
  });
});

describe("buildWhatsAppUrl", () => {
  it("encodes the text, keeping line breaks as %0A", () => {
    const url = buildWhatsAppUrl("Melody #1  3/6\n🟩🟩🟩🟩🟩\nhttps://example.com/games/melody/?s=share");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain("%0A");
    expect(url).not.toContain("\n");
    expect(url).not.toContain("?s=share"); // the query inside the text is escaped
    const decoded = decodeURIComponent(url.slice("https://wa.me/?text=".length));
    expect(decoded).toBe("Melody #1  3/6\n🟩🟩🟩🟩🟩\nhttps://example.com/games/melody/?s=share");
  });
});
