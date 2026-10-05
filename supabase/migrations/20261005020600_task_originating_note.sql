-- PROVENANCE-001: a Task may cite zero or one originating Note.
-- The relationship belongs to the Task. It is not an origin value.
-- Null means no originating Note was established with the Task.
-- Many Tasks may cite the same Note. The Note does not store those Tasks.
-- ON DELETE NO ACTION does not change the citing Task and does not clear the citation.
-- The check is deferred so account removal can delete that user's tasks and notes
-- in one transaction. That deferral is not a Note-deletion operation.
-- Notes still have no update or delete grant. This migration does not add one.
-- It does not decide what a future Note deletion would do. A committed delete of a
-- cited Note fails, and the Task row is left as it was.

alter table public.tasks
  add column originating_note_id uuid;

comment on column public.tasks.originating_note_id is
  'Optional identity of the Note this Task was explicitly established from. Null when none. Not origin. Not Note content.';

alter table public.tasks
  add constraint tasks_originating_note_same_owner
  foreign key (originating_note_id, user_id)
  references public.notes (id, user_id)
  match simple
  on delete no action
  deferrable initially deferred;

comment on constraint tasks_originating_note_same_owner on public.tasks is
  'Same-owner Note. Not unique, so many Tasks may cite one Note. Does not cascade. Does not set null. Does not grant Note deletion.';
