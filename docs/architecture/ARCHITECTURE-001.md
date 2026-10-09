# ARCHITECTURE-001 — minimum usable architecture

Date: 2026-10-02.

This is the architecture for V0. It does not scaffold the app, choose a NOW ranking, or change product semantics. Product authority remains the canonical documents. [FOUNDATION-003.md](../discovery/FOUNDATION-003.md) defines what V0 is. NOW-CONTRACT-001 later refused a ranking for the first present-moment composition. That composition is Current Temporal Orientation and the Active Thread. It is not built here. The decision is [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md).

Operational adoption is not this document's first deploy or first day of use. That boundary is [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md). Deferred items below are what ARCHITECTURE-001 refused to build. They do not waive voice, Week, Month, Capacity, a truthful read path, or a later production experience where the contract says those block adoption. Push delivery, a service worker, and connecting every external system remain outside that requirement.

Decisions made here are recorded in [../decisions/](../decisions/README.md).

## What this architecture is for

One person. Phone and desktop. Durable state on both. Mobile-first capture and orientation. Production deployment when bootstrap runs.

The system stays small. There is no second backend, no microservice split, no event bus, and no generic integration platform.

## Accepted stack

| Piece | Decision | Why it is the smallest fit |
| --- | --- | --- |
| UI runtime | Next.js App Router, React, TypeScript | One web app for phone and desktop. TypeScript keeps domain facts distinct. A server runtime exists for secrets and future adapters without a second service. |
| Styling | Tailwind CSS | Mobile-first styling mechanism. Not a visual design system. |
| Data and auth | Supabase Postgres and Supabase Auth, in a dedicated project | Durable cross-device rows, one-user access control, no shared database with other products. |
| Host | Vercel, production from GitHub `main` | Matches the Next.js app and the existing GitHub repository. |
| Tests | Vitest for pure domain and projection functions | The behavior that must not drift is deterministic and does not need a browser. |
| Install surface | Web app manifest, mobile viewport, home-screen metadata | Phone use without a native app. |

Versions are the current stable releases at bootstrap time. This tranche does not pin version numbers it has not installed.

### Why not a client-only app

A Vite single-page app plus Supabase would serve V0 reads and writes. It would not give a safe place for Google OAuth client secrets or refresh tokens. Those must never ship to the browser. Next.js is accepted because that server boundary is already a known requirement, not because V0 reads must pass through it.

V0's hot path does not use that server. The browser talks to Supabase under row-level security. NOW is computed on the device from facts already loaded.

### Rejected

- A separate API service, GraphQL layer, ORM requirement, or Redis
- A generic event table or event-sourcing log
- Firebase or another database, which would not simplify distinct domain tables
- Public multi-user registration, roles, or teams
- Native mobile and watch applications
- AI, LLM, or ML services
- A speech provider
- A push-notification provider
- Service-worker offline sync
- Realtime subscriptions
- DeptSync, Wealth Engine, and Carb Buddy coupling, including any shared Supabase project
- A `develop` or staging branch as a required flow

### Deferred

These are deferred from the V0 architecture tranche. [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md) is the later adoption classification. Speech acquisition on the primary phone is proven by device dictation and does not block as an unbuilt speech system. The present-moment experience, Capacity's interaction, and a production visual experience still block operational adoption even though this list refused to build them here. The bounded Capacity meaning is [../decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md). [../implementation/CAPACITY-001.md](../implementation/CAPACITY-001.md) implements the deterministic reading and does not add a production interaction. The composition itself is later decided and is not a ranking. Push, offline queues, a cadence editor, and watch surfaces stay non-blocking unless a later decision says otherwise.

- Google Calendar implementation, OAuth, and write-back
- Push delivery and watch surfaces
- Voice capture. No grammar is established. The establishment contract is [../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md).
- Offline mutation queues
- A cadence editor, window editor, and workspace administration
- NOW ranking policy. Later refused for the first present-moment composition. No `rankNow` is authorized. The experience remains unbuilt.
- A visual design system

## Client and server boundary

