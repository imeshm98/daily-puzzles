"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GameConfig } from "@/lib/game-config";
import type { ReactNode } from "react";

interface HowToPlayDialogProps {
  game: GameConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Extra content from the game page (e.g. sound settings), rendered below the rules. */
  extra?: ReactNode;
}

/** Renders a game's howToPlay config. Opens automatically on the first visit. */
export function HowToPlayDialog({ game, open, onOpenChange, extra }: HowToPlayDialogProps) {
  const { intro, rules, legend, extra: configExtra } = game.howToPlay;
  const [lead, ...more] = intro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to play {game.name}</DialogTitle>
          {lead && <DialogDescription>{lead}</DialogDescription>}
        </DialogHeader>

        {more.map((paragraph) => (
          <p key={paragraph} className="text-sm text-muted-foreground">
            {paragraph}
          </p>
        ))}

        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        {legend && legend.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span aria-hidden="true">{item.square}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        )}

        {configExtra}
        {extra}

        <DialogFooter>
          <Button size="lg" className="h-11 w-full text-base" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
