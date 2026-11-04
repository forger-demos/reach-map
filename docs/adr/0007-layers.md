# Pure core, shell and ui layers

Status: accepted

## Context

The brief asks for pure, tested maths and data logic apart from rendering. The architecture pack enforces an import map from `.forger/architecture.json`.

## Decision

Three layers: `src/core` is pure (routing, timetable layout, walking, field, contours, journeys, story) and imports nothing from the other layers; `src/shell` holds input and output (feed reading, the build command, the server) and may import core; `src/ui` holds browser rendering and may import core.

## Consequences

- Core tests need no network, files or DOM.
- A rule about where code may go is checked by the `arch` gate, not by memory.
- The ui layer cannot import the shell, so it receives data through plain values.
