# ORIENT-PULSE-AUTHORITY-002

## Timed Block-start general authority proof

Implements the smallest bounded proof that Pulse interrupt authority can operate across more than one authoritative source kind.

**Baseline:** `4197d471f78fd8a74bfabab02c56791f770b8265`

**Discovery basis:** [ORIENT-PULSE-AUTHORITY-001.md](ORIENT-PULSE-AUTHORITY-001.md) (`ORIENT-PULSE-GENERAL-AUTHORITY-MODEL-CLEAR`).

**Status:** Corrected migration applied in production as candidate `aa2cdcb` (`20261010093000`). Physical acceptance (**003**) **failed** at hosted establishment (PL/pgSQL `source_starts_on` ambiguity). Forward repair is **004** (`20261010154000`); not yet applied. Physical general authority **UNACCEPTED**.

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

**Not applied to hosted production.** 002B left production pre-002; 002C corrects the migration source only.

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
- No physical acceptance claim in this document

---

## Verification stance

Typecheck, lint, build, and focused tests must pass before publication. Hosted migration apply and physical closed-client / device acceptance are later programs.
