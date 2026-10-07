# ESTABLISHED-TRUTH-ALL-DAY-AUTHORITY-DISCOVERY-001

Discovery only. No runtime behavior changed. No migrations. No UI. No commits.

Baseline: `f30b5179c8b792f27fd5f6dc573ba2eeb63b0f2a` on `main` / `origin/main`. Working tree clean at discovery start.

Prior accepted work: [MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md](MOBILE-INTERACTION-REFINEMENT-ACCEPTANCE-001.md), [TASK-CLOCK-POINT-ACCEPTANCE-001.md](TASK-CLOCK-POINT-ACCEPTANCE-001.md), Work schedule on `/` ([WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md](WORK-SCHEDULE-AUTHORITY-PATH-ACCEPTANCE-001.md)). Prior inventory: [ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md](ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md) (partially superseded on timed civil-date edit; see §6).

---

## 1. Baseline

| Item | Value |
| --- | --- |
| HEAD | `f30b5179c8b792f27fd5f6dc573ba2eeb63b0f2a` |
| Branch | `main == origin/main` |
| Working tree | Clean at start |
| Production instrument | `/` → `OrientInstrument` → `OrientView` |
| Historical scaffold | `/schedule` → `WorkSchedule` + `BottomNav` |

---

## 2. Canonical question

> Can a human establish, inspect, correct, and remove every currently supported all-day temporal truth from production `/` without depending on `/schedule`?

**Answer: No.**

| Operation | Production `/` |
| --- | --- |
| Establish all-day Protected Time / Block / Commitment | **Missing** — establishment is timed-only |
| Inspect all-day facts | **Present** — Day / Present / Exact list / signature referral |
| Correct all-day facts (date, label/purpose/title, kind) | **Missing** — FactDetail has no Edit when `stored` is null |
| Remove all-day facts | **Present** — Delete this fact → Confirm delete → hard delete |

`/schedule` sections remain the sole production-reachable path for all-day **create** and all-day **edit** (including civil-date and kind change).

---

## 3. All-day domain inventory

Only three interval types support an explicit all-day temporal state. Work Off is **not** among them (see §13).

| Type | Table | Domain | Same row as timed? | Distinguisher |
| --- | --- | --- | --- | --- |
| Protected Time | `protected_time` | `domain/protectedTime.ts` `AllDayProtectedTime` \| `TimedProtectedTime` | Yes — one table, `kind` | `kind: "all_day"` + `starts_on`; timed adds `start_local` / `end_local`; optional `label` |
| Block | `blocks` | `domain/block.ts` `AllDayBlock` \| `TimedBlock` | Yes | `kind: "all_day"` + `starts_on`; required `purpose`; optional `context_id`, `task_id` |
| Commitment | `commitments` | `domain/commitment.ts` | Yes | `kind: "all_day"` + `starts_on`; required `title`; `origin: user_created` |

`defineProtectedTime` / `defineBlock` / `defineCommitment` accept `kind: "all_day" | "timed"`. Persistence `to*Write` maps all-day without inventing clock columns (`persistence/protectedTime.ts`, `block.ts`, `commitment.ts`).

No other domain type stores an all-day interval of this shape. Tasks use `planned_on` / `planned_local` (not all-day territory). Notes are not temporal territory.

---

## 4. Writer / authority inventory

| Writer | Path | Accepts all-day input? |
| --- | --- | --- |
| `createProtectedTime` / `updateProtectedTime` / `deleteProtectedTime` | `persistence/protectedTime.ts` | Yes (via `ProtectedTimeInput`) |
| `createBlock` / `updateBlock` / `deleteBlock` | `persistence/block.ts` | Yes |
| `createCommitment` / `updateCommitment` / `deleteCommitment` | `persistence/commitment.ts` | Yes |

Production wire: `OrientInstrument.onEstablish` / `onUpdate` / `onRemove` call those writers (`components/orient/OrientInstrument.tsx`).

Composition helpers on `/`:

| Helper | File | All-day? |
| --- | --- | --- |
| `establishFromSelection` | `components/canvasEstablishment.ts` | **No** — always `kind: "timed"` |
| `updateFromStored` | same | **No** — always `kind: "timed"` |
| Section drafts (`protectedTimeDraft`, `blockDraft`, `commitmentDraft`) | `components/*Draft.ts` | **Yes** — `kind` radio; `*InputFromDraft` → `define*` |

RLS: owner insert/update/delete on each table (existing migrations). No new grant required for all-day.

All-day ↔ timed: supported as **same-id** update when the draft/input sets a different `kind` (sections do this). Not supported by production FactDetail / `updateFromStored`.

---

## 5–8. Production `/` reachability (phone + desktop) and `/schedule`

Phone and desktop share the same establishment, FactDetail, and writers. Device symmetry holds for this gap.

### Capability matrix

