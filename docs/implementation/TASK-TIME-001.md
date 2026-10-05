# TASK-TIME-001 — Time given to a Task

Date: 2026-10-05.

Baseline: `2c1256a6f3faf0707625302f28dec661576f7b9e`.

This implements [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md). It does not change that contract.

## Storage

`blocks.task_id` is a nullable uuid. Null means the Block does not refer to a Task. A value is the Task this Block was chosen for.

The column is not unique. Many Blocks may refer to one Task. The Task does not store those Blocks.

`tasks` already has `unique (id, user_id)` from the Active Thread migration. The new foreign key is `(task_id, user_id)` referencing `tasks (id, user_id)`, `match simple`, `on delete no action`, `deferrable initially deferred`. No new uniqueness constraint was added. No grant was added. Existing Block row-level security is unchanged.

`ON DELETE NO ACTION` does not delete the Block, does not clear `task_id`, and does not change the purpose. A committed delete of a cited Task fails, and the Block row stays as it was. The check is deferred so account removal can delete that user's blocks and tasks in one transaction. That deferral is not a Task-removal operation. Task-removal semantics remain unresolved.

The migration is `supabase/migrations/20261005092200_block_task.sql`. Hosted application and device acceptance are recorded in TASK-TIME-001A below.

## Domain and persistence

`Block.taskId` is `string | null`. `Task` gains no Block list, no start, no end, and no duration.

Purpose stays the user's words. The Task title is not copied into it. Creating or updating a Block does not write `planned_on`, Must Do, a due date, completion, or the Active Thread.

`createBlock` and `updateBlock` remain one write to `blocks`. An update includes `task_id`, so moving a Block keeps the reference that was supplied with that write. Completing a Task still writes only `completed_at` on `tasks`.

## Scaffold

The time-first Block establishment on the day canvas can optionally cite one open Task. The choice is empty until the human selects one. Save is still the write. Leave and Cancel write nothing. A failed write is not success.

Open Tasks come from the existing complete `loadOpenTasks` read, in that function's order. A failed read is shown as a failure. It is not an empty task list. The human can still establish a Block with no Task reference. Selecting a Task does not change the purpose.

Task-first placement is the same canonical Block. This tranche does not implement that gesture.

## Projections

A Task-associated Block remains a Block in Timeline and in Current Temporal Orientation. `taskId` travels with that Block. The Task is not a separate member. Overlap is unchanged. Capacity is not calculated.

## Not done

Capacity, drag and drop, Task-first gesture, Week, Month, recurrence, reminders, Pulse, reschedule, carry-forward, Start, Adjust, Skip, Task removal, and the final interaction remain unresolved.

## TASK-TIME-001A

Date: 2026-10-05.

Baseline: `1d0ac4f097a27ef3627eb0a96df96f2939314bfd`.

This section records hosted schema evidence and primary-device acceptance. It does not change the scaffold.

### Hosted schema

At the implementation commit the migration was authored and not yet applied. It was then applied manually to the canonical Orient Supabase project `ksmhgaamyheyhefbyglb`.

Direct inspection of that database showed:

| Observation | Value |
| --- | --- |
| `column_name` | `task_id` |
| `data_type` | `uuid` |
| `is_nullable` | `YES` |
| `constraint_name` | `blocks_task_same_owner` |
| `constraint_definition` | `FOREIGN KEY (task_id, user_id) REFERENCES tasks(id, user_id) DEFERRABLE INITIALLY DEFERRED` |

The displayed constraint definition did not repeat `MATCH SIMPLE` or `ON DELETE NO ACTION`. Those clauses are in the committed migration that was applied. Hosted persistence now supports Block to zero or one Task, with same-owner enforcement. `task_id` is not unique, so many Blocks may refer to one Task. Task-removal semantics remain unresolved.

### Samsung Galaxy S26 Ultra

The deployed production path was exercised on the Samsung Galaxy S26 Ultra:

Schedule, Day, select a temporal range, "Choose a purpose", Block, independently enter the Block purpose, scroll within the selected-time panel, Task, select an existing open Task, Save.

The optional Task field exists on that Day-canvas Block establishment path. "None" is the no-association choice. When there were zero open Tasks, the selector contained only "None". After the user explicitly created an open Task, that Task became available for selection. Task association remained optional. Save established the Block. The Block appeared through the production path.

Block movement and adjustment were not part of this phone exercise. Task-first placement, drag and drop, and the final interaction were not tested. This acceptance is the semantic and runtime scaffold proof. It is not the production experience.

### Hosted relationship

After that establishment, a hosted query joined `blocks.task_id` to `tasks.id` for the same user and returned:

| Field | Value |
| --- | --- |
| `block_id` | `c25995ab-8856-416d-b65f-4aeb0f245dce` |
| `block_purpose` | `Test` |
| `task_id` | `dc4e7dbf-3c40-4c7f-bd01-596351b5de4c` |
| `task_title` | `Test` |

The Block persisted. `task_id` persisted non-null. The Task relationship resolves in the canonical hosted database.

The user authored both the Block purpose and the Task title as "Test". That row does not, by itself, prove that the two strings are independent. Domain and runtime storage keep Block purpose and Task identity separate. The TASK-TIME-001 tests prove that selecting a Task does not copy or replace the independently authored purpose. The production probe proves the relationship persisted and resolves. No further phone retest is required merely to use different strings.

### Discoverability

The user first reported that no optional Task selector was visible. Read-only diagnosis of commit `1d0ac4f097a27ef3627eb0a96df96f2939314bfd` found the selector in the production Day-canvas path. It is the last field before Save in the selected-time Block form. That panel is constrained to about 28rem and scrolls internally. No responsive branch removes the selector. A successful empty open-Task collection still renders the selector with "None". Orient has no service worker and no application-shell cache. The user then scrolled the selected-time panel and found the selector.

That is EXPERIENCE-001 evidence: a semantically correct control may still be spatially undiscoverable in the engineering scaffold. This tranche does not patch or redesign it. It supports the existing spatial-continuity and comprehensibility evidence for the eventual production experience.

### Accepted scope

Accepted for the scope of [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md):

- A Block refers to zero or one Task.
- Zero to many Blocks may refer to one Task.
- An ordinary Block with no Task remains valid.
- Block purpose remains independently human-authored.
- A Task receives no temporal fields.
- `planned_on`, Must Do, due, completion, and the Active Thread stay independent.
- Current Temporal Orientation continues to contain the Block as a Block.
- Optional `taskId` may travel with that Block reading.
- The Task is not a separate temporal-orientation member.
- No ranking, inference, or availability meaning was introduced.
- No automatic mutation runs between Task and Block.

### Still unresolved

The final Task and time interaction, Task-first placement, drag and drop, direct manipulation, and the final phone and desktop expression remain for EXPERIENCE-001 or later. What Task removal does to Blocks that cite the Task remains an independent lifecycle question. Start, Adjust, and Skip remain unresolved. Capacity and availability remain unresolved. No allocator or scheduler is defined. Capacity is the next structural territory. This acceptance does not make Orient operationally ready.
