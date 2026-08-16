-- P1-1: cross-device first-seen classification.
--
-- question_attempts and user_answers remain the answer-history source of truth.
-- Historical rows stay false: history still makes future attempts "seen", while
-- inventing a historical first marker from incomplete legacy data would be unsafe.
-- A constant NOT NULL default is metadata-only on supported production Postgres.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.question_attempts
  add column if not exists is_first_attempt boolean not null default false;

create unique index if not exists question_attempts_one_first_per_user_question_idx
  on public.question_attempts (user_id, question_id)
  where is_first_attempt;

-- The set-based history query reuses the production baseline's existing
-- per-user indexes. Avoid two additional full index builds on live tables.

-- All application answer writers take the same per-user transaction lock.
-- This makes the atomic RPC and the legacy user_answers writer serialize. A
-- 64-bit hash collision can only over-serialize unrelated users; it cannot
-- create two first claims.
create or replace function public.lock_question_exposure_answer_write()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended('question-exposure-user' || chr(31) || new.user_id::text, 0)
  );
  return new;
end;
$$;

alter function public.lock_question_exposure_answer_write() owner to postgres;
revoke all on function public.lock_question_exposure_answer_write() from public;
revoke all on function public.lock_question_exposure_answer_write() from anon;
revoke all on function public.lock_question_exposure_answer_write() from authenticated;
revoke all on function public.lock_question_exposure_answer_write() from service_role;

drop trigger if exists lock_question_exposure_question_attempts
  on public.question_attempts;
create trigger lock_question_exposure_question_attempts
before insert or update of user_id, question_id on public.question_attempts
for each row execute function public.lock_question_exposure_answer_write();

drop trigger if exists lock_question_exposure_user_answers
  on public.user_answers;
create trigger lock_question_exposure_user_answers
before insert or update of user_id, question_id on public.user_answers
for each row execute function public.lock_question_exposure_answer_write();

