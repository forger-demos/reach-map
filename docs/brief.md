# Brief: how far can I get in 30 minutes

I want to click anywhere in a city and see, instantly, everywhere I can reach by public transport and walking in 15, 30, 45 and 60 minutes, leaving at a time I choose.

## What I want to see

- A map of one real city with travel time painted on it from the point I click: a smooth colour field, plus outlines at 15, 30, 45 and 60 minutes.
- A departure time picker; the shape changes visibly between 8am on a weekday and 11pm on a Sunday.
- A comparison mode: two points side by side, or the same point at two times, with the difference highlighted.
- Hover anywhere to see the fastest journey from the clicked point: walk, which lines, changes, total time.
- A one-paragraph story the page can tell about the city, for example which areas are best connected, computed from the data rather than written by hand.

## What makes it right

- Uses an open, properly licensed timetable feed, attributed on the page. The research picks the city: open data, a reasonable size, and a licence that allows this.
- Journey times agree with the operator's own journey planner within a few minutes on a fixed set of sample trips, recorded with the date checked.
- The routing algorithm is pure, tested code with small hand-built timetables as fixtures; tests never touch the network.
- Clicking gives a result in under a second in the browser.

## Constraints

No API keys and no paid services; the base map comes from an open source whose usage policy allows it, attributed. The processed timetable ships with the app or is built from the feed by a command. Works on a phone and a laptop, light and dark.

## How to start

Research before building: the city and feed, the routing algorithm (RAPTOR or alternatives), walking access, how to preprocess and ship the data, and how to draw the map. Write it down with sources, decide, then plan the build as small slices that each end in something I can see, and start building straight after.