| Truth / operation | Phone `/` | Desktop `/` | `/schedule` |
| --- | --- | --- | --- |
| All-day Protected Time create | No | No | Yes — `ProtectedTimeSection` |
| inspect | Yes | Yes | Yes (section list) |
| correct | No | No | Yes — section edit (date, kind, label, times) |
| remove | Yes | Yes | Yes — section remove |
| All-day Block create | No | No | Yes — `BlocksSection` |
| inspect | Yes | Yes | Yes |
| correct | No | No | Yes (date, kind, purpose, Context; Task citation preserved on edit, not offered on new draft) |
| remove | Yes | Yes | Yes |
| All-day Commitment create | No | No | Yes — `CommitmentsSection` |
| inspect | Yes | Yes | Yes |
| correct | No | No | Yes |
| remove | Yes | Yes | Yes |
| Timed PT/Block/Commitment create | Yes — Exact / Day establishment | Yes | Yes — Day canvas + sections |
| Timed inspect / correct / remove | Yes | Yes | Yes (canvas + sections) |

### Establish (production `/`)

- Path: Day Exact / Day field selection → `EstablishmentSurface` → `establishFromSelection` → `onEstablish` → `create*`.
- Phone ADD → **Time on the day** routes to Day/Present Exact (`OrientView.routeTimeOnTheDay`) — still the same timed establishment.
- **Never** builds `kind: "all_day"`.

### Inspect (production `/`)

- All-day facts project into `DayCanvasModel.allDay` (`projections/dayCanvas.ts`).
- Phone Present/Day: membership buttons (`PhoneContinuity`).
- Desktop Present/Day: membership (`DesktopReading`).
- Exact Day: all-day region (`DayField`).
- Referral opens `InspectionSurface` / `FactDetail`.

### Correct (production `/`)

- `describe()` for all-day listed facts returns `stored: null` (`Surfaces.tsx`).
- Edit button is gated on `stored` → **no Edit** for all-day.
- Confirmed by `components/orient/civilDateCorrection.test.tsx` (“does not give an all-day fact this edit”).
- Timed facts can edit civil date + clocks via FactDetail + `updateFromStored` (civil-date correction tranche since the older ESTABLISHED-TRUTH discovery).

### Remove (production `/`)

- `removable` for PT/Block/Commitment; does not require `stored`.
- “Delete this fact” → “Confirm delete” → `onRemove` → `delete*` hard delete.
- No undo / tombstone / history.

### `/schedule` unique (for this gap)

| Capability | Only on `/schedule`? |
| --- | --- |
| All-day create (three types) | **Yes** (sections) |
| All-day edit / kind change / civil-date change | **Yes** (sections) |
| Timed create/edit/delete | No — duplicated on `/` |
| Work week management | No — accepted on `/` |
| QuickCapture | No — Capture / direct Task on `/` |
| Confirmed IANA zone **save** UI | **Yes** — `WorkSchedule` calls `saveTemporalSettings`; `/` only **reads** zone via `loadTemporalSettings` |
| BottomNav Tasks/Schedule chrome | Scaffold-only |

`/` does not link to `/schedule` (`orientView` tests). URL still opens the scaffold.

---

## 9. Establish / inspect / correct / remove matrix (summary)

See §5–8 table. Net: **inspect + remove** without `/schedule`; **establish + correct** still depend on `/schedule` for all-day.

---

## 10. Same-ID correction findings

| Path | Same row/id? |
| --- | --- |
| Timed FactDetail Save | Yes — `update*` with same id |
| `/schedule` section Save | Yes — `update*` with draft including new `startsOn` / `kind` |
| All-day FactDetail | N/A — no Edit |
| Delete + recreate | Always possible but **not** the intended correction path |

---

## 11. All-day ↔ timed conversion findings

| Path | Supported? |
| --- | --- |
| Domain + persistence | Yes — write either kind on same id |
| `/schedule` sections | Yes — kind radio |
| Production FactDetail / `updateFromStored` | **No** — forces timed; all-day never enters edit |

No product decision here that conversion *must* be offered on `/`. Evidence: conversion is already identity-preserving in writers/sections; production simply does not expose it.

---

## 12. Removal / reversal findings

| Concern | Finding |
| --- | --- |
| Remove exposed on `/` for all-day | Yes |
| Confirmation | Two-step confirm |
| Canonical delete | Hard delete |
| Reversal / undo | None |
| Provenance/history | None beyond gone row |
| Phone vs desktop | Same |

---

## 13. Work schedule boundary

Work is `work_schedule_days`: Scheduled / Off / Unknown (absent).

- Off is explicit schedule truth, not a Protected Time / Block / Commitment all-day row.
- Work management is already on `/` (accepted).
- Do not fold Work Off into this all-day interval gap.

---

## 14. Projection findings

When all-day rows exist, projections already work:

| Surface | Behavior |
| --- | --- |
| Timeline | `allDay: true`, `intersection: { status: "civil" }` — not a fake 00:00–24:00 interval (`projections/timeline.ts`) |
| Day canvas | Listed in `model.allDay` |
| Present / Day phone & desktop | Membership “All day” |
| Week / Month | Timeline facts of those kinds participate as civil / territory per existing contracts |
| Capacity | All-day facts have no clock coverage contribution (`projections/capacity.ts`) |

**Projection is not the gap.** Do not redesign readings to “fix” missing create/edit reachability.

---

## 15. `/schedule` retirement conditions

