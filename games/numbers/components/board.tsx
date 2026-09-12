"use client";

import { cn } from "@/lib/utils";
import { formatStep, OPERATORS, TILE_COUNT, type Operator, type Step } from "../logic";
import type { Tile } from "../store";

interface TileGridProps {
  tiles: Tile[];
  selectedTile: number | null;
  disabled?: boolean;
  onTap: (id: number) => void;
}

/** Big tappable number tiles. Result tiles (made by the player) look slightly different. */
export function TileGrid({ tiles, selectedTile, disabled = false, onTap }: TileGridProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Number tiles">
      {tiles.map((tile) => {
        const selected = tile.id === selectedTile;
        const isResult = tile.id >= TILE_COUNT;
        return (
          <button
            key={tile.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={`${tile.value}${isResult ? ", result" : ""}`}
            onClick={(event) => {
              event.currentTarget.blur();
              onTap(tile.id);
            }}
            className={cn(
              "animate-pop h-16 min-w-16 flex-1 basis-0 rounded-xl px-2 text-2xl font-bold tabular-nums ring-1 transition-colors select-none max-w-20 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              selected
                ? "bg-primary text-primary-foreground ring-primary"
                : isResult
                  ? "bg-secondary text-secondary-foreground ring-foreground/20"
                  : "bg-card text-card-foreground ring-foreground/15",
            )}
          >
            {tile.value}
          </button>
        );
      })}
    </div>
  );
}

interface OperatorRowProps {
  selectedOp: Operator | null;
  disabled?: boolean;
  onTap: (op: Operator) => void;
}

const OPERATOR_LABELS: Record<Operator, string> = {
  "+": "plus",
  "-": "minus",
  "×": "times",
  "÷": "divided by",
};

export function OperatorRow({ selectedOp, disabled = false, onTap }: OperatorRowProps) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Operators">
      {OPERATORS.map((op) => {
        const selected = op === selectedOp;
        return (
          <button
            key={op}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={OPERATOR_LABELS[op]}
            onClick={(event) => {
              event.currentTarget.blur();
              onTap(op);
            }}
            className={cn(
              "h-14 rounded-xl text-2xl font-bold ring-1 transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
              selected
                ? "bg-present text-black ring-present"
                : "bg-muted text-foreground ring-foreground/15",
            )}
          >
            {op}
          </button>
        );
      })}
    </div>
  );
}

interface StepsListProps {
  steps: readonly Step[];
  /** How many steps to show (for the step-by-step solution reveal). */
  visible?: number;
  label?: string;
  className?: string;
}

export function StepsList({ steps, visible, label, className }: StepsListProps) {
  const shown = visible === undefined ? steps : steps.slice(0, visible);
  if (shown.length === 0 && !label) return null;
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      )}
      <ol className="space-y-1 font-mono text-sm tabular-nums">
        {shown.map((step, index) => (
          <li key={index} className="animate-pop flex items-center gap-3">
            <span className="w-4 text-muted-foreground">{index + 1}</span>
            <span>{formatStep(step)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
