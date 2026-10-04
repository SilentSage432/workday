# workday

`workday` is the repository name. The product name is unresolved. "Workday" was a working label during early discovery. It is not the canonical name. Do not rename this folder until a later decision chooses a name.

This repository holds the product truth for a personal, single-user, time-aware cadence and orientation system. The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

A directional statement, not final copy:

> The system helps the user understand where they are in their day, what currently matters, what they intended this time for, what they were doing before interruption, and what comes next.

The conceptual center is **NOW**. **Resume** returns the user to the Active Thread. **Timeline** shows the shape of the day. **Pulse** is a moment of orientation, distinct from a reminder about one fact.

Established Contexts, not an exhaustive list and not silos: **Work**, **Family**, **TeamLab**, and **Financial**.

## Current phase

**V0-017, not operationally adopted.** Typed quick capture is the resting state on Tasks and Schedule. Schedule can establish, edit, and delete Protected Time, a Block, or a Commitment on one selected civil day. Tasks can show Resume and the established facts that contain the current instant. That list is not NOW.

NOW, Week, and Month are not built. They block operational adoption. Week and Month interactions beyond their roles are unresolved. The adoption boundary is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md). "Does not block first use" is the historical V0 gate, not this boundary. Phone acceptance of a tranche is not operational adoption.

Today, Resume, Work orientation, Timeline, and current temporal orientation are projections. They are not tables. The day canvas is a view of Timeline, not a table.

The web app manifest has no icons. Designed install assets do not exist yet, so home-screen installability is incomplete on platforms that require an icon.

The latest behavior record is [docs/implementation/V0-017.md](docs/implementation/V0-017.md). Earlier slices are in [docs/implementation/V0-001.md](docs/implementation/V0-001.md) through [docs/implementation/V0-016.md](docs/implementation/V0-016.md).

## Canonical documents

| Document | Responsibility |
| --- | --- |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Durable context, boundaries, principles, and current state |
| [PRODUCT.md](PRODUCT.md) | Intended experience, the life loop, V0, and non-goals |
| [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md) | Operational adoption boundary. Not the historical first-use gate |
| [DOMAIN.md](DOMAIN.md) | Domain primitives and known relationships |
| [TIME_MODEL.md](TIME_MODEL.md) | System-level time, chosen and obligated time, and the Work clocks |
| [CADENCE.md](CADENCE.md) | The cadence primitive, and the Work cadences discovered so far |
| [docs/architecture/ARCHITECTURE-001.md](docs/architecture/ARCHITECTURE-001.md) | Minimum production architecture for V0 |
| [docs/data/DATA-001.md](docs/data/DATA-001.md) | First durable Context and Task schema |
| [docs/implementation/V0-001.md](docs/implementation/V0-001.md) | First usable sign-in, capture, and completion loop |
| [docs/implementation/V0-002.md](docs/implementation/V0-002.md) | Active Thread and Resume |
| [docs/implementation/V0-003.md](docs/implementation/V0-003.md) | Quiet Capture and the Work schedule |
| [docs/implementation/V0-004.md](docs/implementation/V0-004.md) | Deterministic Work orientation |
| [docs/implementation/V0-004A.md](docs/implementation/V0-004A.md) | Compact Work schedule reading and editing |
| [docs/implementation/V0-004B.md](docs/implementation/V0-004B.md) | Mobile navigation, Capture, and week saving |
| [docs/implementation/V0-005.md](docs/implementation/V0-005.md) | Intentional Today planning |
| [docs/implementation/V0-006.md](docs/implementation/V0-006.md) | Protected Time |
| [docs/implementation/V0-007.md](docs/implementation/V0-007.md) | Blocks |
| [docs/implementation/V0-008.md](docs/implementation/V0-008.md) | Commitments |
| [docs/implementation/V0-009.md](docs/implementation/V0-009.md) | Timeline composition |
| [docs/implementation/V0-010.md](docs/implementation/V0-010.md) | Read-only day temporal canvas |
| [docs/implementation/V0-011.md](docs/implementation/V0-011.md) | Direct time selection on the day canvas |
| [docs/implementation/V0-012.md](docs/implementation/V0-012.md) | Temporal meaning choice on a selected span |
| [docs/implementation/V0-012A.md](docs/implementation/V0-012A.md) | Contextual handoff and precise selection refinement |
| [docs/implementation/V0-013.md](docs/implementation/V0-013.md) | Explicit establishment of a selected range |
| [docs/implementation/V0-014.md](docs/implementation/V0-014.md) | Addressing an established fact |
| [docs/implementation/V0-015.md](docs/implementation/V0-015.md) | Edit and delete of an established fact |
| [docs/implementation/V0-016.md](docs/implementation/V0-016.md) | Current temporal orientation. Not NOW |
| [docs/implementation/V0-017.md](docs/implementation/V0-017.md) | Typed quick capture |
| [docs/discovery/FOUNDATION-003.md](docs/discovery/FOUNDATION-003.md) | Product ledger: life evidence, V0, and remaining product questions |
| [docs/discovery/FOUNDATION-002A.md](docs/discovery/FOUNDATION-002A.md) | Historical scope correction, when Work was the only Context |
| [docs/discovery/FOUNDATION-002.md](docs/discovery/FOUNDATION-002.md) | Historical behavioral semantics |
| [docs/discovery/FOUNDATION-001.md](docs/discovery/FOUNDATION-001.md) | Historical evidence from the first foundation tranche |
| [docs/decisions/README.md](docs/decisions/README.md) | Where a standalone decision record goes after a decision is actually made |

## Design principles

Intelligence should emerge from relationships, not feature count.

The system should know relatively few things and understand them deeply.

If using the system becomes another task the user has to manage, the design has failed.

The user said this earlier, while the repository was called Workday, as: "If using Workday becomes another task I have to manage, it has been designed incorrectly."
