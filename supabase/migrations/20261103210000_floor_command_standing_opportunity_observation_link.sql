-- TEAMLAB-ORIENT-FLOOR-COMMAND-RELEASE-033
-- Link governed observation evidence onto a standing opportunity claim after a
-- durable source-attempt mark. Does not perform HTTP. Does not enable the gate.
-- Does not create claims. Not applied to hosted Orient by this tranche.

create or replace function public.link_floor_command_standing_opportunity_observation(
  p_user_id uuid,
  p_claim_id uuid,
  p_observation_request_id uuid,
  p_observation_outcome text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.floor_command_standing_opportunity_claims%rowtype;
  v_now timestamptz := now();
begin
  if p_user_id is null or p_claim_id is null or p_observation_request_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  if p_observation_outcome is null
     or p_observation_outcome not in (
       'accepted_new', 'unchanged', 'revised', 'failed', 'rejected'
     ) then
    return jsonb_build_object('status', 'invalid_outcome');
  end if;

  select *
  into v_claim
  from public.floor_command_standing_opportunity_claims
  where claim_id = p_claim_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_claim.source_attempted_at is null then
    return jsonb_build_object('status', 'source_not_attempted', 'claim_id', v_claim.claim_id);
  end if;

  if v_claim.observation_committed_at is not null then
    return jsonb_build_object(
      'status', 'observation_already_linked',
      'claim_id', v_claim.claim_id,
      'observation_request_id', v_claim.observation_request_id,
      'observation_outcome', v_claim.observation_outcome
    );
  end if;

  update public.floor_command_standing_opportunity_claims
  set
    source_response_at = coalesce(source_response_at, v_now),
    observation_request_id = p_observation_request_id,
    observation_committed_at = v_now,
    observation_outcome = p_observation_outcome
  where claim_id = v_claim.claim_id
  returning * into v_claim;

  return jsonb_build_object(
    'status', 'linked',
    'claim_id', v_claim.claim_id,
    'observation_request_id', v_claim.observation_request_id,
    'observation_outcome', v_claim.observation_outcome,
    'source_attempted_at', v_claim.source_attempted_at,
    'source_response_at', v_claim.source_response_at,
    'observation_committed_at', v_claim.observation_committed_at
  );
end;
$$;

comment on function public.link_floor_command_standing_opportunity_observation(uuid, uuid, uuid, text) is
  'Persists governed observation correlation onto a standing claim after source attempt. No HTTP.';

revoke all on function public.link_floor_command_standing_opportunity_observation(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.link_floor_command_standing_opportunity_observation(uuid, uuid, uuid, text)
  to service_role;

-- Terminal close after a committed dispatch decision when no governed classification
-- will be linked (for example governed open returned busy). Does not reopen the
-- opportunity and does not invent an observation outcome.
create or replace function public.close_floor_command_standing_opportunity_after_dispatch(
  p_user_id uuid,
  p_claim_id uuid,
  p_closure_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.floor_command_standing_opportunity_claims%rowtype;
begin
  if p_user_id is null or p_claim_id is null then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  if p_closure_reason is null
     or char_length(p_closure_reason) < 1
     or char_length(p_closure_reason) > 80 then
    return jsonb_build_object('status', 'invalid_reason');
  end if;

  select *
  into v_claim
  from public.floor_command_standing_opportunity_claims
  where claim_id = p_claim_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_claim.authority_status = 'closed' then
    return jsonb_build_object(
      'status', 'closed',
      'claim_id', v_claim.claim_id,
      'closure_reason', v_claim.closure_reason
    );
  end if;

  if v_claim.source_attempted_at is null then
    return jsonb_build_object('status', 'source_not_attempted', 'claim_id', v_claim.claim_id);
  end if;

  if v_claim.observation_committed_at is not null then
    return jsonb_build_object(
      'status', 'observation_already_linked',
      'claim_id', v_claim.claim_id
    );
  end if;

  update public.floor_command_standing_opportunity_claims
  set
    authority_status = 'closed',
    closed_at = now(),
    closure_reason = p_closure_reason
  where claim_id = v_claim.claim_id
  returning * into v_claim;

  return jsonb_build_object(
    'status', 'closed',
    'claim_id', v_claim.claim_id,
    'closure_reason', v_claim.closure_reason,
    'source_attempted_at', v_claim.source_attempted_at,
    'observation_outcome', v_claim.observation_outcome
  );
end;
$$;

comment on function public.close_floor_command_standing_opportunity_after_dispatch(uuid, uuid, text) is
  'Closes a standing claim after dispatch authorization when classification will not be linked. No HTTP.';

revoke all on function public.close_floor_command_standing_opportunity_after_dispatch(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.close_floor_command_standing_opportunity_after_dispatch(uuid, uuid, text)
  to service_role;
