# Straight-line walking with a detour factor

Status: accepted

## Context

The browser needs a walk from a point to stops, between stops, and from stops to map cells. Options are in [walking-access](../research/walking-access.md).

## Decision

Model walking as straight-line distance times a detour factor over a fixed speed, capped per leg, behind one small interface. Street-network walking from an OpenStreetMap extract is the upgrade path for stop-to-stop transfers.

## Consequences

- No extra data to ship and the field computation stays cheap.
- Accuracy is worst across water and rail barriers; the validation slice calibrates the constants ([ADR 0006](0006-validation.md)) and a land mask is an optional later slice.
- Swapping the model touches the walk module and the pipeline's footpath step, not the router.
