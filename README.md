# Orient

The product name is Orient. `workday` is the repository and folder name. It is an implementation and history detail, and it does not define product identity. Do not rename the repository. "Workday" was a working label during early discovery. The decision is [docs/decisions/2026-10-04-product-name.md](docs/decisions/2026-10-04-product-name.md).

This repository holds the product truth for a personal, single-user, time-aware cadence and orientation system. The system does not manage the user's life. It helps the user remain temporally oriented inside the life they have chosen.

A directional statement, not final copy:

> The system helps the user regain orientation in the lived present: which established temporal truths contain this instant, and which Task the user has explicitly established as their current intention.

Present-moment orientation is that composition: Current Temporal Orientation and the Active Thread. It is not persisted, and it does not decide what the user should do. The experience does not have to be named NOW. **Resume** returns the user to the Active Thread. **Timeline** shows the shape of a requested range. **Pulse** is a separate orientation moment, distinct from a reminder about one fact. The decision is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). An earlier statement that asked what currently matters and what comes next is historical. It is not this composition.

Established Contexts, not an exhaustive list and not silos: **Work**, **Family**, **TeamLab**, and **Financial**.

## Current phase

**PRODUCTION-PHONE-EXPERIENCE-002, not operationally adopted.** The signed-in route `/` is the production temporal instrument. The visual identity from [docs/implementation/PRODUCTION-VISUAL-EMBODIMENT-001.md](docs/implementation/PRODUCTION-VISUAL-EMBODIMENT-001.md) stands. [docs/implementation/PRODUCTION-UI-002.md](docs/implementation/PRODUCTION-UI-002.md) restored temporal origin. [docs/implementation/PRODUCTION-UI-003.md](docs/implementation/PRODUCTION-UI-003.md) recomposes Month as a 7 × 4 field, centers Week, and restores Day handle refinement. [docs/implementation/PRODUCTION-TEMPORAL-STABILITY-001.md](docs/implementation/PRODUCTION-TEMPORAL-STABILITY-001.md) keeps today's civil date from choosing the viewpoint and keeps manual Day traversal from being rewritten. That behavior has physical acceptance. [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md) is the phone reading of the same instrument. [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001A.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001A.md) recomposes that reading through the portrait field. [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-002.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-002.md) makes a fresh phone entry ask Day. Desktop still opens on Present. Human acceptance of that phone entry is still required. `/schedule` remains the work-week editor. `/instrument` remains experimental evidence. The chassis record is [docs/implementation/PRODUCTION-UI-001.md](docs/implementation/PRODUCTION-UI-001.md).

The present-moment projection exists, and the production encounter now renders it. Human acceptance on the Samsung Galaxy S26 Ultra and on desktop is still required. That acceptance is not operational adoption. The composition does not rank and does not have to be labeled NOW. How the human encounters Orient is decided in [docs/decisions/2026-10-05-experience-architecture.md](docs/decisions/2026-10-05-experience-architecture.md): one field of time, with Present, Day, Week, and Month as questions of that reality. Low-fidelity spatial prototyping is closed. The production experience is specified in [docs/decisions/2026-10-05-production-experience-design.md](docs/decisions/2026-10-05-production-experience-design.md). The gate is [docs/decisions/2026-10-05-production-experience-gate.md](docs/decisions/2026-10-05-production-experience-gate.md). The scaffold's Tasks and Schedule split is not the production target. Week's meaning is decided: perception of temporal shape. [docs/implementation/WEEK-001.md](docs/implementation/WEEK-001.md) implements that reading for an explicit civil range. The production instrument asks a seven-date window of that reading. It does not redefine Week. Month's question is decided: explicit direction beside established temporal structure, without inferring expression. A Task or a Block explicitly in service of a Priority is [docs/decisions/2026-10-05-execution-direction-contract.md](docs/decisions/2026-10-05-execution-direction-contract.md). [docs/implementation/EXECUTION-DIRECTION-REP-001.md](docs/implementation/EXECUTION-DIRECTION-REP-001.md) stores those pairs. [docs/implementation/MONTH-001.md](docs/implementation/MONTH-001.md) reads retained direction and those pairs beside Timeline for an explicit civil range. The production instrument asks a twenty-eight-date window of that reading and does not assign Direction to dates. The Month decision is [docs/decisions/2026-10-05-month-contract.md](docs/decisions/2026-10-05-month-contract.md). The Week decision is [docs/decisions/2026-10-05-week-contract.md](docs/decisions/2026-10-05-week-contract.md). The adoption boundary is [docs/decisions/2026-10-03-operational-adoption.md](docs/decisions/2026-10-03-operational-adoption.md). The composition is [docs/decisions/2026-10-04-present-moment-orientation.md](docs/decisions/2026-10-04-present-moment-orientation.md). "Does not block first use" is the historical V0 gate, not this boundary. Phone acceptance of a tranche is not operational adoption. The product name is Orient.

