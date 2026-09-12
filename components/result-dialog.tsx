"use client";

import { ArrowRight, Infinity as InfinityIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Countdown } from "@/components/countdown";
import { ShareButton, WhatsAppButton } from "@/components/share-button";
import { StatsPanel } from "@/components/stats-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GameMode } from "@/lib/game-config";
import type { GameStats } from "@/lib/stats";

const WIN_TITLES = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];

export function resultTitle(won: boolean, tries: number): string {
  if (!won) return "Not this time";
  return WIN_TITLES[Math.min(Math.max(tries, 1), WIN_TITLES.length) - 1];
}

interface ResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameName: string;
  puzzleNumber: number;
  /** Daily results show stats and the countdown; practice results show neither. */
  mode: GameMode;
  won: boolean;
  /** Tries used. For a loss this equals maxTries. */
  tries: number;
  maxTries: number;
  shareText: string;
  stats: GameStats;
  /** Overrides the default Wordle-style title. */
  title?: string;
  /** Overrides the "tries/maxTries" score in the subtitle, e.g. "3 steps (par 3)". */
  scoreLabel?: string;
  /** Heading of the stats distribution (see GameConfig.distributionLabel). */
  distributionLabel?: string;
  /**
   * Present when the game supports practice. In daily mode it starts practice
   * ("Keep playing"); in practice mode it loads the next random puzzle ("Next").
   */
  onPractice?: () => void;
  /** Game-specific content, e.g. the revealed answer. */
  children?: ReactNode;
}

/**
 * End-of-game dialog shared by every game: result, big Share button, then
 * for the daily puzzle the stats, practice button, countdown and a hidden ad
 * slot; for practice just a "Next puzzle" button.
 */
export function ResultDialog({
  open,
  onOpenChange,
  gameName,
  puzzleNumber,
  mode,
  won,
  tries,
  maxTries,
  shareText,
  stats,
  title,
  scoreLabel,
  distributionLabel,
  onPractice,
  children,
}: ResultDialogProps) {
  const score = scoreLabel ?? (won ? `${tries}/${maxTries}` : `X/${maxTries}`);
  const practice = mode === "practice";
  const heading = practice ? `${gameName} Practice` : `${gameName} #${puzzleNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-2xl">{title ?? resultTitle(won, tries)}</DialogTitle>
          <DialogDescription>
            {heading} · {score}
          </DialogDescription>
        </DialogHeader>

        {children}

        {/* Stacked: "Challenge on WhatsApp" is too long for half of a phone-width dialog. */}
        <div className="grid gap-2">
          <ShareButton text={shareText} />
          <WhatsAppButton text={shareText} />
        </div>

        {practice ? (
          onPractice && (
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full text-base font-semibold"
              onClick={onPractice}
            >
              Next puzzle
              <ArrowRight />
            </Button>
          )
        ) : (
          <>
            <StatsPanel
              stats={stats}
              maxTries={maxTries}
              highlightTries={won ? tries : null}
              distributionLabel={distributionLabel}
            />

            {onPractice && (
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full text-base font-semibold"
                onClick={onPractice}
              >
                <InfinityIcon />
                Keep playing (practice)
              </Button>
            )}

            <Countdown label={`Next ${gameName} in`} size="sm" />

            {/* Reserved for a future ad unit. Stays hidden until it is wired up. */}
            <div id="ad-slot" hidden />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
