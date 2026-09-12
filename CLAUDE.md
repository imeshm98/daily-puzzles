@AGENTS.md

# Daily Puzzles

A static website of small daily puzzle games, Wordle-style. One puzzle per game per day, identical for everyone on the same local date. Everything runs in the browser: no server code, no database, no paid services.

## Stack

- Next.js 16 App Router with `output: "export"` and `trailingSlash: true` (see `next.config.ts`), TypeScript, Tailwind CSS v4.
- shadcn/ui (Base UI primitives, style `base-nova`) in `components/ui/`. Add more with `npx shadcn@latest add <name>`. Use `open` / `onOpenChange` on dialogs rather than trigger components.
- Zustand for game state. Vitest for unit tests of game rules (`*.test.ts` next to the code).
- localStorage for stats, streaks and today's progress. Client components only.
- Web Audio API for every sound. No audio files.
- zod for the JSON content files under `content/` (schemas in `lib/content/schemas.ts`, shared by the games and the admin).

## Commands

```
npm run dev     # http://localhost:3000 (also serves the development-only admin at /admin)
npm run build   # static export into out/
npm test        # vitest run
npm run lint    # eslint
```

## Structure

```
app/                     Routes only. page.tsx is the hub, games/<id>/page.tsx is a game page.
  layout.tsx             Root layout: dark theme, fonts, metadata, analytics placeholder comment.
  admin/                 Development-only content admin: *.dev.tsx pages (dashboard + puzzle preview, order, distance)
                         and _components/. api/admin/content/route.dev.ts is its read/write API. See "Admin" below.
content/                 JSON data edited by the admin: order-categories.json, cities.json. Sorted, one entry per line.
components/              Shared UI used by every game.
  game-shell.tsx         Header (back, help, stats), first-visit help, stats dialog, midnight reload.
  result-dialog.tsx      End screen: result, Share, stats, countdown, hidden #ad-slot.
  how-to-play-dialog.tsx / stats-dialog.tsx / stats-panel.tsx / share-button.tsx / countdown.tsx
  game-card.tsx          Hub card. puzzle-date.tsx shows today's puzzle number.
  ui/                    shadcn components (button, dialog, card).
lib/                     Shared logic, pure and tested where possible.
  config.ts              SITE_NAME, SITE_URL (share text), EPOCH_DATE (puzzle #1), STORAGE_PREFIX.
  daily.ts               Local date key, puzzle number, ms until midnight, countdown format.
  random.ts              hashString, mulberry32, createRng(seed), randomInt, pickOne, shuffle.
  stats.ts               GameStats, recordResult (streak rules), load/save. stats-store.ts wraps it in Zustand.
  daily-state.ts         Save/load a game's progress for today (must include dateKey, puzzleNumber, status).
  share.ts               buildShareText, shareResult (native share on mobile, clipboard elsewhere), SQUARES.
  storage.ts             Safe localStorage JSON helpers and namespaced keys.
  game-config.ts         The GameConfig type every game registers.
  content/               schemas.ts (zod, shared), validate.ts (+ test: rules the admin enforces), format.ts (stable
                         sort + JSON layout), files.ts (the only files the admin API may touch).
  hooks/                 useHydrated, useToday, useCountdown, useReloadOnNewDay.
games/                   One folder per game plus the registry.
  index.ts               `games` array: add new configs here, in hub order.
  melody/                config.ts, logic.ts (+ logic.test.ts), store.ts (+ store.test.ts), audio.ts (+ audio.test.ts: synth,
                         master gain, compressor, volume setting), components/ (board, piano, sound-settings, game).
  colourmix/             Same layout: config.ts, logic.ts, store.ts, components/ (sliders, swatches, game).
  numbers/               Same layout; logic.ts holds the breadth-first solver (exploreResults, findSolution).
  distance/              Same layout plus cities.ts (typed loader for content/cities.json).
  order/                 Same layout plus categories.ts (typed loader for content/order-categories.json); components use
                         @dnd-kit/sortable with arrow-button fallbacks.
```

## Rules every game follows

