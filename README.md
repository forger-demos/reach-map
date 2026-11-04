# reach-map

Click anywhere in a city and see everywhere you can reach by public transport in an hour.

The owner's brief is [docs/brief.md](docs/brief.md). A forger work loop builds it: requests are GitHub issues labelled `ready-for-agent`, each is built on its own branch, and a PR merges only when the gates in `.forger/workloop.config.json`, CI and an independent verifier pass.

## Develop

```
bun install
bun run build:client
bun run start
bun run check
```

`build:client` bundles the map code in `src/ui/` into `public/`; the bundle is not committed. `bun run screenshots` captures the page at the viewports and themes in `.forger/ui.json` into `docs/screenshots/`, with the server running.

## Deploy

`bun run build` bundles the client and writes a self-contained static site to `dist/` (git-ignored): everything in `public/`, including the timetable snapshot, plus the bundle and the map assets. `bun run start` serves `public/`, which holds the same files, so local development and the deployed site match. No server code runs in production.

`vercel.json` points a Vercel project linked to this repository at that build, so every merge to main deploys. Linking the project is done once in Vercel, not in this repository.

## Data

The timetable snapshot is committed under `public/data/`. To refresh it, download the HSL feed (<https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip>, CC BY 4.0; never commit it) and run:

```
bun run data:build path/to/hsl.zip --weekday YYYYMMDD --saturday YYYYMMDD --sunday YYYYMMDD
```

Each date must fall on its day type and inside the feed's validity window. A directory of the unzipped feed works in place of the zip. Refreshes go in a reviewed PR.

## Docs

- [docs/brief.md](docs/brief.md): the owner's brief.
- [docs/research/](docs/research/): the research notes with sources.
- [docs/adr/](docs/adr/): the decisions.
- [docs/features.md](docs/features.md): what the app does today, with screenshots.
- [docs/plan.md](docs/plan.md): the build as ordered slices.
- `spike/` holds the throwaway search and its tests; the next slice moves them into the app.
