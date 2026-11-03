# Helsinki region with the HSL GTFS feed

Status: accepted

## Context

The app needs an open feed, a licence that allows an attributed public web app, no key, and enough service variety to make the shape change. Candidates and licences are compared in [city-and-data](../research/city-and-data.md).

## Decision

Use the Helsinki region and the HSL GTFS feed under CC BY 4.0, over Luxembourg (too small and uniform) and over cities whose licence or download could not be verified.

## Consequences

- The page credits HSL and the feed year and links the licence.
- The feed is large, so the pipeline streams it and keeps only one service day per day type ([ADR 0004](0004-data-pipeline.md)).
- The HSL open data page blocks automated fetches, so a person confirms the current attribution wording before the showcase ships.
- The coast makes straight-line walking overshoot water ([ADR 0003](0003-walking-access.md)).
