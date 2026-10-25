# ORIENT-FLOOR-COMMAND-005 — Work presentation

Local only. The pull stays off. Opening Work reads the retained observation and does not call Floor Command. Live connection remains **NO-GO**.

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
| Retained | A week may be shown. Live reading is off, or the last attempt failed. It is not a new check. |
| Last accepted read | The pull is enabled and the last attempt succeeded. This screen still did not request a new one. |
| Not read | The retained row could not be loaded. |

A rejected credential, an unreachable source, a withheld snapshot, and a sequence conflict keep the last week and say why. An unpublished week stays unpublished. A cleared assignment says "Cleared in Floor Command." A bay that disappeared without that report says "Removed in Floor Command." Neither is an Orient completion. There is no checkbox.

The reading does not become a Task, Commitment, Block, Protected Time, stewardship row, Active Thread, or Pulse grant.

## Activation still required

1. Floor Command's Sunday publication gate, then its unreleased migrations through the atomic read.
2. Orient migrations `20261024210000`, `20261024220000`, and `20261024230000` on the Orient database. None of these is applied here.
3. An operator approval for the server store.
4. A later tranche that allows the hosted Floor Command origin. The pull still refuses `deptsync-hub.vercel.app`.
5. The pull flag, set only after those gates. It is not set now.

## Remaining limits

The Work surface shows the last retained week. It does not refresh it. There is still no rate limit or read audit on the producer. Hosted migration state is unverified. No production credential exists.
