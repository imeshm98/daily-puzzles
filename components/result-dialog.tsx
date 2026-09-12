"use client";

import type { ReactNode } from "react";
import { Countdown } from "@/components/countdown";
import { ShareButton } from "@/components/share-button";
import { StatsPanel } from "@/components/stats-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  won: boolean;
  /** Tries used. For a loss this equals maxTries. */
  tries: number;
  maxTries: number;
  shareText: string;
  stats: GameStats;
  /** Game-specific content, e.g. the revealed answer. */
  children?: ReactNode;
}

/**
 * End-of-game dialog shared by every game: result, big Share button, stats,
 * countdown to the next puzzle, and a hidden ad slot for later.
 */
export function ResultDialog({
  open,
  onOpenChange,
  gameName,
  puzzleNumber,
  won,
  tries,
  maxTries,
  shareText,
  stats,
  children,
}: ResultDialogProps) {
  const score = won ? `${tries}/${maxTries}` : `X/${maxTries}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-2xl">{resultTitle(won, tries)}</DialogTitle>
          <DialogDescription>
            {gameName} #{puzzleNumber} · {score}
          </DialogDescription>
        </DialogHeader>

        {children}

        <ShareButton text={shareText} />

        <StatsPanel stats={stats} maxTries={maxTries} highlightTries={won ? tries : null} />

        <Countdown label={`Next ${gameName} in`} />

        {/* Reserved for a future ad unit. Stays hidden until it is wired up. */}
        <div id="ad-slot" hidden />
      </DialogContent>
    </Dialog>
  );
}
