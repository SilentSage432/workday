# Orient

The product name is Orient. `workday` is the repository and folder name. It is an implementation and history detail, and it does not define product identity. Do not rename the repository. "Workday" was a working label during early discovery. The decision is [docs/decisions/2026-10-04-product-name.md](docs/decisions/2026-10-04-product-name.md).

This repository holds the product truth for a personal, single-user, time-aware cadence and orientation system. The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

A directional statement, not final copy:

> The system helps the user regain orientation in the lived present: which established temporal truths contain this instant, and which Task the user has explicitly established as their current intention.

Present-moment orientation is that composition: Current Temporal Orientation and the Active Thread. It is not persisted, and it does not decide what the user should do. The experience does not have to be named NOW. **Resume** returns the user to the Active Thread. **Timeline** shows the shape of a requested range. **Pulse** is a separate orientation moment, distinct from a reminder about one fact. The decision is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). An earlier statement that asked what currently matters and what comes next is historical. It is not this composition.

Established Contexts, not an exhaustive list and not silos: **Work**, **Family**, **TeamLab**, and **Financial**.

## Current phase

**V0-017, not operationally adopted.** Typed quick capture is the resting state on Tasks and Schedule. Schedule can establish, edit, and delete Protected Time, a Block, or a Commitment on one selected civil day. Tasks can show Resume and the established facts that contain the current instant. That list is Current Temporal Orientation. It is one input to present-moment orientation. NOW-001 composes it with Resume as a projection. The Tasks screen is unchanged, and the experience is not built.

The present-moment projection exists. Its experience, Week, and Month are not built. They block operational adoption. The composition does not rank. The experience remains unresolved, and that experience does not have to be labeled NOW. Week's meaning is decided: perception of temporal shape. Interactions beyond that perception remain unresolved. Month remains landscape, and interactions beyond that remain unresolved. The Week decision is [docs/decisions/2026-10-05-week-contract.md](docs/decisions/2026-10-05-week-contract.md). The adoption boundary is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md). The composition is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). "Does not block first use" is the historical V0 gate, not this boundary. Phone acceptance of a tranche is not operational adoption. The product name is Orient.

Today, Resume, Work orientation, Timeline, and current temporal orientation are projections. They are not tables. The day canvas is a view of Timeline, not a table.

The web app manifest has no icons. Designed install assets do not exist yet, so home-screen installability is incomplete on platforms that require an icon.

