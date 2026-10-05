# DISCOVERY-CANON-001 — Captured experience, destination, priority, and cadence

Date: 2026-10-03.

Baseline: `c6caea97de202d46991f6ca1dd0aada685f892ff`.

This tranche records semantic discoveries made after [PRODUCTION-CONTRACT-001](../decisions/2026-10-03-operational-adoption.md) and [P0-INTEGRITY-001](../implementation/P0-INTEGRITY-001.md). It does not implement behavior, storage, or interface. It does not choose a parser, a speech provider, a language model, a ranking, a score, or an automation.

Living statements are in [DOMAIN.md](../../DOMAIN.md), [PRODUCT.md](../../PRODUCT.md), [CADENCE.md](../../CADENCE.md), and [TIME_MODEL.md](../../TIME_MODEL.md). This file keeps the reasoning and the questions those documents do not need to repeat.

## What was already canon

A Note meant information worth retaining when action had not been established. It did not burden the Task list. Conversion to a Task was explicit and was required to keep originating information. Which parts survived was unresolved. Notes were not stored.

A Task meant action is required. The user establishes it. It does not have to be done at capture.

Cadence meant how the user intends to move through a meaningful period or Context. It was not a rigid schedule. Opening, Mid, and Closing are Work cadences. No cadence existed for Family, TeamLab, or Financial.

Context meant a meaningful area or operating mode. Work, Family, TeamLab, and Financial were established. How a Context becomes current was unresolved.

Target meant a preferred completion point. Objective meant a desired operating condition, not automatically a Task. Deadline stayed a completion boundary. Those three were not collapsed.

Must Do was a user-set flag, not a score and not inferred urgency. Today was a planned civil day, not a rank. No high / medium / low priority existed.

Provenance already meant where a truth came from: `user_created` on a Commitment or Task, and originating information when a Note became a Task. External sources keep authority over their own facts.

Runtime intelligence was deterministic. A model does not decide what matters, what the user should do, what time means, whether time is available, what Context is current, what should be sacrificed, or how an overlap is resolved. A later bounded interface, if some future decision authorizes one, still would not own temporal truth. None is authorized.

Human authority stays with the user. The product does not infer action from informational capture.

## Note

The earlier sentence described a Note by the absence of a Task. The discovery is positive.

A Note is a retained fragment of experience: something the user observed, learned, thought, or was told, captured so its meaning can be revisited later. It carries no inherent obligation to act. It may remain informational indefinitely. It may later be provenance for zero, one, or many explicitly established actions or temporal facts.

Capture time is when the experience was retained. It is not when something should occur. Incomplete understanding is legitimate information. Suggestive language inside a Note does not establish an action.

Establishing a later fact does not destroy or replace the Note. The earlier word "conversion" remains the name of an explicit user act in older records. It does not mean the Note is consumed. [FOUNDATION-002.md](FOUNDATION-002.md) item 3 stays historical. Its Note sentence is refined here.

No Note schema is defined in this discovery. [../decisions/2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md) later decides the minimum representation and where the provenance reference sits. [../implementation/NOTE-STORAGE-001.md](../implementation/NOTE-STORAGE-001.md) stores that Note. This file is not rewritten into that decision.

## From experience to action

A captured experience may not yet tell the user what should happen. Further observation, questioning, learning, or reflection may produce enough understanding to establish an action.

That transition does not happen because imperative language appears, because software classifies text as actionable, because a parser detects a verb, or because an interpretation believes something sounds like a Task.

Interpretation may propose structure. The user establishes meaning.

A useful conceptual sequence is experience, then capture, then interpretation, then human establishment, then execution. It is not a workflow and not a wizard. A capture need not pass through every stage.

## Interpretation

Future typed or spoken capture may be interpreted into candidate structure supported by what the user expressed. Candidates may include observations, retained information, candidate actions, temporal references, possible durations, unresolved information, and other explicitly supported structure.

Candidates are proposals. They are not a Task, Block, Commitment, Priority, Destination, or other domain truth until the user establishes them.

