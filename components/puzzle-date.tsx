"use client";

import { parseDateKey } from "@/lib/daily";
import { useToday } from "@/lib/hooks/use-today";

/** "Puzzle #N · Monday 14 September" using the player's local date. */
export function PuzzleDate() {
  const today = useToday();
  if (!today) return <p className="h-5" aria-hidden="true" />;

  const { year, month, day } = parseDateKey(today.dateKey);
  const formatted = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));

  return (
    <p className="h-5 text-sm text-muted-foreground">
      Puzzle #{today.puzzleNumber} · {formatted}
    </p>
  );
}
