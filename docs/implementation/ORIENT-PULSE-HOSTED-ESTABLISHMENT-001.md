# ORIENT-PULSE-HOSTED-ESTABLISHMENT-001

Sovereign hosted establishment of authorized Commitment-start Pulse occurrences without an open Orient client.

## One sentence

Hosted Orient establishes that an authorized temporal condition became true; delivery surfaces only make that established occurrence perceptible.

## Status

**ORIENT-PULSE-HOSTED-ESTABLISHMENT-001: PHYSICALLY ACCEPTED**

Hosted verification verdict: **ORIENT-PULSE-HOSTED-AUTHORITY-CLEAR**

Implementation commit: `b8ba8b8cfb8dc58891f26417428e074719606bb2`

## Baseline

| Item | Value |
| --- | --- |
| Branch | `main` |
| Implementation HEAD | `b8ba8b8cfb8dc58891f26417428e074719606bb2` |
| Canonical Supabase | `ksmhgaamyheyhefbyglb` |
| Prior proof | [ORIENT-PULSE-COMMITMENT-START-001.md](ORIENT-PULSE-COMMITMENT-START-001.md) |
| Discovery | ORIENT-PHONE-PULSE-DELIVERY-DISCOVERY-001 → `ORIENT-PHONE-PULSE-HYBRID-PATH-CLEAR` |

## Authority boundary preserved

TEMPORAL TRUTH → TEMPORAL CONDITION → INTERRUPTION AUTHORITY → PULSE OCCURRENCE → DELIVERY

This tranche proves hosted occurrence establishment. Delivery (Kotlin Android, push, haptics, Wear) remains deferred and is **not** accepted here.

## Selected mechanism

**Postgres `pg_cron` + one SECURITY DEFINER SQL evaluator** on the canonical Supabase database.

| Alternative | Why rejected |
| --- | --- |
| Supabase scheduled Edge Function | Extra runtime, secret custody, and a second TypeScript copy of the predicate unless Deno packaging is added. Larger than in-database establishment. |
| Vercel cron / Next route | Requires service-role on the app host, another scheduler, and is not smaller than `pg_cron` for DB-truth evaluation. |
| Keep browser-only establishment | Fails the closed-client requirement by definition. |

Smallest correct boundary: the database already holds authoritative grants, Commitments, and temporal settings; establishment converges on the existing uniqueness constraint; cron needs no device credentials.

## Eligibility-window correction

Browser condition evaluation still reports:

- `not_yet` — `now < threshold`
- `eligible` — `[threshold, start)`
- `elapsed` — `now >= start`

The first browser path established only on `eligible`. That half-open window can be permanently missed when no client is alive.

**Smallest contract-preserving correction:** establishment is due when `commitmentStartPulseIsDueForEstablishment` is true — `eligible | elapsed` — i.e. `now >= threshold` under an active grant and current timed Commitment identity.

This does not invent authority. The human already authorized the relative lead. It records that the authorized threshold became due under current source truth. Expression remains before fingerprinted start (`pulseOccurrenceStillBeforeStart`).

## Exact hosted evaluator semantics

Function: `public.establish_due_commitment_start_pulse_occurrences(p_now)`

For each active Interrupt Grant (`revoked_at is null`, commitment/start, positive lead):

1. Load same-owner timed Commitment; skip missing / all-day / non-timed.
2. Load confirmed `temporal_settings.time_zone`; withhold if missing/invalid.
3. Derive `source_start_at = (starts_on + start_local) AT TIME ZONE zone`.
4. Derive `threshold_at = source_start_at - lead_offset_seconds`.
5. Skip if `now < threshold_at`.
6. Skip if occurrence already exists for `(grant_id, starts_on, start_local)`.
7. Insert occurrence; `ON CONFLICT DO NOTHING`.

Cron entrypoint: `public.run_pulse_hosted_establishment()` every minute as job `orient-pulse-hosted-establishment`.

Observability: `public.pulse_hosted_evaluator_runs` (started/finished/status/counts/identities/error).

## Single semantic source

- TypeScript authority: `domain/pulse.ts` (`evaluateCommitmentStartPulseCondition`, `commitmentStartPulseIsDueForEstablishment`).
- SQL documents correspondence in migration comments and contract tests.
- Client persistence uses the same due predicate so opportunistic client establishment cannot diverge.

## Client evaluator disposition

**Remain as safe opportunistic convergence.**