No language model, speech provider, parser, confidence algorithm, or extraction architecture is chosen. The deterministic runtime remains the authority. If an external language model eventually participates, it is an interpretation interface. It is not temporal or domain authority. It must not silently establish importance, Priority, availability, current Context, Tasks, temporal meaning, what should be sacrificed, or what the user should do. Private model reasoning is not retained.

[2026-10-02-deterministic-intelligence.md](../decisions/2026-10-02-deterministic-intelligence.md) is not relaxed.

## Provenance

Provenance is an inspectable relationship to evidence the user originated. It is not an event log, and it is not stored chain-of-thought.

When a Task or another supported fact originates from a Note, the Note remains independently intact. One Note may support several later facts. Where that relationship exists, the system should eventually be able to answer why the established thing exists and which captured experience it came from.

How that relationship is stored is unresolved. [ARCHITECTURE-001.md](../architecture/ARCHITECTURE-001.md) sketched source fields, including a note reference. That sketch is not this decision.

## Destination, Objective, and Target

Nothing in prior canon used Destination.

Objective remains a desired operating condition in the time model. It may contextualize Tasks. It is not a checkbox. Thursday department readiness is an Objective.

Target remains a preferred completion point. It may be earlier than a deadline and does not become one on its own. Full Shelf Replenishment's morning language is a Target.

Destination is a different conceptual layer. It describes where the user is deliberately trying to take some part of their life or reality. It may be a desired condition, a direction of development, or something continuously approached rather than a binary finish line. It may evolve as the user learns. It is the reference against which sustained importance can be understood.

The user needs some sense of where they are going before Priority can have directional meaning.

Destination is not declared equal to Objective or to Target. The boundary among the three, beyond the refusal to collapse them, is unresolved. Destination is not a Context. It is not yet a stored primitive. Lifecycle, completion, metrics, hierarchy, and schema are not defined.

## Priority

Priority is a condition or area of sustained attention whose continued health materially advances an established Destination and therefore deserves repeated execution over time.

It describes what repeatedly matters to movement toward a Destination. Concrete execution under it may change as reality changes. A Priority is not itself necessarily a Task. Actions can establish, restore, or maintain the condition it names.

Priority is not Must Do, Due, Planned, a Block, or the Active Thread. It is not urgency, recency, frequency, a due date, or whatever currently has the user's attention. It is not high, medium, or low. It is not a numeric score or an inferred ranking.

Attention is not evidence of importance. An interruption that gains attention does not gain Priority. Something may need doing without being the best use of the user's own execution.

Needs doing is not needs the user. Needs the user is not needs the user now. The user may determine that another person should execute something while the user retains responsibility for follow-up or outcome. That delegation and follow-up relationship is unresolved. It does not authorize multi-user assignment, workforce management, employee accounts, or a delegation workflow.

No automatic prioritization is authorized.

Earlier tranche records that exclude "priority" mean they did not add a rank, a score, or a level. That exclusion still holds. It does not define this Priority.

The following Work illustration shows the relationship. It is not a system taxonomy.

Destination, as the user described it: learn to genuinely run the Flooring & Home Decor business.

Conditions the user treated as sustained attention toward that Destination included maintaining showroom standards, remaining in stock, remaining clean and safe, maintaining the inventory needed to execute installed sales efficiently, and developing Specialists who know their business, own their portion, maintain it like they own it, and have fun doing it.

## Cadence

The existing definition stands: cadence is how the user intends to move through a meaningful period or Context, not a rigid schedule.

This discovery adds a second description of the same primitive: cadence is recurring attention and execution through which the user maintains or advances the conditions that matter to a Destination.

Neither description replaces the other. Opening, Mid, and Closing remain movement through a Work shift. They do not require a Destination to stay valid. A cadence is not a list of recurring Tasks and not a set of rigid time blocks. A scheduled execution may be disrupted while the cadence remains valid. No cadence is invented for Family, TeamLab, or Financial.

## Foundation and deviation

A strong operating foundation makes deviation easier for the human to perceive. Ordinary life contains friction. The goal is not zero disturbance.

Stable foundations and explicit relationships make a departure from intended operation more legible. The human determines meaning and cause.

