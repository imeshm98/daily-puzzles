"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABELS,
  CHANNELS,
  HINT_LABELS,
  HINT_SYMBOLS,
  type Channel,
  type Hint,
  type RGB,
} from "../logic";

const THUMB_COLOURS: Record<Channel, string> = {
  r: "#ef4444",
  g: "#22c55e",
  b: "#3b82f6",
};

interface RgbSlidersProps {
  value: RGB;
  /** Hints from the latest try, or null before the first try. */
  hints: readonly Hint[] | null;
  disabled?: boolean;
  onChange: (channel: Channel, value: number) => void;
}

/** Three big-thumbed range sliders with the value and the latest hint next to each. */
export function RgbSliders({ value, hints, disabled = false, onChange }: RgbSlidersProps) {
  return (
    <div className="space-y-1">
      {CHANNELS.map((channel, index) => {
        const hint = hints?.[index] ?? null;
        return (
          <label key={channel} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-sm font-medium">{CHANNEL_LABELS[channel]}</span>
            <input
              type="range"
              min={0}
              max={255}
              step={1}
              value={value[channel]}
              disabled={disabled}
              onChange={(event) => onChange(channel, Number(event.target.value))}
              aria-label={CHANNEL_LABELS[channel]}
              className="colour-slider min-w-0 flex-1"
              style={{ "--slider-colour": THUMB_COLOURS[channel] } as CSSProperties}
            />
            <span className="w-9 shrink-0 text-right font-mono text-sm tabular-nums">
              {value[channel]}
            </span>
            <span
              className={cn(
                "w-6 shrink-0 text-center text-lg leading-none",
                hint === "close" ? "text-correct" : hint ? "text-present" : "text-transparent",
              )}
              aria-label={hint ? `${CHANNEL_LABELS[channel]}: ${HINT_LABELS[hint]}` : undefined}
              aria-hidden={!hint}
            >
              {hint ? HINT_SYMBOLS[hint] : "•"}
            </span>
          </label>
        );
      })}
    </div>
  );
}
