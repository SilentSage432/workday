# EXTERNAL-PROVIDER-CREDENTIAL-SECURITY-IMPLEMENTATION-001

Bounded Tranche 2 security implementation. Credential custody foundation only.

## Baseline

| Item | Value |
| --- | --- |
| Canonical HEAD at start | `87b0407eb8cef87d777c7ee152afb6ac78eaa14b` |
| Prior tranche | [EXTERNAL-TEMPORAL-CORE-IMPLEMENTATION-001.md](EXTERNAL-TEMPORAL-CORE-IMPLEMENTATION-001.md) |
| Plan authority | [GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md](GOOGLE-CALENDAR-OBSERVATION-IMPLEMENTATION-PLAN-001.md) |
| Working tree at start | Clean; `main == origin/main` |

## Security boundary

Provider credentials are capability-bearing secrets.

They are not temporal truth, domain truth, browser state, realtime data, or projection input.

Path:

plaintext (trusted server caller)
→ AES-256-GCM seal
→ ciphertext persistence
→ ownership-verified server open/update/delete

No Google OAuth. No real provider credentials. No public credential API routes.

## Credential schema

Migration: `supabase/migrations/20261007210000_external_provider_credentials.sql`

Table: `external_provider_credentials`

| Column | Role |
| --- | --- |
| `connection_id` | PK; one envelope per Connection |
| `user_id` | Owner; same-owner FK to Connection |
| `ciphertext` | Base64 AES-GCM ciphertext |
| `nonce` | Base64 12-byte IV |
| `encryption_version` | Envelope version (`v1` only) |
| `scopes` | Non-secret scope metadata |
| `access_token_expires_at` | Optional non-secret expiry metadata |
| `created_at` / `updated_at` | Lifecycle timestamps |

No plaintext token columns.

## RLS / no-policy model

- RLS enabled
- `revoke all` from `public`, `anon`, `authenticated`
- **No** authenticated policies
- **No** grants to authenticated/anon
- Service-role bypass used only by trusted server modules after ownership verification

## Realtime publication

Credentials are not added to `supabase_realtime`.

Migration intentionally omits publication membership changes.

## Service-role boundary

`server/supabaseServiceRoleClient.ts`

- Reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Server-only assert
- No session persistence / auto-refresh
- Throws `service_role_unavailable` only when factory is invoked without config
- Does not replace browser RLS client

## Encryption

`server/credentials/crypto.ts`

| Item | Decision |
| --- | --- |
| Algorithm | AES-256-GCM via platform Web Crypto (`crypto.subtle`) |
| Key env | `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY` |
| Key format | Standard base64 of exactly 32 random bytes |
| Nonce | Fresh 12 cryptographically random bytes per seal |
| Version | `v1` only; unknown versions fail closed |
| AAD | UTF-8 `` `${version}\0${userId}\0${connectionId}` `` |
| Payload | Opaque bytes (caller serializes; crypto does not interpret Google DTOs) |

No new crypto dependency. No password-based derivation. No key rotation infrastructure.

## Ownership verification

`server/credentials/ownership.ts`

`requireOwnedExternalConnection(admin, authenticatedUserId, connectionId)`

- Looks up Connection with service role
- Requires row `id` + `user_id` match authenticated user
- Privilege permits lookup; ownership establishes authority
- Caller-supplied owner id alone is insufficient

## Repository operations

`server/credentials/repository.ts`

| Operation | Behavior |
| --- | --- |
| `storeExternalProviderCredentials` | Verify ownership → seal → upsert one row |
| `openExternalProviderCredentials` | Verify ownership → load → validate version → open with AAD → return plaintext to server caller |
| `deleteExternalProviderCredentials` | Verify ownership → delete credential row only |

Store/replace: one record per Connection; fresh nonce each seal; no secret history.

Load: missing → `credential_missing`; corrupt/auth failure → `credential_unopenable`.

Delete: does not delete Connection/Sources/Facts/Orient truth; no Google revoke.

## Error model

`ExternalCredentialError` codes:

- `service_role_unavailable`
- `encryption_key_unavailable`
- `encryption_key_invalid`
- `unauthorized_connection`
- `credential_missing`
- `unsupported_envelope_version`
- `credential_unopenable`
- `persistence_failure`

Messages do not include plaintext, keys, or ciphertext dumps.

## Domain / projection isolation

Credential modules are not imported by:

- `domain/externalTemporal.ts`
- Timeline / CTO / Present / Day / Week / Month / Capacity

Credential types are not added to temporal domain vocabulary.

## Browser isolation

- Modules live under `server/`
- Runtime `assertServerOnly`
- Architectural tests forbid client/domain/projection/persistence imports of credential/server modules
- Browser Supabase client unchanged
- Ordinary external temporal SourceRead columns exclude credential fields

## Secret-logging review

No logging of plaintext, tokens, encryption keys, ciphertext dumps, or service-role keys in touched modules.

Tests use synthetic values only.

## Config-optional behavior

Ordinary Orient continues to test/typecheck/build without:

- `SUPABASE_SERVICE_ROLE_KEY`
- `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY`

Secret validation occurs when privileged factories/operations are invoked, not on module import.

## Dependencies

Zero new runtime dependencies.

## Environment documentation

`.env.example` documents server-only names (commented; no values):

- `SUPABASE_SERVICE_ROLE_KEY`
- `EXTERNAL_CREDENTIALS_ENCRYPTION_KEY` (base64 / 32 bytes)

No Google client ID/secret/redirect URI in this tranche.

## Tests

- `server/credentials/crypto.test.ts` — round trip, nonce uniqueness, key validation, wrong key, tamper, AAD mismatch, version rejection
- `server/credentials/repository.test.ts` — ownership, store/open/replace/delete, unauthorized, missing vs corrupt
- `server/credentials/isolation.test.ts` — domain/projection/browser/realtime/RLS/config-optional

## Validation

| Check | Result |
| --- | --- |
| Credential security tests | 24 passed |
| External temporal + capacity relevant tests | Pass |
| Full suite | **855 passed / 90 files** |
| Lint | Pass |
| Typecheck | Pass |
| Production build without real provider/security secrets | Pass |

## Files changed

- `supabase/migrations/20261007210000_external_provider_credentials.sql`
- `server/assertServerOnly.ts`
- `server/supabaseServiceRoleClient.ts`
- `server/credentials/errors.ts`
- `server/credentials/crypto.ts` (+ test)
- `server/credentials/ownership.ts`
- `server/credentials/repository.ts` (+ test)
- `server/credentials/isolation.test.ts`
- `.env.example`
- This document

## Deferred work

Tranche 3: Google OAuth routes, token exchange, CalendarList, source selection UI, Google Cloud/human secrets.

Later: observation writes via service role, revoke orchestration, realtime for sources/facts only, key rotation if needed.

## Deviations from accepted plan

1. Modules live under `server/` rather than only `persistence/supabaseServerClient.ts`, to harden browser isolation; service-role client name is `supabaseServiceRoleClient.ts`.
2. Did not add the `server-only` npm package (zero new dependencies); used runtime assert + architectural import tests instead.
3. Ciphertext/nonce stored as base64 `text` for Supabase JS simplicity (equivalent security to bytea for this purpose).

## Final verdict

## CREDENTIAL-SECURITY-CLEAR

Credential custody foundation is securely implemented within the accepted Tranche 2 boundary. Ready for security/architectural review before commit/push. Tranche 3 must not begin until this is preserved.
