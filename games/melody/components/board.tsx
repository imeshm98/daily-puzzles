"use client";

import type { HTMLAttributes } from "react";
import type { GameStatus } from "@/lib/daily-state";
import { cn } from "@/lib/utils";
import { MAX_TRIES, MELODY_LENGTH, NOTE_LABELS, type Mark, type Note } from "../logic";

/** Which sequence is sounding right now and which note of it is playing. */
export interface Playback {
  kind: "melody" | "guess" | "answer";
  index: number | null;
}

interface BoardProps {
  guesses: Note[][];
  marks: Mark[][];
  current: Note[];
  status: GameStatus;
  /** The answer, shown under the board after a loss. */
  reveal: Note[] | null;
  playback: Playback | null;
}

const MARK_CLASSES: Record<Mark, string> = {
  correct: "bg-correct text-white",
  present: "bg-present text-black",
  absent: "bg-absent text-white",
};

const MARK_LABELS: Record<Mark, string> = {
  correct: "correct",
  present: "in the melody, wrong position",
  absent: "not in the melody",
};

export function Board({ guesses, marks, current, status, reveal, playback }: BoardProps) {
  const activeRow = status === "playing" ? guesses.length : -1;
  const playingRow = playback?.kind === "guess" ? guesses.length - 1 : -1;

  return (
    <div className="mx-auto w-full max-w-[17rem]">
      <div className="grid gap-1.5" role="grid" aria-label="Your tries">
        {Array.from({ length: MAX_TRIES }, (_, row) => {
          const guess = guesses[row];
          const rowMarks = marks[row];
          return (
            <div key={row} role="row" className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: MELODY_LENGTH }, (_, col) => {
                if (guess && rowMarks) {
                  const mark = rowMarks[col];
                  const label = NOTE_LABELS[guess[col]];
                  return (
                    <Cell
                      key={col}
                      label={label}
                      aria-label={`${label}, ${MARK_LABELS[mark]}`}
                      className={cn(
                        MARK_CLASSES[mark],
                        row === playingRow && playback?.index === col && "scale-110 ring-2 ring-white",
                      )}
                    />
                  );
                }
                if (row === activeRow) {
                  const note = current[col];
                  return (
                    <Cell
                      key={col}
                      label={note ? NOTE_LABELS[note] : ""}
                      aria-label={note ? NOTE_LABELS[note] : "empty"}
                      className={
                        note ? "animate-pop border-2 border-foreground/60" : "border-2 border-border"
                      }
                    />
                  );
                }
                return <Cell key={col} label="" aria-label="empty" className="border-2 border-border/60" />;
              })}
            </div>
          );
        })}
      </div>

      {reveal && (
        <div className="mt-4">
          <p className="mb-1.5 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            The melody was
          </p>
          <div className="grid grid-cols-5 gap-1.5" role="row">
            {reveal.map((note, col) => (
              <Cell
                key={col}
                label={NOTE_LABELS[note]}
                aria-label={NOTE_LABELS[note]}
                className={cn(
                  "bg-correct/25 text-foreground ring-1 ring-correct",
                  playback?.kind === "answer" &&
                    playback.index === col &&
                    "scale-110 bg-correct text-white",
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  className,
  ...rest
}: { label: string; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="gridcell"
      className={cn(
        "flex aspect-square items-center justify-center rounded-md text-xl font-bold transition-transform duration-150 select-none",
        className,
      )}
      {...rest}
    >
      {label}
    </div>
  );
}
