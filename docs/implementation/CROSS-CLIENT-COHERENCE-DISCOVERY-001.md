# CROSS-CLIENT-COHERENCE-DISCOVERY-001

Discovery only. No mechanism is chosen as implemented. No runtime change.

Baseline: `a21864a2fe61894cffe876386cd75113f1e751a0` on `main`.

Labels used below: **observed**, **repository**, **inference**, **unknown**, **recommendation**.

## Observed

Orient was open on a phone and on a desktop. A Block was deleted on the phone. The phone dropped it at once. The desktop kept showing it until some later event caused that desktop to read canonical truth again.

Canonical persistence looked shared and correct. The gap was propagation into the already-open desktop.

Candidate principle, not yet an implementation:

An active Orient client should converge on canonical temporal truth changed by another active Orient client without requiring a manual refresh.

## Repository: who reads

Production `/` is `app/page.tsx`, which renders `OrientInstrument`. `app/layout.tsx` wraps that in `AppFrame`. `AppFrame` mounts children only after `getSession` finds a session. Sign-out unmounts them.

`OrientInstrument` owns the production read.

On mount it calls `loadTemporalSettings` once. That effect depends on nothing. A later reload does not read settings again.

After a time zone exists, a 30-second interval replaces `now`. **Repository:** that interval does not call a loader and does not change `anchor`. A test requires the interval not to call `setAnchor`.

The canonical bundle is one effect. It runs when `timeZone`, `anchor`, or `reloadToken` changes. It reads, in one `Promise.all`:

| Loader | Table | Scope |
| --- | --- | --- |
| `loadWorkSchedule` | `work_schedule_days` | `experienceLoadWindow(anchor)` |
| `loadProtectedTime` | `protected_time` | same window |
| `loadBlocks` | `blocks` | same window |
| `loadCommitments` | `commitments` | same window |
| `loadContexts` | `contexts` | the user's rows |
| `loadOpenTasks` | `tasks` where `completed_at` is null | the user's open rows |
| `loadActiveThread` | `active_threads` | one row, or none |
| `loadDestinations` | `destinations` | the user's rows |
| `loadPriorities` | `priorities` | the user's rows |
| `loadTaskPriorityService` | `task_priority_service` | the user's rows |
| `loadBlockPriorityService` | `block_priority_service` | the user's rows |
| `loadCitedTaskIdentities` | `tasks` by cited ids | after the task-priority read |

`experienceLoadWindow` is the look-behind span of the 28-day month from the anchor: the civil day before the anchor through the last included day of that span. It is not a fiscal week.

The result is held in `OrientInstrument` state as `truth`. `OrientView` receives those rows and projects them. Question, focus, and scroll stay in `OrientView`. Changing Present, Day, Week, or Month does not change `reloadToken` and does not change `anchor`, so it does not read again.

Changing `anchor` does read again, because the effect depends on `anchor`.

`loadNotes` is not in this effect. `CaptureSurface` calls it when that surface asks for notes. A kept note does not increment `reloadToken`.

## Repository: what makes a client fresh

`persist` awaits the write, then increments `reloadToken`. The bundle effect runs again. The write's returned row is not stored.

These production actions use `persist`:

- create Protected Time, Block, or Commitment
- update them, including civil-date correction (`onUpdate` → `updateProtectedTime` / `updateBlock` / `updateCommitment`)
- delete them
- `saveWorkWeek` (`save_work_week`)
- `updateTask`
- `completeTask`
- `establishActiveThread`
- `clearActiveThread`

`onTasksChanged` increments the same token without a write inside `persist`. Capture uses it after a task is created: quick capture, a task kept from an expression, and a task created from a retained note.

A failed write throws before the token increments. The bundle stays.

**Repository:** the initiating client becomes fresh because its own success increments `reloadToken`, or because it changes `anchor`, or because `OrientInstrument` mounts again. Nothing in production `/` increments that token because another client wrote.

