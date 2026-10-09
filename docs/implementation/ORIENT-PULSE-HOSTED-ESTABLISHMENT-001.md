# ORIENT-PULSE-HOSTED-ESTABLISHMENT-001

Sovereign hosted establishment of authorized Commitment-start Pulse occurrences without an open Orient client.

## One sentence

Hosted Orient establishes that an authorized temporal condition became true; delivery surfaces only make that established occurrence perceptible.

## Baseline

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `63be8c86ad5807bcac16fb617119d9e41ecaae72` |
| Canonical Supabase | `ksmhgaamyheyhefbyglb` |
| Prior proof | [ORIENT-PULSE-COMMITMENT-START-001.md](ORIENT-PULSE-COMMITMENT-START-001.md) |
| Discovery | ORIENT-PHONE-PULSE-DELIVERY-DISCOVERY-001 → `ORIENT-PHONE-PULSE-HYBRID-PATH-CLEAR` |

## Authority boundary preserved

TEMPORAL TRUTH → TEMPORAL CONDITION → INTERRUPTION AUTHORITY → PULSE OCCURRENCE → DELIVERY

This tranche implements hosted occurrence establishment only. Delivery (Kotlin Android, push, haptics, Wear) remains deferred.

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

- Evaluator functions: `SECURITY DEFINER`, `REVOKE` from `public` / `anon` / `authenticated`, `EXECUTE` only to `postgres` (cron path).
- Run log: RLS on; no authenticated grants; `service_role` SELECT for console inspection.
- No service-role secret on browser/phone/watch.
- Authenticated occurrence authority unchanged: `SELECT` + `INSERT` own rows only.
- No public HTTP path that manufactures arbitrary occurrences.

## Schema / jobs added

Migration: `supabase/migrations/20261008240000_pulse_hosted_establishment.sql`

- `pulse_hosted_evaluator_runs`
- `establish_due_commitment_start_pulse_occurrences`
- `run_pulse_hosted_establishment`
- `pg_cron` job `orient-pulse-hosted-establishment` (`* * * * *`)

Depends on prior Pulse tables migration `20261008230000_pulse_commitment_start.sql`.

## Hosted / physical status

| Surface | Status |
| --- | --- |
| Repository implementation | This tranche |
| Canonical Supabase apply | **Not applied** (stop before deploy) |
| Production data mutation | None |
| Vercel | Untouched |
| Phone / Kotlin | Untouched |
| Closed-client physical acceptance | Pending after hosted apply |

## Closed-client physical acceptance (after hosted apply)

1. Create a timed Commitment.
2. Explicitly choose a 5-minute Pulse; confirm grant.
3. Completely close Orient on phone and desktop.
4. Let threshold pass with no Orient client alive.
5. Reopen Orient later.
6. Confirm durable `pulse_occurrences` row exists for the grant + source identity.
7. Do **not** expect notification or haptic — delivery is deferred.

## Deferred

- Kotlin Android expression/delivery
- Push / Wear / haptics / service worker
- Additional Pulse source kinds
- Expanding beyond Commitment-start
