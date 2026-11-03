# City and data

Which city, from which feed, under which licence.

## What the brief needs

An open timetable feed with a licence that allows an attributed public web app, no API key to fetch it, enough service variety (rail, metro, tram, bus, ferry) for the shape to change visibly between a weekday morning and a Sunday night, and a size a browser can hold once processed.

## Candidates

| Candidate | Feed and licence | Fit |
|---|---|---|
| Helsinki region (HSL) | One GTFS zip for the whole region at <https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip>, fetched without a key. HSL states that its data sets and APIs, except the OpenStreetMap-derived journey planner data, are licensed CC BY 4.0, and asks users to credit the licensee and the year of delivery ([HSL open data page](https://www.hsl.fi/en/opendata), [licence text](https://creativecommons.org/licenses/by/4.0/)). | Metro, commuter rail, trams, buses and ferries on a coast with islands and bays: striking shapes. Large raw feed, small once reduced to one service day (see [data-pipeline](data-pipeline.md)). |
| Luxembourg (national) | Weekly GTFS on [data.public.lu](https://data.public.lu/fr/datasets/horaires-et-arrets-des-transport-publics-gtfs/), licence listed as CC BY 4.0, producer Administration des transports publics. The page notes that the stated update frequency is not always respected. | Small and easy, but one small city: little visual range, rail and bus only. |
| Oslo (Entur national feed) | Entur publishes national open data; its developer portal moved to developer.entur.no and the pages for the feed and licence were not reachable during this spike. | Not verified, so not chosen. |
| French cities on transport.data.gouv.fr | One feed per network, with licences that differ per dataset (Licence Ouverte, ODbL and others). | Each would need its own licence check; no single feed stood out over Helsinki. |

The HSL open data page answers automated fetches with a bot challenge. The licence statement above was confirmed from a search result quoting that page, the Helsinki Region Infoshare catalogue entries that list CC BY 4.0 for HSL data sets, and the sample-data package of the r5py project, which redistributes an HSL feed under CC BY 4.0. Before shipping, a person should open the HSL page in a browser and copy the attribution wording it currently asks for.

## Recommendation

Helsinki region, HSL feed. See [ADR 0001](../adr/0001-city-and-feed.md).

- Attribution on the page: the HSL name and the year of the feed, a link to the CC BY 4.0 licence, and a statement that the data was reduced to a representative service day. Map data attribution is separate ([map](map.md)).
- The feed is rebuilt about daily and holds a rolling window of a couple of months, so any processed snapshot records the feed version and the service dates it was taken from.
- The feed uses stop-to-stop `transfers.txt` only minimally, has no `frequencies.txt`, and gives every vehicle trip explicit stop times, which suits a timetable-based router.

## Spike measurement

Record of one run on 2026-11-03, reproducible with the commands in [data-pipeline](data-pipeline.md): the unzipped feed is close to a gigabyte, dominated by `stop_times.txt` with roughly ten million rows. A single weekday keeps a few tens of thousands of trips over roughly eight thousand stops.
