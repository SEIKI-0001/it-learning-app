-- P1-2 Task 8: atomically complete one immutable assessment session.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.complete_assessment_session(
  p_user_id uuid,
  p_session_id uuid,
  p_completed_at timestamptz,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.assessment_sessions%rowtype;
  v_answer jsonb;
  v_answered_count integer;
  v_correct_count integer;
  v_first_count integer;
  v_seen_count integer;
  v_unknown_count integer;
begin
  if p_user_id is null or p_session_id is null or p_completed_at is null then
    raise exception 'assessment session identity and completion time are required'
      using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'assessment session answers must be an array'
      using errcode = '22023';
  end if;

  select session.*
  into v_session
  from public.assessment_sessions session
  where session.user_id = p_user_id
    and session.session_id = p_session_id
  for update;

  if not found then
    raise exception 'assessment session not found' using errcode = 'P0002';
  end if;
  if p_completed_at < v_session.started_at then
    raise exception 'assessment completion precedes start' using errcode = '22023';
  end if;

  for v_answer in select value from jsonb_array_elements(p_answers)
  loop
    if jsonb_typeof(v_answer) <> 'object'
      or (select count(*) from jsonb_object_keys(v_answer)) <> 7
      or not (
        v_answer ? 'idempotency_key'
        and v_answer ? 'canonical_question_id'
        and v_answer ? 'topic_id'
        and v_answer ? 'field_id'
        and v_answer ? 'is_correct'
        and v_answer ? 'first_attempt_state'
        and v_answer ? 'answered_at'
      )
      or jsonb_typeof(v_answer -> 'idempotency_key') <> 'string'
      or jsonb_typeof(v_answer -> 'canonical_question_id') <> 'string'
      or jsonb_typeof(v_answer -> 'topic_id') <> 'string'
      or jsonb_typeof(v_answer -> 'field_id') <> 'string'
      or jsonb_typeof(v_answer -> 'is_correct') <> 'boolean'
      or jsonb_typeof(v_answer -> 'first_attempt_state') <> 'string'
      or jsonb_typeof(v_answer -> 'answered_at') <> 'string'
      or length(btrim(v_answer ->> 'idempotency_key')) = 0
      or length(btrim(v_answer ->> 'canonical_question_id')) = 0
      or length(btrim(v_answer ->> 'topic_id')) = 0
      or length(btrim(v_answer ->> 'field_id')) = 0
      or (v_answer ->> 'first_attempt_state') not in ('first', 'seen', 'unknown') then
      raise exception 'invalid assessment session answer'
        using errcode = '22023';
    end if;

    -- Force timestamp parsing before any write so malformed payloads roll back cleanly.
    perform (v_answer ->> 'answered_at')::timestamptz;
  end loop;

  if jsonb_array_length(p_answers) > v_session.question_count then
    raise exception 'assessment answers exceed immutable question count'
      using errcode = '22023';
  end if;
  if (
    select count(*) <> count(distinct answer.idempotency_key)
      or count(*) <> count(distinct answer.canonical_question_id)
    from jsonb_to_recordset(p_answers) as answer(
      idempotency_key text,
      canonical_question_id text
    )
  ) then
    raise exception 'assessment answers contain duplicate identities'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(*) filter (where is_correct)::integer,
    count(*) filter (where first_attempt_state = 'first')::integer,
    count(*) filter (where first_attempt_state = 'seen')::integer,
    count(*) filter (where first_attempt_state = 'unknown')::integer
  into
    v_answered_count,
    v_correct_count,
    v_first_count,
    v_seen_count,
    v_unknown_count
  from jsonb_to_recordset(p_answers) as answer(
    is_correct boolean,
    first_attempt_state text
  );

  if v_session.status = 'completed' then
    if v_session.completed_at is distinct from p_completed_at
      or v_session.answered_count <> v_answered_count
      or v_session.correct_count <> v_correct_count
      or v_session.first_count <> v_first_count
      or v_session.seen_count <> v_seen_count
      or v_session.unknown_count <> v_unknown_count
      or exists (
        select 1
        from jsonb_to_recordset(p_answers) as answer(
          idempotency_key text,
          canonical_question_id text,
          topic_id text,
          field_id text,
          is_correct boolean,
          first_attempt_state text,
          answered_at timestamptz
        )
        where not exists (
          select 1
          from public.assessment_session_answers stored
          where stored.user_id = p_user_id
            and stored.session_id = p_session_id
            and stored.idempotency_key = answer.idempotency_key
            and stored.canonical_question_id = answer.canonical_question_id
            and stored.topic_id = answer.topic_id
            and stored.field_id = answer.field_id
            and stored.is_correct = answer.is_correct
            and stored.first_attempt_state = answer.first_attempt_state
            and stored.answered_at = answer.answered_at
        )
      ) then
      raise exception 'assessment session completion conflicts with stored facts'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'session', to_jsonb(v_session),
      'completed_now', false
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'assessment session is terminal' using errcode = '23505';
  end if;

  insert into public.assessment_session_answers (
    user_id,
    session_id,
    idempotency_key,
    canonical_question_id,
    topic_id,
    field_id,
    is_correct,
    first_attempt_state,
    answered_at
  )
  select
    p_user_id,
    p_session_id,
    answer.idempotency_key,
    answer.canonical_question_id,
    answer.topic_id,
    answer.field_id,
    answer.is_correct,
    answer.first_attempt_state,
    answer.answered_at
  from jsonb_to_recordset(p_answers) as answer(
    idempotency_key text,
    canonical_question_id text,
    topic_id text,
    field_id text,
    is_correct boolean,
    first_attempt_state text,
    answered_at timestamptz
  );

  update public.assessment_sessions
  set status = 'completed',
      completed_at = p_completed_at,
      answered_count = v_answered_count,
      correct_count = v_correct_count,
      first_count = v_first_count,
      seen_count = v_seen_count,
      unknown_count = v_unknown_count,
      updated_at = clock_timestamp()
  where user_id = p_user_id
    and session_id = p_session_id
    and status = 'in_progress'
  returning * into v_session;

  if not found then
    raise exception 'assessment session transition lost its lock'
      using errcode = '40001';
  end if;

  perform public.register_exam_readiness_evidence(
    p_user_id,
    'assessment:' || p_session_id::text
  );

  return jsonb_build_object(
    'session', to_jsonb(v_session),
    'completed_now', true
  );
end;
$$;

alter function public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)
  owner to postgres;
revoke all on function public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)
  from public;
revoke all on function public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)
  from anon;
revoke all on function public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)
  from authenticated;
revoke all on function public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)
  from service_role;
grant execute on function public.complete_assessment_session(uuid, uuid, timestamptz, jsonb)
  to service_role;
