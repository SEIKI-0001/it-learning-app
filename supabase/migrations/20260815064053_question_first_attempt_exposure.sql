-- P1-1: cross-device first-seen classification.
--
-- question_attempts and user_answers remain the answer-history source of truth.
-- The RPC records one validated batch and classifies exposure in the same
-- transaction so concurrent tabs cannot both claim the first attempt.

alter table public.question_attempts
  add column if not exists is_first_attempt boolean;

-- Existing users keep their history. Mark a question_attempt row only when it
-- is the earliest question_attempt and no user_answers fact is earlier (or tied).
update public.question_attempts
set is_first_attempt = false
where is_first_attempt is null;

with ranked_attempts as (
  select
    qa.attempt_id,
    qa.user_id,
    qa.question_id,
    qa.answered_at,
    row_number() over (
      partition by qa.user_id, qa.question_id
      order by
        qa.answered_at,
        coalesce(qa.recorded_at, qa.answered_at),
        qa.attempt_id
    ) as attempt_rank
  from public.question_attempts qa
), eligible_first_attempts as (
  select ranked.attempt_id
  from ranked_attempts ranked
  where ranked.attempt_rank = 1
    and not exists (
      select 1
      from public.user_answers ua
      where ua.user_id = ranked.user_id
        and ua.question_id = ranked.question_id
        and ua.answered_at <= ranked.answered_at
    )
)
update public.question_attempts qa
set is_first_attempt = true
from eligible_first_attempts eligible
where qa.attempt_id = eligible.attempt_id;

alter table public.question_attempts
  alter column is_first_attempt set default false,
  alter column is_first_attempt set not null;

create unique index if not exists question_attempts_one_first_per_user_question_idx
  on public.question_attempts (user_id, question_id)
  where is_first_attempt;

create index if not exists question_attempts_user_question_answered_at_idx
  on public.question_attempts (user_id, question_id, answered_at);

create index if not exists user_answers_user_question_answered_at_idx
  on public.user_answers (user_id, question_id, answered_at);

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
declare
  v_question_id text;
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

  -- Every overlapping batch acquires the same keys in the same order. The hash
  -- can over-serialize on collision, but it cannot allow two first claims.
  for v_question_id in
    select input.question_id
    from pg_temp.question_exposure_input input
    order by input.question_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(p_user_id::text || chr(31) || v_question_id, 0)
    );
  end loop;

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
