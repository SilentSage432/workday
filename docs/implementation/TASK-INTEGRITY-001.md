# TASK-INTEGRITY-001 — Complete open-task reads

Date: 2026-10-04.

Baseline: `15820321c0a5fc8b03d07b3be41495726f4afec7`.

## Previous defect

`loadOpenTasks` performed one ordered select. PostgREST `max_rows` is 1000. The returned array was treated as every open Task. Today was projected from that array. A stopped page could be shown as the open set, as no open tasks, or as every open task planned today.

P0-INTEGRITY-001 already required a complete collection before a surface treats a read as the whole truth. This tranche applies that rule to open Tasks. It does not change Task meaning.

## Implementation

`loadOpenTasks` calls `readCompleteCollection` with the existing page size. The query is open tasks only (`completed_at` is null), with an exact count. Pages continue until the collected rows equal that count.

Creation order stays `created_at` ascending. `id` ascending is a pagination tie-break when two open tasks share that instant. Tasks created at different instants keep creation order. The tie-break is not importance and not a product rank.

A missing count, a short page before the count, a count that changes, a later page error, or a collected length that does not match the count throws. The prefix is not returned.

## Surfaces

`TaskLoop` is the only caller. Today is `projectTodayTasks` over the array that call returns. The open-task list and its empty copy render only when that load has succeeded and the surface is ready.

When the open-task read throws, the existing task error and retry are shown. The partial rows are not rendered. The screen does not say there are no open tasks, and it does not say every open task is planned today. A successful empty collection still uses that empty copy.

This time is unchanged. A failed open-task read never reaches the ready surface, so Today is not computed from a short page.

## Tests

`persistence/openTasks.test.ts` covers a collection larger than one page, order across that boundary, the id tie-break, an empty complete collection, a missing count, a short page, a later-page error, a changed count, and Today taken from the successful collection. `components/openTaskRead.test.tsx` covers the task error surface. The generic cases stay in `persistence/completeRead.test.ts`.

## Exclusions

No schema, migration, or dependency. No Task edit, removal, reopen, reschedule, or carry-forward. No Note, voice, NOW, Week, Month, Context change, recurrence, reminder, Pulse, Capacity, calendar, icon, or visual redesign. No change to This time.
