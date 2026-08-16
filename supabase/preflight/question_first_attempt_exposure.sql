begin transaction read only;

-- Aggregate-only production preflight. This intentionally returns no user IDs,
-- question IDs, answer values, or other personal data.
with
qa_duplicates as (
  select count(*) as row_count
  from public.question_attempts
  group by user_id, question_id
  having count(*) > 1
),
ua_duplicates as (
  select count(*) as row_count
  from public.user_answers
  group by user_id, question_id
  having count(*) > 1
),
cross_table_history as (
  select qa.user_id, qa.question_id
  from public.question_attempts qa
  where exists (
    select 1
    from public.user_answers ua
    where ua.user_id = qa.user_id
      and ua.question_id = qa.question_id
  )
  group by qa.user_id, qa.question_id
),
historical_first_candidates as (
  select qa.attempt_id
  from public.question_attempts qa
  where not exists (
    select 1
    from public.question_attempts earlier
    where earlier.user_id = qa.user_id
      and earlier.question_id = qa.question_id
      and (
        earlier.answered_at < qa.answered_at
        or (earlier.answered_at = qa.answered_at and earlier.attempt_id < qa.attempt_id)
      )
  )
    and not exists (
      select 1
      from public.user_answers ua
      where ua.user_id = qa.user_id
        and ua.question_id = qa.question_id
        and ua.answered_at <= qa.answered_at
    )
)
select jsonb_build_object(
  'question_attempts_count', (select count(*) from public.question_attempts),
  'user_answers_count', (select count(*) from public.user_answers),
  'question_attempt_duplicate_groups', (select count(*) from qa_duplicates),
  'question_attempt_duplicate_excess_rows',
    (select coalesce(sum(row_count - 1), 0) from qa_duplicates),
  'user_answer_duplicate_groups', (select count(*) from ua_duplicates),
  'user_answer_duplicate_excess_rows',
    (select coalesce(sum(row_count - 1), 0) from ua_duplicates),
  'cross_table_user_question_groups', (select count(*) from cross_table_history),
  'historical_first_candidates_not_backfilled',
    (select count(*) from historical_first_candidates),
  'actual_backfill_target_rows', 0,
  'canonical_question_id_missing_rows',
    (
      select
        (select count(*) from public.question_attempts where nullif(btrim(question_id), '') is null)
        + (select count(*) from public.user_answers where nullif(btrim(question_id), '') is null)
    ),
  'partial_unique_index_blockers', 0
) as question_exposure_preflight;

rollback;
