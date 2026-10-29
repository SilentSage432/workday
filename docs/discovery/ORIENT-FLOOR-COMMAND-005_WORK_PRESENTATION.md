# ORIENT-FLOOR-COMMAND-005 — Work presentation

Local only. Opening Work reads the retained observation and does not call Floor Command. The current presentation contract is [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_013.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_013.md). A retained success is not a live reading.

## Server-to-client boundary

Orient's session lives in the browser. `app/page.tsx` cannot see that session, so the authenticated boundary is `GET /api/integrations/floor-command/observation`.

The route takes the signed-in operator from the existing Supabase access token. It loads that operator's binding with the server adapter. The store is the binding. A query string cannot choose a store. The response is `FloorCommandWorkReading`. It has no bearer and no Floor Command base URL.

`OrientInstrument` requests that reading and passes it to `OrientView`. The view renders it only inside the Work surface, in a closed disclosure, ahead of the schedule. Per-bay rows stay inside a second disclosure. The schedule editor does not own the reading.

## What the operator sees

| Posture | Meaning |
| --- | --- |
| Not approved | No binding for this operator. |
| Not configured | The operator is approved, and the server credential or base URL is missing. |
| Store not authorized | The binding store is not the server store. No week is shown. |
| Retained | A week may be shown. The sentence names when it was observed, the source sequence and revision, and that it is retained evidence. An enabled pull flag does not make it current. |
| Not read | The retained row could not be loaded. |

A rejected credential, an unreachable source, a withheld snapshot, and a sequence conflict keep the last week and say why. An unpublished week stays unpublished. A cleared assignment says "Cleared in Floor Command." A bay that disappeared without that report says "Removed in Floor Command." Neither is an Orient completion. There is no checkbox.

The reading does not become a Task, Commitment, Block, Protected Time, stewardship row, Active Thread, or Pulse grant.

## Activation still required

1. Floor Command's Sunday publication gate, then its unreleased migrations through the atomic read.
2. Orient migrations `20261024210000`, `20261024220000`, and `20261024230000` on the Orient database. None of these is applied here.
3. An operator approval for the server store.
4. A later tranche that allows the hosted Floor Command origin. The pull still refuses `deptsync-hub.vercel.app`.
5. The pull flag, set only after those gates. RELEASE-008 left it absent. The credential and the operator binding now exist: [TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_008.md](TEAMLAB_ORIENT_FLOOR_COMMAND_RELEASE_008.md).

## Remaining limits

The Work surface shows the last accepted week. Opening it does not refresh that week. A separate week field inside the disclosure can ask for one named observation. Production still holds the `2026-W44` observation, and the pull flag is absent. The governed request migration is local only.
