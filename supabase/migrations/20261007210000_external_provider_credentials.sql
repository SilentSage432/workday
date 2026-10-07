-- EXTERNAL-PROVIDER-CREDENTIAL-SECURITY-IMPLEMENTATION-001
-- Security-only persistence for encrypted provider authorization material.
-- Not temporal domain truth. Not browser-readable. Not realtime.

create table public.external_provider_credentials (
  connection_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
  encryption_version text not null,
  scopes text not null,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_provider_credentials_connection_same_owner
    foreign key (connection_id, user_id)
    references public.external_temporal_connections (id, user_id)
    on delete cascade,
  constraint external_provider_credentials_ciphertext_shape check (
    char_length(btrim(ciphertext)) > 0
  ),
  constraint external_provider_credentials_nonce_shape check (
    char_length(btrim(nonce)) > 0
  ),
  constraint external_provider_credentials_encryption_version_known check (
    encryption_version = 'v1'
  ),
  constraint external_provider_credentials_scopes_shape check (
    char_length(scopes) <= 2000
  )
);

comment on table public.external_provider_credentials is
  'Encrypted provider authorization material. Not temporal truth. Server/service-role only.';
comment on column public.external_provider_credentials.ciphertext is
  'AES-GCM ciphertext (base64). Never plaintext tokens.';
comment on column public.external_provider_credentials.nonce is
  'AES-GCM nonce/IV (base64). Fresh per seal.';
comment on column public.external_provider_credentials.encryption_version is
  'Envelope format version. Unknown versions must fail closed in application code.';
comment on column public.external_provider_credentials.scopes is
  'Non-secret OAuth scope string retained for refresh/authorization checks. Not temporal truth.';
comment on column public.external_provider_credentials.access_token_expires_at is
  'Optional access-token expiry metadata. Not a capability secret by itself.';

create index external_provider_credentials_user_idx
  on public.external_provider_credentials (user_id);

alter table public.external_provider_credentials enable row level security;

-- No ordinary client access. Service role bypasses RLS for trusted server paths only.
revoke all on table public.external_provider_credentials from public, anon, authenticated;

-- Intentionally no policies for anon/authenticated.
-- Intentionally omitted from realtime publication membership.
