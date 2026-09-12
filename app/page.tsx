import { GameCard } from "@/components/game-card";
import { PuzzleDate } from "@/components/puzzle-date";
import { games } from "@/games";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

/**
 * Hub page: one card per registered game.
 * Only plain fields are passed to the client card (functions can't cross the
 * server/client boundary).
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="space-y-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{SITE_NAME}</h1>
        <p className="text-muted-foreground">{SITE_TAGLINE}</p>
        <PuzzleDate />
      </header>

      <section aria-label="Games" className="grid gap-3">
        {games.map(({ id, name, emoji, tagline, path }) => (
          <GameCard key={id} game={{ id, name, emoji, tagline, path }} />
        ))}
      </section>

      <p className="text-center text-sm text-muted-foreground">More games are on the way.</p>
    </main>
  );
}
