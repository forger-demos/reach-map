# Recorded comparison with the operator's planner

Status: accepted

## Context

The planner's API needs a subscription key and its website blocks automated fetches. Method is in [validation](../research/validation.md).

## Decision

Keep a fixed list of sample trips in the repository, a command that prints our door-to-door times, and a record file of the planner's times with the date checked and the feed versions. State a tolerance (start at five minutes) and report every difference.

## Consequences

- Operator times are entered by a person or a scripted browser, never by a live dependency.
- The record shows when it was last checked, so staleness is visible.
- The walking constants are calibrated once against this list.
