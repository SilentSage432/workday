# RECURRING-STEWARDSHIP-PERSISTENCE-IMPLEMENTATION-001

Date: 2026-10-08.

Baseline: `2ade69a4336f6147d8c29570b643dbc60506c50f`.

## Purpose

Establish the smallest durable foundation for human-established recurring stewardship: definitions, append-only wording revisions, retirement, derived occurrence identity, satisfaction Facts, and withdraw correction. No production UI. No ACT wiring.

## Accepted semantic contract

Prior discoveries:

- WORK-OPERATING-CADENCE-DISCOVERY-001
- RECURRING-STEWARDSHIP-CONTRACT-001
- RECURRING-STEWARDSHIP-PERSISTENCE-CONTRACT-001
- RUN-THE-BUSINESS-PROJECTION-DISCOVERY-001

Recurring Stewardship is a durable repeating responsibility. It is not a Task, MustDo, Active Thread, Note, Opening/Mid/Closing Cadence step, metric, or employee assignment. Satisfaction means only that the human established sufficient attention for one occurrence. Unsatisfied means only not yet satisfied this cycle.

## Persistence model

Model B:

| Table | Role |
| --- | --- |
| `stewardship_definitions` | Durable identity, `cycle_kind`, optional `context_id`, `established_at`, `retired_at` |
| `stewardship_definition_revisions` | Append-only wording with `effective_at` |
| `stewardship_satisfactions` | Satisfaction Fact keyed by occurrence identity |

There is **no** `stewardship_occurrences` table.

## Why occurrences are derived

Occurrence identity is `(definition_id, cycle_kind, cycle_key)`. Materializing every relevant cycle would require generation machinery, risk inventing Off/unknown obligations, and add operational complexity without extra truth. Satisfaction is the only human Fact that must persist per occurrence.

## Cycle kinds

Closed V1 set:

- `workday` — cycle key = Scheduled `work_on`
- `lowes_fiscal_week` — cycle key = Lowe's Saturday-first fiscal week start

No RRULE. No cron. No generic recurrence engine.

## Revision / history rule

Occurrence wording = latest revision with `effective_at <= cycle_start`. Mid-cycle edits append a revision; the current occurrence keeps prior wording; the next cycle sees the new wording. Old revisions are not updated or deleted through authenticated product authority.

## Satisfaction / withdraw

Unique on `(user_id, definition_id, cycle_kind, cycle_key)`. Duplicate satisfy is idempotent and preserves the first `satisfied_at`. Withdraw deletes that Fact; missing Fact is a no-op success. No correction-history table.

## Work relationship

Workday relevance: Scheduled admits; Off and missing do not. Overnight uses the operative Scheduled `work_on` (midnight does not create a second occurrence). Work contextualizes relevance only; Scheduled is not stewardship meaning.

## Fiscal-week relationship

Weekly identity uses existing `workFiscalWeekStart` / `workFiscalWeekContaining`. A weekly occurrence can remain relevant on an Off day in persistence/reconstruction. Future ACT primary visibility is separately gated by Scheduled (`actPrimaryEligible` on the projection helper). This tranche does not wire ACT.

## RLS / authority

Authenticated own-row only. Definitions: select, insert, update (retirement). Revisions: select, insert. Satisfactions: select, insert, delete (withdraw). No authenticated delete on definitions. No anon/public writes. Same-owner Context FK on definitions; same-owner definition FKs on revisions and satisfactions.

## Domain / persistence / projection

- `domain/stewardship.ts` — types, cycle keys, intervals, active overlap, wording resolution
- `persistence/stewardship.ts` — establish, edit forward, retire, satisfy, withdraw, loads
- `projections/stewardship.ts` — operative workday key, admission/relevance, ACT primary eligibility helper, occurrence reading

## Tests

- `domain/stewardship.test.ts`
- `projections/stewardship.test.ts`
- `persistence/stewardship.test.ts` (includes migration/RLS source assertions)

## Explicit deferred scope

ACT UI and ordering, checkbox interaction, stewardship editor surfaces, Business/Inventory/People/Environment categories, employee/zone models, metrics/scoring/gamification, reminders/notifications, Class-A realtime publication for these tables, Bay Audits deadline/availability fields, unretire, broad Cadence / Recurring Obligation prose rename.