| Concern | Where it lives |
| --- | --- |
| Domain snapshot read and write | Browser Supabase client, user session, row-level security |
| NOW, Timeline, Today, Pulse content, Resume presentation, shift position, fiscal-week placement | Deterministic client projection over the loaded snapshot and an injected clock |
| Secrets, future Google token exchange, future provider webhooks | Next.js server only |
| Persistence of user-owned facts | Supabase Postgres |
| External calendar cache, when it exists | Server-side adapter writing a separate external-fact store, never a client-held token |
| First session phase of the shell | Browser client's `getSession`, then `onAuthStateChange` for later changes. A failed initial read stays a failed check. [../implementation/AUTH-BOOTSTRAP-RELIABILITY-001.md](../implementation/AUTH-BOOTSTRAP-RELIABILITY-001.md) |

Passing time is not a reason to refetch. A local tick may re-run the projection. A refetch happens when the user writes, when the app regains focus, or when a future adapter finishes a sync.

Capture may update the local snapshot immediately and then persist. If the persist fails, the failure stays visible. V0 does not queue that write for later. V0-017's typed capture builds that write with `newTaskFromCapture` and persists it with `createTask`. It does not write the Active Thread or a temporal fact. The decision is [../decisions/2026-10-03-quick-capture.md](../decisions/2026-10-03-quick-capture.md).

## Deterministic temporal engine

The engine is a set of pure functions. It takes a domain snapshot and a clock. It returns projections. It does not read the network, the system clock, or the database itself. Tests pass the clock in.

Conceptual boundary, not implementation. The `now` field below is the 2026-10-02 sketch. It is not the present-moment composition. That composition is Current Temporal Orientation and the Active Thread, and it is not this function.

```ts
project({ snapshot, clock }): {
  now: NowProjection
  timeline: TimelineProjection
  pulse: PulseProjection
  resume: ResumeProjection
}
```

`clock` carries an instant, the user's time zone, and an operational date. The operational date is an input so tests stay honest. It is not a product decision that a life-day is midnight to midnight. What a day means is still unresolved in the product.

The snapshot may include current time only via the clock, plus Contexts, Commitments, Blocks, planned Tasks, due boundaries, MUST DO, reminders, the Active Thread, Work shifts, Work Windows, and recurring-obligation definitions with their completion records. That list is what the engine may be given. It is not the input list of present-moment orientation.

The engine must not:

- call an AI or LLM. This exclusion is an architectural constraint, recorded in [../decisions/2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md). It is not a V0 deferral.
- invent meaning for unparsed speech
- write or mutate source truth because time passed
- mark a target or an objective as a deadline
- turn a Block into a Task
- replace the Active Thread because a Block or shift boundary was reached
- emit punitive status language

A deadline and a target may each be reported as factually past. Those are different fields. There is no single `overdue` flag.

### Ranking seam

Superseded for the first present-moment composition by [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). That composition is Current Temporal Orientation and the Active Thread. It is not `NowProjection`, and it has no `rankNow`. The paragraphs below record the 2026-10-02 sketch. They are not authority to group Must Do, due facts, or reminders into the present moment, and they are not authority to add a ranking function.

`NowProjection` returns labeled groups: active thread, overlapping blocks, overlapping commitments, must-do tasks, due facts, reminders, and other established groups as the product already names them. It does not return one ranked list.

The only legal place for cross-group order is a future function, `rankNow`. That function does not exist yet. Components must not sort groups themselves. FOUNDATION-003 requires a useful NOW and also leaves the hierarchy undecided. The architecture keeps that tension visible instead of hiding an order in the UI. Those two sentences described an open hierarchy. The later contract closes it by refusing the hierarchy. Components still must not sort groups themselves.

Work cadence steps and Work windows such as Power Hour are constants in the domain module, compiled from [CADENCE.md](../../CADENCE.md) and [TIME_MODEL.md](../../TIME_MODEL.md). They are not user-editable tables in V0.

## Domain truth and projections

| Domain truth, persisted or held as product constants | Projections, not stored |
| --- | --- |
| Task, Note, Block, user-owned Commitment, Context, Active Thread, Recurring Obligation, completed or explicitly activated occurrence, Shift pattern, Protected Time, reminder, provenance, Work window and cadence constants | NOW, Today, Timeline, Pulse, Resume presentation, shift-relative position, capacity |

NOW is not a table. Timeline is not a table. Today is the set of tasks whose planned day is the operational date under consideration, not a stored bucket and not the Timeline. In V0-005 that date is the civil date of a supplied instant in the confirmed IANA time zone.

