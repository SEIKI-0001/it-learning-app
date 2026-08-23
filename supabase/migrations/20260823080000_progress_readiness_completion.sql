-- Task 9: atomically persist P0 progress facts and register one readiness event.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- A stable completion key is bound to the full canonical JSON payload received
-- on its first successful transaction. This lets an old exact retry reclaim
-- readiness work without rewriting progress that newer completions have moved on.
create table public.progress_readiness_completions (
  user_id uuid not null references public.line_users (id) on delete cascade,
  trigger_type text not null check (
    trigger_type in ('learning_complete', 'review_complete', 'assessment')
  ),
  trigger_id text not null check (length(btrim(trigger_id)) > 0 and length(trigger_id) <= 4096),
  progress_payload jsonb not null check (jsonb_typeof(progress_payload) = 'object'),
  payload_fingerprint text not null check (length(payload_fingerprint) = 32),
  readiness_registered boolean not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, trigger_type, trigger_id)
);

alter table public.progress_readiness_completions owner to postgres;
alter table public.progress_readiness_completions enable row level security;
revoke all on table public.progress_readiness_completions from public;
revoke all on table public.progress_readiness_completions from anon;
revoke all on table public.progress_readiness_completions from authenticated;
revoke all on table public.progress_readiness_completions from service_role;

comment on table public.progress_readiness_completions is
  'RPC-private idempotency records binding a stable learning/review/assessment completion to its original full progress payload and readiness association.';

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
  v_completion public.progress_readiness_completions%rowtype;
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
    or (p_trigger_type is not null and p_trigger_type not in (
      'learning_complete',
      'review_complete',
      'assessment'
    ))
    or (p_trigger_id is not null and (length(btrim(p_trigger_id)) = 0 or length(p_trigger_id) > 4096)) then
    raise exception 'invalid progress readiness trigger' using errcode = '22023';
  end if;

  if p_trigger_type = 'assessment' and not exists (
    select 1
    from public.assessment_sessions assessment
    where assessment.user_id = p_user_id
      and assessment.session_id::text = p_trigger_id
      and assessment.status = 'completed'
  ) then
    raise exception 'assessment readiness trigger requires a completed session owned by the user'
      using errcode = '23503';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select progress.*
  into v_existing
  from public.user_progress progress
  where progress.user_id = p_user_id
  for update;

  if p_trigger_type is not null then
    select completion.*
    into v_completion
    from public.progress_readiness_completions completion
    where completion.user_id = p_user_id
      and completion.trigger_type = p_trigger_type
      and completion.trigger_id = p_trigger_id
    for update;

    if found then
      if v_completion.payload_fingerprint is distinct from md5(p_progress::text)
        or v_completion.progress_payload is distinct from p_progress then
        raise exception 'progress readiness trigger conflicts with original payload'
          using errcode = '23505';
      end if;

      return jsonb_build_object(
        'evidence_changed', false,
        'trigger_registered', v_completion.readiness_registered,
        'replayed', true
      );
    end if;
  end if;

  v_evidence_changed :=
    v_existing.topic_mastery_stats is distinct from (p_progress -> 'topic_mastery_stats')
    or v_existing.review_queue is distinct from (p_progress -> 'review_queue');
  v_event_key := case when p_trigger_type is null
    then null
    else p_trigger_type || ':' || p_trigger_id
  end;

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

  if v_event_key is not null
    and (v_evidence_changed or p_trigger_type = 'assessment') then
    perform public.register_exam_readiness_evidence(p_user_id, v_event_key);
    v_trigger_registered := true;
  end if;

  if v_event_key is not null then
    insert into public.progress_readiness_completions (
      user_id,
      trigger_type,
      trigger_id,
      progress_payload,
      payload_fingerprint,
      readiness_registered
    ) values (
      p_user_id,
      p_trigger_type,
      p_trigger_id,
      p_progress,
      md5(p_progress::text),
      v_trigger_registered
    );
  end if;

  return jsonb_build_object(
    'evidence_changed', v_evidence_changed,
    'trigger_registered', v_trigger_registered,
    'replayed', false
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
  'Atomically binds a stable completion to its full payload, writes authoritative P0 progress once, and registers readiness for assessment finalization or changed mastery/review facts.';