No Friction entity is added. No anomaly detection is authorized. No cause of deviation is inferred.

## Relationship, not a tree

The conceptual relationship is:

Destination, then Priority, then cadence or repeated execution, then observable reality.

That is not a persisted hierarchy and not a project tree. Not every Task requires a Priority. Not every Note requires a Destination. Not every Priority requires a metric. Not every Destination requires completion criteria. The system should know relatively few things deeply through explicit relationships.

These meanings do not replace the temporal architecture. Time remains the canvas. Protected Time, Commitment, Block, Task, Active Thread, Timeline, and current temporal orientation keep their existing semantics. Capacity is not defined here. [../decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md) later defines the bounded reading. [../implementation/CAPACITY-001.md](../implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. Timeline semantics are unchanged. NOW composition is not defined in this discovery. No ranking is created. Present-moment orientation was later decided in [../decisions/2026-10-04-present-moment-orientation.md](../decisions/2026-10-04-present-moment-orientation.md). Destination and Priority are not inputs to that composition.

Context stays a meaningful area or operating mode. Destination and Priority are not folded into it. A Context may relate to several Destinations and Priorities. That relationship is not authorized. How Context becomes current stays unresolved.

## Production classification

Notes remain required for operational adoption. Their meaning is now established. Storage, editing, lifecycle, and provenance representation remain required and unresolved. Voice remains required and remains downstream of a safe capture result contract. This discovery does not authorize voice.

Later, [../decisions/2026-10-04-note-representation.md](../decisions/2026-10-04-note-representation.md) decided the minimum Note and the provenance reference, [../implementation/NOTE-STORAGE-001.md](../implementation/NOTE-STORAGE-001.md) stored the Note, and [../decisions/2026-10-04-capture-establishment-contract.md](../decisions/2026-10-04-capture-establishment-contract.md) decided the capture-result contract. [../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) decides the return: an established Note stays directly revisitable through the conceptual Capture experience. [../implementation/NOTE-REVISIT-001.md](../implementation/NOTE-REVISIT-001.md) is the scaffold proof. NOTE-REVISIT-001A accepts it on the Samsung Galaxy S26 Ultra. It is not the production experience. [../decisions/2026-10-04-provenance-contract.md](../decisions/2026-10-04-provenance-contract.md) decides how the human explicitly establishes that a retained experience is the source of a new Task. The Note remains intact. Reference alone establishes nothing. [../implementation/PROVENANCE-001.md](../implementation/PROVENANCE-001.md) stores the Task citation. PROVENANCE-001A records the hosted schema on `ksmhgaamyheyhefbyglb` and accepts the scaffold on the Samsung Galaxy S26 Ultra. The required Note chain for the current adoption contract is closed. Edit, delete, and archive stay unresolved, and they are not required for operational adoption. That placement does not make a Note immutable or undeletable. The final interaction stays unresolved. [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md) decides that a Block may refer to one existing Task. The Task does not acquire the time. [../implementation/TASK-TIME-001.md](../implementation/TASK-TIME-001.md) stores that reference. TASK-TIME-001A accepts the hosted schema and the Samsung Galaxy S26 Ultra scaffold. The scaffold is not the production interaction. Capacity remains unresolved. Notes stay required retained experience, not a Notes application. [VOICE-CAPABILITY-001.md](VOICE-CAPABILITY-001.md) compared acquisition mechanisms. [../implementation/VOICE-PROBE-001A.md](../implementation/VOICE-PROBE-001A.md) passed: on the primary phone, keyboard dictation supplies expression text, and no speech provider was authorized.

Destination and Priority are established conceptual meanings. Their production implementation classification is unresolved. They are not added to the adoption contract as required, as merely enabling, or as future. The current product identity is temporal orientation inside a life the user has chosen. These concepts explain sustained importance and why temporal decisions matter. They do not replace that identity. Evidence does not show that adoption must wait for their representation, and it does not show that the product may treat them as disposable. The contract records that refusal to classify.

## Unresolved

- exact Destination representation
- Destination, Objective, and Target boundaries beyond the refusal to collapse them
- exact Priority representation
- Priority lifecycle
- relationship of Priority to Context
- whether and how Tasks explicitly relate to Priority
- whether and how Cadence explicitly relates to Priority
- Note schema and storage, as left open here; the minimum representation is the later note-representation decision, and storage is NOTE-STORAGE-001
- Note editing, deletion, and archive, as left open here; [../decisions/2026-10-04-note-revisit.md](../decisions/2026-10-04-note-revisit.md) later places them outside operational adoption without deciding their semantics, and decides the return to a retained Note through Capture. [../implementation/NOTE-REVISIT-001.md](../implementation/NOTE-REVISIT-001.md) is the scaffold proof, accepted on the Samsung Galaxy S26 Ultra, not the production experience
- representation of Note to established-fact provenance, as left open here; the later note-representation decision places an optional reference on the derived fact, and [../decisions/2026-10-04-provenance-contract.md](../decisions/2026-10-04-provenance-contract.md) decides that relationship for a Task
- interpretation result contract, as left open here; the later capture-establishment decision is the contract
- typed interpretation experience; the semantic contract is the later capture-establishment decision, and the interaction is not built
- voice transcription and provider, as left open here; VOICE-PROBE-001A later shows that keyboard dictation supplies expression text on the primary phone, and no provider is chosen
- language interpretation technology
- confidence and ambiguity handling, as left open here; the later capture-establishment decision treats unresolved meaning as legitimate and stores no score
- when confirmation is required, and what confirmation looks like; the later capture-establishment decision requires an explicit establishment act, and the visible form of that act remains open
- delegation and follow-up semantics
- whether accumulated Notes should expose repeated observations
- Capacity, as left open here; [../decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md) later defines the bounded reading. [../implementation/CAPACITY-001.md](../implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. Other allocatable boundaries remain unresolved
- Task-to-time planning, as left open here; [../decisions/2026-10-05-task-time-contract.md](../decisions/2026-10-05-task-time-contract.md) later decides that a Block may refer to one Task, and TASK-TIME-001A accepts that scaffold. The bounded Capacity reading is later decided in [../decisions/2026-10-05-capacity-contract.md](../decisions/2026-10-05-capacity-contract.md) [../implementation/CAPACITY-001.md](../implementation/CAPACITY-001.md) implements that reading and does not add a production interaction. The final interaction remains unresolved
- NOW composition, as left open here; the later present-moment decision is the composition, and the experience is not built
- Week interactions
- Month interactions
- how a Context becomes current

## Contradictions held

1. **A Note was defined as information while action was absent.** That remains true of obligation: capturing a Note creates none. It is no longer the whole definition. A Note may stay after action is later established from it.
2. **"Conversion" could be read as replacing the Note.** Establishment keeps the Note. Older records are not rewritten into a schema.
3. **Cadence was only movement through a period.** That meaning stays. Recurring attention toward a Destination is added as the same primitive, not a second one, and not a requirement that Opening name a Destination.
4. **Objective and Target already covered "desired" and "preferred."** Destination is not merged into either. Thursday readiness stays an Objective. The FSR morning language stays a Target.
5. **"Priority" in earlier tranches meant rank or score, which the product refused.** That refusal stays. The new Priority is sustained attention toward a Destination, not a level.
6. **Deterministic authority excludes a model from the runtime.** Interpretation may propose structure only as a future interface the existing decisions already refused to authorize. No model is admitted.
7. **Notes are an adoption requirement, and "what a Note is" was unresolved.** The meaning is now established. Representation still blocks. Voice is still not authorized.
8. **New concepts can be mistaken for new adoption blockers.** Destination and Priority are not classified into the contract's required or future lists.
9. **Older prose uses "destination" for a screen and "target" for an aim.** Navigation destinations in earlier interface records, including the icon vocabulary, mean a surface the user can open. They are not this Destination. PRODUCT.md now says navigation surface where that collision was in living text. Thursday readiness remains an Objective. The FSR morning language remains a Target.
10. **Opening says the user establishes priorities with associates.** That sentence in [CADENCE.md](../../CADENCE.md) is Work behavior in the user's words. It does not define Priority and it is not a taxonomy.
