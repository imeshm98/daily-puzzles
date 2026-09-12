"use client";

import { ArrowRight, Lightbulb, RotateCcw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, useGameShell } from "@/components/game-shell";
import { ResultDialog } from "@/components/result-dialog";
import { Button } from "@/components/ui/button";
import { numbersConfig } from "../config";
import { MAX_STEPS, type NumbersPuzzle, type Operator } from "../logic";
import { useNumbersStore } from "../store";
import { OperatorRow, StepsList, TileGrid } from "./board";

const KEY_TO_OPERATOR: Record<string, Operator> = {
  "+": "+",
  "-": "-",
  "*": "×",
  x: "×",
  "/": "÷",
};

/** Entry point rendered by app/games/numbers/page.tsx. */
export function NumbersGame() {
  return (
    <GameShell game={numbersConfig}>
      <NumbersPlay />
    </GameShell>
  );
}

function NumbersPlay() {
  const { stats, record, dialogOpen, mode, practice, hasPractice, startPractice, nextPractice } =
    useGameShell<NumbersPuzzle>();

  const hydrated = useNumbersStore((state) => state.hydrated);
  const status = useNumbersStore((state) => state.status);
  const puzzleNumber = useNumbersStore((state) => state.puzzleNumber);
  const puzzle = useNumbersStore((state) => state.puzzle);
  const tiles = useNumbersStore((state) => state.tiles);
  const steps = useNumbersStore((state) => state.steps);
  const selectedTile = useNumbersStore((state) => state.selectedTile);
  const selectedOp = useNumbersStore((state) => state.selectedOp);
  const error = useNumbersStore((state) => state.error);
  const solution = useNumbersStore((state) => state.solution);
  const init = useNumbersStore((state) => state.init);
  const startPracticeRound = useNumbersStore((state) => state.startPractice);
  const tapTile = useNumbersStore((state) => state.tapTile);
  const tapOperator = useNumbersStore((state) => state.tapOperator);

  // null = not decided yet: open automatically when today's puzzle is already finished.
  const [resultOpen, setResultOpen] = useState<boolean | null>(null);
  // Steps of the solution shown so far. Infinity = all (after a reload).
  const [revealed, setRevealed] = useState(Number.POSITIVE_INFINITY);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  // Load the daily puzzle, or the current practice round when the shell hands one over.
  useEffect(() => {
    if (practice) startPracticeRound(practice.puzzle);
    else init();
  }, [practice, init, startPracticeRound]);

  const isPractice = mode === "practice";
  const finished = status !== "playing";
  const won = status === "won";
  const showResult = resultOpen ?? (hydrated && finished);

  // Win detection: the store flips status; record it once here.
  const lastRecorded = useRef<string>("");
  useEffect(() => {
    if (!hydrated || status !== "won") return;
    const key = `${mode}:${puzzleNumber}:${steps.length}`;
    if (lastRecorded.current === key) return;
    lastRecorded.current = key;
    record({ puzzleNumber, won: true, tries: steps.length });
  }, [hydrated, status, mode, puzzleNumber, steps.length, record]);

  const handleWinDialog = useCallback(() => {
    clearTimers();
    timers.current.push(window.setTimeout(() => setResultOpen(true), 600));
  }, [clearTimers]);

  const handleTapTile = useCallback(
    (id: number) => {
      const before = useNumbersStore.getState().status;
      tapTile(id);
      if (before === "playing" && useNumbersStore.getState().status === "won") {
        setResultOpen(false);
        handleWinDialog();
      }
    },
    [tapTile, handleWinDialog],
  );

  const handleShowSolution = useCallback(() => {
    const state = useNumbersStore.getState();
    if (state.status !== "playing") return;
    const shown = state.showSolution();
    record({ puzzleNumber: state.puzzleNumber, won: false, tries: MAX_STEPS });
    // Reveal one step at a time, then open the result.
    setResultOpen(false);
    setRevealed(0);
    clearTimers();
    shown.forEach((_, index) => {
      timers.current.push(window.setTimeout(() => setRevealed(index + 1), 500 + index * 900));
    });
    timers.current.push(
      window.setTimeout(() => setResultOpen(true), 500 + shown.length * 900 + 400),
    );
  }, [record, clearTimers]);

  /** "Keep playing (practice)" on the daily result, "Next puzzle" in practice. */
  const handlePractice = useCallback(() => {
    clearTimers();
    setResultOpen(false);
    setRevealed(Number.POSITIVE_INFINITY);
    if (isPractice) nextPractice();
    else startPractice();
  }, [clearTimers, isPractice, nextPractice, startPractice]);

  // Keyboard: + - * / pick an operator, Backspace undoes, Escape clears the selection.
  const keyboardLocked = dialogOpen || showResult;
  useEffect(() => {
    if (keyboardLocked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const store = useNumbersStore.getState();
      const op = KEY_TO_OPERATOR[event.key.toLowerCase()];
      if (op) {
        event.preventDefault();
        store.tapOperator(op);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        store.undo();
      } else if (event.key === "Escape") {
        store.clearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardLocked]);

  const title = !hydrated
    ? numbersConfig.name
    : isPractice
      ? `Practice #${practice?.round ?? 1}`
      : `${numbersConfig.name} #${puzzleNumber}`;

  const progress = !hydrated
    ? ""
    : won
      ? `Solved in ${steps.length} · par ${puzzle.par}`
      : finished
        ? `Par ${puzzle.par}`
        : `${steps.length} ${steps.length === 1 ? "step" : "steps"} · par ${puzzle.par}`;

  const shareText = numbersConfig.buildShareText({
    puzzleNumber,
    practice: isPractice,
    won,
    steps,
    par: puzzle.par,
  });

  const resultTitle = won
    ? steps.length <= puzzle.par
      ? "Perfect!"
      : "Solved!"
    : "Here is a solution";
  const scoreLabel = won ? `${steps.length} steps (par ${puzzle.par})` : `par ${puzzle.par}`;

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span>{progress}</span>
        </div>

        <div className="text-center">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Target
          </p>
          <p className="text-5xl font-bold tabular-nums">{hydrated ? puzzle.target : "—"}</p>
        </div>

        <TileGrid
          tiles={tiles}
          selectedTile={selectedTile}
          disabled={!hydrated || finished}
          onTap={handleTapTile}
        />

        <OperatorRow
          selectedOp={selectedOp}
          disabled={!hydrated || finished || selectedTile === null}
          onTap={tapOperator}
        />

        <p className="h-5 text-center text-sm text-present" role="status" aria-live="polite">
          {error ?? ""}
        </p>

        <StepsList steps={steps} label={steps.length > 0 ? "Your steps" : undefined} />

        {status === "lost" && solution && (
          <StepsList steps={solution} visible={revealed} label="One solution" />
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:mt-2">
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
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 text-base"
                  disabled={!hydrated || steps.length === 0}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    useNumbersStore.getState().undo();
                  }}
                >
                  <Undo2 />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 text-base"
                  disabled={!hydrated || steps.length === 0}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    useNumbersStore.getState().reset();
                  }}
                >
                  <RotateCcw />
                  Reset
                </Button>
              </div>
              <Button
                variant="ghost"
                size="lg"
                className="h-11 w-full text-muted-foreground"
                disabled={!hydrated}
                onClick={(event) => {
                  event.currentTarget.blur();
                  handleShowSolution();
                }}
              >
                <Lightbulb />
                Show a solution
              </Button>
            </>
          )}
        </div>
      </div>

      <ResultDialog
        open={showResult}
        onOpenChange={setResultOpen}
        gameName={numbersConfig.name}
        puzzleNumber={puzzleNumber}
        mode={mode}
        won={won}
        tries={won ? steps.length : MAX_STEPS}
        maxTries={MAX_STEPS}
        title={resultTitle}
        scoreLabel={scoreLabel}
        distributionLabel={numbersConfig.distributionLabel}
        shareText={shareText}
        stats={stats}
        onPractice={hasPractice ? handlePractice : undefined}
      >
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Target <span className="font-bold text-foreground tabular-nums">{puzzle.target}</span>
            {" · "}tiles {puzzle.tiles.join(", ")}
          </p>
          <StepsList steps={won ? steps : (solution ?? [])} label={won ? "Your steps" : "One solution"} />
        </div>
      </ResultDialog>
    </>
  );
}
