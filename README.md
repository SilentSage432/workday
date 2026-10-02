# workday

`workday` is the repository name. The product name is unresolved. "Workday" was a working label during early discovery. It is not the canonical name. Do not rename this folder until a later decision chooses a name.

This repository holds the product truth for a personal, single-user, time-aware cadence and orientation system. The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

A directional statement, not final copy:

> The system helps the user understand where they are in their day, what currently matters, what they intended this time for, what they were doing before interruption, and what comes next.

The conceptual center is **NOW**. **Resume** returns the user to the Active Thread. **Timeline** shows the shape of the day. **Pulse** is a moment of orientation, distinct from a reminder about one fact.

Established Contexts, not an exhaustive list and not silos: **Work**, **Family**, **TeamLab**, and **Financial**.

## Current phase

**V0-004.** A signed-in person can resume one Active Thread, capture a Task when they ask to, enter a personal Work schedule, and see where the current moment sits in that Work day.

NOW, Timeline, Today, and Pulse are still not built. Resume and Work orientation are projections. They are not tables.

The web app manifest has no icons. Designed install assets do not exist yet, so home-screen installability is incomplete on platforms that require an icon.

The behavior of this slice is in [docs/implementation/V0-004.md](docs/implementation/V0-004.md). Earlier slices are in [docs/implementation/V0-001.md](docs/implementation/V0-001.md), [docs/implementation/V0-002.md](docs/implementation/V0-002.md), and [docs/implementation/V0-003.md](docs/implementation/V0-003.md).

## Canonical documents

| Document | Responsibility |
| --- | --- |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Durable context, boundaries, principles, and current state |
| [PRODUCT.md](PRODUCT.md) | Intended experience, the life loop, V0, and non-goals |
| [DOMAIN.md](DOMAIN.md) | Domain primitives and known relationships |
| [TIME_MODEL.md](TIME_MODEL.md) | System-level time, chosen and obligated time, and the Work clocks |
| [CADENCE.md](CADENCE.md) | The cadence primitive, and the Work cadences discovered so far |
| [docs/architecture/ARCHITECTURE-001.md](docs/architecture/ARCHITECTURE-001.md) | Minimum production architecture for V0 |
| [docs/data/DATA-001.md](docs/data/DATA-001.md) | First durable Context and Task schema |
| [docs/implementation/V0-001.md](docs/implementation/V0-001.md) | First usable sign-in, capture, and completion loop |
| [docs/implementation/V0-002.md](docs/implementation/V0-002.md) | Active Thread and Resume |
| [docs/implementation/V0-003.md](docs/implementation/V0-003.md) | Quiet Capture and the Work schedule |
| [docs/implementation/V0-004.md](docs/implementation/V0-004.md) | Deterministic Work orientation |
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
