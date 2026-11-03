# Glossary

**Service day**: One calendar day of timetable, from its own midnight. Trips after midnight belong to the service day they started in and have times past 24:00.
_Avoid_: schedule day

**Day type**: Weekday, Saturday or Sunday, the three service days the snapshot keeps.
_Avoid_: calendar mode

**Snapshot**: The processed timetable files and manifest committed under `public/data/`.
_Avoid_: dump

**Route**: Trips that visit the same stops in the same order and never overtake one another, the unit the search scans.
_Avoid_: line group

**Round**: One pass of the search, allowing one more vehicle leg than the last.
_Avoid_: hop

**Travel time field**: The minimum travel time to every map cell from the chosen origin and time, painted as colour.
_Avoid_: heatmap

**Outline**: The curve where the field crosses 15, 30, 45 or 60 minutes.
_Avoid_: border
