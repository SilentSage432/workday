# GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION-IMPLEMENTATION-001

Bounded Tranche 3 implementation. Google OAuth + CalendarList enumeration + explicit source selection. No Event observation.

## Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD at start | `7963015bc4e900ee829b99e5ef3de5da9f662d07` |
| Prior tranche | [EXTERNAL-PROVIDER-CREDENTIAL-SECURITY-IMPLEMENTATION-001.md](EXTERNAL-PROVIDER-CREDENTIAL-SECURITY-IMPLEMENTATION-001.md) |
| Plan authority | [GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md](GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md) |
| Working tree at start | Clean; `main == origin/main` |

## Implemented boundary

Authenticated Orient human
→ Connect Google
→ OAuth authorization-code + PKCE S256 + CSRF state
→ server callback
→ encrypted credential custody
→ CalendarList enumeration
→ explicit human calendar selection
→ provider-neutral Observed Sources

**Not implemented:** `events.list`, Google Event mapping, `external_temporal_facts` writes, Present/Day/Week/Month external fact wiring, realtime, cron, syncToken, push/watch, writes to Google.

## Auth verification

`server/auth/requireAuthenticatedUser.ts`

- Reads `Authorization: Bearer <supabase access token>`
- Verifies via `supabase.auth.getUser(jwt)` with publishable key
- Returns verified `user.id`
- Does **not** trust browser-supplied `user_id`

Browser clients obtain the session token from the existing Supabase browser client and send it on management XHR routes.

## Connection lifecycle

| Step | Status |
| --- | --- |
| Connect intent | Reuse latest `pending_auth` / `connected` / `auth_failed` Google Connection, or insert `pending_auth` |
| Successful callback + credential custody | `connected` |
| Callback / exchange failure | `auth_failed` |
| Disconnect | `disconnected`; credentials deleted; sources deselected |

Failed/abandoned OAuth never masquerades as connected. Connection identity is Orient-local (no Google email/profile required).

## OAuth state design

Table: `external_oauth_initiations` (`supabase/migrations/20261007220000_external_oauth_initiations.sql`)

| Field | Role |
| --- | --- |
| `state` | Cryptographically random PK; OAuth `state` |
| `user_id` / `connection_id` | Ownership binding (same-owner FK to Connection) |
| `code_verifier` | PKCE verifier retained server-side |
| `expires_at` | Short TTL (default 10 minutes) |
| `consumed_at` | One-time use marker |

RLS enabled; revoke all from public/anon/authenticated; no policies; not in realtime publication.

## State expiry / one-time behavior

`consumeOAuthInitiation`:

- fail closed on missing / invalid
- fail closed on expired
- fail closed on already consumed
- atomic consume via `update … where consumed_at is null`

## PKCE

- Verifier: 32 random bytes, base64url
- Challenge: SHA-256(verifier) base64url (S256)
- Challenge sent on authorize URL; verifier used only in server-side code exchange

## Authorization request

Built server-side (`buildGoogleAuthorizationUrl`):

- `response_type=code`
- configured client ID + exact redirect URI
- scope: `https://www.googleapis.com/auth/calendar.readonly`
- CSRF `state`
- PKCE S256 challenge
- `access_type=offline`
- `prompt=consent` — chosen so V1 reliably obtains a refresh token on Connect (including reconnect after disconnect). Consent is requested on each Connect initiation.

No write scopes. No Gmail/profile/contacts/OpenID scopes.

## Callback ownership binding

OAuth callback is a browser redirect and does **not** rely on `Authorization` Bearer.

Ownership is established exclusively by consuming the one-time server-persisted initiation row keyed by `state`, which carries:

- initiating Orient `user_id`
- Connection id
- PKCE verifier

Invalid/expired/reused state never reaches code exchange. Tokens never return to the browser or redirect query.

Post-callback redirect allowlist (exact paths only):

- success: `/?manage=external-calendars`
- error: `/?manage=external-calendars&googleError=<code>`

Origin taken from configured `GOOGLE_OAUTH_REDIRECT_URI` (fail closed to localhost only when config absent during error handling).

## Code exchange

`exchangeGoogleAuthorizationCode`:

- POST to Google token endpoint with code, client secret, redirect URI, PKCE verifier
- Requires refresh token on initial exchange
- Validates granted scope includes Calendar readonly
- Seals payload via existing credential repository
- Marks Connection `connected` only after successful custody
- On failure: marks `auth_failed`

## Google credential payload

Google-only DTO in `server/googleCalendar/types.ts`:

- `accessToken`
- `refreshToken` (nullable after refresh omit)
- `tokenType`
- `accessTokenExpiresAtMs`
- `scope`

Serialized JSON sealed inside `external_provider_credentials` envelope. No plaintext token columns.

## Credential-custody integration

Uses Tranche 2:

- `storeExternalProviderCredentials`
- `openExternalProviderCredentialText`
- `deleteExternalProviderCredentials`
- `requireOwnedExternalConnection`

## Refresh-token preservation

On refresh:

- if Google returns a new refresh token → retain it
- if omitted → preserve previously held refresh token
- reseal with fresh nonce via repository store

## Token-refresh implementation

`openAuthorizedGoogleCredential`:

- opens custody
- refreshes when ≤60s remain
- reseals replacement
- distinguishes `oauth_auth_failed` vs `oauth_transient`
- no periodic scheduler

## Revoke implementation

`revokeGoogleToken` — best-effort POST to Google revoke endpoint.

`disconnectGoogleCalendarForUser`:

1. open credential (if present)
2. best-effort remote revoke
3. delete local custody
4. clear source selection
5. mark Connection `disconnected`

