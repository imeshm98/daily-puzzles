"use client";

import { ArrowLeft, ChartNoAxesColumn, CircleQuestionMark } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { HowToPlayDialog } from "@/components/how-to-play-dialog";
import { StatsDialog } from "@/components/stats-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { GameConfig, GameMode } from "@/lib/game-config";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useReloadOnNewDay } from "@/lib/hooks/use-reload-on-new-day";
import type { GameResult, GameStats } from "@/lib/stats";
import { useGameStats, useStatsStore } from "@/lib/stats-store";
import { readFlag, storageKey, writeFlag } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** The current practice round. A new object means a new puzzle. */
export interface PracticeState<TPuzzle = unknown> {
  puzzle: TPuzzle;
  /** 1-based round counter, shown as "Practice #n". */
  round: number;
}

interface GameShellContextValue<TPuzzle = unknown> {
  game: GameConfig;
  /** Daily stats for this game. Empty until hydrated on the client. */
  stats: GameStats;
  hydrated: boolean;
  /** Record a finished daily puzzle. Ignored in practice mode and for repeats. */
  record: (result: GameResult) => void;
  openHelp: () => void;
  openStats: () => void;
  /** True while the help or stats dialog is open: games should ignore keyboard input. */
  dialogOpen: boolean;
  /** "daily" or "practice". Practice never touches stats, streaks or saved progress. */
  mode: GameMode;
  /** The current practice puzzle, or null in daily mode. */
  practice: PracticeState<TPuzzle> | null;
  /** True when the game config provides generateRandomPuzzle. */
  hasPractice: boolean;
  startPractice: () => void;
  nextPractice: () => void;
  exitPractice: () => void;
}

const GameShellContext = createContext<GameShellContextValue | null>(null);

/** Access the shell. Pass the game's puzzle type to get a typed `practice.puzzle`. */
export function useGameShell<TPuzzle = unknown>(): GameShellContextValue<TPuzzle> {
  const context = useContext(GameShellContext);
  if (!context) throw new Error("useGameShell must be used inside <GameShell>");
  return context as GameShellContextValue<TPuzzle>;
}

interface GameShellProps {
  game: GameConfig;
  children: ReactNode;
  /** Optional content rendered at the bottom of the how-to-play dialog (e.g. sound settings). */
  helpExtra?: ReactNode;
}

/**
 * Shared page frame for every game: header with back / practice / help / stats,
 * the how-to-play dialog (opens automatically on the first visit), the stats
 * dialog, stats persistence, practice mode and a reload at local midnight.
 */
export function GameShell({ game, children, helpExtra }: GameShellProps) {
  const hydrated = useHydrated();
  const stats = useGameStats(game.id, game.maxTries);
  const hydrateStats = useStatsStore((state) => state.hydrate);
  const recordStats = useStatsStore((state) => state.record);

  const [helpForced, setHelpForced] = useState(false);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [practice, setPractice] = useState<PracticeState | null>(null);

  useReloadOnNewDay();

  useEffect(() => {
    hydrateStats(game.id, game.maxTries);
  }, [hydrateStats, game.id, game.maxTries]);

  // First visit: the help dialog opens by itself until the player closes it once.
  const seenHelpKey = storageKey(game.id, "seen-help");
  const firstVisit = hydrated && !helpDismissed && !readFlag(seenHelpKey);
  const helpOpen = helpForced || firstVisit;

  const openHelp = useCallback(() => setHelpForced(true), []);
  const closeHelp = useCallback(() => {
    writeFlag(seenHelpKey);
    setHelpDismissed(true);
    setHelpForced(false);
  }, [seenHelpKey]);
  const openStats = useCallback(() => setStatsOpen(true), []);

  // Practice mode: random puzzles from the game config, never counted in stats.
  const generateRandomPuzzle = game.generateRandomPuzzle;
  const hasPractice = typeof generateRandomPuzzle === "function";
  const mode: GameMode = practice ? "practice" : "daily";

  const startPractice = useCallback(() => {
    if (!generateRandomPuzzle) return;
    setPractice({ puzzle: generateRandomPuzzle(), round: 1 });
  }, [generateRandomPuzzle]);
  const nextPractice = useCallback(() => {
    if (!generateRandomPuzzle) return;
    const puzzle = generateRandomPuzzle();
    setPractice((current) => ({ puzzle, round: (current?.round ?? 0) + 1 }));
  }, [generateRandomPuzzle]);
  const exitPractice = useCallback(() => setPractice(null), []);

  const record = useCallback(
    (result: GameResult) => {
      if (mode === "practice") return;
      recordStats(game.id, game.maxTries, result);
    },
    [mode, recordStats, game.id, game.maxTries],
  );

  const value = useMemo<GameShellContextValue>(
    () => ({
      game,
      stats,
      hydrated,
      record,
      openHelp,
      openStats,
      dialogOpen: helpOpen || statsOpen,
      mode,
      practice,
      hasPractice,
      startPractice,
      nextPractice,
      exitPractice,
    }),
    [
      game,
      stats,
      hydrated,
      record,
      openHelp,
      openStats,
      helpOpen,
      statsOpen,
      mode,
      practice,
      hasPractice,
      startPractice,
      nextPractice,
      exitPractice,
    ],
  );

  return (
    <GameShellContext.Provider value={value}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center">
            <Link
              href="/"
              aria-label="All games"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-10")}
            >
              <ArrowLeft />
            </Link>
            {hasPractice && (
              <Button
                variant="link"
                size="sm"
                className="h-10 px-1 text-muted-foreground"
                onClick={mode === "practice" ? exitPractice : startPractice}
              >
                {mode === "practice" ? "Daily" : "Practice"}
              </Button>
            )}
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            <span aria-hidden="true">{game.emoji}</span> {game.name}
          </h1>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="How to play"
              onClick={openHelp}
            >
              <CircleQuestionMark />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="Statistics"
              onClick={openStats}
            >
              <ChartNoAxesColumn />
            </Button>
          </div>
        </header>
        {children}
      </div>

      <HowToPlayDialog
        game={game}
        extra={helpExtra}
        open={helpOpen}
        onOpenChange={(open) => (open ? setHelpForced(true) : closeHelp())}
      />
      <StatsDialog game={game} stats={stats} open={statsOpen} onOpenChange={setStatsOpen} />
    </GameShellContext.Provider>
  );
}
