# RAPTOR for routing

Status: accepted

## Context

A click asks for the earliest arrival at every stop; hover needs one journey; comparison repeats the query. Options are in [routing](../research/routing.md).

## Decision

Use RAPTOR with footpath relaxation after each round and parents per round, over Connection Scan (less direct for changes), Trip-Based (heavy preprocessing) and Transfer Patterns (server scale). Trips are grouped into non-overtaking routes by the pipeline. A departure window (rRAPTOR) is deferred.

## Consequences

- The router is pure code over typed arrays, tested with hand-built timetables; it needs no network and no index beyond a stop-to-routes table.
- A query from a central point on the real feed takes milliseconds in the spike, so no worker thread is planned.
- Queries use seconds from the start of a service day; the small hours read the previous day type shifted by 24 hours.
- Fewest-legs and earliest-arrival are the only criteria; fares and comfort are out of scope.