Remote revoke failure does **not** block local disconnect. Response reports `revokedRemotely` truthfully.

## CalendarList adapter

`enumerateGoogleCalendarList` — direct HTTPS to:

`https://www.googleapis.com/calendar/v3/users/me/calendarList`

No `googleapis` package. No `events.list`.

## Pagination

Follows `nextPageToken` up to 50 pages. Later-page failure returns `status: "partial"` and does not claim complete enumeration. Zero calendars is a successful empty complete result.

## Calendar safe-metadata mapping

| Google field | Orient selection metadata |
| --- | --- |
| `id` | `sourceLocalId` (opaque) |
| `summary` / `summaryOverride` | `displayName` |
| `primary` | `primary` (UI hint) |
| `accessRole` | stored as safe metadata on Source (`provider_access_role`) |
| `timeZone` | `sourceTimeZone` |
| Orient selection | `selected` (not Google’s selected flag) |

Deleted entries skipped. No Google settings imported into core temporal domain.

## Source identity / upsert

Unique relationship: user + Connection + `source_local_id`.

Enumeration+save upserts enumerated calendars; rename updates display metadata without new identity.

## Explicit selection

Save persists only IDs present in a **complete** CalendarList enumeration for the owned Connection. Enumeration alone never selects.

## Deselection

Saving without an ID (or empty selection) sets `selected=false`. No fact-cache semantics in this tranche; orchestration leaves room for Tranche 4 cache clearing.

## Arbitrary-source-injection defense

`saveGoogleSourceSelection` rejects any selected ID not in the enumerated set (`source_injection_rejected`). Sources route re-enumerates before save.

## Management endpoints

| Route | Method | Role |
| --- | --- | --- |
| `/api/external/google/connect` | POST | Begin OAuth |
| `/api/external/google/callback` | GET | OAuth callback |
| `/api/external/google/status` | GET | Connection/source status (no secrets) |
| `/api/external/google/calendars` | GET | Enumerate calendars |
| `/api/external/google/sources` | PUT | Save selection |
| `/api/external/google/disconnect` | POST | Disconnect |

All management routes (except callback) require verified Bearer auth.

## UI surface

LOOK → Position operations → **Google Calendar** (borrowed operational surface, same pattern as Manage Work).

Component: `ExternalCalendarsOperation`.

### Disconnected

“Not connected” + Connect.

### Connected

Connected status, Load calendars, checkbox selection draft, Save selection, Disconnect. Explicit note: selection permits later observation; events are not loaded here.

### Loading / empty / error

Distinguishes status loading, calendar loading, zero calendars, enumeration failure, partial enumeration, auth failure, configuration unavailable. Save disabled when enumeration is incomplete.

## Security review

| Risk | Mitigation |
| --- | --- |
| Login CSRF / callback substitution | One-time state bound to user+Connection |
| State replay | `consumed_at` + atomic update |
| PKCE downgrade | S256 only; verifier server-side |
| Open redirect | Exact allowlisted paths; origin from configured redirect URI |
| Token leakage | Never in responses/redirects/logs |
| Arbitrary Connection | `requireOwnedExternalConnection` |
| Source injection | Enumerated-ID allowlist |
| Browser credential exposure | Client never imports credential/server modules |
| Refresh-token loss | Preserve-on-omit |
| Config absent | Fail closed on Google routes; app builds without secrets |

## Configuration names

Server-only (documented in `.env.example`):

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

Also required for custody (Tranche 2):

- `SUPABASE_SERVICE_ROLE_KEY`
- `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY`

Never `NEXT_PUBLIC_` for secrets. App builds without Google values; Connect fails closed with configuration error.

## Human Google Cloud setup (after review / before physical acceptance)

Do **not** perform these in this tranche. Exact steps for the operator:

1. Create/select a Google Cloud project.
2. Enable **Google Calendar API**.
3. Configure OAuth consent screen (External; Testing status is appropriate for operators).
4. Add operator Google accounts as test users if required.
5. Create **Web application** OAuth client.
6. Authorized redirect URIs:
   - Local: `http://localhost:3000/api/external/google/callback`
   - Production: `https://orient-cyan.vercel.app/api/external/google/callback`
7. Install in Vercel (server-only): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (production callback URL).
8. Ensure `SUPABASE_SERVICE_ROLE_KEY` is installed in Vercel.
9. Generate 32-byte key: `openssl rand -base64 32` → install as `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY`.
10. Apply migration `20261007220000_external_oauth_initiations.sql` to the Supabase project.
11. Redeploy.
12. Never paste secret values into chat, Cursor, or the repo.

## Tests

- PKCE / state / OAuth URL / exchange / refresh
- Authorized access refresh + reseal
- CalendarList pagination / partial / empty
- Source selection / injection / ownership
- Disconnect + revoke best-effort
- Auth helper rejects missing Bearer
- Architectural guards (no events.list, no googleapis, oauth initiation RLS)
- UI: disconnected / connected / empty / error / save / disconnect
- LOOK operations include Google Calendar

## Validation

See automated validation section in the return report for this tranche.

## Files changed

See return report item 3.

## Deferred event observation

Tranche 4: `events.list`, Google Event → external fact mapping, observation windows, bounded absence, production Present/Day/Week/Month external reads, provenance UI.

## Deviations

None material from the accepted plan. `prompt=consent` on every Connect is documented above as the refresh-token reliability choice.

## Final verdict

**OAUTH-SOURCE-SELECTION-CLEAR**

OAuth and explicit Google Calendar source-selection implementation are sound and ready for preservation/configuration before physical acceptance and Tranche 4.
