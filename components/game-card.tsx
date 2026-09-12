"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { loadDailyState, type GameStatus } from "@/lib/daily-state";
import { useToday } from "@/lib/hooks/use-today";
import { cn } from "@/lib/utils";

/** The plain, serialisable part of a GameConfig that the hub needs. */
export interface GameSummary {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  path: string;
}

const STATUS_LABELS: Record<GameStatus | "new", { text: string; className: string }> = {
  new: { text: "New puzzle today", className: "text-muted-foreground" },
  playing: { text: "In progress", className: "text-present" },
  won: { text: "Solved today", className: "text-correct" },
  lost: { text: "Played today", className: "text-muted-foreground" },
};

export function GameCard({ game }: { game: GameSummary }) {
  const today = useToday();
  const status = today ? (loadDailyState(game.id, today.dateKey)?.status ?? "new") : null;
  const label = status ? STATUS_LABELS[status] : null;

  return (
    <Link
      href={game.path}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-colors group-hover:bg-muted/40 group-active:bg-muted/60">
        <CardContent className="flex items-center gap-4">
          <span className="text-4xl leading-none" aria-hidden="true">
            {game.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{game.name}</h2>
            <p className="text-sm text-muted-foreground">{game.tagline}</p>
            <p className={cn("mt-1 h-4 text-xs font-medium", label?.className)}>{label?.text}</p>
          </div>
          <Play className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  );
}
