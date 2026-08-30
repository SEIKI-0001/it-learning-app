-- Record grouped assessment attempts while retaining the owned session lock.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Do not add a unique index over question_attempts: historical grouped rows can
-- legitimately contain duplicates. Receipts bind only new assessment writes and
-- leave every legacy row untouched.
create table public.assessment_attempt_receipts (
  user_id uuid not null,
  session_id uuid not null,
  question_id text not null,
  attempt_id uuid not null references public.question_attempts(attempt_id) on delete cascade,
  payload jsonb not null,
  first_attempt_at timestamptz,
  attempt_count bigint not null,
  primary key (user_id, session_id, question_id)
);

create or replace function public.record_assessment_question_attempts_with_exposure(
  p_user_id uuid,
  p_session_id uuid,
  p_attempts jsonb
)
returns table (
  question_id text,
  state text,
  attempted_before boolean,
  first_attempt_at timestamptz,
  attempt_count bigint,
  saved boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_source text;
  v_mode text;
  v_status text;
  v_result record;
  v_attempt jsonb;
  v_persisted public.question_attempts%rowtype;
  v_receipt public.assessment_attempt_receipts%rowtype;
begin
  if p_user_id is null or p_session_id is null then
    raise exception 'assessment session identity is required'
      using errcode = '22023';
  end if;

  select source, mode, status
  into v_source, v_mode, v_status
  from public.assessment_sessions
  where user_id = p_user_id
    and session_id = p_session_id
  for update;

  if not found or v_status <> 'in_progress' then
    raise exception 'assessment session is not an owned in-progress recording target'
      using errcode = '23503';
  end if;

  if p_attempts is null
    or jsonb_typeof(p_attempts) <> 'array'
    or jsonb_array_length(p_attempts) = 0 then
    raise exception 'p_attempts must be a non-empty JSON array'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_attempts) as item(value)
    where jsonb_typeof(item.value) <> 'object'
      or nullif(item.value ->> 'question_id', '') is null
      or nullif(item.value ->> 'question_type', '') is null
      or nullif(item.value ->> 'topic_id', '') is null
      or jsonb_typeof(item.value -> 'is_correct') <> 'boolean'
  ) then
    raise exception 'p_attempts contained an invalid assessment attempt'
      using errcode = '22023';
  end if;

  if (
    select count(*) <> count(distinct item.value ->> 'question_id')
    from jsonb_array_elements(p_attempts) as item(value)
  ) then
    raise exception 'p_attempts contained duplicate assessment questions'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_attempts) as item(value)
    where item.value ->> 'attempt_group_id' is distinct from p_session_id::text
      or case item.value ->> 'question_type'
        when 'mini_exam' then 'checkpoint'
        when 'theme_exam' then 'summary'
        when 'mock_exam' then 'mock'
        when 'official_past' then 'official_past'
        else null
      end is distinct from v_source
      or (
        item.value ->> 'question_type' = 'official_past'
        and item.value ->> 'attempt_mode' is distinct from v_mode
      )
  ) then
    raise exception 'assessment attempt does not match its locked session'
      using errcode = '23503';
  end if;

  -- A receipt is the idempotency boundary for new writes. Existing historical
  -- duplicate rows have no receipt, so the migration never rewrites or rejects
  -- them. A retry must contain the exact caller-owned batch.
  if exists (
    select 1
    from jsonb_array_elements(p_attempts) as item(value)
    join public.assessment_attempt_receipts receipt
      on receipt.user_id = p_user_id
      and receipt.session_id = p_session_id
      and receipt.question_id = item.value ->> 'question_id'
  ) then
    for v_attempt in
      select item.value
      from jsonb_array_elements(p_attempts) with ordinality as item(value, ordinality)
      order by item.ordinality
    loop
      select receipt.* into v_receipt
      from public.assessment_attempt_receipts receipt
      where receipt.user_id = p_user_id
        and receipt.session_id = p_session_id
        and receipt.question_id = v_attempt ->> 'question_id';
      if not found then
        raise exception 'assessment attempt replay is missing a receipt'
          using errcode = '23505';
      end if;
      if v_receipt.payload is distinct from v_attempt then
        raise exception 'assessment attempt replay conflicts with stored facts'
          using errcode = '23505';
      end if;
      select attempt.* into v_persisted
      from public.question_attempts attempt
      where attempt.attempt_id = v_receipt.attempt_id;
      if not found then
        raise exception 'assessment attempt receipt lost its canonical row'
          using errcode = '40001';
      end if;
      question_id := v_receipt.question_id;
      state := case when v_persisted.is_first_attempt then 'first' else 'seen' end;
      attempted_before := not v_persisted.is_first_attempt;
      first_attempt_at := v_receipt.first_attempt_at;
      attempt_count := v_receipt.attempt_count;
      saved := false;
      return next;
    end loop;
    return;
  end if;

  -- The generic recorder remains the single P1-1 first-attempt authority. Its
  -- validation, advisory serialization, insert, and evidence registration all
  -- execute while this transaction still owns the assessment session row lock.
  for v_result in
    select recorder.*
    from public.record_question_attempts_with_exposure(
      p_user_id,
      p_attempts
    ) recorder
  loop
    select item.value
    into strict v_attempt
    from jsonb_array_elements(p_attempts) as item(value)
    where item.value ->> 'question_id' = v_result.question_id;

    select attempt.*
    into v_persisted
    from public.question_attempts attempt
    where attempt.user_id = p_user_id
      and attempt.attempt_group_id = p_session_id::text
      and attempt.question_id = v_result.question_id
      and attempt.question_version is not distinct from
        nullif(v_attempt ->> 'question_version', '')::integer
    order by attempt.answered_at desc, attempt.attempt_id desc
    limit 1;

    if not found then
      raise exception 'assessment attempt persistence lost its idempotent row'
        using errcode = '40001';
    end if;

    insert into public.assessment_attempt_receipts (
      user_id, session_id, question_id, attempt_id, payload,
      first_attempt_at, attempt_count
    ) values (
      p_user_id, p_session_id, v_result.question_id, v_persisted.attempt_id,
      v_attempt, v_result.first_attempt_at, v_result.attempt_count
    );

    question_id := v_result.question_id;
    state := case when v_persisted.is_first_attempt then 'first' else 'seen' end;
    attempted_before := not v_persisted.is_first_attempt;
    first_attempt_at := v_result.first_attempt_at;
    attempt_count := v_result.attempt_count;
    saved := v_result.saved;
    return next;
  end loop;
end;
$$;

alter function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb)
  owner to postgres;
revoke all on function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb)
  from public;
revoke all on function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb)
  from anon;
revoke all on function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb)
  from authenticated;
revoke all on function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb)
  from service_role;
grant execute on function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb)
  to service_role;

comment on function public.record_assessment_question_attempts_with_exposure(uuid, uuid, jsonb) is
  'Locks an owned in-progress assessment session, validates its batch, and records idempotent P1-1 exposure facts.';
