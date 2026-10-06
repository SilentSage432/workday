# TIMED-FACT-CIVIL-DATE-CORRECTION-PHYSICAL-DIAGNOSTIC-001

Diagnostic accepted. The tranche is accepted in [TIMED-FACT-CIVIL-DATE-CORRECTION-001.md](TIMED-FACT-CIVIL-DATE-CORRECTION-001.md).

## Closure

No implementation defect was found in the current candidate source. The missing Date control came from a browser session that was still executing the pre-candidate `FactDetail` module.

The current source path is one `FactDetail`, shared by Present, Day, Week, and Month, on desktop and on phone. Date, Start, and End are the same `editing && stored` block. There is no Week-specific editor and no runtime correction for this miss.

Regression coverage now walks production `OrientView` into Week and Month on desktop, and into Week on the phone, inspects an existing timed Block, chooses Edit, and asserts the editable Fact date beside the existing Start control. Present and Day coverage stays.

A later desktop pass, on a client executing this candidate, found the Date authority visible and usable. Chrome device mode inspected the mobile form, and that interaction looked and felt correct. A deployed Samsung device has not exercised this commit. That confirmation may follow deployment and does not reopen the tranche.

No runtime behavior was changed for this closure.

## Expected behavior

Inspecting an existing timed Block from production Week, then choosing Edit, shows a civil-date field in that same edit, beside Start and End. Save is still the write. The contract is unchanged.

## Physical evidence

The human inspected a timed Block from production `/` while the question was Week.

- Purpose: software dev
- Civil date: Wed, Oct 7
- Time: 12:00 PM–3:00 PM
- Context: TeamLab

Edit opened. The interval line was `Wed, Oct 7, 12:00 PM–Wed, Oct 7, 3:00 PM`.

The visible edit controls were Start, End, Purpose, Context, Task, Save, Delete this fact, and Close. There was no civil-date control.

## Rendered path

```
app/page.tsx
  OrientInstrument
    OrientView
      question === "week"
        Landscape
          timed placement button
            onRefer(sharing(...))
              referTo
                surface { kind: "facts" }
                  InspectionSurface
                    FactDetail
                      Edit → editing && stored
```

Week and Month both mount `Landscape` and pass the same `referTo`. Present and Day mount `DesktopReading` or `PhoneContinuity` and pass that same `referTo`. All four questions open the one `InspectionSurface` in `OrientView`. There is no Week-only inspection component.

`FactDetail` in `components/orient/Surfaces.tsx` is the component that renders this control list. The prototype editor in `components/prototype/InstrumentView.tsx` is mounted at `/instrument`, not at `/`.

## Render condition in the candidate source

Inside `FactDetail`, the edit block is `{editing && stored ? ( ... )}`.

For a timed Block, `stored` is the timed placement from `describe`. Edit sets `editing`. Inside that one block, the candidate source renders, in order:

1. label Date, `input type="date"` with `aria-label="Fact date"`
2. Start
3. End
4. Purpose, Context, and Task, because `stored.sourceKind === "block"`
5. Save

Delete this fact and Close are outside that block and show for a Block whether or not Edit is open.

There is no second condition around the date input. Week does not take a different branch. Desktop and phone share this `FactDetail`. CSS for `.orient-surface input` and `.orient-note` does not hide `type="date"` or the Date label. The date field sits above Start, in the same region as the interval line the human read.

So the candidate source cannot show Start, End, Purpose, Context, and Task while omitting Date. Those nodes are one block, and Date is the first node in it.

## Root cause

The control list that was seen is the `FactDetail` edit block from before the date field was added.

`components/orient/Surfaces.tsx` was written at 16:34:48 local. The dev compiler emitted `.next/dev/static/chunks/_0seivos._.js` at 16:34:49, and that chunk contains the string `Fact date`. The production build at 16:38 also contains `Fact date` in `.next/static/chunks/03_9uwfgsyezv.js`.

Chunks compiled earlier the same afternoon contain `Fact start` and do not contain `Fact date`:

- `_0jojyto._.js` at 15:03:28
- `_0i1fabg._.js` at 15:04:06

