# ORIENT-PULSE-AUTHORITY-002

## Timed Block-start general authority proof

Implements the smallest bounded proof that Pulse interrupt authority can operate across more than one authoritative source kind.

**Baseline:** `4197d471f78fd8a74bfabab02c56791f770b8265`

**Discovery basis:** [ORIENT-PULSE-AUTHORITY-001.md](ORIENT-PULSE-AUTHORITY-001.md) (`ORIENT-PULSE-GENERAL-AUTHORITY-MODEL-CLEAR`).

**Status:** Timed Block-start **physically proven** through AUTHORITY-005 on candidate `e3ec23c` (`ORIENT-PULSE-GENERAL-AUTHORITY-PHYSICALLY-ACCEPTED`). Implementation migration `20261010093000` plus evaluator repair `20261010154000` are live. Historical AUTHORITY-003 remains **FAILED** (does not retroactively succeed). Acceptance record: [ORIENT-PULSE-AUTHORITY-005.md](ORIENT-PULSE-AUTHORITY-005.md).

---

## Authorized source relationships

| Order | Relationship | Lead | Notes |
| --- | --- | --- | --- |
| 1 (accepted) | `commitment` + `start` | positive relative before start | Unchanged production truth |
| 2 (this tranche) | `block` + `start` | positive relative before start | Source generalization proof |

Not authorized here: lead=0, Block end, all-day Block, Task, MustDo, Protected Time, Stewardship, Note, ActiveThread, external, work schedule, absolute timestamps, recurring Pulse engine.

---

## Grammar preserved

```text
authoritative source
→ established temporal relationship
→ explicit human Interrupt Grant
→ deterministic threshold
→ Pulse occurrence
```

Threshold = Block start − positive lead. Relative grant follows current Block start before occurrence establishment. Occurrence fingerprints `(grant_id, source_starts_on, source_start_local)` at establishment and is not rewritten if the Block later moves.

---

## Schema (bounded extension B)

Migration: `supabase/migrations/20261010093000_pulse_block_start_authority.sql`

- Widen `source_kind` CHECK on grants and occurrences to `('commitment', 'block')`
- Drop Commitment-only same-owner FK
- **Depends on** existing `blocks_id_user_key UNIQUE (id, user_id)` from `20261005170800_execution_direction.sql` — does **not** re-ADD it (002C correction)
- Kind-aware BEFORE INSERT trigger validates same-owner timed source
- AFTER DELETE cascade triggers on `commitments` and `blocks` remove grants (Commitment CASCADE parity)
- Hosted evaluator body extended for Block-start; function name retained for cron continuity
- Occurrence uniqueness unchanged
- No delivery / FCM / device tables touched

Applied on production after 002C/002D/002E; evaluator ambiguity repaired by **004** (`20261010154000`). Physical proof is AUTHORITY-005 (not 003).

**Lifecycle (closed):** the 002 cascade function shipped as SECURITY INVOKER and broke authenticated source DELETE (`42501`). Corrected by [LIFECYCLE-002](ORIENT-PULSE-LIFECYCLE-002.md) (`20261010170000` SECURITY DEFINER) and physically accepted in [LIFECYCLE-003](ORIENT-PULSE-LIFECYCLE-003.md) on candidate `413da67`.

---

## Domain / persistence / UI

- `domain/pulse.ts` — `PULSE_SOURCE_KIND_BLOCK`, `evaluateBlockStartPulseCondition`, shared timed-start threshold helpers; Commitment evaluator API preserved
- `satisfied` for Block = occurrence already exists for grant + current Block start fingerprint (same as Commitment)
- `persistence/pulse.ts` — `establishBlockStartInterruptGrant`, Block branch in `establishEligiblePulseOccurrences`
- `BlockPulseAuthority.tsx` — timed Block inspection: Reach me / Don’t reach me; bounded lead choices; no delivery controls
- In-app expression titles Block purpose; delivery remains occurrence-id only

---

## Explicit non-goals

- No Task / MustDo / Protected Time / Stewardship / Note / ActiveThread / external / work-schedule Pulse
- No lead=0, Block end, all-day Block Pulse
- No absolute “Reach me at…”
- No preferred phone/watch routing, haptic language, visual Pulse language, watch face
- No agent-created grants

Physical acceptance of Block-start (and general authority across Commitment + Block) is recorded in [ORIENT-PULSE-AUTHORITY-005.md](ORIENT-PULSE-AUTHORITY-005.md).
