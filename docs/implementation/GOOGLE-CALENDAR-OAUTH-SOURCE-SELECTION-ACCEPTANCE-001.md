# GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION-ACCEPTANCE-001

Physical production acceptance of Tranche 3: Google OAuth, CalendarList enumeration, and explicit source selection.

## Authority

| Item | Value |
| --- | --- |
| Implementation commit | `101c984bcb2e096c96333b867c7674d9f2712a12` |
| Implementation record | [GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION-IMPLEMENTATION-001.md](GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION-IMPLEMENTATION-001.md) |
| Canonical Orient Supabase | `ksmhgaamyheyhefbyglb` |
| Production surface | `https://orient-cyan.vercel.app` |
| Hosted schema reconciliation | All three external-time migrations applied and ledgered on the canonical project (`20261007200000`, `20261007210000`, `20261007220000`) prior to physical exercise |

This record documents human physical acceptance only. It does not change application behavior, migrations, Google integration, or UI.

## Google Testing / test-user condition

The Google OAuth application used for this acceptance operated under Google's **Testing** configuration.

Initial Connect was blocked because the operator had not yet been admitted as a Testing test user. Google Cloud configuration was corrected by adding the operator as an authorized test user. Connect then succeeded.

This acceptance does **not** claim final public Google OAuth verification. Testing-mode authorization and refresh-token lifetime constraints remain an operational consideration for sustained use and are unchanged by this record.

## Physical sequence

Performed by the human operator against deployed production:

1. Orient initially showed Google Calendar **disconnected**.
2. Human selected **Connect**.
3. Google authorization initially blocked (operator not yet a Testing test user).
4. Operator added as authorized Testing test user in Google Cloud.
5. Connect attempted again.
6. Google consent/authorization completed successfully.
7. Google redirected through the deployed Orient callback successfully.
8. Orient displayed the Google Calendar relationship as **connected**.
9. Human selected **Load calendars**.
10. Production enumerated multiple Google Calendar sources (observed examples: Family; primary Google calendar; Holidays in United States; CC).
11. Enumeration itself did **not** silently select all calendars.
12. Human explicitly selected the primary Google calendar.
13. UI represented this as one selection in draft before Save.
14. Human exercised authority through **Save selection**.
15. Orient reported one calendar selected for observation.
16. Human closed the Google Calendar operation.
17. Human reopened the Google Calendar operation and reloaded/re-read the relationship.
18. The previously selected calendar **remained selected** (persisted source-selection authority, not transient component state).
19. Human selected **Disconnect**.
20. Orient returned to **disconnected**.

## Observed outcomes

| Invariant | Physical result |
| --- | --- |
| Google OAuth authorization | Succeeded after test-user correction |
| Deployed redirect URI / callback | Succeeded |
| Callback ownership / state / PKCE path | Succeeded |
| Encrypted credential custody | Succeeded sufficiently for the deployed relationship |
| Connection `connected` only after authorization/custody | Observed |
| CalendarList enumeration against real provider | Succeeded; multiple sources listed |
| Enumeration ≠ selection | Observed |
| Explicit human selection required | Observed |
| Saved selection persists across close/reopen and reread | Observed |
| Disconnect ends local observation relationship | Observed |
| UI returns truthfully to disconnected | Observed |

## Persistence proof

After Save selection, closing the Google Calendar operation and reopening it retained the previously selected calendar. This proves persisted Orient source-selection authority rather than ephemeral UI state.

## Disconnect proof

Disconnect returned Orient to the disconnected state and withdrew the local observation relationship. Orient-owned temporal truth was not altered by this acceptance exercise.

## Sovereignty / authority conclusions

Google establishes Google calendar/source truth.

Orient retains:

- its own Connection relationship;
- encrypted authorization capability;
- explicit human-selected observation-source relationship.

The human retains authority over whether the relationship exists and which Sources Orient may observe.

- Authorization does not imply selection.
- Enumeration does not imply selection.
- Selection does not transfer temporal ownership.
- Disconnect withdraws Orient's observation relationship without changing Orient-owned temporal truth.

## Deferred presentation refinement

Physical inspection revealed alignment/presentation problems in the Google Calendar source-selection surface, including checkbox/label layout.

Classification: **presentation refinement — non-blocking**.

It does **not** invalidate OAuth semantics, Calendar enumeration, source identity, selection authority, persistence, or disconnect behavior.

Do not treat presentation polish as part of this acceptance. Recorded as deferred bounded UI refinement.

## No event observation

This acceptance did **not** exercise:

- Google `events.list`
- Google Event mapping
- external temporal Fact creation
- Present / Day / Week / Month external-event projection
- fact provenance UI
- realtime or cron

Tranche 3 remains the observation **relationship** path only.

## Final physical acceptance verdict

**GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION — PHYSICALLY ACCEPTED**

Tranche 3 is closed.

## Next canonical implementation tranche

**GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-001**

That tranche may introduce the first real Google Event observation path. It remains separately bounded and is not begun by this record.
