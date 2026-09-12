"use client";

import { ArrowRight, Delete, Play, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, useGameShell } from "@/components/game-shell";
import { ResultDialog } from "@/components/result-dialog";
import { Button } from "@/components/ui/button";
import { playNote, playSequence, unlockAudio, type SequenceHandle } from "../audio";
import { melodyConfig } from "../config";
import { KEY_TO_NOTE, MAX_TRIES, MELODY_LENGTH, NOTE_LABELS, type Note } from "../logic";
import { useMelodyStore } from "../store";
import { Board, type Playback } from "./board";
import { Piano } from "./piano";
import { MelodySoundSettings } from "./sound-settings";

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Entry point rendered by app/games/melody/page.tsx. */
export function MelodyGame() {
  return (
    <GameShell game={melodyConfig} helpExtra={<MelodySoundSettings />}>
      <MelodyPlay />
    </GameShell>
  );
}

function MelodyPlay() {
  const { stats, record, dialogOpen, mode, practice, hasPractice, startPractice, nextPractice } =
    useGameShell<Note[]>();

  const hydrated = useMelodyStore((state) => state.hydrated);
  const status = useMelodyStore((state) => state.status);
  const puzzleNumber = useMelodyStore((state) => state.puzzleNumber);
  const guesses = useMelodyStore((state) => state.guesses);
  const marks = useMelodyStore((state) => state.marks);
  const current = useMelodyStore((state) => state.current);
  const answer = useMelodyStore((state) => state.answer);
  const init = useMelodyStore((state) => state.init);
  const startPracticeRound = useMelodyStore((state) => state.startPractice);

  const [playback, setPlayback] = useState<Playback | null>(null);
  const [flashNote, setFlashNote] = useState<Note | null>(null);
  // null = not decided yet: open automatically when today's puzzle is already finished.
  const [resultOpen, setResultOpen] = useState<boolean | null>(null);
  const sequenceRef = useRef<SequenceHandle | null>(null);
  const flashTimer = useRef(0);

  // Load the daily puzzle, or the current practice round when the shell hands one over.
  useEffect(() => {
    if (practice) startPracticeRound(practice.puzzle);
    else init();
  }, [practice, init, startPracticeRound]);

  const isPractice = mode === "practice";
  const finished = status !== "playing";
  const won = status === "won";
  const showResult = resultOpen ?? (hydrated && finished);

  const stopPlayback = useCallback(() => {
    sequenceRef.current?.cancel();
    sequenceRef.current = null;
    setPlayback(null);
  }, []);

  // Stop any sound when leaving the page.
  useEffect(() => stopPlayback, [stopPlayback]);

  // Create and resume the shared AudioContext on the first user gesture, so the
  // first note (even one scheduled from a touch pointerdown) plays without delay.
  useEffect(() => {
    const events = ["pointerup", "touchend", "keydown"] as const;
    const unlock = () => {
      unlockAudio();
      events.forEach((name) => window.removeEventListener(name, unlock));
    };
    events.forEach((name) => window.addEventListener(name, unlock, { passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, unlock));
  }, []);

  /** Plays a sequence; `highlight` lights up the keys and cells as it goes. */
  const play = useCallback(
    (kind: Playback["kind"], notes: readonly Note[], highlight: boolean) => {
      stopPlayback();
      const handle = playSequence(
        notes,
        highlight ? (index) => setPlayback({ kind, index }) : undefined,
      );
      sequenceRef.current = handle;
      setPlayback({ kind, index: null });
      return handle.done.then(() => {
        if (sequenceRef.current === handle) {
          sequenceRef.current = null;
          setPlayback(null);
        }
      });
    },
    [stopPlayback],
  );

  // The target melody is never highlighted on the keys: the player must use their ears.
  const playMelody = useCallback(() => {
    const notes = useMelodyStore.getState().answer;
    if (notes.length === 0) return;
    void play("melody", notes, false);
  }, [play]);

  const handlePress = useCallback(
    (note: Note) => {
      const state = useMelodyStore.getState();
      if (!state.hydrated || state.status !== "playing") return;
      if (state.current.length >= MELODY_LENGTH) return;
      stopPlayback();
      playNote(note);
      state.pressNote(note);
      setFlashNote(note);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashNote(null), 140);
    },
    [stopPlayback],
  );

  const handleUndo = useCallback(() => {
    useMelodyStore.getState().undo();
  }, []);

  const handleSubmit = useCallback(async () => {
    const state = useMelodyStore.getState();
    const result = state.submit();
    if (!result) return;

    setResultOpen(false);
    if (result.status !== "playing") {
      // The shell ignores this in practice mode.
      record({
        puzzleNumber: state.puzzleNumber,
        won: result.status === "won",
        tries: result.tries,
      });
    }

    // Play the try back so the player can hear the difference.
    await play("guess", result.guess, true);
    if (result.status === "playing") return;

    if (result.status === "lost") {
      await delay(600);
      await play("answer", state.answer, true);
    }
    await delay(500);
    setResultOpen(true);
  }, [play, record]);

  /** "Keep playing (practice)" on the daily result, "Next puzzle" in practice. */
  const handlePractice = useCallback(() => {
    stopPlayback();
    setResultOpen(false);
    if (isPractice) nextPractice();
    else startPractice();
  }, [stopPlayback, isPractice, nextPractice, startPractice]);

  // Computer keyboard: A S D F G H J K = notes, Backspace = undo, Enter = submit.
  const keyboardLocked = dialogOpen || showResult;
  useEffect(() => {
    if (keyboardLocked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const note = KEY_TO_NOTE[event.key.toLowerCase()];
      if (note) {
        event.preventDefault();
        handlePress(note);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (event.key === "Enter") {
        // A focused button keeps its own Enter behaviour.
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardLocked, handlePress, handleUndo, handleSubmit]);

  const playbackNotes = playback?.kind === "answer" ? answer : guesses[guesses.length - 1];
  const playbackNote =
    playback && playback.index !== null ? (playbackNotes?.[playback.index] ?? null) : null;
  const activeNote = playbackNote ?? flashNote;

  const canUndo = hydrated && !finished && current.length > 0;
  const canSubmit = hydrated && !finished && current.length === MELODY_LENGTH;
  const playingMelody = playback?.kind === "melody";

  const title = !hydrated
    ? melodyConfig.name
    : isPractice
      ? `Practice #${practice?.round ?? 1}`
      : `${melodyConfig.name} #${puzzleNumber}`;

  const progress = !hydrated
    ? ""
    : won
      ? `Solved in ${guesses.length}`
      : finished
        ? "Out of tries"
        : `Try ${guesses.length + 1} of ${MAX_TRIES}`;

  const shareText = melodyConfig.buildShareText({
    puzzleNumber,
    practice: isPractice,
    won,
    marks,
  });

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span>{progress}</span>
        </div>

        <Button
          size="lg"
          className="h-12 w-full text-base font-semibold"
          onClick={(event) => {
            // Drop focus so Enter goes to Submit, not back to this button.
            event.currentTarget.blur();
            playMelody();
          }}
          disabled={!hydrated}
        >
          {playingMelody ? <Volume2 className="animate-pulse" /> : <Play />}
          {playingMelody ? "Playing…" : "Play melody"}
        </Button>

        <Board
          guesses={guesses}
          marks={marks}
          current={current}
          status={status}
          reveal={status === "lost" ? answer : null}
          playback={playback}
        />

        {/* Piano hugs the bottom on phones (thumb reach), sits under the board on wide screens. */}
        <div className="mt-auto flex flex-col gap-3 pt-2 sm:mt-4">
          <Piano onPress={handlePress} activeNote={activeNote} disabled={!hydrated || finished} />
          {finished ? (
            isPractice ? (
              <Button
                size="lg"
                className="h-12 w-full text-base font-semibold"
                onClick={handlePractice}
              >
                Next puzzle
                <ArrowRight />
              </Button>
            ) : (
              <Button
                size="lg"
                className="h-12 w-full text-base font-semibold"
                onClick={() => setResultOpen(true)}
              >
                See results
              </Button>
            )
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                className="h-12 text-base"
                disabled={!canUndo}
                onClick={(event) => {
                  event.currentTarget.blur();
                  handleUndo();
                }}
              >
                <Delete />
                Undo
              </Button>
              <Button
                size="lg"
                className="h-12 text-base font-semibold"
                disabled={!canSubmit}
                onClick={(event) => {
                  event.currentTarget.blur();
                  void handleSubmit();
                }}
              >
                Submit
              </Button>
            </div>
          )}
        </div>
      </div>

      <ResultDialog
        open={showResult}
        onOpenChange={setResultOpen}
        gameName={melodyConfig.name}
        puzzleNumber={puzzleNumber}
        mode={mode}
        won={won}
        tries={guesses.length}
        maxTries={MAX_TRIES}
        shareText={shareText}
        stats={stats}
        onPractice={hasPractice ? handlePractice : undefined}
      >
        <MelodyReveal
          notes={answer}
          won={won}
          onPlay={() => void play("melody", answer, false)}
        />
      </ResultDialog>
    </>
  );
}

function MelodyReveal({
  notes,
  won,
  onPlay,
}: {
  notes: Note[];
  won: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="space-y-2 text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {won ? "The melody" : "The melody was"}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        {notes.map((note, index) => (
          <span
            key={index}
            className="flex size-9 items-center justify-center rounded-md bg-correct text-sm font-bold text-white"
          >
            {NOTE_LABELS[note]}
          </span>
        ))}
        <Button
          variant="outline"
          size="icon"
          className="ml-1 size-9"
          aria-label="Play the melody"
          onClick={onPlay}
        >
          <Play />
        </Button>
      </div>
    </div>
  );
}
