-- NOTE-STORAGE-001: a Note is a retained fragment of experience.
-- Domain fields are id, content, and captured_at.
-- user_id is ownership for row level security. It is not part of the Note.
-- captured_at is the instant the experience was retained. It is not insertion time,
-- not a civil day, and not a plan or a due date.
-- There is no created_at. There is no origin, Context, or lifecycle column.
-- Unique (id, user_id) is the same-owner target a later fact reference can use.
-- This migration does not add that reference.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  captured_at timestamptz not null,
  constraint notes_content_not_blank check (char_length(btrim(content)) > 0),
  constraint notes_id_user_key unique (id, user_id)
);

comment on table public.notes is
  'A retained fragment of experience. Not a Task. Not a temporal allocation.';
comment on column public.notes.content is
  'The retained experience. Required. Non-blank after trim. Not rewritten to remove the user''s wording.';
comment on column public.notes.captured_at is
  'Instant the experience was retained. Supplied at establishment. Not row-insert time.';
comment on constraint notes_id_user_key on public.notes is
  'Same-owner identity a later fact can reference. This migration does not add that reference.';

create index notes_user_captured_at_idx on public.notes (user_id, captured_at, id);

alter table public.notes enable row level security;

revoke all on table public.notes from public, anon;

-- Other application tables also grant update and delete because those operations exist.
-- Note editing and deletion are unresolved, so those privileges are not granted.
grant select, insert on table public.notes to authenticated;

create policy notes_select_own
  on public.notes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notes_insert_own
  on public.notes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
