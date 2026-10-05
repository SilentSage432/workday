-- EXECUTION-DIRECTION-REP-001: a Task or a Block explicitly in service of a Priority.
-- Two tables keep the execution kinds distinct. This is not a generic relationship graph.
-- The pair is the relationship. There is no surrogate event id and no second row for the same pair.
-- established_at is the instant of the human act. It is not insertion time, rank, or a deadline.
-- There is no destination_id. Priority already names its Destination.
-- There is no priority_id on tasks or blocks. Zero or many forbids that single column.
-- Block.task_id is not read and is not copied.
-- Withdrawal deletes the pair. There is no withdrawn_at, tombstone, or history.
-- blocks_id_user_key is a same-owner target. id is already the primary key, so the
-- constraint adds no Block column and no new Block cardinality.

alter table public.blocks
  add constraint blocks_id_user_key unique (id, user_id);

comment on constraint blocks_id_user_key on public.blocks is
  'Same-owner identity. id is already the primary key. This constraint adds no Block column and no priority reference.';

create table public.task_priority_service (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null,
  priority_id uuid not null,
  established_at timestamptz not null,
  constraint task_priority_service_pair_key primary key (task_id, priority_id),
  constraint task_priority_service_task_same_owner
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred,
  constraint task_priority_service_priority_same_owner
    foreign key (priority_id, user_id)
    references public.priorities (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred
);

comment on table public.task_priority_service is
  'The human explicitly established this Task in service of this Priority. One row per pair. Not progress, rank, provenance, or a Destination edge.';
comment on column public.task_priority_service.established_at is
  'Instant the human established this pair. Supplied at that act. Not a deadline, not rank, and not row-insert time.';
comment on constraint task_priority_service_task_same_owner on public.task_priority_service is
  'Same-owner Task. Does not cascade. Does not decide Task removal. A committed delete of a cited Task fails, and this row is left as it was. Deferred so account removal can delete that user''s rows in one transaction.';
comment on constraint task_priority_service_priority_same_owner on public.task_priority_service is
  'Same-owner Priority. Does not cascade. Does not decide Priority removal. A committed delete of a cited Priority fails, and this row is left as it was. Deferred so account removal can delete that user''s rows in one transaction.';

create index task_priority_service_user_established_at_idx
  on public.task_priority_service (user_id, established_at, task_id, priority_id);

alter table public.task_priority_service enable row level security;

-- Default privileges grant authenticated every table privilege at creation.
-- Revoke that set, then grant only select, insert, and delete.
-- Delete is withdrawal of the pair. Update is not a semantic operation.
revoke all on table public.task_priority_service from public;
revoke all on table public.task_priority_service from anon;
revoke all on table public.task_priority_service from authenticated;

grant select, insert, delete on table public.task_priority_service to authenticated;

create policy task_priority_service_select_own
  on public.task_priority_service
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy task_priority_service_insert_own
  on public.task_priority_service
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy task_priority_service_delete_own
  on public.task_priority_service
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table public.block_priority_service (
  user_id uuid not null references auth.users (id) on delete cascade,
  block_id uuid not null,
  priority_id uuid not null,
  established_at timestamptz not null,
  constraint block_priority_service_pair_key primary key (block_id, priority_id),
  constraint block_priority_service_block_same_owner
    foreign key (block_id, user_id)
    references public.blocks (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred,
  constraint block_priority_service_priority_same_owner
    foreign key (priority_id, user_id)
    references public.priorities (id, user_id)
    match simple
    on delete no action
    deferrable initially deferred
);

comment on table public.block_priority_service is
  'The human explicitly established this Block in service of this Priority. One row per pair. Not inherited from a Task. Not progress, rank, or a Destination edge.';
comment on column public.block_priority_service.established_at is
  'Instant the human established this pair. Supplied at that act. Not a deadline, not rank, and not row-insert time.';
comment on constraint block_priority_service_block_same_owner on public.block_priority_service is
  'Same-owner Block. Does not cascade. Does not decide Block removal. A committed delete of a cited Block fails, and this row is left as it was. Deferred so account removal can delete that user''s rows in one transaction.';
comment on constraint block_priority_service_priority_same_owner on public.block_priority_service is
  'Same-owner Priority. Does not cascade. Does not decide Priority removal. A committed delete of a cited Priority fails, and this row is left as it was. Deferred so account removal can delete that user''s rows in one transaction.';

create index block_priority_service_user_established_at_idx
  on public.block_priority_service (user_id, established_at, block_id, priority_id);

alter table public.block_priority_service enable row level security;

revoke all on table public.block_priority_service from public;
revoke all on table public.block_priority_service from anon;
revoke all on table public.block_priority_service from authenticated;

grant select, insert, delete on table public.block_priority_service to authenticated;

create policy block_priority_service_select_own
  on public.block_priority_service
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy block_priority_service_insert_own
  on public.block_priority_service
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy block_priority_service_delete_own
  on public.block_priority_service
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
