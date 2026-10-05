# MONTH-001 — Deterministic Month reading

Date: 2026-10-05.

Baseline: `04dd7aa121adb6f576ddb0884b47cdd8ba28e5e5`.

Contract: [../decisions/2026-10-05-month-contract.md](../decisions/2026-10-05-month-contract.md).

This implements the deterministic Month reading. It does not add a production interaction, a visual expression, a page, a route, a schema change, a migration, span selection, multi-context closure, progress, or a Capacity aggregate. Orient is not operationally ready. The Month surface is not built.

## Architecture

Two layers:

1. `projections/month.ts` receives complete facts, calls `projectTimeline`, and returns the Month result. It does not place facts. It does not know `SourceRead`. It does not call `projectWeekShape` or Capacity.
2. `components/monthReading.ts` owns evidence completeness, in the same fail-closed shape as `composeWeekShapeReading`. It withholds the result unless every required source is ready and the declared temporal load covers Timeline's look-behind.

Retrieval stays outside the pure projection. `persistence/citedTaskIdentity.ts` is the only new persistence operation. It reads identity and title for Tasks a caller names, including completed Tasks.

## Range

The caller supplies `{ startsOn, endsBefore }`. `startsOn` is included. `endsBefore` is excluded. The range is not the current month, a rolling month, a fiscal month, a Quarter, or a Year. It is not required to be about thirty days.

An invalid range throws the same error Timeline throws: "A timeline range must start before it ends." A date that is not a real civil date throws from the existing civil-date parser. Range selection stays with a future experience.

## Direction

Every retained Destination and every retained Priority is included. The reading does not filter them by `established_at`, the requested range, the current date, temporal structure, service relationships, Context, or activity. A Priority keeps `destinationId`. That ancestry is the Priority's. The reading does not create execution to Destination.

## Temporal structure

Participating temporal sources are Work shifts, Protected Time, Commitments, and Blocks. A Task-associated Block participates as the Block. An ordinary Task does not become a temporal fact.

Placement, overlap, ordering, look-behind, and unresolved bounds are Timeline's. `weekLoadedSpan` is that one-civil-day look-behind. The name is historical. The rule is Timeline's loading contract, so Month reuses it and does not extract a second window.

The outer reading refuses a complete result when the declared load misses that span.

## Execution-direction

Task to Priority pairs and Block to Priority pairs stay two collections. A pair is retained directional truth. It is not filtered by `establishedAt`, and it is not dropped because the cited execution does not occupy the requested range. A Block's `task_id` does not create either pair. Neither pair creates a Destination.

## Cited Tasks

`citedTasks` is `id` and `title` for Tasks named by a retained Task pair. Completed Tasks can be named. Uncited Tasks are omitted. `loadOpenTasks` is not used. The identity read selects `id, title` for the requested ids and does not filter `completed_at`. An empty request reads nothing.

A retained Task pair whose identity is missing, or whose identity read failed, makes the whole Month reading incomplete. The pair is not dropped.

## Result

`complete` carries `range`, `destinations`, `priorities`, `temporalFacts`, `taskPriorityService`, `blockPriorityService`, and `citedTasks`.

`incomplete` carries `status` and `message`. It does not carry a partial reading.

The result has no count, score, percentage, density, utilization, progress, health, alignment, trajectory, available time, empty-day object, or gap object. The projection is not persisted.

A complete reading whose `temporalFacts` are empty means no participating temporal structure meets the requested range. It does not mean free, unused, available, allocatable, or Capacity.

## Context and progress

The reading does not read or establish a current Context, and it does not filter direction or service pairs by Context. A Timeline fact may already carry `contextId`. That field is preserved and not interpreted. [../decisions/2026-10-05-multi-context-contract.md](../decisions/2026-10-05-multi-context-contract.md) decides that this neutrality is foundational. There is no current Context.

The reading does not derive meaning from how many pairs or Blocks exist, from Task completion, from duration, or from density.

## What this does not close

Span selection, Month interaction, Month visual expression, experience focus by Context, progress, and Capacity aggregation remain unresolved. The foundational Context meaning is [../decisions/2026-10-05-multi-context-contract.md](../decisions/2026-10-05-multi-context-contract.md).
