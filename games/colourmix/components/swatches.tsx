"use client";

import { cn } from "@/lib/utils";
import { hintsToSymbols, toCss, type Hint, type RGB } from "../logic";

export function rgbLabel(colour: RGB): string {
  return `R ${colour.r}  G ${colour.g}  B ${colour.b}`;
}

interface SwatchProps {
  /** Null renders a neutral placeholder (before hydration). */
  colour: RGB | null;
  label: string;
  /** Text under the swatch, e.g. the exact RGB values. */
  footer?: string;
  className?: string;
}

export function Swatch({ colour, label, footer, className }: SwatchProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div
        role="img"
        aria-label={colour ? `${label}: ${toCss(colour)}` : label}
        className="h-24 w-full rounded-xl bg-muted ring-1 ring-foreground/15"
        style={colour ? { backgroundColor: toCss(colour) } : undefined}
      />
      {footer && (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{footer}</span>
      )}
    </div>
  );
}

interface ColourCompareProps {
  target: RGB;
  best: RGB | null;
  bestScore: number;
}

/** Target and best try side by side with their exact RGB values. */
export function ColourCompare({ target, best, bestScore }: ColourCompareProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Swatch colour={target} label="Target" footer={rgbLabel(target)} />
      <Swatch colour={best} label={`Yours · ${bestScore}%`} footer={best ? rgbLabel(best) : ""} />
    </div>
  );
}

interface TriesListProps {
  guesses: readonly RGB[];
  hints: readonly (readonly Hint[])[];
  scores: readonly number[];
}

export function TriesList({ guesses, hints, scores }: TriesListProps) {
  if (guesses.length === 0) return null;
  return (
    <ol className="space-y-1.5" aria-label="Your tries">
      {guesses.map((guess, index) => (
        <li key={index} className="flex items-center gap-3 text-sm">
          <span className="w-10 text-muted-foreground">Try {index + 1}</span>
          <span
            className="size-6 shrink-0 rounded-md ring-1 ring-foreground/15"
            style={{ backgroundColor: toCss(guess) }}
            aria-hidden="true"
          />
          <span className="w-12 font-mono font-semibold tabular-nums">{scores[index]}%</span>
          <span className="font-mono tracking-[0.3em]" aria-label={`hints ${hintsToSymbols(hints[index])}`}>
            {hintsToSymbols(hints[index])}
          </span>
        </li>
      ))}
    </ol>
  );
}