A Work shift is stored as a shift pattern. The projection may present that interval beside Commitments. It does not convert the shift row into a Commitment row. That storage question from FOUNDATION-003 stays open, and this choice avoids answering it by collapsing the tables.

V0-009 adds `projections/timeline.ts`. It takes a requested half-open civil range, the confirmed IANA zone, and already loaded Work schedule entries, Protected Time, Blocks, and Commitments. It returns those facts together without merging them, ranking them, or storing a timeline row. It does not read the clock. Planned Tasks are not part of this projection. A Block may refer to one Task. [../implementation/TASK-TIME-001.md](../implementation/TASK-TIME-001.md) stores that reference on the Block. This projection carries it with the Block and does not add a Task source. The migration is applied on `ksmhgaamyheyhefbyglb`. TASK-TIME-001A accepts the scaffold on the Samsung Galaxy S26 Ultra. The decisions are [../decisions/2026-10-02-timeline-composition.md](../decisions/2026-10-02-timeline-composition.md) and [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md).

V0-010 adds `projections/dayCanvas.ts`. It asks Timeline for one civil day and returns visual geometry for the canvas. That geometry is not a second composition and not a stored row. The decision is [../decisions/2026-10-02-day-canvas.md](../decisions/2026-10-02-day-canvas.md).

V0-011 adds `components/daySelection.ts`. It maps a pointer on that geometry to a transient local-clock range. The range is not a projection of stored facts, not a Timeline fact, and not a row. The decision is [../decisions/2026-10-02-direct-time-selection.md](../decisions/2026-10-02-direct-time-selection.md).

V0-012 keeps an intended meaning beside that range: protect the time, choose a purpose, or add a commitment. The meaning is interaction state in the same session. It is not a domain primitive, not a Timeline fact, and not a row. The decision is [../decisions/2026-10-03-temporal-meaning-choice.md](../decisions/2026-10-03-temporal-meaning-choice.md).

V0-012A draws that handoff over the day canvas and lets the same selection be refined by minute. The refined minutes are still the one transient selection. The decision is [../decisions/2026-10-03-contextual-temporal-handoff.md](../decisions/2026-10-03-contextual-temporal-handoff.md).

V0-013 turns that selection into an existing Protected Time, Block, or Commitment only when the user saves it. The canvas does not insert a row itself. Schedule calls the existing create functions and reloads the day. The decision is [../decisions/2026-10-03-explicit-temporal-establishment.md](../decisions/2026-10-03-explicit-temporal-establishment.md).

V0-016 adds `projections/currentTemporalOrientation.ts`. It takes a supplied instant, the confirmed IANA zone, and already loaded Work schedule entries, Protected Time, Blocks, and Commitments. It returns every one of those facts that contains the instant, still as separate facts. It does not rank them, store a row, or read Tasks or the Active Thread. It is not `NowProjection`. Together with the Active Thread it is the later present-moment composition. NOW-001 adds `projections/presentMomentOrientation.ts` for that composition and `components/presentMomentReading.ts` for the completeness gate. It does not add a route, a table, or `rankNow`. The experience is not built. The decisions are [../decisions/2026-10-03-current-temporal-orientation.md](../decisions/2026-10-03-current-temporal-orientation.md) and [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). The record is [../implementation/NOW-001.md](../implementation/NOW-001.md).

CAPACITY-001 adds `projections/capacity.ts` and `components/capacityReading.ts`. The question is an explicit civil date. A scheduled Work shift for that date may bound the reading. Protected Time, Commitments, and Blocks cover territory inside that boundary. The result is remaining intervals and elapsed milliseconds. It does not join Timeline, Current Temporal Orientation, or present-moment orientation. It stores nothing. There is no production interaction. The records are [../decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md) and [../implementation/CAPACITY-001.md](../implementation/CAPACITY-001.md).

## Persistence

Supabase Postgres is the durable store. This product gets its own Supabase project. That project must not be the one used by Wealth Engine, DeptSync, Carb Buddy, or any other TeamLab system.

No schema, migration, or project ref is created in this tranche.

Future tables follow the domain. They are not one event table. Expected categories:

