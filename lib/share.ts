import { SITE_URL } from "./config";

/** Emoji squares used in share grids. Shared by every game. */
export const SQUARES = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
} as const;

/** Query parameter added to every shared link so analytics can count share visits. */
export const SHARE_SOURCE_PARAM = "s";
export const SHARE_SOURCE_VALUE = "share";

/** Hooks must fit on one line in a chat preview. */
export const MAX_HOOK_LENGTH = 40;

/**
 * The link a share points at: the game's own page (never the hub) with the
 * share source parameter, e.g. https://example.com/games/melody/?s=share.
 * The trailing slash matches `trailingSlash: true` in next.config.ts, so the
 * static host serves the page directly without a redirect.
 */
export function buildShareUrl(path: string): string {
  const base = SITE_URL.replace(/\/+$/, "");
  const slug = path.replace(/^\/+|\/+$/g, "");
  return `${base}/${slug ? `${slug}/` : ""}?${SHARE_SOURCE_PARAM}=${SHARE_SOURCE_VALUE}`;
}

export interface ShareTextInput {
  gameName: string;
  puzzleNumber: number;
  /** Practice puzzles use a plainer format: "<Game> Practice", no number, no hook. */
  practice?: boolean;
  won: boolean;
  /** Tries used (1-based). Ignored for a loss, which shows "X". */
  tries: number;
  maxTries: number;
  /** Optional extra between the heading and the tries, e.g. "96%" → "Colour Mix #3  96%  2/3". */
  detail?: string;
  /** Replaces the "tries/maxTries" part entirely, e.g. "✓ 3 steps (par 3)" or "✗". */
  scoreLabel?: string;
  /** One line per try. Emoji squares only: never include the answer. */
  rows: readonly string[];
  /**
   * The challenge line shown after the grid on daily results, from the game's
   * `buildHook`. Trimmed to a single line; ignored for practice.
   */
  hook?: string;
  /** Route of the game page, e.g. "/games/melody". Builds the link with buildShareUrl. */
  path: string;
  /** Overrides the link entirely (tests). */
  url?: string;
}

/**
 * Builds the text every game shares. Daily:
 *
 *   Melody #1  3/6
 *   🟩🟨⬛⬛🟩
 *   🟩🟩🟩🟩🟩
 *   Can you beat 3 tries?
 *   https://example.com/games/melody/?s=share
 *
 * Practice keeps a plainer format: "Melody Practice  3/6", the rows, the link.
 *
 * Lines are joined with "\n" only (no "\r"), which WhatsApp, Telegram,
 * Discord and X all keep as line breaks, both from the clipboard and from the
 * native share sheet.
 */
export function buildShareText(input: ShareTextInput): string {
  const score =
    input.scoreLabel ?? (input.won ? `${input.tries}/${input.maxTries}` : `X/${input.maxTries}`);
  const heading = input.practice
    ? `${input.gameName} Practice`
    : `${input.gameName} #${input.puzzleNumber}`;
  const hook = input.practice ? "" : (input.hook ?? "").replace(/\s+/g, " ").trim();
  return [
    [heading, input.detail, score].filter(Boolean).join("  "),
    ...input.rows,
    hook,
    input.url ?? buildShareUrl(input.path),
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

/** Opens WhatsApp (app or web) with the text ready to send. */
export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
