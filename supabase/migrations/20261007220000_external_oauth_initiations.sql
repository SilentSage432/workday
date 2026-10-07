-- GOOGLE-CALENDAR-OAUTH-SOURCE-SELECTION-IMPLEMENTATION-001
-- Short-lived OAuth initiation state (CSRF + PKCE verifier binding).
-- Server/service-role only. Not temporal truth. Not realtime.

create table public.external_oauth_initiations (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null,
  code_verifier text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint external_oauth_initiations_connection_same_owner
    foreign key (connection_id, user_id)
    references public.external_temporal_connections (id, user_id)
    on delete cascade,
  constraint external_oauth_initiations_state_shape check (
    char_length(btrim(state)) >= 32
    and char_length(state) <= 128
  ),
  constraint external_oauth_initiations_verifier_shape check (
    char_length(btrim(code_verifier)) >= 43
    and char_length(code_verifier) <= 128
  )
);

comment on table public.external_oauth_initiations is
  'One-time OAuth initiation state bound to Orient user and Connection. Server-only.';
comment on column public.external_oauth_initiations.state is
  'Cryptographically random OAuth state. Consumed once.';
comment on column public.external_oauth_initiations.code_verifier is
  'PKCE code_verifier retained server-side until callback exchange.';

create index external_oauth_initiations_user_idx
  on public.external_oauth_initiations (user_id);

create index external_oauth_initiations_expires_idx
  on public.external_oauth_initiations (expires_at);

alter table public.external_oauth_initiations enable row level security;

revoke all on table public.external_oauth_initiations from public, anon, authenticated;

-- Intentionally no authenticated policies.
-- Intentionally omitted from realtime publication membership.