- profile, including the IANA time zone
- context, seeded with Work, Family, TeamLab, and Financial
- task, with separate nullable planned date and due boundary, and a MUST DO flag
- note
- block
- user-owned commitment
- external temporal fact, only when a calendar adapter exists, separate from commitments
- active thread, the single current thread
- work shift pattern
- recurring obligation definition
- obligation occurrence, written when a period is completed or explicitly activated, not pre-generated into the future
- reminder
- provenance on the rows that have a source, not a general event log

Context membership is a single optional reference. Unassigned rows are valid. A join table would decide that an item may belong to several Contexts. That product question is still open, so the join table is not part of the architecture.

The browser uses the user session. The service-role key is not part of the V0 app path. It bypasses row-level security.

Migrations, when a later tranche adds a schema, are SQL files in the repository applied to this dedicated project. Dashboard-only edits are not the source of truth.

## Authentication

Supabase Auth. One account, created out of band. Public sign-up disabled. No roles, teams, or registration flow.

The daily method is email and password with a persisted session, so opening the phone app to capture does not wait on an email link. Google sign-in is not the app login. Later Google OAuth is calendar access only.

Every application table is protected by row-level security tying the row to `auth.uid()`. The anon key may ship to the browser. It cannot read rows unless a session passes those policies.

## Google Calendar boundary

An adapter behind `integrations/` is the only code that may know Google's API. The domain sees an external temporal fact: source name, external id, interval, and provenance. It does not see OAuth types.

Rules:

- User-owned commitments and external facts are different stores.
- A calendar event is not copied into a commitment, not turned into a reminder, and not marked user-owned.
- The timeline projection may show both, with provenance visible.
- Read and write-back are separate and both deferred. Bidirectional sync is not V0.
- Adapter failure leaves user-owned rows unchanged. A failed refresh does not delete internal truth and does not present a stale cache as a fresh read.
- Tokens and the client secret stay on the server. They are never in `NEXT_PUBLIC_` variables, never in the repository, and never in the browser bundle.

No OAuth flow is implemented in this tranche.

## Other systems

DeptSync and Wealth Engine are not dependencies, not shared databases, and not adapter interfaces in V0. A future integration would be another narrow adapter with the same provenance rule. There is no plugin framework for that possibility.

## PWA and offline

Required for the first deployed V0:

- mobile viewport
- web app manifest and home-screen metadata so the phone can install it
- a UI that assumes a phone first

Deferred:

- service worker
- precached app shell beyond ordinary HTTP caching
- offline create, edit, and sync

Explicitly not needed:

- native packaging
- background sync
- conflict resolution

If the snapshot is already loaded, projection continues during a blip without a request. A cold start while offline is unsupported. The app should fail that load visibly rather than invent a queue.

FOUNDATION-003 did not authorize PWA behavior. This tranche does, and only at the manifest level above.

## Pulse hosted establishment

Hosted Orient establishes that an explicitly authorized temporal condition became true (`pg_cron` + database evaluator on `ksmhgaamyheyhefbyglb`). Delivery surfaces only make that established occurrence perceptible. Physically accepted closed-client: Orient fully closed through threshold; reopen expressed the already-established occurrence. Future Android/Kotlin must not become the source of temporal truth, Interrupt Grant authority, Pulse eligibility, urgency, or recommendation. Record: [../implementation/ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md](../implementation/ORIENT-PULSE-HOSTED-ESTABLISHMENT-001.md).

## Pulse delivery transport (in progress)

Closed-app Android delivery uses FCM over already-established `pulse_occurrences`. Android is perception/delivery only.

- Token registration: `public.orient_device_push_tokens` hosted authority clear ([ORIENT-ANDROID-PULSE-BRIDGE-002](../implementation/ORIENT-ANDROID-PULSE-BRIDGE-002.md)).
- Trusted dispatcher: `POST /api/pulse/dispatch` re-reads occurrence ownership and sends FCM data `{ pulse_occurrence_id }` ([ORIENT-ANDROID-PULSE-BRIDGE-003](../implementation/ORIENT-ANDROID-PULSE-BRIDGE-003.md)).
- Database Webhook → dispatch autonomy accepted through zero-target (`no_targets` with empty token table).
- Native Android perception edge: `android/` package `com.teamlab.orient` — authoritative user-JWT reread, local exactly-once expression claim, one notification + one haptic ([ORIENT-ANDROID-PULSE-BRIDGE-005](../implementation/ORIENT-ANDROID-PULSE-BRIDGE-005.md)). Wear OS remains deferred. Physical device acceptance pending local Firebase client config handoff.