**Inference:** the physical desktop stayed stale because it never hit one of those three triggers. Which later event finally read again is not in the observation. The repository triggers that would do it are an own successful mutation, an anchor change, or a remount.

Browser focus, visibility, online, and offline do not reload production `/`. Auth events in `AppFrame` set signed-in or signed-out. They do not reload the bundle while the session remains. Token auto-refresh is on and is not a domain read.

There is no periodic domain read.

## Repository: mutable truth

Class A can change what an already-mounted `/` reading shows, and production `/` can write it.

- `protected_time`, `blocks`, `commitments` — the temporal field
- `work_schedule_days` — the shift on that field
- `tasks` — open tasks, including MustDo, plan, due, title, and completion. MustDo is a column, not a table
- `active_threads` — the thread reading. Completing the cited task deletes that thread in the same transaction (`tasks_clear_active_thread_on_completion`)

Class B is loaded into the mounted reading, or would change a label on it, and production `/` does not write it.

- `contexts` — names on inspection. Policies allow update and delete. Application code only loads them
- `destinations`, `priorities`, `task_priority_service`, `block_priority_service` — priority lines on inspection. Establish and create functions exist in persistence. No production component calls them
- cited task rows — follow the task-priority read
- `temporal_settings` — read once to confirm the clock. Not part of `reloadToken`. The writer used by the app is `saveTemporalSettings` in `components/WorkSchedule.tsx`, which `/schedule` mounts. Production `/` does not call it

Class C for the mounted temporal field:

- `notes` — not in the bundle. The capture list reads them on demand. Policies are select and insert. Keeping a note does not refresh the field
- the capture draft in `AppFrame` — unestablished local session, not a table

A later signal does not have to treat these classes the same. The observed miss is class A.

## Repository: writes

Each writer is a Supabase call as the signed-in user. RLS is `user_id = auth.uid()` on these tables. `save_work_week` is `security invoker` and uses `auth.uid()`.

There is no version column and no etag. **Repository:** a successful `update` filtered by id and `user_id` replaces that row. `active_threads` upserts on `user_id`, so the later establish replaces the one thread. `save_work_week` updates `work_schedule_days` on conflict of `(user_id, work_on)`. A delete removes the row for that id and user. This is last successful write for those operations. It is not a conflict policy and it is not a resolver.

The initiating client is fresh because `persist` re-reads after success. The other mounted client never enters `persist`.

## Repository: propagation search

| Evidence | Class |
| --- | --- |
| `channel`, `postgres_changes`, broadcast, presence | absent |
| `BroadcastChannel`, `storage` events, service worker messaging | absent |
| `router.refresh`, `revalidatePath`, `revalidateTag` | absent |
| domain polling | absent |
| `OrientInstrument` 30-second `setInterval` | production-active, clock only |
| `InstrumentView` 30-second `setInterval` | prototype `/instrument`, clock only |
| `TaskLoop` `visibilitychange` | not production `/`. `app/page.tsx` does not mount `TaskLoop`. The listener rolls that surface's clock and reloads it when the civil day changes |
| `AppFrame` `onAuthStateChange` | production-active, session phase only |
| `supabase/config.toml` `[realtime] enabled = true` | local realtime process flag. It does not subscribe and it does not add tables to a publication |
| `@supabase/supabase-js` `^2.117.2` | the dependency includes a Realtime client. No application call uses it |

Dependency presence is not a subscription.

## Repository: client, auth, Realtime config

`getSupabaseBrowserClient` builds one `createClient` and reuses it. Auth options are `persistSession`, `autoRefreshToken`, and `detectSessionInUrl: false`. Reads and writes call `auth.getUser()` or rely on the session the client sends. RLS grants are to `authenticated` and match `auth.uid()` to `user_id`.

**Repository:** no migration adds a table to `supabase_realtime` or sets replica identity. **Unknown:** whether the hosted project already publishes any table. Dashboard state is not in this repository. Local `[realtime] enabled = true` does not answer that.

