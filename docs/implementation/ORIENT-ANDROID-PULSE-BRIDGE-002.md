# ORIENT-ANDROID-PULSE-BRIDGE-002

Hosted device push token authority for future Orient Pulse Android delivery.

## One sentence

Register owner-scoped Android FCM tokens as delivery infrastructure only — never as Pulse authority.

## Status

**Implemented in repository. Migration not applied to hosted Supabase.**

Prior discovery/contracts:

- ORIENT-ANDROID-PULSE-NATIVE-PATH-CLEAR
- ORIENT-ANDROID-PULSE-TRANSPORT-CONTRACT-CLEAR

## Authority boundary

```
TEMPORAL TRUTH
→ HUMAN INTERRUPTION AUTHORITY
→ HOSTED PULSE ESTABLISHMENT
→ pulse_occurrences
→ DELIVERY TRANSPORT   ← token registration lives here
→ ANDROID PERCEPTION
```

A push token is **not**:

- Pulse authority
- temporal truth
- permission to create occurrences
- acknowledgment
- urgency
- evidence that Tyson perceived anything

## Proposed hosted schema

Migration: `supabase/migrations/20261009120000_orient_device_push_tokens.sql`

Table: `public.orient_device_push_tokens`

| Column | Role |
| --- | --- |
| `id` | UUID PK |
| `user_id` | Owner (`auth.users`), ON DELETE CASCADE |
| `fcm_token` | Globally unique FCM registration token |
| `platform` | First proof: `android` only |
| `updated_at` | Database-controlled refresh instant |

Indexes: `(user_id)` for future dispatcher lookup.

Not included: device names, inventory, watch identity, preferences, grant/occurrence FKs, delivery status, acknowledgment, telemetry.

## Owner-scoped RLS

- RLS enabled
- Revoke all from `public`, `anon`, `authenticated`, then `service_role`
- `authenticated`: SELECT / INSERT / UPDATE / DELETE own rows only
- Policies: `user_id = (select auth.uid())` for USING and WITH CHECK
- `anon` / `PUBLIC`: none

## Service-role lookup boundary

Migration expresses:

```sql
grant select on table public.orient_device_push_tokens to service_role;
```

No intentional `service_role` INSERT/UPDATE/DELETE for cleanup.

Supabase platform defaults may still leave `service_role` surplus after apply. **Hosted authority must be inspected after apply** (same class of finding as hosted Pulse establishment). This tranche does not apply the migration.

## Token registration / update semantics

Domain contract: `domain/devicePushToken.ts`

- Authenticated owner registers or refreshes their Android FCM token
- Global uniqueness + RLS reject silent cross-user reassignment
- Same owner + same token → refresh (`updated_at` by trigger)
- Same owner + new token → insert (multi-token allowed for first proof)
- Web TypeScript persistence writer deferred — Android/Kotlin will own registration
- No unused web UI

## updated_at

BEFORE INSERT OR UPDATE trigger sets `updated_at = timezone('utc', now())`.

Meaning: the authenticated owner most recently established/refreshed this registration. Not behavioral telemetry. Not client-authored.

## Explicitly not in this tranche

- FCM send
- Dispatcher route
- Database Webhook
- Kotlin / `/android` project
- Phone mutation
- Firebase / Vercel mutation
- Hosted Supabase apply
- Native delivery acceptance

## Pulse authority preserved

This migration does not alter:

- `pulse_interrupt_grants`
- `pulse_occurrences`
- hosted Pulse evaluator / `pg_cron`
- Commitment truth
- `temporal_settings`
- occurrence uniqueness
- in-app Pulse expression

## Next

1. Review → commit/push candidate (when requested)
2. Hosted apply + privilege inspection on `ksmhgaamyheyhefbyglb`
3. Later: dispatcher + webhook + Android registration/perception
