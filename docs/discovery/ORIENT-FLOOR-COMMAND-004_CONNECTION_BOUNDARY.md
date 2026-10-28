# ORIENT-FLOOR-COMMAND-004 — Connection boundary

Local only. The pull is off unless `ORIENT_FLOOR_COMMAND_PULL_ENABLED` is exactly `1`. This tranche originally refused `deptsync-hub.vercel.app`. RELEASE-004B allows that exact HTTPS origin and still refuses every lookalike. No production credential was created. Live connection remains **NO-GO**.

Floor Command remains the authority for assignments, Zebra entry, and confirmed SMART deadlines. Orient keeps its own week, and it does not create a Task, Commitment, Block, stewardship row, or Pulse grant.

## Operator approval

A configured credential does not connect an operator.

`approveFloorCommandConnection` reads the signed-in operator with the existing Supabase session. The store comes from `ORIENT_FLOOR_COMMAND_STORE_NUMBER`. The caller cannot pass a store, a source, or a purpose. The server records:

- source `deptsync.floor-command.orient.v1`
- purpose `orient_published_week_read`
- the normalized store
- `approved_at`

The same approval can be repeated. A different store is rejected. `authenticated` cannot execute the bind. The binding table has no token column.

## Credential custody

The bearer lives in `ORIENT_FLOOR_COMMAND_READ_TOKEN`. It is read only in server code, sent only as a request header, and omitted from the approval result, the pull result, and logs. It is not written to a client-readable row. It is not a Floor Command supervisor session and not Floor Command's service-role key.

Orient's own service-role key is used only to call the existing bind and persist functions.

| State | Meaning |
| --- | --- |
| Unconfigured | Token, store, or a usable base URL is missing. A lookalike of the production host is treated as missing. The exact `https://deptsync-hub.vercel.app` origin is usable. |
| Configured, pull off | The server can name the store. The default. No request is made. |
| Revoked | The source answered 401. The last snapshot stays. The attempt reason is `credential_rejected`. |
| Unavailable | Timeout, transport failure, or a body that is not the contract. The last snapshot stays. |

Floor Command uses one unauthorized response for expiry and revocation. Orient does not invent which one it was.

## Pull

`pullFloorCommandPublishedWeek` asks for one ISO week. It does not choose the week from the clock. It claims a database lease, then sends one GET for the server store. The timeout is eight seconds. `redirect` is `manual`. A snapshot week that differs from the requested week is an invalid snapshot.

HTTP 200 is not acceptance. `synchronization: "withheld"` is a failed attempt and does not replace the snapshot. A lower sequence is rejected. The same sequence with a different revision is a conflict. After one committed success, another pull returns `already_succeeded` and does not fetch. A failed fetch releases the claim. A committed success does not.

## Retired assignments

`snapshot.retired` is the source's cleared list, including on the first observation. Those rows are `retired`. An assignment that was current and then disappeared without a retired row is `superseded`. Current rows stay `current`. A failed read keeps the last list. None of these lifecycles means the associate finished the Zebra task. `zebra_task_completed` stays false. The view says "Cleared in Floor Command" and does not say completed.

## Work

The retained reading is mounted beside the Work schedule. The server boundary and the pull flag are described in [ORIENT-FLOOR-COMMAND-005_WORK_PRESENTATION.md](ORIENT-FLOOR-COMMAND-005_WORK_PRESENTATION.md). Opening Work does not call Floor Command. No notification or Pulse grant was added.

## Activation still required

1. Floor Command's Sunday publication gate, then its unreleased migrations through the atomic read.
2. Orient migrations `20261024210000`, `20261024220000`, `20261024230000`, and `20261024240000` on the Orient database. None of these is applied to hosted Orient by the local application work.
3. An operator approval for the server store.
4. The exact production origin is now accepted by local code. It is not activated here.
5. The pull flag, set only after those gates. It is not set now.

## Remaining limits

There is no rate limit on the producer and no read audit there. A rejected older sequence writes no attempt row. The bearer is an environment secret, so rotation is a deployment change plus `revoked_at` on the Floor Command credential. This repository does not perform that revocation.
