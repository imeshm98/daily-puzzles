"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GameShell, useGameShell } from "@/components/game-shell";
import { ResultDialog } from "@/components/result-dialog";
import { Button } from "@/components/ui/button";
import { colourMixConfig } from "../config";
import { bestScore, isWinningScore, MAX_TRIES, type RGB } from "../logic";
import { useColourMixStore } from "../store";
import { RgbSliders } from "./rgb-sliders";
import { ColourCompare, Swatch, TriesList } from "./swatches";

/** Entry point rendered by app/games/colourmix/page.tsx. */
export function ColourMixGame() {
  return (
    <GameShell game={colourMixConfig}>
      <ColourMixPlay />
    </GameShell>
  );
}

function ColourMixPlay() {
  const { stats, record, dialogOpen, mode, practice, hasPractice, startPractice, nextPractice } =
    useGameShell<RGB>();

  const hydrated = useColourMixStore((state) => state.hydrated);
  const status = useColourMixStore((state) => state.status);
  const puzzleNumber = useColourMixStore((state) => state.puzzleNumber);
  const target = useColourMixStore((state) => state.target);
  const current = useColourMixStore((state) => state.current);
  const guesses = useColourMixStore((state) => state.guesses);
  const hints = useColourMixStore((state) => state.hints);
  const scores = useColourMixStore((state) => state.scores);
  const init = useColourMixStore((state) => state.init);
  const startPracticeRound = useColourMixStore((state) => state.startPractice);
  const setChannel = useColourMixStore((state) => state.setChannel);

  // null = not decided yet: open automatically when today's puzzle is already finished.
  const [resultOpen, setResultOpen] = useState<boolean | null>(null);

  // Load the daily puzzle, or the current practice round when the shell hands one over.
  useEffect(() => {
    if (practice) startPracticeRound(practice.puzzle);
    else init();
  }, [practice, init, startPracticeRound]);

  const isPractice = mode === "practice";
  const finished = status !== "playing";
  const won = status === "won";
  const showResult = resultOpen ?? (hydrated && finished);

  const best = bestScore(scores);
  const bestGuess = guesses[scores.indexOf(best)] ?? null;
  const winningTry = won ? scores.findIndex(isWinningScore) + 1 : undefined;
  const latestHints = hints[hints.length - 1] ?? null;

  const handleSubmit = useCallback(() => {
    const state = useColourMixStore.getState();
    const result = state.submit();
    if (!result) return;
    setResultOpen(false);
    if (result.status === "playing") return;
    // The shell ignores this in practice mode.
    record({
      puzzleNumber: state.puzzleNumber,
      won: result.status === "won",
      tries: result.tries,
    });
    // Let the player see the final hints and swatches before the dialog opens.
    window.setTimeout(() => setResultOpen(true), 700);
  }, [record]);

  /** "Keep playing (practice)" on the daily result, "Next puzzle" in practice. */
  const handlePractice = useCallback(() => {
    setResultOpen(false);
    if (isPractice) nextPractice();
    else startPractice();
  }, [isPractice, nextPractice, startPractice]);

  // Enter submits (arrow keys on a focused slider work natively).
  const keyboardLocked = dialogOpen || showResult;
  useEffect(() => {
    if (keyboardLocked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.tagName === "BUTTON") return; // a focused button keeps its own Enter behaviour
      event.preventDefault();
      handleSubmit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardLocked, handleSubmit]);

  const title = !hydrated
    ? colourMixConfig.name
    : isPractice
      ? `Practice #${practice?.round ?? 1}`
      : `${colourMixConfig.name} #${puzzleNumber}`;

  const progress = !hydrated
    ? ""
    : won
      ? `Matched at ${best}%`
      : finished
        ? `Best ${best}%`
        : `Try ${guesses.length + 1} of ${MAX_TRIES}`;

  const shareText = colourMixConfig.buildShareText({
    puzzleNumber,
    practice: isPractice,
    won,
    bestScore: best,
    hints,
    winningTry,
  });

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span>{progress}</span>
        </div>

        {finished ? (
          <ColourCompare target={target} best={bestGuess} bestScore={best} />
        ) : (
          <>
            <Swatch colour={hydrated ? target : null} label="Target" />
            <Swatch colour={hydrated ? current : null} label="Yours" />
          </>
        )}

        <RgbSliders
          value={current}
          hints={latestHints}
          disabled={!hydrated || finished}
          onChange={setChannel}
        />

        <TriesList guesses={guesses} hints={hints} scores={scores} />

        <div className="mt-auto pt-2 sm:mt-2">
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
            <Button
              size="lg"
              className="h-12 w-full text-base font-semibold"
              disabled={!hydrated}
              onClick={(event) => {
                event.currentTarget.blur();
                handleSubmit();
              }}
            >
              Submit
            </Button>
          )}
        </div>
      </div>

      <ResultDialog
        open={showResult}
        onOpenChange={setResultOpen}
        gameName={colourMixConfig.name}
        puzzleNumber={puzzleNumber}
        mode={mode}
        won={won}
        tries={winningTry ?? guesses.length}
        maxTries={MAX_TRIES}
        shareText={shareText}
        stats={stats}
        onPractice={hasPractice ? handlePractice : undefined}
      >
        <ColourCompare target={target} best={bestGuess} bestScore={best} />
      </ResultDialog>
    </>
  );
}
