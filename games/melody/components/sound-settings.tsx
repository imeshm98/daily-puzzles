"use client";

import { Volume2 } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_VOLUME, getVolume, playNote, setVolume, subscribeVolume } from "../audio";

const TEST_NOTE = "A4";

/**
 * Sound section of the Melody how-to-play dialog: a loudness warning, the
 * volume slider (remembered in localStorage) and a "Test sound" button.
 */
export function MelodySoundSettings() {
  const volume = useSyncExternalStore(subscribeVolume, getVolume, () => DEFAULT_VOLUME);
  const sliderId = useId();
  const headingId = `${sliderId}-heading`;
  const percent = Math.round(volume * 100);

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm"
    >
      <p id={headingId} className="font-semibold">
        <span aria-hidden="true">🔊</span> Turn your volume up or use headphones.
      </p>
      <p className="text-muted-foreground">
        On an iPhone the ring/silent switch must also be off, otherwise the game stays silent.
      </p>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor={sliderId} className="font-medium">
            Volume
          </label>
          <span className="text-muted-foreground tabular-nums">{percent}%</span>
        </div>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          onChange={(event) => setVolume(Number(event.target.value) / 100)}
          // Preview the new level when the slider is released.
          onPointerUp={() => playNote(TEST_NOTE)}
          onKeyUp={() => playNote(TEST_NOTE)}
          className="h-11 w-full cursor-pointer accent-primary"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full text-base"
        onClick={() => playNote(TEST_NOTE)}
      >
        <Volume2 />
        Test sound
      </Button>
    </section>
  );
}
