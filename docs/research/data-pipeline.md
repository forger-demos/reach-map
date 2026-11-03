# Data pipeline

From the operator's zip to a compact file the browser loads.

Sources: the [GTFS reference](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md) defines the files and the rule that times may pass 24:00:00; the HSL feed is the zip at <https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip> ([HSL on GitHub](https://github.com/hsldevcom)); the route grouping follows the no-overtaking requirement in the [RAPTOR paper](https://www.microsoft.com/en-us/research/publication/round-based-public-transit-routing/).

## Shape of the problem

The feed holds every trip for weeks of service. A query needs one service day. Reducing to one representative day per day type shrinks the data by a large factor; the spike's output for each day type is a few megabytes raw and around one megabyte gzipped, against a feed close to a gigabyte unzipped.

```mermaid
flowchart LR
  zip[hsl.zip] --> read[Stream stop_times and trips]
  cal[calendar and calendar_dates] --> pick[Services running on the chosen date]
  pick --> read
  read --> group[Group trips into routes without overtaking]
  group --> foot[Stop-to-stop footpaths]
  foot --> enc[Binary arrays plus manifest]
  enc --> files[One file per day type]
```

Read left to right: the calendar chooses which trips survive, the stop times are streamed so memory stays bounded, and the result is typed arrays written in one pass.

## Decisions

- **Day types.** A weekday, a Saturday and a Sunday, each taken from a real date inside the feed's validity window. The page's time picker chooses a day type and a clock time. The manifest records the date, the feed version and the publisher.
- **Late-night trips.** Times past 24:00 stay as they are in the service day they belong to. A query in the small hours reads the previous day type with a 24 hour shift.
- **Stops.** Only boarding stops (location type empty or 0) are kept; parent stations are ignored for routing.
- **Format.** Typed arrays in one binary file per day type plus a JSON manifest holding names, route labels and the metadata above. A fixed header, offsets and flat arrays decode in a tenth of a second and need no parser. `spike/timetable.ts` is the throwaway version of the layout.
- **Streaming reader.** `stop_times.txt` is read as a stream and filtered by trip as it passes, a few seconds for the whole feed.
- **No shapes.** `shapes.txt` is skipped; the hover journey draws straight segments between stops.

## Committed or built in CI

| | Commit the processed snapshot | Build in CI or at deploy |
|---|---|---|
| Reproducible screenshots and tests | Yes, offline | Needs the network and a large download on every run |
| Repository growth | Small files, grows on each refresh | None |
| Freshness | Manual refresh by one command and a PR | Always current, but the feed moves under the page |
| Validation against the planner | Pinned to a known feed version | A moving target |

Recommendation: commit a snapshot of the three day-type files and manifest under `public/data/`, refreshed by one command and a reviewed PR. The raw feed is never committed. Tests build their timetables from small hand-made fixtures and never touch the network. See [ADR 0004](../adr/0004-data-pipeline.md).

## Commands

- Build: `bun spike/build-feed.ts <gtfs-dir> <YYYYMMDD> <out.bin>` is the throwaway version. The build slice replaces it with a package script.
- Measure: `bun spike/bench.ts <out.bin>`.