`npm run dev` on port 3000 has been running since 2026-10-06 05:11 UTC, which is before that edit. A client that was still executing one of those earlier modules would render exactly the controls that were seen: Start through Close, with no Date label.

The `next start` process on port 3456 ended at 11:33 local, before the edit. It was not serving the 16:38 build.

This diagnostic did not capture the chunk URL loaded in the browser tab, so it does not name the module that tab executed. The source, the Week path, and the 16:34 dev chunk do not omit the control. The physical control list matches the pre-edit module that is still on disk.

Classification: the candidate source renders the input. The inspected session did not execute that source. It is not a Week-only render condition, not a hidden CSS node, and not a second production editor.

## Why the tests passed

`components/orient/civilDateCorrection.test.tsx` mounts `OrientView` from the current source through React, in happy-dom. It does not open the dev server and it does not load a compiled chunk.

Desktop tests leave `matchMedia("(max-width: 959px)")` unmatched, so the form is desktop and the initial question is Present. They click `button[data-source-kind]`, which on Present is the membership button, then Edit, then `aria-label="Fact date"`. After save they still assert `data-question="present"`.

The phone test forces the phone media query. The initial question is Day, `data-phone-reading` is true, and it asserts the same date input. If Week-style overlap opens first, the test chooses `Block · Write` and then Edit.

At the time of the miss, neither test called Week or Month, and the phone test never left Day. Those assertions passed because the source `FactDetail` contains the input. They proved the source tree. They did not prove the process the human had open.

Closure adds the Week, Month, and phone Week walks against that same source. Those walks still mount `OrientView` in happy-dom. They still do not prove which module a browser tab has loaded.

## What is not affected in source

Present, Day, Week, and Month all reach this one `FactDetail`. Phone uses it too. None of those questions has a branch that drops the date input. If the loaded module is the candidate, all of them show it. If the loaded module is the pre-edit `FactDetail`, all of them omit it. The physical miss is not special to Week in the source.

## Contract

Unchanged. Inspection of an existing timed Protected Time, Block, or Commitment still owns the correction, including when the fact is opened from Present, Day, Week, or Month.

## Smallest correction

No new editor and no Week-only field. The date input is already the first control in the timed edit block.

The inspected client has to execute the module compiled from that block. On the running dev server, that is the chunk emitted at 16:34:49, after a load that is not still holding the 15:03 module.

Do not change persistence, identity, kind, Block relationships, Commitment provenance, Capacity, the Save boundary, failure behavior, or viewpoint behavior. Those are already in the candidate and were not what the inspection failed.

The regression below is now in `components/orient/civilDateCorrection.test.tsx`. It locks the source path. It would not have turned red for a browser that never loaded the candidate.

## Regression boundary

One desktop test, against `OrientView` rather than a bare `FactDetail`:

1. Render the production view on the desktop form.
2. Choose Week.
3. Activate an existing timed Block in the Week field.
4. Choose Edit.
5. Assert a visible `input[aria-label="Fact date"]` whose value is that Block’s `startsOn`, and assert Start is still present in the same inspection.

The same procedure for Month, because Month uses `Landscape` and the same inspection. Present and Day are already asserted. One phone case on Week is enough to show the phone form reaches that same Week inspection; the existing phone test already covers Day.

Do not drop the Present and Day assertions.

## Parked observations

These were seen during the physical pass. They are not part of this correction. They are not investigated here and they are not implemented here.

### Cross-client coherence

An existing Block was deleted from the phone. The phone showed the deletion at once. A desktop Orient that was already open kept displaying that Block until something else caused it to refresh.

Later discovery should investigate this production principle: an active Orient client should converge on canonical temporal truth changed by another active Orient client without requiring a manual refresh. That discovery chooses the mechanism. Supabase Realtime is not prescribed.

### Mobile time entry

Work schedule time editing on Android opened the large analog native clock face. That interaction was previously rejected as too heavy for Orient. The accepted direction was compact time entry: the human types a time, or uses a simple hour and minute selection.

The time input is unchanged here. Later discovery should identify which Work schedule control opens the analog picker, whether the accepted compact time-entry machinery already exists elsewhere, why Work schedule does not use it, and whether desktop is affected.