Uniqueness prevents duplicates. An open client can still establish during the window if cron has not yet run. Hosted establishment removes the closed-client dependency. Future Kotlin may read occurrences; it must not decide whether they deserve to exist.

## Security / privilege model

- Evaluator functions: `SECURITY DEFINER`, `REVOKE` from `public` / `anon` / `authenticated`; cron path executes as `postgres`.
- Run log: RLS on; no authenticated grants.
- No service-role secret on browser/phone/watch.
- Authenticated occurrence authority unchanged: `SELECT` + `INSERT` own rows only.
- No public HTTP path that manufactures arbitrary occurrences.

### Hosted privilege finding (non-blocking)

On canonical `ksmhgaamyheyhefbyglb`, `service_role` retains Supabase platform-default surplus authority on the new hosted functions and `pulse_hosted_evaluator_runs` beyond the migration’s narrower explicit grants. Authenticated / anon / public client paths remain closed as designed. This did **not** block hosted verification or physical acceptance. Future hardening may narrow privileged surplus if justified.

## Schema / jobs

Migration: `supabase/migrations/20261008240000_pulse_hosted_establishment.sql`

- `pulse_hosted_evaluator_runs`
- `establish_due_commitment_start_pulse_occurrences`
- `run_pulse_hosted_establishment`
- `pg_cron` job `orient-pulse-hosted-establishment` (`* * * * *`)

Depends on prior Pulse tables migration `20261008230000_pulse_commitment_start.sql`.

## Hosted verification (live)

Canonical project: `ksmhgaamyheyhefbyglb`

| Evidence | Hosted reality |
| --- | --- |
| `20261008230000` | Present remotely exactly once |
| `20261008240000` | Applied successfully exactly once |
| `pg_cron` | 1.6.4 active |
| Job | `orient-pulse-hosted-establishment` (job id `1`) |
| Schedule | `* * * * *` |
| Active | `true` |
| Command | `select public.run_pulse_hosted_establishment();` |
| Normal cron | Succeeding runs observed in `cron.job_run_details` |
| Run log | `pulse_hosted_evaluator_runs` recorded successful executions |
| Authenticated Pulse authority | Remained narrow (grants SELECT/INSERT + UPDATE(`revoked_at`); occurrences SELECT/INSERT) |
| Delivery behavior | None in this path |

Verdict: **ORIENT-PULSE-HOSTED-AUTHORITY-CLEAR**

## Physical acceptance

Performed on Tyson’s real production environment after hosted verification.

1. Created a new timed Commitment.
2. Explicitly selected the 5-minute Pulse; Interrupt Grant established.
3. Before threshold, Orient was completely closed on phone and desktop.
4. No Orient client remained alive through the threshold.
5. Threshold passed while Orient was closed.
6. Commitment start also passed while Orient remained closed.
7. Later reopen of Orient showed the Pulse expression already present.

Acceptance evidence (journal-style quote):

> it fucking worked. when i opened it back up, that notification was there already

Interpretation preserved:

- the open browser evaluator was not required
- hosted evaluation established the durable Pulse occurrence
- post-start due-establishment semantics worked
- re-entry expression observed the already-established occurrence
- Tyson’s attention was not required for temporal establishment

**This is not full Pulse delivery acceptance.** In-app re-entry expression of an already-established occurrence is not closed-app Android notification, haptic, Kotlin, or Wear.

## Proven vs deferred

### Proven

- Explicit human Interrupt Grant
- Relative 5-minute authority
- Deterministic threshold
- Hosted evaluation
- Durable occurrence establishment with all Orient clients closed
- Later expression of that established occurrence on re-entry

### Not implemented / not accepted

- Closed-app Android notification
- Haptic Pulse
- Native Android delivery
- Kotlin companion
- Wear OS delivery / Watch6 / watch face
- Final in-app Pulse visual treatment (still needs refinement)
- Broader Pulse source kinds

## Architectural consequence

Hosted Orient establishes that an explicitly authorized temporal condition became true.

Delivery surfaces make that established occurrence perceptible.

A future Android layer must **not** become the source of temporal truth, Interrupt Grant authority, Pulse eligibility authority, urgency, or recommendation. Kotlin discovery/implementation has **not** started; next Pulse boundary is occurrence → native phone perception/delivery.

## Deferred

- Kotlin Android perception/delivery edge (not started)
- Push / Wear / haptics / service worker
- Additional Pulse source kinds
- Expanding beyond Commitment-start
- In-app Pulse visual refinement