### A. Production `/` must gain

1. All-day **establish** for Protected Time, Block, Commitment (reuse `create*` + define*/draft semantics; not Exact-minute selection alone).
2. All-day **inspect→edit** same-id correction (civil date, type fields, optional kind change if product keeps section parity) — requires FactDetail/`stored` (or equivalent) for all-day, not only timed `DayCanvasStoredFact`.

### B. Already duplicated on `/`

Timed establish/inspect/correct/remove; Work week operation; Task/Note create; Capture for undeclared expression.

### C. Historical / scaffold no longer needed for core field

`DayCanvas` on `/schedule`, BottomNav, QuickCapture duplicate, section chrome once A is met.

### D. Still uniquely necessary until separately addressed

- All-day create/edit (this discovery’s core A).
- Confirmed time-zone **write** UI (`saveTemporalSettings`) — orthogonal to all-day intervals but blocks “retire `/schedule` entirely” unless zone save moves or is accepted elsewhere.

---

## 16. Exact missing authority / reachability

| Gap | Class |
| --- | --- |
| No all-day create on `/` | Reachability — writers exist |
| No all-day Edit on `/` | Reachability / timed-shaped FactDetail composition — writers exist |
| `establishFromSelection` / `updateFromStored` timed-only | Composition helpers, not missing tables |
| `DayCanvasStoredFact` / `describe()` all-day → `stored: null` | Presentation/composition that blocks Edit |
| Zone save only on `/schedule` | Separate retirement blocker |

**Not missing:** schema for all-day; create/update/delete writers; inspect; remove; projections.

---

## 17. Minimum next tranche

Thin **reachability + composition** tranche on production `/`:

1. All-day establishment UI (e.g. Day-level “all day” establish, and/or ADD entry that does not pretend Exact minutes) calling existing `create*` with `kind: "all_day"`.
2. FactDetail (or sibling) edit for all-day listed facts: civil date + type fields; Save via `update*` with all-day input (extend or bypass timed-only `updateFromStored`).
3. Preserve Delete path.
4. Reuse section draft→input functions where clean; **do not** route operators through `/schedule`; **do not** delete+recreate.
5. Optional product choice: whether `/` offers all-day↔timed conversion in v1 (writers already allow).

Defer: `/schedule` page deletion, zone-save relocation (unless folded deliberately), recurrence, reminders, Work redesign, LOOK·ADD·ACT redesign, Android clock picker.

---

## 18. Verdict

### **B — Canonical authority exists; production reachability is incomplete**

**Rationale:** Domain, tables, and `create*` / `update*` / `delete*` already represent all-day Protected Time, Block, and Commitment. Projections and inspect/delete on `/` already work. The gap is that production establishment and FactDetail correction are timed-shaped, so humans still need `/schedule` sections to establish or correct all-day truth.

**Secondary (not C/D primary):** FactDetail/`updateFromStored`/`DayCanvasStoredFact` need a thin all-day composition path before Edit can save without forcing timed. That is composition to existing writers, not new schema (not D) and not absence of delete (removal works).

---

## 19. Evidence references

- `domain/protectedTime.ts`, `domain/block.ts`, `domain/commitment.ts`
- `persistence/protectedTime.ts`, `persistence/block.ts`, `persistence/commitment.ts`
- `components/canvasEstablishment.ts` (`establishFromSelection`, `updateFromStored`)
- `components/orient/Surfaces.tsx` (`FactDetail`, `describe`, EstablishmentSurface)
- `components/orient/OrientView.tsx` / `OrientInstrument.tsx`
- `components/orient/PhoneContinuity.tsx`, `DesktopReading.tsx`, `DayField.tsx`
- `components/ProtectedTimeSection.tsx`, `BlocksSection.tsx`, `CommitmentsSection.tsx` + `*Draft.ts`
- `components/WorkSchedule.tsx`, `app/schedule/page.tsx`, `components/AppFrame.tsx`, `components/BottomNav.tsx`
- `projections/timeline.ts`, `projections/dayCanvas.ts`, `projections/capacity.ts`
- Tests: `civilDateCorrection.test.tsx` (all-day no Edit), section tests, `timeline.test.ts`, `dayCanvas.test.ts`
- Prior: `ESTABLISHED-TRUTH-ACTION-AUTHORITY-DISCOVERY-001.md`, `MOBILE-LOOK-ADD-ACT-IMPLEMENTATION-PLAN-001.md` (all-day not advertised in ADD)

---

## Relationship to Orient principles

| Principle | Finding |
| --- | --- |
| Human authority | All-day writes exist; `/` does not offer create/edit acts |
| Same-id correction | Writers preserve id; sections use them; FactDetail does not for all-day |
| Sovereign types | PT / Block / Commitment stay distinct; Work Off stays separate |
| Unestablished ≠ available | Untouched |
| Phone continuity vs desktop spatial | Same all-day gap on both |

---

## Git status at discovery write

```
On branch main
HEAD: f30b5179c8b792f27fd5f6dc573ba2eeb63b0f2a
main == origin/main

(this file is the only intended addition; do not commit in this discovery turn)
```

End of discovery. No implementation performed.
