"use client";

import { Countdown } from "@/components/countdown";
import { StatsPanel } from "@/components/stats-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GameConfig } from "@/lib/game-config";
import type { GameStats } from "@/lib/stats";

interface StatsDialogProps {
  game: GameConfig;
  stats: GameStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatsDialog({ game, stats, open, onOpenChange }: StatsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Statistics</DialogTitle>
          <DialogDescription>{game.name}</DialogDescription>
        </DialogHeader>
        <StatsPanel
          stats={stats}
          maxTries={game.maxTries}
          distributionLabel={game.distributionLabel}
        />
        <Countdown label={`Next ${game.name} in`} />
      </DialogContent>
    </Dialog>
  );
}
