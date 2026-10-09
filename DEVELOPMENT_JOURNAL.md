# Development journal

## 2026-10-08 — ORIENT-PULSE-COMMITMENT-START-001

First human-authorized Pulse proof.

- Domain: Interrupt Grant, Pulse occurrence, deterministic Commitment-start evaluator (`[threshold, start)`).
- Migration: `pulse_interrupt_grants` + `pulse_occurrences`; narrow privileges (revoke defaults first); same-owner Commitment cascade; occurrence fingerprint retention; realtime reread publication.
- Persistence: establish/revoke grant; idempotent occurrence ensure.
- UI: timed Commitment remind / don’t remind; restrained in-app expression; dismiss is expression-only.
- No push, Wear, haptics, service worker, or channel policy.
- Hosted migration not applied.

Record: [docs/implementation/ORIENT-PULSE-COMMITMENT-START-001.md](docs/implementation/ORIENT-PULSE-COMMITMENT-START-001.md).

## 2026-10-08 — NOTE-LIFECYCLE-001A

Corrective forward migration after hosted verification: revoke table-level `UPDATE` on `public.notes` from `authenticated`, then re-grant `UPDATE (retired_at)`. Lifecycle-001 applied and was semantically correct in isolation; additive grants left historical table-level UPDATE in place. Not applied to hosted yet.

Record: [docs/implementation/NOTE-LIFECYCLE-001A.md](docs/implementation/NOTE-LIFECYCLE-001A.md).

## 2026-10-08 — NOTE-LIFECYCLE-001

Implemented Retire + Delete for retained Notes from NOTE-LIFECYCLE-DISCOVERY-001.

- Domain: `retiredAt` on `Note`; `NoteCitedError` for cited Delete.
- Migration: `retired_at`, owner `UPDATE (retired_at)` + `DELETE` grants and policies (not applied to hosted project in this tranche).
- Persistence: operational `loadNotes` filters `retired_at IS NULL`; `retireNote`; `deleteNote`.
- UI: LOOK → Notes exposes Retire (no confirm) and Delete (confirm). Provenance FK unchanged.
- Edit, Unretire UI, Archive browser, Notes Class-A realtime deferred.
- Pulse remains next major exploration after physical acceptance.

Record: [docs/implementation/NOTE-LIFECYCLE-001.md](docs/implementation/NOTE-LIFECYCLE-001.md). Decision: [docs/decisions/2026-10-08-note-lifecycle.md](docs/decisions/2026-10-08-note-lifecycle.md).

## 2026-10-08 — MOBILE-CENTER-PLUS-CORRECTION-001

Phone center ADD showed Lucide Plus stacked above a redundant text `+`. Removed the phone text sibling; kept one Plus glyph, `aria-label="ADD"`, and desktop Plus+ADD. No CSS. Physical phone verification still required after deploy.

Record: [docs/implementation/MOBILE-CENTER-PLUS-CORRECTION-001.md](docs/implementation/MOBILE-CENTER-PLUS-CORRECTION-001.md).

## 2026-10-08 — MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001

Phone LOOK progressive disclosure after real-world overload at Lowe’s.

- Shared `LookSurface` gains `LookComposition`: `navigator-lens` (desktop) / `phone-calm` (phone).
- Phone initial LOOK: orientation summary, immediate Present/Day/Week/Month, collapsed Position / Focus / Operations via native `<details>`.
- Desktop LOOK composition left unchanged.
- No schema, persistence, domain, or dependency changes.
- Physically accepted in production (“that is much better”).

Record: [docs/implementation/MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001.md](docs/implementation/MOBILE-LOOK-PROGRESSIVE-DISCLOSURE-001.md).