1. One puzzle per day. Puzzle number = days since 2026-09-14, which is #1, using the player's local date. Always use `getToday()` from `lib/daily.ts`.
2. The puzzle is generated from `createRng(`${gameId}:${dateKey}`)` in `lib/random.ts`. Never use `Math.random` for puzzle content.
3. Wrap the page in `<GameShell game={config}>`. Use `useGameShell()` for `stats`, `record(result)` and `dialogOpen` (ignore keyboard input while it is true). Pass `helpExtra` to render extra content at the bottom of the how-to-play dialog (Melody puts its volume slider and Test sound button there).
4. Persist today's progress with `loadDailyState` / `saveDailyState` from `lib/daily-state.ts`, keyed by the game id. Recompute derived data from the saved input rather than trusting it.
5. When the game ends, call `record({ puzzleNumber, won, tries })` once and show `<ResultDialog>` with the share text.
6. Share text comes from `buildShareText` in `lib/share.ts`: emoji squares and numbers only, never the answer, ending with `SITE_URL`.
7. Client-only data (localStorage, the clock, audio) must not affect server-rendered HTML. Stores start empty and hydrate from an effect that calls a store action. Never call a `useState` setter synchronously inside `useEffect` (the react-hooks lint rules forbid it); prefer `useSyncExternalStore` or a Zustand action.
8. Mobile first, dark theme, large touch targets, keyboard support on desktop.
9. A game's `id` is its URL slug and its localStorage namespace. Never rename it after launch.
10. Games without "tries" still set `maxTries` (it sizes the stats distribution, e.g. steps used) and can set `distributionLabel`. `ResultDialog` accepts `title` and `scoreLabel` overrides, and `buildShareText` accepts `detail` (extra text) or `scoreLabel` (replaces "n/max") for headings like "Colour Mix #3  96%  2/3" or "Numbers #5  ✓ 3 steps (par 3)".
11. Practice mode is provided by the shell. A game opts in by setting `generateRandomPuzzle` in its config (Math.random is fine there). The shell then shows the header "Practice" / "Daily" link and the "Keep playing (practice)" and "Next puzzle" buttons, and makes `record()` a no-op in practice. The game reads `mode` and `practice.puzzle` from `useGameShell<TPuzzle>()`, loads the practice puzzle into its store without persisting it, and passes `practice: true` to its share text builder so the heading reads "<Game> Practice". Stats, streaks, saved progress and the countdown are daily-only.

## Admin (development only)

`/admin` edits the JSON content under `content/` and previews the daily puzzle of every game for any date. It has no login: it exists only under `npm run dev` on the developer's machine.

- Its files are named `page.dev.tsx`, `layout.dev.tsx` and `route.dev.ts`. `next.config.ts` registers the `dev.tsx` / `dev.ts` page extensions only when `process.env.NODE_ENV === "development"`, so `next build` never sees them and `out/` contains no admin page and no API route. The route handler also answers 404 unless NODE_ENV is development. Never rename these files to plain `page.tsx`.
- The API (`GET/PUT /api/admin/content`) only reads and writes the files listed in `lib/content/files.ts`, looked up by key. It never builds a path from the request.
- Every save is validated with `lib/content/validate.ts` (schema, at least 15 items per category, numeric values, no duplicate names, no near-equal values, enough clearly different values, city coordinates in range, no duplicate cities), then sorted and formatted by `lib/content/format.ts` so diffs stay small. `content.test.ts` checks the shipped files pass the same rules and are stored in that exact format.
- After saving, commit the JSON and open a pull request. Changing content changes the puzzles generated for every date, so the pinned launch-day tests may need updating.

## Adding a new game

1. Create `games/<id>/logic.ts` with pure rule functions and a `getDaily<Name>(dateKey)` generator, plus `logic.test.ts`.
2. Create `games/<id>/config.ts` exporting a `GameConfig` (id, name, emoji, tagline, path, maxTries, howToPlay, buildShareText, and `generateRandomPuzzle` for practice mode).
3. Create `games/<id>/store.ts` (Zustand) with an `init()` that loads today's puzzle and saved progress, a `startPractice(puzzle)` that loads a practice puzzle without saving, and actions that save with `saveDailyState` in daily mode only.
4. Create `games/<id>/components/<name>-game.tsx`, a client component that renders `<GameShell>` and `<ResultDialog>`.
5. Create `app/games/<id>/page.tsx` that exports `metadata` and renders the game component.
6. Add the config to the `games` array in `games/index.ts`. The hub picks it up automatically.
7. Run `npm test`, `npm run lint` and `npm run build`.

Use `games/melody/` as the reference implementation.

## Known quirks

- Puzzle numbers are 0 or negative before the launch date 2026-09-14. That is expected during development.
- A static export built on Windows names the per-segment prefetch files wrongly (Next.js 16.3 exporter bug), so a local preview of `out/` logs one harmless 404 per link prefetch. Linux builds (Vercel, Cloudflare Pages) are fine.
- Windows converts clipboard newlines to CRLF; the share text itself uses `\n`.
