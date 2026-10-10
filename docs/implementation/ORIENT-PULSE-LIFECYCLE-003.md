# ORIENT-PULSE-LIFECYCLE-003

## Source deletion physical acceptance

**Candidate:** `413da6774f2ae81025fbf00f0559e00186692b9d`  
**Project:** `ksmhgaamyheyhefbyglb`  
**Verdict:** `ORIENT-PULSE-SOURCE-DELETION-PHYSICALLY-ACCEPTED`  
**Closeout:** `ORIENT-PULSE-SOURCE-DELETION-LIFECYCLE-FINALIZED`

Prior:

- ORIENT-PULSE-LIFECYCLE-001 — discovery; root cause clear (`42501`)
- [LIFECYCLE-002](ORIENT-PULSE-LIFECYCLE-002.md) — SECURITY DEFINER correction; production-established (002B)
- This tranche — human UI acceptance (003)

---

## Original defect (closed)

Authenticated Orient UI delete of an owned Commitment/Block with an Interrupt Grant failed:

```text
permission denied for table pulse_interrupt_grants
SQLSTATE 42501
```

Root cause: `20261010093000` replaced Commitment FK `ON DELETE CASCADE` with an AFTER DELETE trigger calling `pulse_interrupt_grants_cascade_source_delete()` as **SECURITY INVOKER**. That function `DELETE`s grants while `authenticated` intentionally has no DELETE privilege (human withdrawal is soft revoke via `revoked_at`).

Correction (`20261010170000`): narrow **SECURITY DEFINER** dependent cleanup with `SET search_path = public`. No general authenticated grant DELETE. No human DELETE RLS policy.

---

## Physical acceptance (human)

Tyson used the normal production Orient UI (`orient-cyan.vercel.app`) to delete disposable AUTHORITY-003 evidence — not AUTHORITY-005.

| Item | Value |
| --- | --- |
| Source | Block **Block pulse 003** |
| Source id | `68a7e475-7f66-4f6c-a525-aa61eeb45a78` |
| Grant removed | `996699be-fa97-4a5c-9d1e-a8a547fedc0f` |
| Occurrence retained | `7fadd828-d12c-4213-a9f5-1ddf7e66692e` |

Human result:

- Deletion completed normally
- Previous permission error did **not** appear
- Block disappeared from Orient
- No unexpected behavior observed

Cursor did not issue SQL DELETE, call persistence APIs, or use service-role deletion.

---

## Database consequences

### Before

- Source count = 1
- Grant `996699be…` count = 1, `revoked_at` = NULL
- Occurrence `7fadd828…` count = 1, `grant_id` = grant

### After

- Source count = 0
- Grant count = 0
- Occurrence `7fadd828…` remains with `grant_id` = NULL

Preserved historical evidence on the occurrence:

| Field | Value |
| --- | --- |
| `source_kind` | `block` |
| `source_id` | `68a7e475-7f66-4f6c-a525-aa61eeb45a78` |
| `source_starts_on` | `2026-10-10` |
| `source_start_local` | `09:30:00` |
| `threshold_at` | `2026-10-10T15:25:00Z` |
| `source_start_at` | `2026-10-10T15:30:00Z` |
| `established_at` | `2026-10-10T15:57:00.016132Z` |

Historical Pulse truth survived deletion of both its authoritative source and dependent grant.

---

## Authority semantics (preserved)

| Human act | Effect |
| --- | --- |
| Don’t reach me | Source remains; grant soft-revokes (`UPDATE revoked_at`) |
| Delete source | Source ceases; dependent Interrupt Grant hard-cleans internally; established Pulse occurrences remain historical truth |

Authenticated humans still do **not** possess general hard-delete authority over `pulse_interrupt_grants`.

---

## Isolation

After acceptance:

- Unrelated sources / grants / occurrences intact
- AUTHORITY-005 accepted Block `0b0db1c6…` / grant `6e9adb35…` / occurrence `a2dae150…` unaffected
- Optional human Commitment deletion **not** performed (executable Commitment lifecycle regression sufficient)

---

## Status

| Tranche | Status |
| --- | --- |
| ORIENT-PULSE-LIFECYCLE-001 | **CLOSED** — root cause established |
| ORIENT-PULSE-LIFECYCLE-002 | **CLOSED** — correction production-established |
| ORIENT-PULSE-LIFECYCLE-003 | **PHYSICALLY ACCEPTED** |

Pulse source-deletion lifecycle defect is **CLOSED**.

General Pulse authority (Commitment-start + Block-start) remains accepted. No additional source kinds. Haptic language remains UNDESIGNED / UNIMPLEMENTED.

**Next discovery boundary:** Pulse semantic expression (shared haptic meaning for Commitment vs Block) — do not presume `source_kind` → pattern.
