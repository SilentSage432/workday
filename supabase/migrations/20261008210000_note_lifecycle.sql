-- NOTE-LIFECYCLE-001: Retire and Delete for retained Notes.
-- retired_at null means the Note is current operational memory.
-- A non-null retired_at means the Note existed and was valid, but no longer
-- belongs in the current Notes collection. Retirement is not deletion.
-- UPDATE and DELETE are now product operations for the owning user.
-- tasks.originating_note_id → notes (id, user_id) ON DELETE NO ACTION is unchanged.
-- This migration does not cascade, set null, or clear Task provenance.
-- Existing rows stay current because retired_at defaults to null.

alter table public.notes
  add column retired_at timestamptz;

comment on column public.notes.retired_at is
  'Instant the Note left current operational Notes. Null means current. Not deletion. Not archive browsing.';

grant update (retired_at) on table public.notes to authenticated;
grant delete on table public.notes to authenticated;

create policy notes_update_own
  on public.notes
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notes_delete_own
  on public.notes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
