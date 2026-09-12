# Daily Puzzles

A static website of small daily puzzle games, Wordle-style. Everyone gets the same puzzle on the same local date, progress and stats live in the browser, and there is no server or database.

Games so far:

| Game | What it is |
| --- | --- |
| 🎹 Melody | Hear five notes, then play them back on a piano in six tries. |
| 🎨 Colour Mix | Mix red, green and blue with sliders to match a target colour in three tries. |
| 🔢 Numbers | Combine five number tiles with + − × ÷ to hit the target in as few steps as possible. |
| 🌍 Distance | Guess the distance between two world cities, five rounds, up to 500 points. |
| 📊 Order | Drag five things into order (animals by weight, rivers by length, ...) in three tries. |

Every game has one daily puzzle (same for everyone, with stats and streaks) plus a practice mode with unlimited random puzzles that do not count towards stats.

## Requirements

- Node.js 24 LTS (or 22+) and npm.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The Melody game is at http://localhost:3000/games/melody.

## Test and lint

```bash
npm test        # Vitest unit tests for the game rules and shared logic
npm run lint    # ESLint
```

## Build

```bash
npm run build
```

This produces a fully static site in `out/` (Next.js `output: "export"`). You can preview it with any static file server, for example:

```bash
npx serve out
```

Share links are built from `SITE_URL` in `lib/config.ts`: each result links to its own game page with `?s=share`, so analytics can count visits that came from shares. Change `SITE_URL` once when you move domains.

Note for Windows: when `out/` is built on Windows, Next.js 16.3 writes the per-segment prefetch files with the wrong name (a known exporter bug with backslashes), so a local preview logs one harmless 404 per link prefetch. Builds on Vercel and Cloudflare Pages run on Linux and are not affected.

## Deploy

### Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel choose **Add New Project** and import the repository. The Next.js preset is detected automatically; leave the build command as `npm run build`.
3. Deploy. Because of `output: "export"`, Vercel serves the static `out/` folder.

Or from the terminal: `npx vercel` (then `npx vercel --prod`).

### Cloudflare Pages

1. In the Cloudflare dashboard open **Workers & Pages**, choose **Create**, then **Pages**, and connect the repository.
2. Framework preset: **Next.js (Static HTML Export)**. Build command: `npm run build`. Build output directory: `out`.
3. Add the environment variable `NODE_VERSION` = `24`.
4. Save and deploy.

Or with Wrangler after a local build: `npx wrangler pages deploy out`.

Any other static host works too: upload the contents of `out/`.

## Continuous integration and deployment

- **Cloudflare Pages** is connected to the GitHub repository and builds and deploys the site from the `main` branch automatically on every push (see the Cloudflare Pages steps above for the build settings).
- **GitHub Actions** runs checks only. The workflow in `.github/workflows/ci.yml` runs on every push to every branch and on every pull request: it uses the Node version in `.nvmrc` with npm caching, then runs `npm ci`, `npm run lint`, `npm test` and `npm run build`. It does not deploy anything.

## Content admin (development only)

Run `npm run dev` and open http://localhost:3000/admin. There is no login: the admin exists only on your machine under the dev server and is never part of the production build. Its files are named `page.dev.tsx` / `route.dev.ts`, and `next.config.ts` only registers that file extension when `NODE_ENV` is `development`, so `npm run build` produces no admin page and no API route in `out/`.

- **/admin** lists what can be edited and has a **Preview daily puzzle** panel: pick a date and see exactly what all five games generate that day.
- **/admin/order** edits the Order categories (question, unit, labels, minimum gap) and their items (name, value). Items are shown sorted by value so a wrong value stands out.
- **/admin/distance** is a searchable table of the Distance cities (name, country, flag, latitude, longitude).

Saving validates the data first (at least 15 items per category, numeric values, no duplicate names, no near-equal values, coordinates in range, no duplicate cities) and then writes the JSON file under `content/`, sorted and formatted the same way every time so git diffs stay small. After saving, commit the change and open a pull request. The games read the same files through the zod schemas in `lib/content/schemas.ts`.

## Project structure

```
app/            Routes. page.tsx is the hub, games/<id>/page.tsx is a game page.
components/     Shared UI: game shell, result / stats / how-to-play dialogs, share button, countdown.
components/ui/  shadcn/ui components.
lib/            Shared logic: daily puzzle number, seeded random, stats and streaks, share text, storage, content schemas and validation.
content/        JSON data for the Order categories and the Distance cities (edit with the admin).
games/          One folder per game (config, rules, tests, state, components) and the registry in index.ts.
```

See `CLAUDE.md` for the rules every game follows.

## Add a new game

1. Create `games/<id>/logic.ts` with the pure rules and a daily generator that uses `createRng(`<id>:${dateKey}`)` from `lib/random.ts`. Add `logic.test.ts`.
2. Create `games/<id>/config.ts` exporting a `GameConfig`: `id`, `name`, `emoji`, `tagline`, `path`, `maxTries`, `howToPlay`, `buildShareText`, `buildHook` (the one-line challenge under the share grid, varied by result). Add `generateRandomPuzzle` to get practice mode (unlimited random puzzles that never touch stats) for free.
3. Create `games/<id>/store.ts` (Zustand) that loads today's progress with `loadDailyState`, saves it with `saveDailyState` in daily mode, and can load a practice puzzle without saving.
4. Create the game's client component in `games/<id>/components/`, wrapped in `<GameShell>` and ending with `<ResultDialog>`.
5. Add `app/games/<id>/page.tsx` that renders it.
6. Register the config in `games/index.ts`. The hub lists it automatically.

`games/melody/` is the reference implementation.

## Configuration

| Where | What |
| --- | --- |
| `lib/config.ts` | Site name, tagline, `SITE_URL` for share text, puzzle #1 date, storage prefix. |
| `app/layout.tsx` | Commented placeholder for an analytics script. |
| `components/result-dialog.tsx` | Hidden `<div id="ad-slot">` for a future ad unit. |
