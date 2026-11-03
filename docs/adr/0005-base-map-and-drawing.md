# OpenFreeMap base map, canvas field, marching-squares outlines

Status: accepted

## Context

The base map must allow this app, need no key, and follow light and dark themes. Options and drawing approaches are in [map](../research/map.md).

## Decision

Use MapLibre GL JS with OpenFreeMap Positron and Dark styles. Paint the travel time grid into a canvas source and draw outlines from marching squares as GeoJSON. Keep a self-hosted PMTiles extract as fallback.

## Consequences

- No key or paid service, and attribution comes from MapLibre plus the page's own credit line.
- The public OpenFreeMap instance has no service promise; the fallback is documented.
- The grid, the ramp and the contour maths are pure modules; only the canvas and map calls are shell code.
- The client needs bundling, which the first map slice sets up.
- `maplibre-gl` is an npm dependency bundled by `bun run build:client`. It loads its worker and shared chunk as separate files next to the bundle, so the build copies them into `public/` beside the bundle and stylesheet; none of these built files are committed.
