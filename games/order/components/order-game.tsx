"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GameShell, useGameShell } from "@/components/game-shell";
import { ResultDialog } from "@/components/result-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { orderConfig } from "../config";
import { formatValue, getCategory, MAX_TRIES, type OrderCategory, type OrderPuzzle } from "../logic";
import { useOrderStore } from "../store";
import { SortableList } from "./sortable-list";

/** Entry point rendered by app/games/order/page.tsx. */
export function OrderGame() {
  return (
    <GameShell game={orderConfig}>
      <OrderPlay />
    </GameShell>
  );
}

function OrderPlay() {
  const { stats, record, mode, practice, hasPractice, startPractice, nextPractice } =
    useGameShell<OrderPuzzle>();

  const hydrated = useOrderStore((state) => state.hydrated);
  const status = useOrderStore((state) => state.status);
  const puzzleNumber = useOrderStore((state) => state.puzzleNumber);
  const puzzle = useOrderStore((state) => state.puzzle);
  const order = useOrderStore((state) => state.order);
  const correct = useOrderStore((state) => state.correct);
  const guesses = useOrderStore((state) => state.guesses);
  const marks = useOrderStore((state) => state.marks);
  const locked = useOrderStore((state) => state.locked);
  const init = useOrderStore((state) => state.init);
  const startPracticeRound = useOrderStore((state) => state.startPractice);
  const move = useOrderStore((state) => state.move);
  const step = useOrderStore((state) => state.step);

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
  const category = getCategory(puzzle.categoryId) ?? null;
  const lastMarks = marks[marks.length - 1] ?? null;

  const handleSubmit = useCallback(() => {
    const state = useOrderStore.getState();
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
    // Let the colours land before the dialog opens.
    window.setTimeout(() => setResultOpen(true), 900);
  }, [record]);

  /** "Keep playing (practice)" on the daily result, "Next puzzle" in practice. */
  const handlePractice = useCallback(() => {
    setResultOpen(false);
    if (isPractice) nextPractice();
    else startPractice();
  }, [isPractice, nextPractice, startPractice]);

  const title = !hydrated
    ? orderConfig.name
    : isPractice
      ? `Practice #${practice?.round ?? 1}`
      : `${orderConfig.name} #${puzzleNumber}`;

  const progress = !hydrated
    ? ""
    : won
      ? `Solved in ${guesses.length}`
      : finished
        ? "Out of tries"
        : `Try ${guesses.length + 1} of ${MAX_TRIES}`;

  const shareText = orderConfig.buildShareText({ puzzleNumber, practice: isPractice, won, marks });

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span>{progress}</span>
        </div>

        <h2 className="text-center text-lg font-semibold text-balance">
          {hydrated && category ? category.question : " "}
        </h2>

        {hydrated && category ? (
          <>
            <p className="-mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              ↑ {category.lowLabel}
            </p>
            <SortableList
              items={puzzle.items}
              order={order}
              locked={locked}
              lastMarks={lastMarks}
              disabled={finished}
              onMove={move}
              onStep={step}
            />
            <p className="-mt-2 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {category.highLabel} ↓
            </p>
          </>
        ) : (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-14 rounded-xl bg-card ring-1 ring-foreground/10" />
            ))}
          </div>
        )}

        {finished && category && (
          <CorrectOrder puzzle={puzzle} correct={correct} category={category} />
        )}

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
        gameName={orderConfig.name}
        puzzleNumber={puzzleNumber}
        mode={mode}
        won={won}
        tries={guesses.length}
        maxTries={MAX_TRIES}
        shareText={shareText}
        stats={stats}
        onPractice={hasPractice ? handlePractice : undefined}
      >
        {category && <CorrectOrder puzzle={puzzle} correct={correct} category={category} compact />}
      </ResultDialog>
    </>
  );
}

function CorrectOrder({
  puzzle,
  correct,
  category,
  compact = false,
}: {
  puzzle: OrderPuzzle;
  correct: readonly number[];
  category: OrderCategory;
  compact?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        The correct order
      </p>
      <ol className={cn("space-y-1", compact ? "text-sm" : "text-base")}>
        {correct.map((itemIndex, position) => {
          const item = puzzle.items[itemIndex];
          if (!item) return null;
          return (
            <li key={itemIndex} className="flex items-baseline gap-2">
              <span className="w-5 text-right text-muted-foreground tabular-nums">{position + 1}.</span>
              <span className="min-w-0 flex-1">{item.name}</span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {formatValue(item.value, category)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
