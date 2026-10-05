# NOW-CONTRACT-001 — Present-moment orientation

Date: 2026-10-04.

Baseline: `ba8fa6ca08207bca53623e3a785d0dcf5a6f339e`.

This tranche records the composition. It does not implement it, design its experience, or name the product.

## Decision

Present-moment orientation is a deterministic projection. It is not persisted canonical truth.

The smallest truthful composition is:

```text
Current Temporal Orientation
+ Active Thread
```

These remain independent truths.

The composition exists so the user can regain orientation in the lived present. It does not decide what the user should do.

### Current Temporal Orientation

Current Temporal Orientation answers: which established temporal truths contain the supplied current instant?

The facts stay the ones that projection already keeps: a Work shift while that shift contains the instant, Protected Time, a Block, and a Commitment. More than one may contain the same instant. The projection keeps all of them. It does not choose a winner.

An empty Current Temporal Orientation means only that no established temporal fact contains this instant.

It does not mean:

- free
- available
- allocatable
- unoccupied
- nothing important
- nothing planned
- nothing to do

### Active Thread

The Active Thread answers: what Task has the user explicitly established as their current intention?

No Active Thread means only that no current Task intention has been explicitly established. That absence does not authorize the system to infer one.

### Independence

Neither truth establishes, validates, ranks, or overrides the other.

They may agree, disagree, overlap conceptually, or one may be absent.

Their coexistence is useful because the system preserves both temporal reality and explicit human intention.

A current Block does not establish a thread. A thread does not create a temporal fact. A fact that contains the instant does not become the Active Thread. The Active Thread does not become a temporal fact.

### First composition boundary

The first implementation boundary contains only Current Temporal Orientation and the Active Thread.

These are not included merely because the data exists:

- Today Tasks
- all open Tasks
- Must Do
- Due
- Planned
- Notes
- Destination
- Priority
- Cadence
- reminders
- Pulse
- Capacity
- inferred Context
- upcoming temporal facts
- next Commitment
- arbitrary nearby Tasks
- recommendations

They may participate in a later orientation experience only after their relationship to present orientation is independently established. This contract does not establish those relationships. Current Context is not a deferred member of that list. [2026-10-05-multi-context-contract.md](2026-10-05-multi-context-contract.md) decides that there is no current Context primitive.

### What the composition does not determine

The composition does not determine:

- what matters right now
- a highest priority
- urgency
- a best next action
- what the user should do next

These are not equivalent, and this contract authorizes none of them:

- next temporal boundary
- next temporal fact
- next planned Task
- next due Task
- next thing the user should do

No next behavior is authorized.

### Context

Current Context is not inferred from:

- the Active Thread
- Work
- a Block
- a Commitment
- Protected Time
- whichever fact currently contains the instant

Current Context remains unresolved.

Task Context and temporal-fact Context, where they exist, remain properties of their own source truths.

### Interruption and reorientation

After interruption, the composition can restore two kinds of evidence without making a decision for the user:

- which established temporal truths contain the present instant
- which Task the user explicitly established as their Active Thread

This is reorientation, not recommendation.

The system does not infer an interruption. It does not create interruption state.

### Naming

Product naming is outside this tranche. No name is chosen. "Orient" is not adopted. Application title, manifest, package metadata, repository name, URLs, runtime copy, and architecture identifiers stay as they are.

Superseded as naming authority by [2026-10-04-product-name.md](2026-10-04-product-name.md). The product name is Orient. The sentences above record this contract's boundary. They are not authority to treat Orient as unadopted. This contract still does not rename identifiers, and it does not change the composition.

### Experience

The composition does not require the eventual experience to be named NOW. How the human encounters that composition is [2026-10-05-experience-architecture.md](2026-10-05-experience-architecture.md). This contract still specifies no card, panel, navigation control, color, layout, or animation. Earlier visual explorations are not repository authority. The surface is not built here.

## Context

Read-only discovery found the two truths already represented, and also found repository language that still described an attention hierarchy, `rankNow`, NOW choosing a Context, and answers such as what matters or what comes next. Those descriptions predate this composition. This record is the authority so later work does not follow the older language.

Current temporal orientation was decided on 2026-10-03 as a projection that is not, by itself, the present-moment composition. That remains true of the projection. This contract places it beside the Active Thread. It does not turn the projection into a stored NOW, a route, or a ranking. The earlier decision is [2026-10-03-current-temporal-orientation.md](2026-10-03-current-temporal-orientation.md).

The Active Thread remains the explicit thread from [2026-10-02-active-thread.md](2026-10-02-active-thread.md). Resume remains the projection of that thread while the Task is open. This contract does not change how a thread is established or cleared.

## Consequences

- Canonical documents that offered an attention hierarchy, a `NowProjection` group list, or `rankNow` as the present-moment composition point here. Historical ledgers keep their original sentences and are marked superseded where those sentences would otherwise be read as current authority.
- `rankNow` is not authorized. UI code must not invent a cross-group order.
- No schema, table, migration, route, dependency, or runtime behavior follows from this file.
- Week, Month, Pulse, Capacity, reminders, and recommendations stay outside this composition. There is no current Context to add later. That decision is [2026-10-05-multi-context-contract.md](2026-10-05-multi-context-contract.md).
- The encounter model for this orientation is [2026-10-05-experience-architecture.md](2026-10-05-experience-architecture.md). Operational adoption still requires the unbuilt surface. This file does not build it.
- The product name remains unresolved in this contract. Later naming authority is [2026-10-04-product-name.md](2026-10-04-product-name.md). The name is Orient. This consequence does not apply that name to titles, routes, or copy.

## Superseded as composition authority

These earlier statements are not current authority for what the present moment contains:

- FOUNDATION-001's four NOW questions, including what needs attention right now and what comes next.
- FOUNDATION-002's unfinished attention hierarchy and NOW selection order, including reminders, due boundaries, and Must Do as relevance inputs to that composition.
- FOUNDATION-002A's question of how NOW chooses a Context.
- FOUNDATION-003's open NOW selection order.
- The candidate input list and five NOW questions in [../../PRODUCT.md](../../PRODUCT.md), as they stood before this contract.
- The `NowProjection` labeled groups and the `rankNow` seam in [../architecture/ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md), as the legal shape of the present moment.
- The 2026-10-02 claim that an unfinished NOW hierarchy was still the open answer, in [2026-10-02-temporal-projection.md](2026-10-02-temporal-projection.md).
- Operational-adoption question 9, which asked which composition to use, in [2026-10-03-operational-adoption.md](2026-10-03-operational-adoption.md).

Current temporal orientation's own rule stands: empty is not free, available, or open. This contract adds that empty is also not allocatable, unoccupied, nothing important, nothing planned, or nothing to do.
