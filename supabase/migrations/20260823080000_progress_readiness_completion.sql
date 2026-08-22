-- Task 9: atomically persist P0 progress facts and register one readiness event.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.save_user_progress_with_readiness_evidence(
  p_user_id uuid,
  p_progress jsonb,
  p_trigger_type text default null,
  p_trigger_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.user_progress%rowtype;
  v_evidence_changed boolean;
  v_event_key text;
  v_trigger_registered boolean := false;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;
  if p_progress is null
    or jsonb_typeof(p_progress) <> 'object'
    or (select count(*) from jsonb_object_keys(p_progress)) <> 13
    or not p_progress ?& array[
      'current_day', 'exp', 'level', 'completed_days', 'streak_count', 'weak_tags',
      'last_played_at', 'completed_topics', 'topic_mastery', 'topic_mastery_stats',
      'review_queue', 'weekly_plan', 'checkpoint_progress'
    ] then
    raise exception 'invalid progress payload' using errcode = '22023';
  end if;
  if jsonb_typeof(p_progress -> 'current_day') <> 'number'
    or jsonb_typeof(p_progress -> 'exp') <> 'number'
    or jsonb_typeof(p_progress -> 'level') <> 'number'
    or jsonb_typeof(p_progress -> 'completed_days') <> 'array'
    or jsonb_typeof(p_progress -> 'streak_count') <> 'number'
    or jsonb_typeof(p_progress -> 'weak_tags') <> 'array'
    or jsonb_typeof(p_progress -> 'completed_topics') <> 'array'
    or jsonb_typeof(p_progress -> 'topic_mastery') <> 'object'
    or jsonb_typeof(p_progress -> 'topic_mastery_stats') <> 'object'
    or jsonb_typeof(p_progress -> 'review_queue') <> 'array'
    or jsonb_typeof(p_progress -> 'weekly_plan') not in ('object', 'null')
    or jsonb_typeof(p_progress -> 'checkpoint_progress') not in ('object', 'null')
    or jsonb_typeof(p_progress -> 'last_played_at') not in ('string', 'null') then
    raise exception 'invalid progress payload' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_progress -> 'weak_tags') item
    where jsonb_typeof(item) <> 'string'
  ) or exists (
    select 1 from jsonb_array_elements(p_progress -> 'completed_topics') item
    where jsonb_typeof(item) <> 'string'
  ) or exists (
    select 1 from jsonb_array_elements(p_progress -> 'completed_days') item
    where jsonb_typeof(item) <> 'number'
  ) then
    raise exception 'invalid progress payload' using errcode = '22023';
  end if;
  if (p_trigger_type is null) <> (p_trigger_id is null)
    or (p_trigger_type is not null and p_trigger_type not in ('learning_complete', 'review_complete'))
    or (p_trigger_id is not null and (length(btrim(p_trigger_id)) = 0 or length(p_trigger_id) > 4096)) then
    raise exception 'invalid progress readiness trigger' using errcode = '22023';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select progress.*
  into v_existing
  from public.user_progress progress
  where progress.user_id = p_user_id
  for update;

  v_evidence_changed :=
    v_existing.topic_mastery_stats is distinct from (p_progress -> 'topic_mastery_stats')
    or v_existing.review_queue is distinct from (p_progress -> 'review_queue');
  v_event_key := case when p_trigger_type is null
    then null
    else p_trigger_type || ':' || p_trigger_id
  end;

  if v_event_key is not null and exists (
    select 1
    from public.exam_readiness_evidence_events event
    where event.user_id = p_user_id
      and event.event_key = v_event_key
  ) then
    if v_evidence_changed then
      raise exception 'progress readiness trigger conflicts with stored evidence'
        using errcode = '23505';
    end if;
    v_trigger_registered := true;
  end if;

  update public.user_progress
  set current_day = (p_progress ->> 'current_day')::integer,
      exp = (p_progress ->> 'exp')::integer,
      level = (p_progress ->> 'level')::integer,
      completed_days = array(
        select item.value::integer
        from jsonb_array_elements_text(p_progress -> 'completed_days') as item(value)
      ),
      streak_count = (p_progress ->> 'streak_count')::integer,
      weak_tags = array(
        select item.value
        from jsonb_array_elements_text(p_progress -> 'weak_tags') as item(value)
      ),
      last_played_at = (p_progress ->> 'last_played_at')::timestamptz,
      completed_topics = array(
        select item.value
        from jsonb_array_elements_text(p_progress -> 'completed_topics') as item(value)
      ),
      topic_mastery = p_progress -> 'topic_mastery',
      topic_mastery_stats = p_progress -> 'topic_mastery_stats',
      review_queue = p_progress -> 'review_queue',
      weekly_plan = p_progress -> 'weekly_plan',
      checkpoint_progress = p_progress -> 'checkpoint_progress',
      updated_at = clock_timestamp()
  where user_id = p_user_id;

  if v_evidence_changed and v_event_key is not null then
    perform public.register_exam_readiness_evidence(p_user_id, v_event_key);
    v_trigger_registered := true;
  end if;

  return jsonb_build_object(
    'evidence_changed', v_evidence_changed,
    'trigger_registered', v_trigger_registered
  );
end;
$$;

alter function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)
  owner to postgres;
revoke all on function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)
  from public;
revoke all on function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)
  from anon;
revoke all on function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)
  from authenticated;
revoke all on function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)
  from service_role;
grant execute on function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text)
  to service_role;

comment on function public.save_user_progress_with_readiness_evidence(uuid, jsonb, text, text) is
  'Atomically writes authoritative P0 progress and registers a typed stable readiness event only when mastery or review facts change.';
