# DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-001

Remove diagnostic DTM probe residue from production Desktop Week. Preserve corrected Direct Temporal Manipulation.

## Baseline

`e53069f1f20c382b77f355d47adf6f58b329c541` on `main`, matching `origin/main`.

Discovery authority: [DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001.md](DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-DISCOVERY-001.md).

## Diagnostic artifacts removed

### `components/orient/Landscape.tsx`

- Props `probeDetailOpen`, `onProbeDetailClear`
- State `probe`, ref `origin`, flag `probing`
- Helpers `describeTarget`, `provisionalNodeMounted`, `noteDown`, `noteMove`, `noteLift`, `noteLost`, `noteCancel`, `noteUp`, `latchProvisional`, `resetProbe`
- Diagnostic `hasPointerCapture` / `hasCapture` read in `beginLift`
- noteMove-only pending locals (`width` / panHalf / vertical packaging)
- Aside `.orient-dtm-probe` / `data-dtm-probe` / Reset `data-dtm-reset`
- Types/helpers `DtmProbe`, `emptyProbe`, `formatProbe`

### `components/orient/OrientView.tsx`

- `probeDetailOpen` state
- Landscape probe props and `setProbeDetailOpen` in `onPropose`

### `components/orient/orient.css`

- `.orient-dtm-probe`, `.orient-dtm-probe pre`, `.orient-dtm-probe button`

### `components/orient/orientView.test.tsx`

- Entire temporary probe test
- Probe `textContent` assertions in horizontal-lift correction test
- Phone `data-dtm-probe` null assertion

## Corrected production behavior preserved

- Desktop Week only (`directManipulation={form === "desktop" && question === "week"}`)
- Eligible timed Protected Time / Block / Commitment
- Contact → pending → 10px intentional movement in any direction → lift
- Pointer capture on lift; `captured` from `setPointerCapture` success
- Pending release does not pan; territory pan remains for non-eligible presses
- Cross-column date mapping; Y → minute; 30-minute quantum; duration / overnight / equal-clock 24h
- Provisional paint (`.orient-provisional` / `[data-provisional]`)
- Release proposes; FactDetail owns draft; Save is authority; same-id update

## Files changed

- `components/orient/Landscape.tsx`
- `components/orient/OrientView.tsx`
- `components/orient/orient.css`
- `components/orient/orientView.test.tsx`
- `docs/implementation/DIRECT-TEMPORAL-MANIPULATION-PROBE-CLEANUP-001.md` (this record)

## Tests changed

Semantic DTM coverage retained. Probe-only coverage removed as listed above.

## Validation evidence

| Check | Result |
| --- | --- |
| Targeted `orientView.test.tsx` + `temporalProposal.test.ts` | 49 passed |
| Full suite | 801 passed / 84 files |
| Lint | Pass |
| Typecheck | Pass |
| Production build | Pass |
| Runtime probe residue search (`orient-dtm-probe`, `data-dtm-probe`, `probeDetailOpen`, `DtmProbe`, `noteDown`, `latchProvisional`) | No matches under `components/orient` source |

## Non-goals

- DTM redesign or threshold tuning
- Week / desktop redesign
- Phone DTM or LOOK · + · ACT changes
- Formal DTM acceptance document
- External temporal / Calendar work
- Historical probe/correction doc deletion

## Status

**Awaiting deployed physical production acceptance.**

This record does not claim physical acceptance. After deployment, exercise corrected Desktop Week DTM without probe chrome, then close with a dedicated acceptance artifact.
