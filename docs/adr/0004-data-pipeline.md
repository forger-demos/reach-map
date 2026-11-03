# Committed snapshot of three day types

Status: accepted

## Context

The feed is too large for the browser and changes daily. Options are in [data-pipeline](../research/data-pipeline.md).

## Decision

A command streams the GTFS feed into one compact binary file per day type (weekday, Saturday, Sunday) plus a JSON manifest, and the processed snapshot is committed under `public/data/`. The raw feed is never committed. Tests use small hand-built fixtures.

## Consequences

- Screenshots, tests and CI work offline and are reproducible.
- Each refresh adds files to git history, so refreshes are deliberate PRs, not automatic.
- The page shows the feed version and service dates from the manifest.
- Names and route labels live in the manifest; shapes are not shipped.
