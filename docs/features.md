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

## Click to reach

Before the first click the side panel says to click the map. A click sets the origin: the search leaves 08:00 on the weekday, the traveller walks to any stop within walking range, and the search runs in the browser on the loaded timetable. The origin is marked, and a one-line readout says how many stops are reachable within 30 minutes. If no stop is within walking range, a message says so and the field is cleared. The walking range and speed are the model constants in `src/core/walk.ts`.

The search also keeps, for every stop, how it was reached; `journey` in `src/core/raptor.ts` turns that into the walk and ride legs with times.

## Travel-time field

The result is drawn as a smooth colour field over the region rather than as dots. `src/core/field.ts` holds a grid over the region (the cell size is a named constant) and fills each cell with the least, over reached stops, of the stop's travel time plus the walk from the stop to the cell. Each stop writes outward only as far as the walk cap and the time it has left allow, so the work follows the number of reached stops. Cells beyond an hour or the walk cap are left empty.

`src/core/ramp.ts` turns a travel time into a colour: a sequential ramp, lighter for nearer, with its own colours for the light and dark themes, and transparent where nothing is reached. The ramp meets the legend colour at 15, 30, 45 and 60 minutes. In the browser the grid is painted into an off-screen canvas and shown as a MapLibre canvas source under the labels, so place names stay readable above the colour.

Colour is not the only carrier of the time meaning: the legend lists the four steps by name. The stop dots are hidden once a field is shown; a "Show stops" toggle in the panel brings them back, coloured by band. While a new field is computed the previous one stays and the status line says so. Clicking again moves the origin and repaints.

Near the city centre and in a suburb:

| | Light | Dark |
|---|---|---|
| Phone, centre | ![Phone, centre, light](screenshots/reach-centre-phone-light.png) | ![Phone, centre, dark](screenshots/reach-centre-phone-dark.png) |
| Desktop, centre | ![Desktop, centre, light](screenshots/reach-centre-desktop-light.png) | ![Desktop, centre, dark](screenshots/reach-centre-desktop-dark.png) |
| Phone, suburb | ![Phone, suburb, light](screenshots/reach-suburb-phone-light.png) | ![Phone, suburb, dark](screenshots/reach-suburb-phone-dark.png) |
| Desktop, suburb | ![Desktop, suburb, light](screenshots/reach-suburb-desktop-light.png) | ![Desktop, suburb, dark](screenshots/reach-suburb-desktop-dark.png) |
