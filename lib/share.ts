import { SITE_URL } from "./config";

/** Emoji squares used in share grids. Shared by every game. */
export const SQUARES = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
} as const;

export interface ShareTextInput {
  gameName: string;
  puzzleNumber: number;
  /** Practice puzzles show "<Game> Practice" instead of the puzzle number. */
  practice?: boolean;
  won: boolean;
  /** Tries used (1-based). Ignored for a loss, which shows "X". */
  tries: number;
  maxTries: number;
  /** One line per try. Emoji squares only: never include the answer. */
  rows: readonly string[];
  /** Defaults to SITE_URL. */
  url?: string;
}

/**
 * Builds the text every game shares:
 *
 *   Melody #1  3/6
 *   🟩🟨⬛⬛🟩
 *   🟩🟩🟩🟩🟩
 *   https://example.com
 */
export function buildShareText(input: ShareTextInput): string {
  const score = input.won ? `${input.tries}/${input.maxTries}` : `X/${input.maxTries}`;
  const heading = input.practice
    ? `${input.gameName} Practice`
    : `${input.gameName} #${input.puzzleNumber}`;
  return [
    `${heading}  ${score}`,
    ...input.rows,
    input.url ?? SITE_URL,
  ].join("\n");
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
    .userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac but has touch points.
  const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || iPad;
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Uses the native share sheet on mobile when available, otherwise copies to
 * the clipboard. Returns what happened so the UI can show "Copied!".
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  if (isMobileDevice() && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
      // Fall through to the clipboard.
    }
  }
  return (await copyToClipboard(text)) ? "copied" : "failed";
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back below.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
