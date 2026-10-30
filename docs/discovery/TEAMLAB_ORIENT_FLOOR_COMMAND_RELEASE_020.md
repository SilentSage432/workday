# TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-020

Work interface refinement for Floor Command observation clarity. Written 2026-10-30 from [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_019.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_019.md).

This record does not deploy. It does not enable `ORIENT_FLOOR_COMMAND_PULL_ENABLED`. It does not submit an observation, migrate the database, or change authorization or persistence.

**NO-GO** to deploy from this record.

**GO** to request a separate production deployment of this presentation change.

## 1. Original problem

**Observe this week** was a native submit button inside the Work disclosure. It had no Orient button surface, so it did not read as the action. The retained handoff mixed three facts into overlapping sentences: the original acceptance, a later check, and the stored sequence and revision. An unchanged result was phrased as “the source revision was the same,” which could be read as a permanent state.

## 2. Files changed

- `components/orient/FloorCommandWorkView.tsx`
- `components/orient/FloorCommandObservation.tsx`
- `components/orient/orient.css`
- `projections/floorCommandEvidenceCopy.ts`
- `projections/floorCommandEvidenceCopy.test.ts`
- `components/orient/floorCommandObservation.test.tsx`

The submit path is still `requestFloorCommandObservation`. The week field still enables the button only when the value matches `/^\d{4}-W\d{2}$/` and a request is not already pending. No `useEffect` was added.

## 3. Visual and interaction changes

The control uses the existing `orient-action` button with `data-emphasis="save"`.

| State | Presentation |
| --- | --- |
| Enabled | Gold surface `rgb(243, 215, 176)`, dark text, full width of the Floor Command section, 44px tall, pointer cursor |
| Disabled | Muted fill, muted text, opacity 0.55, default cursor. Hover does not restore the gold surface |
| Pending | Label “Observing this week”, gold surface, wait cursor, `aria-busy`, and the button stays disabled |

The enabled and pending treatments were measured in a local preview of `orient.css`. Keyboard focus uses the existing `.orient-action:focus-visible` outline. The accessible name is the button text. A finished result is announced in a `role="status"` region and is set only after the response returns.

Terminal wording keeps the outcome token:

| Outcome | Sentence |
| --- | --- |
| `accepted_new` | Recorded. Orient accepted this reading. |
| `unchanged` | Recorded. The retained revision matched this check. Floor Command can still change later. |
| `revised` | Recorded. Orient accepted a newer reading. The earlier accepted reading remains in history. |
| `rejected` | Rejected. The last accepted reading is unchanged. |
| `failed` | Failed. The last accepted reading is unchanged. |
| Any other outcome | Floor Command observation was not started. |

## 4. Evidence presentation

Work now shows three labeled facts:

| Label | Source |
| --- | --- |
| Originally observed | The accepted handoff time, in the confirmed zone |
| Last checked | `last_checked_at` when it is present. Otherwise: no later check is recorded |
| Retained evidence | Source sequence and revision stored on the handoff |

The section still says this is retained evidence, not a live Floor Command reading. Freshness is not inferred from the clock. `checked_sequence` is named only when it is a number. A null `checked_sequence`, which is what an equal sequence leaves behind, is not shown as a checked sequence. The unchanged follow-up says the check matched the retained revision and that Floor Command can still change after it.

## 5. Accessibility

The week input keeps its label. The button is a submit button, so Enter in the field submits once. Disabled and pending buttons are not actionable. The pending button exposes the busy state. The outcome region is a status. Focus-visible styling is the shared Orient action rule.

## 6. Responsive check

A local page loaded the real stylesheet at a 360px surface and a 704px surface. At both widths the button was full width and 44px tall. The revision `c3a29fab9de35ca0` wrapped inside the surface and did not overflow. Timestamps and the unchanged outcome wrapped onto additional lines. The enabled control was gold, the disabled control was muted, and the loading control stayed gold with the waiting label. This preview was not the signed-in production Work page.

## 7. Regression results

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `next build` | Passed, including its TypeScript pass |
| ESLint on the changed TypeScript files | Passed |
| Evidence copy, Work observation UI, and governed observation tests | 19 passed |
| Production Floor Command endpoint | Not called |
| Pull flag | Not enabled |

Opening Work still does not call `requestFloorCommandObservation`. The Work view still has no `useEffect`. The one-shot pull file was not edited.

## 8. Remaining limitations

The button enables from the week text. It does not know whether the server flag is absent. A press while the flag is absent still returns before a request row is inserted. The page sentence still does not show the request id. A null `checked_sequence` stays unlabeled rather than being copied from the source sequence.

## 9. Recommendation

**NO-GO** to deploy, to enable the pull flag, or to submit another observation from this record.

**GO** to request a separate authorization to deploy this presentation change. Production remains `77ad973` / `dpl_C6uGoDWowoeXkgh4hGbjr7ZKZYch` with the pull flag absent until that authorization.

**STOP.** Nothing was committed, pushed, or deployed.
