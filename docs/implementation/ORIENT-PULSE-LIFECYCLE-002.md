# ORIENT-PULSE-LIFECYCLE-002

## Source deletion authority correction

**Baseline:** `d33e3f1a2c89987e8bce611b97c71602b7bf549a`  
**Candidate:** `413da6774f2ae81025fbf00f0559e00186692b9d`  
**Discovery:** ORIENT-PULSE-LIFECYCLE-001 → `ORIENT-PULSE-SOURCE-DELETION-DEFECT-CLEAR`  
**Status:** **CLOSED** — correction authored, production-established (`20261010170000` once on `ksmhgaamyheyhefbyglb`), physically accepted via [LIFECYCLE-003](ORIENT-PULSE-LIFECYCLE-003.md).

---

## Physical production symptom

Through the authenticated Orient UI, deleting an owned timed Commitment or Block that still has an Interrupt Grant failed with:

```text
permission denied for table pulse_interrupt_grants
SQLSTATE 42501
```

---

## Root cause

1. Original Commitment Pulse schema (`20261008230000`) used same-owner FK  
   `pulse_interrupt_grants → commitments (id, user_id) ON DELETE CASCADE`.  
   FK cascade runs with referencing-table owner authority, so authenticated did **not** need DELETE on grants.
2. Human grant withdrawal is intentionally soft: `UPDATE (revoked_at)` only; **no** authenticated DELETE privilege; **no** DELETE RLS policy.
3. Generalization (`20261010093000`) dropped the Commitment-only FK and installed AFTER DELETE triggers calling `pulse_interrupt_grants_cascade_source_delete()` as **SECURITY INVOKER**, which performs an explicit `DELETE` on `pulse_interrupt_grants`.
4. Authenticated source DELETE therefore failed at table privilege before RLS mattered.

---

## Why broad authenticated DELETE is rejected

| Act | Authority |
| --- | --- |
| Reach me | `INSERT` grant (own row) |
| Don’t reach me | `UPDATE revoked_at` (soft revoke; row retained) |
| Delete authoritative source | Internal dependent hard cleanup of that source’s grants |

Granting `DELETE ON pulse_interrupt_grants TO authenticated` (or adding a DELETE RLS policy) would create a fourth, general human grant-deletion surface. That is not the Orient model. Soft revoke remains the human withdrawal path while the source exists.

---

## Correction

Forward migration (historical migrations immutable):

`supabase/migrations/20261010170000_pulse_interrupt_grants_source_delete_authority.sql`

Corrects only `public.pulse_interrupt_grants_cascade_source_delete()`:

- `SECURITY DEFINER`
- `SET search_path = public`
- schema-qualified `DELETE FROM public.pulse_interrupt_grants`
- predicate remains `source_kind = TG_ARGV[0] AND source_id = OLD.id AND user_id = OLD.user_id`
- `TG_ARGV[0]` bounded to `'commitment' | 'block'` (matches installed triggers)
- no dynamic SQL; not a general grant-deletion API
- triggers on `commitments` / `blocks` unchanged
- occurrence retention via existing `pulse_occurrences.grant_id ON DELETE SET NULL`

### EXECUTE posture

PostgreSQL 14+ checks EXECUTE on the trigger function for the role executing the triggering statement. Default PUBLIC EXECUTE is revoked; `authenticated` is granted EXECUTE so owner source DELETE can fire the triggers. Direct SQL call of a trigger function still fails as a non-trigger invocation; narrowing EXECUTE removes unnecessary PUBLIC/anon attempt surface.

Function owner is the migration role (typically `postgres` on Supabase). DEFINER elevates only the narrow cleanup DELETE; ownership scoping stays in the predicate (`user_id = OLD.user_id`).

---

## Grant / occurrence lifecycle after correction

- Soft revoke while source exists: unchanged.
- Explicit source deletion: hard-delete grants for that owned source kind/id.
- Pulse occurrences: retained; `grant_id` becomes NULL; `source_kind`, `source_id`, civil/local fingerprints, `threshold_at`, `source_start_at`, `established_at` remain intelligible historical evidence.

---

## Executable proof

`scripts/pulse-source-deletion-authority-regression.sh`  
Vitest wrapper: `domain/pulseSourceDeletionAuthority.pg.test.ts`  
Migration contract: `persistence/pulse.test.ts` (“pulse source-deletion authority migration”)

Proves:

1. INVOKER cleanup → authenticated-equivalent source DELETE → SQLSTATE `42501`
2. After DEFINER correction: Commitment delete + Block delete succeed
3. Associated grants hard-deleted; unrelated same-user and other-user grants untouched
4. Occurrences survive with `grant_id` NULL and provenance fields intact
5. Soft revoke still works; direct authenticated grant DELETE still forbidden
6. Triggers preserved; EXECUTE granted only to authenticated

---

## Production / acceptance (later tranches)

- **002A** published candidate `413da67`
- **002B** applied `20261010170000` exactly once; live function SECURITY DEFINER + `search_path=public`; authenticated DELETE still absent
- **003** physical acceptance: [ORIENT-PULSE-LIFECYCLE-003.md](ORIENT-PULSE-LIFECYCLE-003.md)

Runtime / UI / Android / Wear unchanged by the correction itself.
