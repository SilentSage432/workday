# RECURRING-TASK-IMPLEMENTATION-001

Date: 2026-10-08.

Baseline HEAD: `59e53d1d5031debb4aff6d5a60bc06e6313ce298` (main).

## Purpose

Weekly Recurring Task definitions materialize ordinary Task occurrences for each Lowe's fiscal week once availability arrives.

## Model

Recurring Task Definition → materialized ordinary Task (provenance link).

No Task reset. No Work Scheduled gate. Materialization uses actual local civil now only.

## Canonical cases

| Definition | Available | Due |
| --- | --- | --- |
| Complete bay audits | Saturday | Wednesday |
| Complete cycle counts | Sunday | Wednesday |

## Schema

Migration: `supabase/migrations/20261008120000_recurring_tasks.sql`

- `recurring_task_definitions`
- `recurring_task_occurrences`
- RPC `ensure_recurring_task_occurrence` (SECURITY INVOKER, unique-race safe)

Hosted migration not applied in this tranche.

## Surfaces

- ADD → Recurring Task
- LOOK → Recurring Tasks (manage / edit / Stop recurring)

## Civil boundary correction

**RECURRING-TASK-CIVIL-BOUNDARY-CORRECTION-001:** establishment eligibility uses
`civilDate(established_at, orientTimeZone) >= weekEnd`, not UTC midnight of the
next Saturday. RPC takes `p_time_zone` and applies the same civil law.

## Deferred

Monthly, RRULE, cron, notifications/Web Push, due clock, occurrence browser, Class-A realtime for definition tables.