**NO AUTHORITATIVE REREAD = NO PERCEPTION CLAIM.**

Token rows and dispatch transport are not Pulse authority, acknowledgment, urgency, or perception evidence.

## Pulse, reminders, and notification delivery

Three separate things:

| Thing | Role | V0 |
| --- | --- | --- |
| Reminder | A stored explicit attention point | Persist it. Show it through projection. |
| Pulse | A projection that reorients: where, intended block, active thread, next commitment, open interval | In-app expression of established occurrences. |
| Delivery | Push / native perception of an already-established occurrence | FCM dispatcher + webhook autonomy accepted; Android perception edge in-repo; physical device acceptance pending. |

No empty adapter framework. Native delivery is not accepted until physical proof.

## Voice

The write path accepts an expression and an explicit establishment of one Task, one Note, or nothing. Typed text and text from a future speech adapter are the same expression. Unresolved meaning is legitimate and is not a stored transcript. The domain does not depend on a microphone or a vendor. No grammar and no provider are chosen.

What a Note means, and that a Task is not inferred from a Note, is established in [../../DOMAIN.md](../../DOMAIN.md). The minimum representation is [../decisions/2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md). The establishment boundary is [../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md). Speech acquisition on the primary phone is device dictation into that expression. [../implementation/VOICE-PROBE-001A.md](../implementation/VOICE-PROBE-001A.md) passed. No speech subsystem was added. Candidate interpretation is not establishment. See [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md). [../discovery/VOICE-CAPABILITY-001.md](../discovery/VOICE-CAPABILITY-001.md) compared other mechanisms and does not select them. Provider selection and a native bridge stay unauthorized.

## Provenance

Minimum fields on facts that have an external or derived authority, not an event log:

- origin, where a fact may come from more than one authority: user-created today; a recurring definition or an external source only when that authority exists
- source name, when external
- external id, when external
- internal id

External origin stays externally owned. Derived occurrences point at their definition. This is enough to inspect authority without a history pipeline.

A Note is not an origin value. [2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md) decides the minimum Note and the optional reference on a later fact. A user-established Task remains `user_created`. "Converted from a note" is not a second authority. The Note stays intact. One Note may support zero, one, or many later facts. Provenance is an inspectable relationship to user-originating evidence, not retained model reasoning. That decision does not authorize voice. Storage of the Note, without a surface and without a fact reference, is [../implementation/NOTE-STORAGE-001.md](../implementation/NOTE-STORAGE-001.md). [../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) decides that an established Note stays revisitable through the conceptual Capture experience, using the existing complete read. It adds no table, no column, and no `note_id`. [../implementation/NOTE-REVISIT-001.md](../implementation/NOTE-REVISIT-001.md) proves that return inside General Capture. NOTE-REVISIT-001A accepts that scaffold on the Samsung Galaxy S26 Ultra. It is not the production experience. [../decisions/2026-10-04-provenance-contract.md](../decisions/2026-10-04-provenance-contract.md) decides that act for a Task. The Task may cite one originating Note and remains `user_created`. Reference alone establishes nothing. [../implementation/PROVENANCE-001.md](../implementation/PROVENANCE-001.md) stores `tasks.originating_note_id` in one Task insert. The migration is applied on `ksmhgaamyheyhefbyglb`. PROVENANCE-001A accepts the scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production experience.

## Time

| Fact | Representation |
| --- | --- |
| Absolute instant | `timestamptz` |
| Planned day, all-day block, fiscal deadline | civil `date`, not a UTC midnight |
| Shift start and end | local time-of-day, interpreted in the user's IANA zone |
| User zone | stored on the profile |
| Work fiscal week | pure function of a civil date, Saturday through Friday, Work obligations only |
| Shift-relative position | pure function of shift bounds and the injected instant |

The engine does not call `new Date()` internally. Tests supply the instant and the zone. The Lowe's week function is not used to order Family, TeamLab, Financial, or the generic calendar.

Phase boundaries inside a shift remain undefined in the product. The engine may report elapsed and remaining shift time. It must not invent those phase boundaries.