create or replace function public.record_question_attempts_with_exposure(
  p_user_id uuid,
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
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;
  if p_attempts is null
    or jsonb_typeof(p_attempts) <> 'array'
    or jsonb_array_length(p_attempts) = 0 then
    raise exception 'p_attempts must be a non-empty JSON array' using errcode = '22023';
  end if;

  create temporary table if not exists question_exposure_input (
    ordinal bigint not null,
    question_id text primary key,
    question_type text not null,
    topic_id text not null,
    selected_answer text,
    is_correct boolean not null,
    mistake_reason text,
    answered_at timestamptz not null,
    time_spent_seconds integer,
    source_task_id uuid,
    question_origin text,
    question_version integer,
    exam_year integer,
    attempt_mode text,
    official_exam_field text,
    attempt_group_id text
  ) on commit drop;
  truncate table pg_temp.question_exposure_input;

  insert into pg_temp.question_exposure_input (
    ordinal,
    question_id,
    question_type,
    topic_id,
    selected_answer,
    is_correct,
    mistake_reason,
    answered_at,
    time_spent_seconds,
    source_task_id,
    question_origin,
    question_version,
    exam_year,
    attempt_mode,
    official_exam_field,
    attempt_group_id
  )
  select distinct on (parsed.question_id)
    parsed.ordinal,
    parsed.question_id,
    parsed.question_type,
    parsed.topic_id,
    parsed.selected_answer,
    parsed.is_correct,
    parsed.mistake_reason,
    parsed.answered_at,
    parsed.time_spent_seconds,
    parsed.source_task_id,
    parsed.question_origin,
    parsed.question_version,
    parsed.exam_year,
    parsed.attempt_mode,
    parsed.official_exam_field,
    parsed.attempt_group_id
  from (
    select
      item.ordinality as ordinal,
      nullif(item.value ->> 'question_id', '') as question_id,
      nullif(item.value ->> 'question_type', '') as question_type,
      nullif(item.value ->> 'topic_id', '') as topic_id,
      item.value ->> 'selected_answer' as selected_answer,
      (item.value ->> 'is_correct')::boolean as is_correct,
      item.value ->> 'mistake_reason' as mistake_reason,
      coalesce(
        nullif(item.value ->> 'answered_at', '')::timestamptz,
        statement_timestamp()
      ) as answered_at,
      nullif(item.value ->> 'time_spent_seconds', '')::integer as time_spent_seconds,
      nullif(item.value ->> 'source_task_id', '')::uuid as source_task_id,
      item.value ->> 'question_origin' as question_origin,
      nullif(item.value ->> 'question_version', '')::integer as question_version,
      nullif(item.value ->> 'exam_year', '')::integer as exam_year,
      item.value ->> 'attempt_mode' as attempt_mode,
      item.value ->> 'official_exam_field' as official_exam_field,
      item.value ->> 'attempt_group_id' as attempt_group_id
    from jsonb_array_elements(p_attempts) with ordinality as item(value, ordinality)
  ) parsed
  where parsed.question_id is not null
    and parsed.question_type is not null
    and parsed.topic_id is not null
    and parsed.is_correct is not null
  order by parsed.question_id, parsed.ordinal;

  if not exists (select 1 from pg_temp.question_exposure_input) then
    raise exception 'p_attempts contained no valid attempts' using errcode = '22023';
  end if;

  -- One lock per user keeps a 100-question batch at O(1) lock calls and also
  -- coordinates with direct question_attempts/user_answers writers.
  perform pg_advisory_xact_lock(
    hashtextextended('question-exposure-user' || chr(31) || p_user_id::text, 0)
  );

  create temporary table if not exists question_exposure_before (
    question_id text primary key,
    attempted_before boolean not null,
    first_attempt_at timestamptz,
    attempt_count bigint not null
  ) on commit drop;
  truncate table pg_temp.question_exposure_before;

  insert into pg_temp.question_exposure_before (
    question_id,
    attempted_before,
    first_attempt_at,
    attempt_count
  )
  select
    input.question_id,
    count(fact.question_id) > 0,
    min(fact.answered_at),
    count(fact.question_id)
  from pg_temp.question_exposure_input input
  left join (
    select distinct
      history.question_id,
      history.answered_at,
      history.selected_answer,
      history.is_correct
    from (
      select
        qa.question_id,
        qa.answered_at,
        qa.selected_answer,
        qa.is_correct
      from public.question_attempts qa
      where qa.user_id = p_user_id
        and qa.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
      union all
      select
        ua.question_id,
        ua.answered_at,
        ua.selected_choice as selected_answer,
        ua.is_correct
      from public.user_answers ua
      where ua.user_id = p_user_id
        and ua.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
    ) history
  ) fact on fact.question_id = input.question_id
  group by input.question_id;

  create temporary table if not exists question_exposure_inserted (
    question_id text primary key,
    is_first_attempt boolean not null
  ) on commit drop;
  truncate table pg_temp.question_exposure_inserted;

  with inserted as (
    insert into public.question_attempts (
      user_id,
      question_id,
      question_type,
      topic_id,
      selected_answer,
      is_correct,
      mistake_reason,
      answered_at,
      time_spent_seconds,
      source_task_id,
      question_origin,
      question_version,
      exam_year,
      attempt_mode,
      official_exam_field,
      attempt_group_id,
      is_first_attempt
    )
    select
      p_user_id,
      input.question_id,
      input.question_type,
      input.topic_id,
      input.selected_answer,
      input.is_correct,
      input.mistake_reason,
      input.answered_at,
      input.time_spent_seconds,
      input.source_task_id,
      input.question_origin,
      input.question_version,
      input.exam_year,
      input.attempt_mode,
      input.official_exam_field,
      input.attempt_group_id,
      not before.attempted_before
    from pg_temp.question_exposure_input input
    join pg_temp.question_exposure_before before using (question_id)
    on conflict do nothing
    returning question_attempts.question_id, question_attempts.is_first_attempt
  )
  insert into pg_temp.question_exposure_inserted (question_id, is_first_attempt)
  select inserted.question_id, inserted.is_first_attempt
  from inserted;

  return query
  with current_facts as (
    select distinct
      history.question_id,
      history.answered_at,
      history.selected_answer,
      history.is_correct
    from (
      select
        qa.question_id,
        qa.answered_at,
        qa.selected_answer,
        qa.is_correct
      from public.question_attempts qa
      where qa.user_id = p_user_id
        and qa.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
      union all
      select
        ua.question_id,
        ua.answered_at,
        ua.selected_choice as selected_answer,
        ua.is_correct
      from public.user_answers ua
      where ua.user_id = p_user_id
        and ua.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
    ) history
  ), current_totals as (
    select
      input.question_id,
      min(fact.answered_at) as first_attempt_at,
      count(fact.question_id) as attempt_count
    from pg_temp.question_exposure_input input
    left join current_facts fact using (question_id)
    group by input.question_id
  )
  select
    input.question_id,
    case
      when before.attempted_before then 'seen'
      when coalesce(inserted.is_first_attempt, false) then 'first'
      else 'seen'
    end as state,
    before.attempted_before,
    totals.first_attempt_at,
    totals.attempt_count,
    inserted.question_id is not null as saved
  from pg_temp.question_exposure_input input
  join pg_temp.question_exposure_before before using (question_id)
  join current_totals totals using (question_id)
  left join pg_temp.question_exposure_inserted inserted using (question_id)
  order by input.ordinal;
end;
$$;

alter function public.record_question_attempts_with_exposure(uuid, jsonb) owner to postgres;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb)
  from public;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb)
  from anon;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb)
  from authenticated;
grant execute on function public.record_question_attempts_with_exposure(uuid, jsonb)
  to service_role;

comment on column public.question_attempts.is_first_attempt is
  'True only for the atomic first persisted answer for one user and canonical question.';
comment on function public.record_question_attempts_with_exposure(uuid, jsonb) is
  'Records a validated attempt batch and returns transaction-safe first/seen exposure.';
comment on function public.lock_question_exposure_answer_write() is
  'Serializes all persisted answer writers per user for first-attempt classification.';
