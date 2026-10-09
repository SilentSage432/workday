# ORIENT-ANDROID-PULSE-BRIDGE-003

Trusted server Pulse dispatcher — transport occurrence identity to Android FCM tokens.

## One sentence

After a durable `pulse_occurrence` exists, a secret-authenticated server route re-reads it and sends only its id to the owner’s registered Android FCM tokens.

## Status

**Implemented in repository. Not physically accepted as native delivery.**

Database Webhook not created. Android/Kotlin not implemented. No real FCM traffic from automated tests.

Prior:

- ORIENT-ANDROID-PULSE-NATIVE-PATH-CLEAR
- ORIENT-ANDROID-PULSE-TRANSPORT-CONTRACT-CLEAR
- ORIENT-ANDROID-PULSE-TOKEN-HOSTED-AUTHORITY-CLEAR (`orient_device_push_tokens` live)

## Authority boundary

```
TEMPORAL TRUTH
→ HUMAN INTERRUPTION AUTHORITY
→ HOSTED PULSE ESTABLISHMENT
→ durable pulse_occurrence
→ trusted dispatch          ← this tranche
→ FCM transport
→ ANDROID PERCEPTION        (deferred)
```

The dispatcher does **not** decide whether a Pulse should exist. Transport failure does not create occurrences, mutate grants, alter the evaluator, invent urgency, or imply perception.

## Route

| Item | Contract |
| --- | --- |
| Method / path | `POST /api/pulse/dispatch` |
| Runtime | Node.js (`export const runtime = "nodejs"`) |
| Auth header | `X-Orient-Pulse-Dispatch-Secret: <ORIENT_PULSE_DISPATCH_SECRET>` |
| Compare | SHA-256 digests + `timingSafeEqual` |

Missing/wrong secret → `401`. Firebase is not invoked.

## Input

Lookup key only:

- `{ "pulse_occurrence_id": "<uuid>" }`, or
- Supabase webhook-shaped `{ "record": { "id": "<uuid>", ... } }` (other record fields ignored)

Malformed → `400`. Webhook-supplied `user_id` cannot control ownership.

## Authoritative reread

After auth:

1. Service-role `SELECT` `pulse_occurrences` by id  
2. Ownership = hosted `user_id`  
3. Missing → `404`  
4. No mutation of occurrence / grant / temporal truth  

## Token lookup

`SELECT` from `orient_device_push_tokens` where `user_id = owner` and `platform = 'android'`.

No tokens → `200` `{ status: "no_targets", ... }` (not a Pulse failure).

## Firebase Admin boundary

- Dependency: `firebase-admin` (server-only; `serverExternalPackages`)
- Env: `FIREBASE_SERVICE_ACCOUNT_JSON` (full service-account JSON string)
- Never committed; never client-bundled; never logged

## FCM payload

Data message only:

```json
{ "pulse_occurrence_id": "<uuid>" }
```

Android config: `priority: "high"` for closed-app wake transport. No notification title/body, no urgency, no domain copy.

## Duplicate semantics

Webhook/dispatch/FCM may repeat. No delivery ledger. No `delivered` mark on occurrences. Android local dedupe by occurrence id remains the perception edge.

## Stale tokens

Firebase may report invalid/unregistered tokens. **Automatic deletion is deferred.**

Hosted `service_role` on `orient_device_push_tokens` is **SELECT-only**. This tranche does not broaden mutation authority.

## Secrets / prerequisites (Vercel)

| Env | Role |
| --- | --- |
| `ORIENT_PULSE_DISPATCH_SECRET` | Dispatch auth (exists) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | FCM Admin (exists) |
| `SUPABASE_SERVICE_ROLE_KEY` | Authoritative occurrence/token reads — **deployment prerequisite**; must be present in the environment that serves this route |
| `NEXT_PUBLIC_SUPABASE_URL` | Already required |

Values are outside repository authority.

## Explicitly not in this tranche

- Database Webhook creation/configuration  
- Android/Kotlin / notification / haptic  
- Phone / Firebase console / Supabase schema mutation  
- Delivery ledger / retry orchestration  
- Native delivery physical acceptance  

## Next

1. Review → commit/push candidate when requested  
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` on Vercel for the dispatch route  
3. Create Database Webhook `AFTER INSERT` on `pulse_occurrences` → this route + secret header  
4. `/android` auth, token registration, FCM receive, notification + haptic  
