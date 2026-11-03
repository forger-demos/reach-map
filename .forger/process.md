# Development process - reach-map

One ticket per iteration, quality gates green, small clean commits.
**On GitHub, the issues are the backlog**: an open issue with the intake label is
a ticket, and an issue closed by a merged PR is completed. Elsewhere,
`backlog.json` is the backlog.

This file is the per-repo brain of the work loop. The plugin's engine and
commands are generic; everything specific to THIS project lives here and in
`.forger/workloop.config.json`. Fill in every section below.

## What this repo is

A browser app: click anywhere in the Helsinki region and see everywhere reachable by public transport and walking in 15, 30, 45 and 60 minutes, leaving at a chosen time, drawn as a smooth colour field with outlines, with a journey on hover, a comparison mode and a story computed from the data. It is a demo for its owner and for anyone who opens the page. A Bun and TypeScript server serves the static client; routing runs in the browser over a processed timetable. The brief is `docs/brief.md`, the research is `docs/research/`, the decisions are `docs/adr/` and the build order is `docs/plan.md`.

## The gates

The exact command is in `.forger/workloop.config.json` (`gates`). Never proceed
on red. The gates do not look at pixels. A slice with a screen carries screenshots from
the project's screenshot command (light and dark, phone and desktop), and the
reviewer looks at them. They also do not check that the data credit and the map
attribution stay visible on the phone viewport.

## The tracker

`workloop.config.json` `tracker.kind` says where live tickets are published:

- `github` (default): open issues carrying the intake label (`tracker.label`,
  default `ready-for-agent`) are the tickets. Priority and effort are labels
  (`P0`-`P3`, `effort:small|medium|large`), `depends_on` is the native
  blocked-by, and `needs-human` / `deferred` labels carry those statuses. The
  worker claims an issue by assigning itself and closes it through the PR
  (`Closes #<n>`); that merge is what completed means. Labels in
  `tracker.ignore` (such as `wayfinder:*` decision tickets) are never work.
- `local`: `backlog.json` is the only record.
- `none`: `backlog.json`, and never touch an issue tracker.

## Rules

1. One ticket per iteration.
2. Gates green before every commit and merge.
3. Read the code a ticket touches, and any reference it names, before writing.
4. One `feat:` PR per ticket (code + tests + docs). Push the branch the moment
   gates are green, before the PR. Squash-merge.
5. Keep the public API working - additive where possible.
6. Blocked? Signal `<process>stop</process>` with a reason.

## Project gotchas

The first two are forger's defaults. The rest are hard constraints the research
found. The worker treats these as enforced, not advisory.

- **Determinism first** (principle 0). Every decision a ticket adds or changes
  lands as a tested command with machine-readable output, not as prompt text.
  Pure logic is split from I/O, and side effects sit behind an injectable `CommandRunner`.
- **Comments say why, never narrate a change.** History belongs in the commit.
- **Layers.** `src/core` is pure: no files, network, DOM or clock. `src/shell` does input and output. `src/ui` draws in the browser. Shell and ui may import core; nothing else crosses (`.forger/architecture.json`, ADR 0007).
- **Tests never touch the network.** Core tests use small hand-built timetables with expected values worked out by hand and shown in the test. The committed snapshot is read from disk.
- **Never commit the raw GTFS feed.** Only the processed snapshot and its manifest under `public/data/`, refreshed by the build command in a reviewed PR.
- **Times are seconds from the start of a service day and may pass 86400.** Never wrap them to a clock; the small hours of a morning read the previous day type shifted by a day.
- **Trips of one route must not overtake.** The pipeline splits routes that would; the search assumes it.
- **Binary decoding must copy.** A Node `Buffer` slice is a view of the whole file; decode copies each array.
- **No API keys and no paid services.** The base map is OpenFreeMap; never prefetch or bulk-download tiles, and never hide the attribution.
- **Attribution is part of the feature.** HSL (CC BY 4.0) with the feed version and date, OpenStreetMap and OpenFreeMap stay visible on the phone.
- **Walking is a model, not a measurement.** Straight line times a detour factor over a speed, with a cap; constants are named in one module and changed only by the validation work.
- **Documentation stays qualitative.** Sizes and timings live in a generated report or a command, not in a durable note.

The retro refines this file over time: a lesson that holds for this project
lands here by PR, and one that holds for every project goes upstream to forger.

## The ticket shape

Each entry in `backlog.json` `features` looks like:

```json
"<ticket_id>": {
  "priority": "P0",
  "status": "not_started",
  "type": "feature",
  "depends_on": [],
  "effort": "medium",
  "issue": 42,
  "description": "What and why, enough to implement without guessing.",
  "acceptance_criteria": ["testable outcome", "another testable outcome"],
  "files": ["src/area/"],
  "reuse": ["the reference implementation or pattern to follow"]
}
```

A good ticket is a **vertical slice**: a narrow but complete path through every
layer it touches, demoable or verifiable on its own, sized to one fresh context
window. A wide mechanical refactor (rename a shared symbol, retype a column) is
the exception: sequence it expand, migrate in batches, contract, each batch its
own ticket with `depends_on` on the expand.

`files` and `reuse` are **hints for a worker starting cold**, not a contract;
they go stale, so the worker reads the code before trusting them. `issue` is the
tracker number when `tracker.kind` is `github`. Set `repo` only if the ticket
belongs to a different codebase (the loop tracks but does not implement it).
