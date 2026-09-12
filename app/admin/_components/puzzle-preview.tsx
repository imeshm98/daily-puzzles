"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDailyColour, toHex } from "@/games/colourmix/logic";
import { getDailyPuzzle as getDailyDistance } from "@/games/distance/logic";
import { getDailyMelody } from "@/games/melody/logic";
import { NOTE_LABELS } from "@/games/melody/logic";
import { getDailyPuzzle as getDailyNumbers } from "@/games/numbers/logic";
import { correctOrder, formatValue, getCategory, getDailyPuzzle as getDailyOrder } from "@/games/order/logic";
import { getLocalDateKey, getPuzzleNumber } from "@/lib/daily";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Read-only: exactly what each game generates for a chosen local date, using
 * the same generators and the same seeds as the site.
 */
export function PuzzlePreview() {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey());
  const valid = DATE_KEY.test(dateKey);
  const puzzleNumber = valid ? getPuzzleNumber(dateKey) : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h2 className="text-xl font-semibold">Preview daily puzzle</h2>
          <p className="text-sm text-muted-foreground">
            What every game generates on a date. Puzzle #1 is 2026-09-14; earlier dates give 0 or negative numbers.
          </p>
        </div>
        <div className="ml-auto flex items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor="preview-date">Local date</Label>
            <Input
              id="preview-date"
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
              className="w-44"
            />
          </div>
          <p className="pb-2 text-sm text-muted-foreground">
            {puzzleNumber === null ? "Pick a date" : `Puzzle #${puzzleNumber}`}
          </p>
        </div>
      </div>

      {valid && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MelodyPreview dateKey={dateKey} />
          <ColourMixPreview dateKey={dateKey} />
          <NumbersPreview dateKey={dateKey} />
          <DistancePreview dateKey={dateKey} />
          <OrderPreview dateKey={dateKey} />
        </div>
      )}
    </section>
  );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

function MelodyPreview({ dateKey }: { dateKey: string }) {
  const notes = getDailyMelody(dateKey);
  return (
    <PreviewCard title="🎹 Melody">
      <p className="font-mono text-lg">{notes.map((note) => NOTE_LABELS[note]).join("  ")}</p>
      <p className="text-muted-foreground">{notes.join(" ")}</p>
    </PreviewCard>
  );
}

function ColourMixPreview({ dateKey }: { dateKey: string }) {
  const colour = getDailyColour(dateKey);
  const hex = toHex(colour);
  return (
    <PreviewCard title="🎨 Colour Mix">
      <div className="flex items-center gap-3">
        <span className="size-12 rounded-md border border-border" style={{ backgroundColor: hex }} aria-hidden="true" />
        <div>
          <p className="font-mono">{hex}</p>
          <p className="text-muted-foreground">
            R {colour.r} · G {colour.g} · B {colour.b}
          </p>
        </div>
      </div>
    </PreviewCard>
  );
}

function NumbersPreview({ dateKey }: { dateKey: string }) {
  const puzzle = getDailyNumbers(dateKey);
  return (
    <PreviewCard title="🔢 Numbers">
      <p>
        Tiles <span className="font-mono">{puzzle.tiles.join("  ")}</span>
      </p>
      <p>
        Target <span className="font-mono font-semibold">{puzzle.target}</span> · par {puzzle.par}
      </p>
    </PreviewCard>
  );
}

function DistancePreview({ dateKey }: { dateKey: string }) {
  const puzzle = getDailyDistance(dateKey);
  return (
    <PreviewCard title="🌍 Distance">
      <ol className="list-decimal space-y-0.5 pl-5">
        {puzzle.rounds.map((round, index) => (
          <li key={index}>
            {round.from.flag} {round.from.name} → {round.to.flag} {round.to.name}:{" "}
            <span className="font-mono">{round.distanceKm.toLocaleString("en-US")} km</span>
          </li>
        ))}
      </ol>
    </PreviewCard>
  );
}

function OrderPreview({ dateKey }: { dateKey: string }) {
  const puzzle = getDailyOrder(dateKey);
  const category = getCategory(puzzle.categoryId);
  const answer = correctOrder(puzzle.items);
  return (
    <PreviewCard title="📊 Order">
      <p className="mb-1 font-medium">{category?.question ?? puzzle.categoryId}</p>
      <p className="text-muted-foreground">Shown as: {puzzle.items.map((item) => item.name).join(", ")}</p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5">
        {answer.map((itemIndex) => {
          const item = puzzle.items[itemIndex];
          return (
            <li key={item.name}>
              {item.name}{" "}
              <span className="font-mono text-muted-foreground">
                {category ? formatValue(item.value, category) : item.value}
              </span>
            </li>
          );
        })}
      </ol>
    </PreviewCard>
  );
}
