# Features

## Map

A full-viewport map of the Helsinki region from OpenFreeMap, drawn with MapLibre GL JS. It follows the system light or dark preference, and a button on the map overrides it; the choice is remembered in the browser. The attribution (MapLibre, OpenFreeMap, OpenMapTiles, OpenStreetMap) is always expanded, including on a phone.

On a desktop width the right side holds an empty panel and on a phone the bottom is reserved, for the controls later slices add.

| | Light | Dark |
|---|---|---|
| Phone | ![Phone, light](screenshots/map-phone-light.png) | ![Phone, dark](screenshots/map-phone-dark.png) |
| Desktop | ![Desktop, light](screenshots/map-desktop-light.png) | ![Desktop, dark](screenshots/map-desktop-dark.png) |

## Stops and credit

Once the weekday timetable has loaded, every boarding stop is drawn as a dot over the map; the dots follow the theme. A status line in the side panel (the bottom strip on a phone) says the timetable is loading, loaded or could not be loaded; when it fails the map stays usable. Below it a credit line names the publisher (HSL) and the feed year with a link, the CC BY 4.0 licence with a link, the feed version and the weekday service date, all read from the committed manifest.

The data comes from the committed snapshot under `public/data/`, refreshed by `bun run data:build` (see [data pipeline](research/data-pipeline.md)).