All-day blocks use civil dates. That storage choice does not define when a life-day begins.

## Testing

Vitest runs beside the pure modules. Highest-value cases:

- injected clock and time zone, including a date that differs in UTC and local time
- planned day unchanged when due changes, and the reverse
- block interval and all-day span
- commitment interval
- active thread survives a clock change; resume returns it; a block boundary does not clear it
- obligation definition stays put when a period completes; a completed period does not burden a later projection
- Saturday-first fiscal week, and a Monday-start week not applied to it
- null context versus one assigned context
- external provenance not treated as user-owned
- target past versus deadline past as different facts

UI tests are a later, thin check of capture and resume. They are not the foundation. No end-to-end suite is required to start.

## Security and privacy

The data includes personal time, family commitments, and caregiving reminders.

- Public sign-up off. One provisioned user.
- Row-level security on every application table.
- Anon key public. Service-role key absent from the app and from any client environment.
- Google secrets, when they exist, server-only.
- `.env` files gitignored. A template lists names only.
- No medical inference in code.
- Least privilege: the user session is the write path.

No compliance program is added.

## Deployment

Intended canonical remote, not connected in this tranche:

`https://github.com/SilentSage432/workday.git`

Flow: local `main` → GitHub `main` → Vercel production.

One branch is enough. Preview deployments are optional and are not a second environment the product must support. No production deploy happens in ARCHITECTURE-001.

## Repository shape for bootstrap

Create these when scaffolding starts. Do not create them in this tranche.

```
app/             Next.js routes and layouts. No projection policy.
components/      Presentation. Renders projections it is given.
domain/          Types, invariants, Work cadence and window constants, fiscal week. No React. No IO.
projections/     Pure temporal engine. Present-moment orientation is not a rankNow seam.
persistence/     Supabase mapping to domain objects.
integrations/    External adapters. Empty of Google calls until that work is authorized.
```

Bootstrap also adds the manifest, environment template, and Vitest. It does not add a schema, a Supabase project, or a Vercel link unless the later bootstrap tranche says so.

## Production instrument

`/` is the production instrument. Below 960px it is the accepted phone continuity. At 960px and wider, Present and Day are the accepted desktop reading: Present is authoritative Now without a whole-day inscription, and Day is the selected civil date with one 00:00–24:00 inscription. Exact time still opens the existing day clock. Week and Month stay the shared landscapes. Direction stays on Month. `/instrument` remains historical experimental evidence. The temporary `/desktop-reading` route is retired. The record is [../implementation/PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md](../implementation/PRODUCTION-DESKTOP-READING-ACCEPTANCE-001.md). Day-anchor provenance records whether a viewpoint follows Today or has been moved. It does not change midnight behavior and it is not persisted. The contract is [../implementation/DAY-ANCHOR-PROVENANCE-DISCOVERY-001.md](../implementation/DAY-ANCHOR-PROVENANCE-DISCOVERY-001.md). The implementation is [../implementation/DAY-ANCHOR-PROVENANCE-001.md](../implementation/DAY-ANCHOR-PROVENANCE-001.md).

## What remains open

Adoption classification of these items is in [../decisions/2026-10-03-operational-adoption.md](../decisions/2026-10-03-operational-adoption.md). An open item is not thereby optional for operational adoption.

- The NOW ranking function. Superseded. The first present-moment composition does not rank, and `rankNow` is not authorized. The experience remains unbuilt.
- The product definition of a day
- Multi-context membership
- Whether a shift row is ever also a commitment row
- Which calendar events, if any, enter the external-fact store automatically
- Start, Adjust, and Skip
- When a Pulse is shown, beyond an in-app capability
- Reschedule, carry-forward, and reminder recurrence rules
- Speech provider and grammar
- Push provider
- Offline sync
- Exact dependency versions, chosen at install time

## Next tranche

If this architecture is accepted, BOOTSTRAP-001 may connect the Git remote, make the first implementation commit, push `main`, scaffold Next.js, install the accepted dependencies, create the folders above, add the environment template, connect a Supabase project only after the user creates that dedicated project, prepare Vercel, and run the type and test baseline.

BOOTSTRAP-001 must not invent a schema, a NOW ranking, a calendar integration, or a service worker while doing that. A later contract still refuses that ranking.
