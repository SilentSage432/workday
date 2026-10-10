-- ORIENT-PULSE-LIFECYCLE-002
-- Source-deletion cleanup authority correction.
--
-- 20261010093000 replaced Commitment FK ON DELETE CASCADE with AFTER DELETE
-- triggers calling pulse_interrupt_grants_cascade_source_delete(). That function
-- was SECURITY INVOKER and performed DELETE on pulse_interrupt_grants while
-- authenticated intentionally has no DELETE privilege (human withdrawal is soft
-- revoke via revoked_at). Authenticated source DELETE then failed with SQLSTATE
-- 42501: permission denied for table pulse_interrupt_grants.
--
-- Correction: narrow SECURITY DEFINER cleanup with pinned search_path, same
-- source_kind/source_id/user_id predicate, and EXECUTE limited to authenticated
-- so triggers can fire for owner source deletes without granting table DELETE.
-- Occurrences remain via pulse_occurrences.grant_id ON DELETE SET NULL.
--
-- Do not GRANT DELETE on pulse_interrupt_grants to authenticated.
-- Do not add a DELETE RLS policy for human sessions.

create or replace function public.pulse_interrupt_grants_cascade_source_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- TG_ARGV[0] is fixed by installed triggers (commitment | block), not caller SQL.
  if tg_argv[0] is distinct from 'commitment'
     and tg_argv[0] is distinct from 'block' then
    raise exception 'unsupported pulse source kind for grant cleanup: %', tg_argv[0];
  end if;

  delete from public.pulse_interrupt_grants
  where source_kind = tg_argv[0]
    and source_id = old.id
    and user_id = old.user_id;

  return old;
end;
$$;

comment on function public.pulse_interrupt_grants_cascade_source_delete() is
  'SECURITY DEFINER dependent cleanup: hard-deletes Interrupt Grants for the deleted owned source (source_kind, source_id, user_id). Restores FK ON DELETE CASCADE authority without granting authenticated DELETE on grants. Soft revoke via revoked_at remains the human withdrawal path.';

-- Trigger functions are invokable only as triggers, but default PUBLIC EXECUTE
-- would still allow authenticated/anon to attempt a direct call. Narrow EXECUTE
-- to authenticated so owner source DELETE can fire the triggers (PostgreSQL 14+
-- checks EXECUTE for the role executing the triggering statement).
revoke all on function public.pulse_interrupt_grants_cascade_source_delete()
  from public;
revoke all on function public.pulse_interrupt_grants_cascade_source_delete()
  from anon;
grant execute on function public.pulse_interrupt_grants_cascade_source_delete()
  to authenticated;

-- Triggers from 20261010093000 remain the sole callers:
--   pulse_interrupt_grants_cascade_commitment_delete on public.commitments
--   pulse_interrupt_grants_cascade_block_delete on public.blocks
-- CREATE OR REPLACE preserves those trigger bindings to this function OID/name.
