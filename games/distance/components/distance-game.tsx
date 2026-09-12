"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { GameShell, useGameShell } from "@/components/game-shell";
import { ResultDialog } from "@/components/result-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { distanceConfig } from "../config";
import {
  isWinningScore,
  kmToMiles,
  MAX_SCORE,
  parseGuess,
  ROUNDS,
  scoreBucket,
  squareForError,
  totalPoints,
  type City,
  type DistancePuzzle,
  type RoundResult,
  type Unit,
} from "../logic";
import { useDistanceStore } from "../store";

const formatNumber = (value: number) => Math.round(value).toLocaleString("en-US");

/** "1,234 km" or "767 mi" for a km value. */
function formatDistance(km: number, unit: Unit): string {
  return unit === "mi" ? `${formatNumber(kmToMiles(km))} mi` : `${formatNumber(km)} km`;
}

/** Entry point rendered by app/games/distance/page.tsx. */
export function DistanceGame() {
  return (
    <GameShell game={distanceConfig}>
      <DistancePlay />
    </GameShell>
  );
}

function DistancePlay() {
  const { stats, record, mode, practice, hasPractice, startPractice, nextPractice } =
    useGameShell<DistancePuzzle>();

  const hydrated = useDistanceStore((state) => state.hydrated);
  const status = useDistanceStore((state) => state.status);
  const puzzleNumber = useDistanceStore((state) => state.puzzleNumber);
  const puzzle = useDistanceStore((state) => state.puzzle);
  const results = useDistanceStore((state) => state.results);
  const phase = useDistanceStore((state) => state.phase);
  const input = useDistanceStore((state) => state.input);
  const unit = useDistanceStore((state) => state.unit);
  const init = useDistanceStore((state) => state.init);
  const startPracticeRound = useDistanceStore((state) => state.startPractice);
  const setInput = useDistanceStore((state) => state.setInput);
  const setUnit = useDistanceStore((state) => state.setUnit);
  const nextRound = useDistanceStore((state) => state.nextRound);

  // null = not decided yet: open automatically when today's puzzle is already finished.
  const [resultOpen, setResultOpen] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the daily puzzle, or the current practice round when the shell hands one over.
  useEffect(() => {
    if (practice) startPracticeRound(practice.puzzle);
    else init();
  }, [practice, init, startPracticeRound]);

  const isPractice = mode === "practice";
  const finished = status !== "playing";
  const won = status === "won";
  const total = totalPoints(results);
  const reviewing = phase === "reviewing";
  // The dialog waits until the player leaves the last round's review.
  const showResult = resultOpen ?? (hydrated && finished && !reviewing);

  const roundIndex = reviewing ? results.length - 1 : results.length;
  const round = puzzle.rounds[roundIndex] ?? puzzle.rounds[puzzle.rounds.length - 1] ?? null;
  const lastResult = reviewing ? results[results.length - 1] : null;

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const state = useDistanceStore.getState();
      const result = state.submit();
      if (!result) return;
      const after = useDistanceStore.getState();
      if (after.status !== "playing") {
        // The shell ignores this in practice mode.
        record({
          puzzleNumber: after.puzzleNumber,
          won: after.status === "won",
          tries: scoreBucket(totalPoints(after.results)),
        });
      }
    },
    [record],
  );

  const handleNext = useCallback(() => {
    const state = useDistanceStore.getState();
    nextRound();
    if (state.status !== "playing") setResultOpen(true);
    else window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [nextRound]);

  /** "Keep playing (practice)" on the daily result, "Next puzzle" in practice. */
  const handlePractice = useCallback(() => {
    setResultOpen(false);
    if (isPractice) nextPractice();
    else startPractice();
  }, [isPractice, nextPractice, startPractice]);

  const title = !hydrated
    ? distanceConfig.name
    : isPractice
      ? `Practice #${practice?.round ?? 1}`
      : `${distanceConfig.name} #${puzzleNumber}`;

  const progress = !hydrated
    ? ""
    : finished
      ? `${total}/${MAX_SCORE}`
      : `Round ${Math.min(roundIndex + 1, ROUNDS)} of ${ROUNDS} · ${total} pts`;

  const shareText = distanceConfig.buildShareText({ puzzleNumber, practice: isPractice, results });
  const resultTitle =
    total >= 450 ? "Globetrotter!" : total >= 350 ? "Well travelled!" : total >= 200 ? "Not bad!" : "Lost at sea";
  const canSubmit = hydrated && !finished && !reviewing && parseGuess(input) !== null;

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span>{progress}</span>
        </div>

        <RoundSquares results={results} />

        {round && hydrated ? (
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="mb-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              How far is it from
            </p>
            <CityLine city={round.from} />
            <p className="my-2 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              to
            </p>
            <CityLine city={round.to} />
          </div>
        ) : (
          <div className="h-40 rounded-xl bg-card ring-1 ring-foreground/10" aria-hidden="true" />
        )}

        {lastResult && round ? (
          <RoundReview result={lastResult} unit={unit} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-stretch gap-2">
              <label className="sr-only" htmlFor="distance-guess">
                Your guess in {unit === "mi" ? "miles" : "kilometres"}
              </label>
              <input
                id="distance-guess"
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9., ]*"
                autoComplete="off"
                enterKeyHint="go"
                placeholder="0"
                value={input}
                disabled={!hydrated || finished}
                onChange={(event) => setInput(event.target.value)}
                className="h-14 min-w-0 flex-1 rounded-xl bg-input/30 px-4 text-right text-2xl font-bold tabular-nums ring-1 ring-foreground/15 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
              <UnitToggle unit={unit} onChange={setUnit} />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base font-semibold"
              disabled={!canSubmit}
            >
              Submit
            </Button>
          </form>
        )}

        <div className="mt-auto pt-2">
          {reviewing ? (
            <Button
              size="lg"
              className="h-12 w-full text-base font-semibold"
              onClick={(event) => {
                event.currentTarget.blur();
                handleNext();
              }}
            >
              {results.length >= ROUNDS ? "See results" : "Next round"}
              <ArrowRight />
            </Button>
          ) : finished ? (
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
          ) : null}
        </div>
      </div>

      <ResultDialog
        open={showResult}
        onOpenChange={setResultOpen}
        gameName={distanceConfig.name}
        puzzleNumber={puzzleNumber}
        mode={mode}
        won={won}
        tries={scoreBucket(total)}
        maxTries={ROUNDS}
        title={resultTitle}
        scoreLabel={`${total}/${MAX_SCORE}`}
        distributionLabel={distanceConfig.distributionLabel}
        shareText={shareText}
        stats={stats}
        onPractice={hasPractice ? handlePractice : undefined}
      >
        <RoundsSummary puzzle={puzzle} results={results} unit={unit} />
      </ResultDialog>
    </>
  );
}

