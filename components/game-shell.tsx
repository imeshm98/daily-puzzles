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
import type { GameConfig } from "@/lib/game-config";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useReloadOnNewDay } from "@/lib/hooks/use-reload-on-new-day";
import type { GameResult, GameStats } from "@/lib/stats";
import { useGameStats, useStatsStore } from "@/lib/stats-store";
import { readFlag, storageKey, writeFlag } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface GameShellContextValue {
  game: GameConfig<never>;
  /** Stats for this game. Empty until hydrated on the client. */
  stats: GameStats;
  hydrated: boolean;
  /** Record a finished puzzle. Safe to call more than once for the same puzzle. */
  record: (result: GameResult) => void;
  openHelp: () => void;
  openStats: () => void;
  /** True while the help or stats dialog is open: games should ignore keyboard input. */
  dialogOpen: boolean;
}

const GameShellContext = createContext<GameShellContextValue | null>(null);

export function useGameShell(): GameShellContextValue {
  const context = useContext(GameShellContext);
  if (!context) throw new Error("useGameShell must be used inside <GameShell>");
  return context;
}

interface GameShellProps {
  game: GameConfig<never>;
  children: ReactNode;
}

/**
 * Shared page frame for every game: header with back / help / stats buttons,
 * the how-to-play dialog (opens automatically on the first visit), the stats
 * dialog, stats persistence and a reload at local midnight.
 */
export function GameShell({ game, children }: GameShellProps) {
  const hydrated = useHydrated();
  const stats = useGameStats(game.id, game.maxTries);
  const hydrateStats = useStatsStore((state) => state.hydrate);
  const recordStats = useStatsStore((state) => state.record);

  const [helpForced, setHelpForced] = useState(false);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

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

  const record = useCallback(
    (result: GameResult) => {
      recordStats(game.id, game.maxTries, result);
    },
    [recordStats, game.id, game.maxTries],
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
    }),
    [game, stats, hydrated, record, openHelp, openStats, helpOpen, statsOpen],
  );

  return (
    <GameShellContext.Provider value={value}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <header className="mb-4 flex items-center justify-between gap-2">
          <Link
            href="/"
            aria-label="All games"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-10")}
          >
            <ArrowLeft />
          </Link>
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
        open={helpOpen}
        onOpenChange={(open) => (open ? setHelpForced(true) : closeHelp())}
      />
      <StatsDialog game={game} stats={stats} open={statsOpen} onOpenChange={setStatsOpen} />
    </GameShellContext.Provider>
  );
}
