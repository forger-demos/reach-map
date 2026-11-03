# Map

A base map whose usage policy allows this app, and how to draw the result on it.

## Base map options

| Option | Policy | Fit |
|---|---|---|
| OpenStreetMap standard tiles | [Tile usage policy](https://operations.osmfoundation.org/policies/tiles/): interactive viewing is allowed; bulk download, prefetching and offline use are not; attribution must be visible; access may be withdrawn without notice if use harms the service; raster only | Allowed for light use but no service promise, and a raster tile cannot follow the page's light and dark themes |
| OpenFreeMap | [Free, no key, no registration, no cookies, commercial use allowed, no limits on the public instance](https://openfreemap.org/); attribution "OpenFreeMap (c) OpenMapTiles Data from OpenStreetMap" (the first part optional); [terms](https://openfreemap.org/tos/) | Vector tiles with Positron (light) and Dark styles at `https://tiles.openfreemap.org/styles/positron` and `.../dark`. MapLibre adds the attribution itself. |
| Self-hosted PMTiles extract | [Protomaps](https://docs.protomaps.com/pmtiles/): one static file for the region, served from the app | No third party at runtime, at the cost of building and hosting an extract and writing a style |

## Drawing the result

- **Colour field.** The pure core computes travel time on a grid of map cells. The shell paints the grid into an off-screen canvas and gives it to MapLibre as a [canvas](https://maplibre.org/maplibre-gl-js/docs/API/classes/CanvasSource/) or [image](https://maplibre.org/maplibre-gl-js/docs/API/classes/ImageSource/) source with four corner coordinates. The GPU resamples it linearly, which gives a smooth field without drawing polygons.
- **Outlines.** Marching squares over the same grid at 15, 30, 45 and 60 minutes, in a pure module, producing GeoJSON lines drawn as a MapLibre line layer with minute labels.
- **Colour.** A perceptually ordered sequential ramp with enough contrast against both the light and the dark base style; the legend states the minutes. Not hue alone: the outlines carry the thresholds.
- **Themes.** Switch the base style with the page theme; the field keeps its ramp but adjusts opacity.
- **Phone.** Touch pan and zoom come with MapLibre; tap sets the origin. Hover journey on touch uses press and drag.

## Attribution

The page keeps MapLibre's attribution control visible and adds the HSL feed credit ([city-and-data](city-and-data.md)). Neither is hidden behind a toggle on a phone.

## Recommendation

OpenFreeMap with MapLibre GL JS, Positron and Dark styles, canvas-source field and marching-squares outlines. A self-hosted PMTiles extract stays the fallback if the public instance disappears. See [ADR 0005](../adr/0005-base-map-and-drawing.md).