function CityLine({ city }: { city: City }) {
  return (
    <p className="text-center">
      <span className="text-2xl" aria-hidden="true">
        {city.flag}
      </span>{" "}
      <span className="text-xl font-bold">{city.name}</span>
      <span className="block text-sm text-muted-foreground">{city.country}</span>
    </p>
  );
}

function UnitToggle({ unit, onChange }: { unit: Unit; onChange: (unit: Unit) => void }) {
  return (
    <div className="flex overflow-hidden rounded-xl ring-1 ring-foreground/15" role="group" aria-label="Unit">
      {(["km", "mi"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={unit === option}
          onClick={() => onChange(option)}
          className={cn(
            "w-14 text-sm font-semibold transition-colors",
            unit === option ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function RoundSquares({ results }: { results: readonly RoundResult[] }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label="Rounds">
      {Array.from({ length: ROUNDS }, (_, index) => {
        const result = results[index];
        return (
          <span
            key={index}
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-md text-xs font-bold tabular-nums",
              !result && "bg-muted text-muted-foreground",
              result && squareForError(result.errorPercent) === "🟩" && "bg-correct text-white",
              result && squareForError(result.errorPercent) === "🟨" && "bg-present text-black",
              result && squareForError(result.errorPercent) === "🟥" && "bg-red-700 text-white",
            )}
            aria-label={result ? `Round ${index + 1}: ${result.points} points` : `Round ${index + 1}`}
          >
            {result ? result.points : index + 1}
          </span>
        );
      })}
    </div>
  );
}

function RoundReview({ result, unit }: { result: RoundResult; unit: Unit }) {
  const square = squareForError(result.errorPercent);
  return (
    <div className="space-y-2 rounded-xl bg-card p-4 text-center ring-1 ring-foreground/10">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Real distance
      </p>
      <p className="text-3xl font-bold tabular-nums">{formatDistance(result.actualKm, unit)}</p>
      <p className="text-sm text-muted-foreground">
        You said {formatDistance(result.guessKm, unit)} · {result.errorPercent.toFixed(1)}% off
      </p>
      <p className="text-lg font-semibold">
        <span aria-hidden="true">{square}</span> {result.points} points
      </p>
    </div>
  );
}

function RoundsSummary({
  puzzle,
  results,
  unit,
}: {
  puzzle: DistancePuzzle;
  results: readonly RoundResult[];
  unit: Unit;
}) {
  return (
    <ol className="space-y-2 text-sm">
      {results.map((result, index) => {
        const round = puzzle.rounds[index];
        if (!round) return null;
        return (
          <li key={index} className="flex items-center gap-2">
            <span aria-hidden="true">{squareForError(result.errorPercent)}</span>
            <span className="min-w-0 flex-1 truncate">
              {round.from.flag} {round.from.name} → {round.to.flag} {round.to.name}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatDistance(result.actualKm, unit)}
            </span>
            <span className="w-8 text-right font-semibold tabular-nums">{result.points}</span>
          </li>
        );
      })}
      <li className="flex justify-end gap-2 border-t border-border pt-2 font-semibold">
        <span>Total</span>
        <span className={cn("tabular-nums", isWinningScore(totalPoints(results)) && "text-correct")}>
          {totalPoints(results)}/{MAX_SCORE}
        </span>
      </li>
    </ol>
  );
}
