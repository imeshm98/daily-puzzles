"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { NOTE_LABELS, NOTE_TO_KEY, NOTES, type Note } from "../logic";

interface PianoProps {
  onPress: (note: Note) => void;
  /** Key to light up (a note being played back or just pressed). */
  activeNote: Note | null;
  disabled?: boolean;
}

/** Eight white keys. Reacts on pointer-down so it feels instant on touch screens. */
export function Piano({ onPress, activeNote, disabled = false }: PianoProps) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, note: Note) => {
    if (disabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // No focus ring and no text selection on tap; Enter stays free for Submit.
    event.preventDefault();
    onPress(note);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, note: Note) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onPress(note);
    }
  };

  return (
    <div
      role="group"
      aria-label="Piano keys"
      className="grid touch-none grid-cols-8 gap-1 rounded-lg bg-zinc-900 p-1.5"
    >
      {NOTES.map((note) => (
        <button
          key={note}
          type="button"
          disabled={disabled}
          aria-label={`${NOTE_LABELS[note]} key`}
          onPointerDown={(event) => handlePointerDown(event, note)}
          onKeyDown={(event) => handleKeyDown(event, note)}
          className={cn(
            "flex h-24 flex-col items-center justify-end rounded-t-sm rounded-b-md border-b-4 border-zinc-400 bg-zinc-100 pb-1.5 text-zinc-900 outline-none transition-[transform,background-color,border-width] duration-75 select-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
            activeNote === note && "translate-y-px border-b-2 bg-sky-200",
          )}
        >
          <span className="text-sm font-semibold sm:text-base">{NOTE_LABELS[note]}</span>
          <kbd className="hidden font-mono text-[10px] text-zinc-500 sm:block">
            {NOTE_TO_KEY[note]}
          </kbd>
        </button>
      ))}
    </div>
  );
}