## Invalidation granularity

**Repository:** `persist` throws away the write payload and runs the existing loaders again. `OrientView` does not keep a second copy of those tables. Timeline, capacity, the day field, and resume are functions of the rows they are given.

**Inference:** a signal can stay ignorant of projection. It only needs to cause that same bundle effect to run. Level A — something relevant changed; read canonical truth again — matches this. Table, id, or full-row replication would build a second way to assemble `truth`.

The current effect already re-reads every loader in the bundle. A signal does not need to name a row for the read to be correct. Naming class A tables matters only for what the signal subscribes to, not for how the reading is built.

`temporal_settings` is outside that effect. A token increment would not refresh the clock's time zone.

## Multi-client, without a new resolver

These are what the current code would do after the stale client next runs the bundle effect. They are not what it does while the token stays still.

- A deletes a fact B is inspecting. The next read omits it. `describe` returns `found: false`, and the existing effect closes that inspection.
- A moves a fact to another civil date while B stays on the old anchor. The viewpoint is not asked to follow. If the new date is inside B's loaded window, the next read paints it there. If it is outside that window, it leaves B's models and the inspection closes. That is the same rule the writer's own save already uses.
- A saves Work schedule while B shows Week. Week is a projection of `work` rows. The next read replaces those rows. The question stays.
- A completes the task B's thread cites. The completion trigger deletes that `active_threads` row in the same transaction. The next read has no thread.
- A establishes a different thread. Upsert on `user_id` replaces the row. The next read shows that thread.
- A writes while B is offline. Nothing queues a read for B. **Repository:** `/` has no reconnect read. **Unknown:** how an unused Realtime socket would behave across a drop.
- Duplicate notifications. Two token increments schedule two reads. The effect cancels an in-flight read when the token changes again. The later read wins. The anchor is untouched.
- A notification of the client's own mutation. `persist` has already incremented the token. Another increment reads once more. It does not move the viewpoint.

An open `FactDetail` keeps drafts in `useState`, initialized when that inspection mounts. **Inference:** a reload refreshes the reading behind an editor, and it does not re-seed those drafts unless the inspection unmounts. If the fact disappears, the inspection closes. If it remains, a still-mounted editor can keep the drafts it already had. That is concurrent-edit state, not propagation. This discovery does not add a merge.

## Invariants

| Id | Mark | Why |
| --- | --- | --- |
| I1 Supabase remains canonical | supported | Loaders are the read. Writes go to Supabase. Projections are not stored |
| I2 No second domain authority | supported as a constraint the current shape can keep | A payload cache would break it. The token does not |
| I3 A signal is not itself truth | supported as a constraint | Nothing in the repo is such a signal yet |
| I4 Existing loaders and projections build the reading | supported | `reloadToken` already works this way for the writer's own success |
| I5 A missed signal must not strand the client | needs refinement | Today a client is stranded until its own mutation, an anchor change, or a remount. A signal with no recovery read would still strand a miss |
| I6 Duplicate signals are harmless | supported | Extra token increments re-read and do not move `anchor` |
| I7 Own-mutation notification is tolerable | supported | The writer already re-reads. A second read is the same boundary |
| I8 Unestablished truth stays unestablished | supported | The capture draft is local and is not in the bundle |
| I9 Viewpoint does not chase | supported | `reloadToken` does not call `onAnchor` |
| I10 Propagation is not a conflict policy | supported | Last successful write is what the updates and upserts do. No resolver exists, and this tranche does not add one |

## Mechanism families

**Supabase Realtime change notification.** Freshness is the change, not a timer. The client would still call the existing loaders, so Supabase stays canonical and RLS still bounds the read. Phone cost is a socket plus a read when something changes. Reconnect behavior is **unknown** in this repo because nothing subscribes. Failure if a notice is missed is I5. **Repository gap:** table publication is not in migrations. Hosted publication is **unknown**. Using this family requires a configuration or a migration that does not exist yet. It is not selected merely because it is a common product. It is the family that can say "a relevant row changed" without copying the row into a second store.