The latest behavior record is [docs/implementation/V0-017.md](docs/implementation/V0-017.md). Earlier slices are in [docs/implementation/V0-001.md](docs/implementation/V0-001.md) through [docs/implementation/V0-016.md](docs/implementation/V0-016.md). Open Tasks and Today are shown only after the open-task collection is complete. That read is [docs/implementation/TASK-INTEGRITY-001.md](docs/implementation/TASK-INTEGRITY-001.md). An open Task's title, Context, planned day, due day, and Must Do can be edited. That write is [docs/implementation/TASK-EDIT-001.md](docs/implementation/TASK-EDIT-001.md). A Note can be stored and read completely. There is no Notes management surface. That storage is [docs/implementation/NOTE-STORAGE-001.md](docs/implementation/NOTE-STORAGE-001.md). The capture establishment contract is decided. A provisional typed surface on Tasks proves it. That proof is [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md). It does not classify text, and it does not add voice or a Notes management surface. On the Samsung Galaxy S26 Ultra, keyboard dictation supplied expression text and an explicit act kept a Note. That pass is [docs/implementation/VOICE-PROBE-001A.md](docs/implementation/VOICE-PROBE-001A.md). It does not close operational adoption. The return to a retained Note is decided: Capture has memory. NOTE-REVISIT-001 proves that return inside General Capture. NOTE-REVISIT-001A accepts that scaffold on the Samsung Galaxy S26 Ultra. It is not the production Capture experience, and not a Notes application. Edit, delete, and archive are not required for operational adoption, and their semantics are not decided. The decision is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md). The proof is [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md). Establishment from a retained Note is decided for a Task: the human may explicitly establish a Task that cites the Note. The Note stays intact. Reference alone establishes nothing. [docs/implementation/PROVENANCE-001.md](docs/implementation/PROVENANCE-001.md) stores that citation. The migration is applied on `ksmhgaamyheyhefbyglb`. PROVENANCE-001A accepts the scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production experience. The required Note chain is closed. Giving time to an existing Task is a Block that may refer to that Task. The Task does not acquire the range. [docs/implementation/TASK-TIME-001.md](docs/implementation/TASK-TIME-001.md) stores that reference. The migration is applied on `ksmhgaamyheyhefbyglb`. TASK-TIME-001A accepts the time-first scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production interaction. The bounded Capacity reading is [docs/decisions/2026-10-05-capacity-contract.md](docs/decisions/2026-10-05-capacity-contract.md). [docs/implementation/CAPACITY-001.md](docs/implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. The Task and time decision is [docs/decisions/2026-10-05-task-time-contract.md](docs/decisions/2026-10-05-task-time-contract.md). Provenance remains [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md).

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
| [docs/implementation/V0-016.md](docs/implementation/V0-016.md) | Current temporal orientation. One input, not the composition |
| [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md) | Present-moment orientation. Not an implementation |
| [docs/decisions/2026-10-04-product-name.md](docs/decisions/2026-10-04-product-name.md) | Product name. Orient. Repository stays `workday` |
| [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md) | Return to a retained Note through Capture. Not a Notes application |
| [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md) | Establishment of a Task from a retained Note. Semantics only |
| [docs/decisions/2026-10-05-task-time-contract.md](docs/decisions/2026-10-05-task-time-contract.md) | A Block may refer to one Task. Not Capacity |
| [docs/decisions/2026-10-05-capacity-contract.md](docs/decisions/2026-10-05-capacity-contract.md) | Bounded Capacity reading. Not an allocator |
| [docs/decisions/2026-10-05-week-contract.md](docs/decisions/2026-10-05-week-contract.md) | Week perceives temporal shape. Not an implementation |
| [docs/implementation/CAPACITY-001.md](docs/implementation/CAPACITY-001.md) | Deterministic Work Capacity reading. Not a production interaction |
| [docs/implementation/TASK-TIME-001.md](docs/implementation/TASK-TIME-001.md) | Optional Task reference on a Block. Hosted schema verified. S26 Ultra scaffold accepted. Not drag and drop |
| [docs/implementation/PROVENANCE-001.md](docs/implementation/PROVENANCE-001.md) | Task citation of one originating Note. Hosted schema verified. S26 Ultra scaffold accepted. Not the production experience |
| [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md) | Scaffold return to retained Notes. Accepted on the Samsung Galaxy S26 Ultra. Not the production experience |
| [docs/implementation/NOW-001.md](docs/implementation/NOW-001.md) | Present-moment orientation projection. Not an experience |
| [docs/implementation/V0-017.md](docs/implementation/V0-017.md) | Typed quick capture |
| [docs/implementation/P0-INTEGRITY-001.md](docs/implementation/P0-INTEGRITY-001.md) | Complete temporal reads and honest partial failure |
| [docs/implementation/TASK-INTEGRITY-001.md](docs/implementation/TASK-INTEGRITY-001.md) | Complete open-task reads. Today uses that collection |
| [docs/implementation/TASK-EDIT-001.md](docs/implementation/TASK-EDIT-001.md) | Edit the established fields of an open Task |
| [docs/implementation/NOTE-STORAGE-001.md](docs/implementation/NOTE-STORAGE-001.md) | Store and completely read a canonical Note |
| [docs/implementation/NOTE-STORAGE-001A.md](docs/implementation/NOTE-STORAGE-001A.md) | Correct the Notes migration comment syntax. No schema change |
| [docs/decisions/2026-10-04-capture-establishment-contract.md](docs/decisions/2026-10-04-capture-establishment-contract.md) | Capture establishment boundary |
| [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md) | Provisional typed proof of Note, Task, or nothing |
| [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md) | Note, Destination, Priority, and the Cadence refinement. Not an implementation |
| [docs/discovery/VOICE-CAPABILITY-001.md](docs/discovery/VOICE-CAPABILITY-001.md) | Speech acquisition boundary. Primary-device dictation satisfies the established need |
| [docs/implementation/VOICE-PROBE-001A.md](docs/implementation/VOICE-PROBE-001A.md) | Passed keyboard-dictation probe on the Samsung Galaxy S26 Ultra |
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