Today, Resume, Work orientation, Timeline, and current temporal orientation are projections. They are not tables. The day canvas is a view of Timeline, not a table.

The installed application is named Orient. Its home-screen artwork is the Beacon in [docs/implementation/PRODUCTION-APP-IDENTITY-001.md](docs/implementation/PRODUCTION-APP-IDENTITY-001.md). The horizontal wordmark inside the instrument is a different file. Physical acceptance of the installed icon on the Samsung Galaxy S26 Ultra is still required.

The latest behavior record is [docs/implementation/PRODUCTION-APP-IDENTITY-001.md](docs/implementation/PRODUCTION-APP-IDENTITY-001.md). The in-instrument mark remains [docs/implementation/PRODUCTION-IDENTITY-001.md](docs/implementation/PRODUCTION-IDENTITY-001.md). [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-002.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-002.md) remains the phone entry. [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001A.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001A.md) remains the portrait composition. [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md) remains the phone reading. [docs/implementation/PRODUCTION-TEMPORAL-STABILITY-001.md](docs/implementation/PRODUCTION-TEMPORAL-STABILITY-001.md) remains the startup and traversal record. [docs/implementation/PRODUCTION-UI-003.md](docs/implementation/PRODUCTION-UI-003.md) remains the Month, Week, and Day-handle record. Temporal origin is [docs/implementation/PRODUCTION-UI-002.md](docs/implementation/PRODUCTION-UI-002.md). The chassis is [docs/implementation/PRODUCTION-UI-001.md](docs/implementation/PRODUCTION-UI-001.md). The visual correction of its rejected skin is [docs/implementation/PRODUCTION-VISUAL-EMBODIMENT-001.md](docs/implementation/PRODUCTION-VISUAL-EMBODIMENT-001.md). The historical quick-capture record is [docs/implementation/V0-017.md](docs/implementation/V0-017.md). Earlier slices are in [docs/implementation/V0-001.md](docs/implementation/V0-001.md) through [docs/implementation/V0-016.md](docs/implementation/V0-016.md). Open Tasks and Today are shown only after the open-task collection is complete. That read is [docs/implementation/TASK-INTEGRITY-001.md](docs/implementation/TASK-INTEGRITY-001.md). An open Task's title, Context, planned day, due day, and Must Do can be edited. That write is [docs/implementation/TASK-EDIT-001.md](docs/implementation/TASK-EDIT-001.md). A Note can be stored and read completely. There is no Notes management surface. That storage is [docs/implementation/NOTE-STORAGE-001.md](docs/implementation/NOTE-STORAGE-001.md). The capture establishment contract is decided. A provisional typed surface on Tasks proves it. That proof is [docs/implementation/TYPED-GENERAL-CAPTURE-001.md](docs/implementation/TYPED-GENERAL-CAPTURE-001.md). It does not classify text, and it does not add voice or a Notes management surface. On the Samsung Galaxy S26 Ultra, keyboard dictation supplied expression text and an explicit act kept a Note. That pass is [docs/implementation/VOICE-PROBE-001A.md](docs/implementation/VOICE-PROBE-001A.md). It does not close operational adoption. The return to a retained Note is decided: Capture has memory. NOTE-REVISIT-001 proves that return inside General Capture. NOTE-REVISIT-001A accepts that scaffold on the Samsung Galaxy S26 Ultra. It is not the production Capture experience, and not a Notes application. Edit, delete, and archive are not required for operational adoption, and their semantics are not decided. The decision is [docs/decisions/2026-10-04-note-revisit.md](docs/decisions/2026-10-04-note-revisit.md). The proof is [docs/implementation/NOTE-REVISIT-001.md](docs/implementation/NOTE-REVISIT-001.md). Establishment from a retained Note is decided for a Task: the human may explicitly establish a Task that cites the Note. The Note stays intact. Reference alone establishes nothing. [docs/implementation/PROVENANCE-001.md](docs/implementation/PROVENANCE-001.md) stores that citation. The migration is applied on `ksmhgaamyheyhefbyglb`. PROVENANCE-001A accepts the scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production experience. The required Note chain is closed. Giving time to an existing Task is a Block that may refer to that Task. The Task does not acquire the range. [docs/implementation/TASK-TIME-001.md](docs/implementation/TASK-TIME-001.md) stores that reference. The migration is applied on `ksmhgaamyheyhefbyglb`. TASK-TIME-001A accepts the time-first scaffold on the Samsung Galaxy S26 Ultra. The scaffold is not the production interaction. The bounded Capacity reading is [docs/decisions/2026-10-05-capacity-contract.md](docs/decisions/2026-10-05-capacity-contract.md). [docs/implementation/CAPACITY-001.md](docs/implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. The Task and time decision is [docs/decisions/2026-10-05-task-time-contract.md](docs/decisions/2026-10-05-task-time-contract.md). Provenance remains [docs/decisions/2026-10-04-provenance-contract.md](docs/decisions/2026-10-04-provenance-contract.md).

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
| [docs/decisions/2026-10-05-direction-contract.md](docs/decisions/2026-10-05-direction-contract.md) | Human-established direction. Semantics. Not a surface |
| [docs/decisions/2026-10-05-month-contract.md](docs/decisions/2026-10-05-month-contract.md) | Month perceives direction beside structure. Not an implementation |
| [docs/decisions/2026-10-05-execution-direction-contract.md](docs/decisions/2026-10-05-execution-direction-contract.md) | A Task or a Block may be in service of a Priority. Semantics |
| [docs/decisions/2026-10-05-multi-context-contract.md](docs/decisions/2026-10-05-multi-context-contract.md) | Context is a meaningful area of one life. Not a mode or a workspace |
| [docs/decisions/2026-10-05-experience-architecture.md](docs/decisions/2026-10-05-experience-architecture.md) | One field of time. Encounter model. Not a surface |
| [docs/decisions/2026-10-05-production-experience-gate.md](docs/decisions/2026-10-05-production-experience-gate.md) | Spatial prototyping closed. Production experience design authorized. Not an implementation |
| [docs/decisions/2026-10-05-production-experience-design.md](docs/decisions/2026-10-05-production-experience-design.md) | Production form of the instrument. Not an implementation |
| [docs/implementation/PRODUCTION-UI-001.md](docs/implementation/PRODUCTION-UI-001.md) | Production temporal instrument on `/`. Chassis kept; first visual embodiment rejected |
| [docs/implementation/PRODUCTION-VISUAL-EMBODIMENT-001.md](docs/implementation/PRODUCTION-VISUAL-EMBODIMENT-001.md) | Visual correction. Dark field and controls accepted; Week and Month were not |
| [docs/implementation/PRODUCTION-UI-002.md](docs/implementation/PRODUCTION-UI-002.md) | Temporal origin. Week signature began to work. Month was still a long week |
| [docs/implementation/PRODUCTION-UI-003.md](docs/implementation/PRODUCTION-UI-003.md) | Month 7 × 4 field, centered Week, Day handle refinement. Awaiting human production acceptance |
| [docs/implementation/PRODUCTION-TEMPORAL-STABILITY-001.md](docs/implementation/PRODUCTION-TEMPORAL-STABILITY-001.md) | Startup viewpoint and continuous Day traversal. Month quiet ground asks Day. Startup and traversal physically accepted |
| [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001.md) | Phone reads lived time. The vertical Day clock remains the precision surface. Directionally accepted |
| [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001A.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-001A.md) | Portrait composition of that phone reading. Directionally accepted |
| [docs/implementation/PRODUCTION-PHONE-EXPERIENCE-002.md](docs/implementation/PRODUCTION-PHONE-EXPERIENCE-002.md) | Fresh phone entry asks Day. Present remains the immediate moment. Awaiting human acceptance |
| [docs/implementation/PRODUCTION-IDENTITY-001.md](docs/implementation/PRODUCTION-IDENTITY-001.md) | Supplied Orient mark in the upper right of the phone and desktop instruments. Awaiting visual acceptance |
| [docs/implementation/PRODUCTION-APP-IDENTITY-001.md](docs/implementation/PRODUCTION-APP-IDENTITY-001.md) | Beacon install icon. Distinct from the in-instrument wordmark. Awaiting S26 Ultra home-screen acceptance |
| [docs/implementation/DIRECTION-REP-001.md](docs/implementation/DIRECTION-REP-001.md) | Stored Destination and Priority. Not a production interaction |
| [docs/implementation/EXECUTION-DIRECTION-REP-001.md](docs/implementation/EXECUTION-DIRECTION-REP-001.md) | Stored Task and Block pairs in service of a Priority. Migration not applied. Not a surface |
| [docs/implementation/WEEK-001.md](docs/implementation/WEEK-001.md) | Deterministic Week shape reading. Not a production interaction |
| [docs/implementation/MONTH-001.md](docs/implementation/MONTH-001.md) | Deterministic Month reading. Not a production interaction |
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
| [docs/discovery/DISCOVERY-CANON-001.md](docs/discovery/DISCOVERY-CANON-001.md) | Discovery of Note, Destination, Priority, and the Cadence refinement. Direction semantics now live in the direction contract |
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