**Focus or visibility re-read.** No new server config. It reuses the loaders. It does **not** meet the observation: the desktop was already open and showing the deleted Block, so a visibility change had not happened. It does meet I5 for a client that returns from the background or from offline. `TaskLoop` is not a production `/` version of this.

**Bounded polling.** No new server config. It would have refreshed the open desktop within one interval. It reuses the loaders. Cost is a full bundle read on the interval, including on the phone, including when nothing changed. Freshness is the interval. A missed moment is recovered by the next tick, so I5 holds. It is a clock, not a statement that truth changed.

**Hybrid.** A change notice for class A, plus one read when the document becomes visible. The notice covers two clients that are both on screen. The visibility read is the recovery net for I5. Both call `reloadToken`. Neither applies a payload.

**Recommendation.** Keep the propagation layer ignorant. The smallest architecture that matches the repository is: a class A change says the bundle may be stale; `OrientInstrument` increments `reloadToken`; the existing effect re-reads; `OrientView` projects as it does now. Prefer a Realtime notice for that signal only if publication is actually added or confirmed. Do not assume the dashboard. Pair it with a visibility re-read so a missed notice cannot strand the client. Polling is the no-config alternative and is a worse fit for the principle, because it cannot tell a change from a quiet interval. Do not prescribe the notice as canon until that publication evidence exists.

Do not replicate rows into local state. Do not add a second projection. Do not sync client to client. Do not resolve conflicts in that layer.

## Smallest later candidate

Not this tranche.

- **Owner.** `OrientInstrument`. It already owns `reloadToken` and the bundle effect. `OrientView` should not subscribe.
- **Sources.** `protected_time`, `blocks`, `commitments`, `work_schedule_days`, `tasks`, `active_threads`.
- **Not in that first signal.** Notes, contexts, destinations, priorities, priority-service pairs, and `temporal_settings`. Settings are outside the reload effect. The others have no production `/` writer, or they do not feed the field.
- **Reload boundary.** `setReloadToken((token) => token + 1)` after the instrument is mounted. Same effect as `persist`. Do not pass the notice payload into `truth`.
- **Lifecycle.** Start when `OrientInstrument` is mounted, which is already the signed-in `/` tree. Stop on unmount, including sign-out. Do not hold a channel after the session is gone.
- **Auth.** The reused browser client and its session. The following read still goes through the loaders, so RLS still applies to the rows that land in `truth`.
- **Reconnect.** **Unknown** for an unused socket. The visibility re-read is the recovery this repository can specify without guessing socket behavior. One read when `document.visibilityState` becomes `visible`.
- **Own mutation.** Allow the extra read. Do not special-case it.
- **Coalesce.** Not required for correctness. The effect already drops a superseded in-flight read. A short coalesce would only avoid a double read when `persist` and the notice arrive together.
- **Viewpoint.** The signal must not call `onAnchor`.
- **Tests, when implemented.** A stand-in notice increments the token and the loaders run again while `anchor` and the question stay. A second notice does the same. The writer's own `persist` still re-reads and still does not move the viewpoint. A reload that no longer contains an inspected fact still closes that inspection. No test should require a live Realtime project until publication is real.
- **Config.** If the notice is `postgres_changes`, publication membership has to be confirmed or added. It is not in this repo. **Unknown** for the hosted project. Visibility recovery and the reload token need no migration.
- **Migration.** None for the reload boundary. One only if publication is added as SQL. Do not add it in discovery.

## Out of scope

Mobile analog time entry, drag and drop, civil-date correction, Week and Month geometry, Present and Day geometry, Exact Time, recurrence, reminders, task reopen and undo, carry-forward, `/schedule` retirement, Google Calendar, and offline-first storage. The parked time-entry observation stays parked.
