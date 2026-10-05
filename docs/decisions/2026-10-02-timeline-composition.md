# Timeline composition

Date: 2026-10-02.

## Decision

Timeline composes temporal truth. It does not resolve temporal truth.

Time is the underlying space. Multiple established truths may describe the same time without one canceling the others.

Nothing established is not the same as available.

`projectTimeline` is a pure projection. It is not a table, a calendar event, a generic event, a screen, or a scheduling algorithm. V0-009 adds no migration.

The projection takes an explicit half-open civil range, the confirmed IANA time zone, and the Work schedule entries, Protected Time rows, Blocks, and Commitments the caller supplies. It returns the established facts that meet that range. It does not read a clock, the network, or the database.

## Sources

The four sources stay distinct:

| Semantic source | Meaning |
| --- | --- |
| `work_schedule` | I am scheduled to work during this time. |
| `protected_time` | I have made this time unavailable for allocation. |
| `block` | I have chosen what this time is for. |
| `commitment` | This time is constrained by something I have committed to. |

Semantic source kind is not provenance. A Commitment's `origin` remains `user_created`. That field says where the Commitment came from. `sourceKind: "commitment"` says the Timeline fact came from the Commitment primitive. Google Calendar is still not a source.

A Work shift is not rewritten as a Commitment. Opening, Mid, and Closing stay shift types. They are not priorities. The row identity of a Work fact is its civil date, because that schedule has one state per date and no separate id. Protected Time, Blocks, and Commitments keep their row ids.

## Range

The caller supplies `{ startsOn, endsBefore }`. `startsOn` is included. `endsBefore` is excluded. The range is not today, this week, or now.

A fact is included when its time meets that range, including when the stored row begins on the previous civil date. The existing timed model continues at most into the next civil date, so one previous civil day is the whole look-behind. The projection does not invent a longer shift. It also cannot see a row the caller did not pass, so a caller that loads rows for the range includes timed rows from the civil day before `startsOn`.

An all-day fact is included when its civil date is inside the range. It stays all-day. It is not stored or returned as 00:00–24:00.

A timed fact keeps its local start, local end, and owning civil date. When both ends map to instants in the confirmed zone, `bounds` is that full source interval and `intersection` is the half-open portion inside the requested range. Those are different fields. Clipping the intersection does not rewrite the source row.

If the stored end is exactly the next midnight, the interval ends there and does not occupy the next civil date. `endsNextCivilDate` still means the end is read on the next civil date. It does not by itself mean that date contains a positive duration.

## Unresolved time

A local time that does not occur in the confirmed zone is not given an instant. If either end cannot be mapped, the fact's `bounds` and `intersection` are unresolved, and the local text remains. The fact stays when the civil span it claims meets the range, including an overnight claim on the next civil date. A valid start is not kept beside a fabricated end.

A repeated local time uses the existing first round-trip from `instantFromZonedLocal`. The stored clock text stays as written. This tranche does not redesign that rule.

All-day truth does not depend on that conversion.

## Overlap

Overlap is a geometric fact. Conflict is an interpretation this projection does not make.

Work 08:00–17:00, a Block 10:00–11:00, and a Commitment 10:30–11:00 are three facts. Protected Time 08:00–14:00 and a Block 10:00–12:00 are two facts. The Block does not release, split, or shorten the Protected Time. No source outranks another. There is no winner, loser, warning, or merge.

## Order

Order is presentation support.

1. Owning civil date.
2. All-day before timed on that date.
3. Local start.
4. Source kind, only when the previous keys match: `work_schedule`, `protected_time`, `block`, `commitment`.
5. Source id.

A Friday-owned overnight shift sorts by Friday even when a Saturday range shows only its Saturday portion. The kind order is a tie-break. It is not importance.

## What this projection refuses

Work Off is not occupied time. A missing Work row is unknown Work schedule truth and is not occupied time. The projection does not manufacture a fact for either.

It does not label a gap free, open, or available. It does not emit an unestablished interval. Absence of a fact is the truth at this layer.

It does not calculate capacity, remaining time, utilization, or an allocatable window. It does not subtract intervals or union them.

It does not include Tasks, Today, Must Do, the Active Thread, reminders, recurring obligations, or Windows. A due date or a planned day does not make a Task a temporal interval.

It does not implement NOW. The input has no instant.

## Future evidence, not implemented

The temporal surface this projection is for is an editor, not a form-entry page. A later day resolution can offer a vertical time axis, select one or more spans, and establish Protected Time, a Block, or a Commitment. A week resolution is for the shape of the week: where time is already spoken for, where the user has chosen a purpose, and where nothing is established yet. A month resolution is broad orientation. Present-moment orientation is the lived instant. NOW-CONTRACT-001 later limited that composition to Current Temporal Orientation and the Active Thread. None of those screens are built here. Week, Month, and that experience later block operational adoption. This section still does not implement them. It does not authorize a next Commitment or a ranking. See [2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md) and [2026-10-04-present-moment-orientation.md](2026-10-04-present-moment-orientation.md).

Experience before this tranche also suggests a person may drag a Task into time. The Task would remain a Task, and the deliberate allocation would be a Block associated with that Task. That relationship is evidence only. It is not a schema and not a projection input.

Planned Tasks, reminders, occurrences, and Windows remain later composition sources. They are not part of this contract.

Google Calendar, Gemini, OAuth, and external sync remain deferred in this tranche. Operational adoption later requires a real interoperability boundary and does not require those connections. Gemini is not made part of the runtime.

## Context

Each temporal primitive was stored and projected alone. That kept Work Off, Protected Time, a Block, and a Commitment from being collapsed into one event. A later day, week, or month surface needs to ask which of those facts meet a requested civil period without deciding that one cancels another, and without treating silence as free time.

The earlier deterministic-intelligence decision says projections take the facts they need and a supplied instant. Timeline's time input is the requested civil range and the confirmed zone. An instant here would imply now. The function still does not read the clock.

The Schedule list classifiers can call an unresolved row past once its civil date is before yesterday, relative to a supplied instant. Timeline does not. A historical range still includes an unresolved fact whose claimed civil span meets that range.

## Consequences

- `projections/timeline.ts` is the composition. Schedule's separate lists are unchanged.
- No Timeline table, CRUD, or row-level security policy exists.
- Domain meaning survives the projection: shift type, label, purpose, Context id, title, and Commitment origin are carried on the matching fact.
- The first temporal canvas can render these facts in layers. It still must not treat an empty stretch as available. Capacity remains its own later meaning.

The tranche record is [../implementation/V0-009.md](../implementation/V0-009.md).
