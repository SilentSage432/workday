# Cadence

A cadence is how the user intends to move through a meaningful period or Context. It is not a rigid schedule. Interruptions are expected. The product helps the user resume rather than judging the deviation. The primitive is defined in [DOMAIN.md](DOMAIN.md).

No cadence outside Work has been discovered. Family, TeamLab, and Financial are Contexts. They are not cadences, and this file does not invent sequences for them. A Block or a Commitment in those Contexts is not a cadence.

The remainder of this document is the Work Context. Opening, Mid, and Closing are Work examples, not universal life patterns. The Work schedule is a different fact and lives in [PRODUCT.md](PRODUCT.md). Work clocks live in [TIME_MODEL.md](TIME_MODEL.md).

Opening has the strongest predefined sequence. Mid is intentionally fluid. Closing conceptually mirrors opening in the opposite direction, but an ordered personal closing sequence is not established.

Where this document says the user "normally" does something, that is known Work behavior, not a state machine the product has been authorized to enforce.

## Opening

The user normally begins with:

1. Check email
2. Review scorecard
3. Review sales/metrics
4. Review important communications/issues

Then:

5. **LSR — Lowe's Safe Review.** Opening department safety and readiness walk. Ensure the department is open, safe, and ready for customers and associates.

Then:

6. **Full Shelf Replenishment (FSR).** Previously referred to as IRP. Canonical name: Full Shelf Replenishment (FSR). Identify and complete replenishment and pack-down needs. Homes filled. This step uses absolute morning-clock time, not "a fixed offset after shift start": intended before approximately 10:00 AM, outer expectation approximately 11:00 AM. That language is a target, not a hard deadline.

Then:

7. **Associate alignment.** Check in with associates, understand what they are working on, establish priorities and cadence, and identify what they need from the user.

Then manager work and department responsibilities as available.

After lunch, and later in the day, conditions become more fluid:

- customer support
- sales
- customer issues
- manager-on-duty responsibilities
- store walks
- overrides
- gate unlocks
- associate support
- department work

FSR's target and Power Hour are both absolute. Power Hour does not delete an unfinished FSR. Customer focus is the store context during Power Hour; the Active Thread can still be FSR. See [TIME_MODEL.md](TIME_MODEL.md) and [PRODUCT.md](PRODUCT.md).

**Unresolved:** whether the product only remembers the user's place in this sequence, or also prompts when a step is skipped. Resume offers the Active Thread. A forced sequence is not established. Ending the shift is not defined as ending that thread.

## Mid

Mid shifts are less predictable. Do not force an artificial rigid sequence onto Mid.

Power Hour, 10:00 AM–2:00 PM, is particularly important. During Power Hour:

- customer focus takes precedence
- task work may still be available when customer demand permits
- the product should help the user Resume the Active Thread when available

**Unresolved:** any Mid structure beyond that fluidity, Power Hour, and the return to intended work.

## Closing

Closing conceptually mirrors opening in the opposite direction. An ordered checklist equal to Opening steps 1–7 is not established. Do not invent one.

Known closing concerns:

- confirm Full Shelf Replenishment responsibilities are complete
- Manager Portal closeout
- manager verifications complete
- department and store closing readiness
- managers walking the store to ensure customers have exited
- cash office responsibilities when assigned
- perimeter door checks and locking when assigned

Some closing responsibilities belong to the closing management team. They are not automatically this user's personal responsibility. "When assigned" is part of the cash-office and perimeter-door items. The product must not convert every store responsibility into a personal task merely because somebody must do it.

**Unresolved:** which concerns are the user's by default, how assignment is represented, and whether the user's own closing cadence has an order.

## Weekly rhythm

This is the user's current operating strategy inside the Lowe's fiscal week. That week begins on Saturday and is a Work fact. It does not define a universal calendar. See [TIME_MODEL.md](TIME_MODEL.md) for the deadline / target / objective distinction.

**Saturday.** The fiscal week begins. Emphasis is weekend, customer, and sales focus.

**Sunday.** A useful opportunity to start orienting and preparing work for the coming execution days.

**Monday through Thursday.** The primary runway for department task execution: pack-down, zoning, filling homes, preparing bays, manager obligations, and operational work discovered during the week.

**Thursday.** The desired department readiness boundary. This is an operating objective, not a Task and not a deadline.

**Weekend.** Ideally, sales and customer readiness rather than catching up on unfinished task work.

**Unresolved:** how the product represents this Work strategy so it remains context. It is not established as a set of enforced daily plans, and it is not a template for life outside Work.

## Recurring obligations

Bay Audits and Cycle Counts are Work Recurring Obligation definitions. The primitive is not limited to work. No non-work Recurring Obligation, with availability and a deadline, has been discovered. User-established caregiving reminders are a different fact and are not given a period here. See [DOMAIN.md](DOMAIN.md). The Wednesday and Friday boundaries use the Lowe's fiscal week, not a universal week.

Each definition activates an occurrence for a fiscal period. Completing that occurrence satisfies the period. The definition remains. A completed occurrence no longer burdens later shifts in that period.

### Bay Audits

- Available: weekend
- Deadline: Wednesday
- Preferred target: early

### Cycle Counts

- Available: weekend
- Deadline: Friday
- Preferred target: well before Friday

**Unresolved:** whether the occurrence is also a Task. No recurrence algorithm is defined.

## Established versus not established

| Established | Not established |
| --- | --- |
| Opening's normal sequence, including LSR and FSR (formerly IRP) | Enforcing that sequence, or the prompt behavior when it breaks |
| FSR as an absolute morning-clock target: intended before about 10:00 AM, outer expectation about 11:00 AM, not a deadline and not a shift-start offset | How those two morning points are shown when the clock passes them |
| Mid is fluid; Power Hour is customer focus; the Active Thread remains resumable | A Mid step sequence |
| Closing concerns, including items that apply only when assigned | An ordered personal closing cadence and an assignment model |
| Weekly Work strategy; Thursday readiness as a Work objective; obligation definition versus a completable period occurrence | Product mechanics that would turn the strategy or the objective into a checkbox or into catch-up enforcement |
| These cadences belong to Work | Any cadence outside Work. Family, TeamLab, and Financial do not yet have one |
| V0 may use this discovered Work cadence for orientation | A cadence editor, or any requirement to re-author these sequences before real use |
