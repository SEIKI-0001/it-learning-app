begin;

set local search_path = extensions, public, pg_catalog;

select plan(54);

select has_function(
  'public',
  'save_user_progress_with_readiness_evidence',
  array['uuid', 'jsonb', 'text', 'text'],
  'the atomic progress readiness function exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.save_user_progress_with_readiness_evidence(uuid,jsonb,text,text)',
    'EXECUTE'
  ),
  'service_role can execute the progress readiness function'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_user_progress_with_readiness_evidence(uuid,jsonb,text,text)',
    'EXECUTE'
  ),
  'anon cannot execute the progress readiness function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.save_user_progress_with_readiness_evidence(uuid,jsonb,text,text)',
    'EXECUTE'
  ),
  'authenticated cannot execute the progress readiness function'
);

select has_table(
  'public',
  'progress_readiness_completions',
  'stable progress completion payloads have an idempotency table'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.progress_readiness_completions'::regclass),
  true,
  'the completion idempotency table has RLS enabled'
);

select ok(
  not has_table_privilege('service_role', 'public.progress_readiness_completions', 'SELECT'),
  'service_role cannot bypass the RPC to inspect completion payloads'
);

select ok(
  not has_table_privilege('authenticated', 'public.progress_readiness_completions', 'SELECT'),
  'authenticated cannot inspect completion payloads'
);

insert into public.line_users (id, line_user_id)
values ('21000000-0000-0000-0000-000000000009', 'progress-readiness-test-user');

create temporary table task9_payloads (
  label text primary key,
  payload jsonb not null
) on commit drop;

insert into task9_payloads (label, payload) values
  (
    'initial',
    '{"current_day":1,"exp":15,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:00:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":8},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":8,"lastEvaluatedAt":"2026-08-23T01:00:00Z","correctCount":1,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb
  ),
  (
    'non-p0-later',
    '{"current_day":1,"exp":16,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:00:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":8},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":8,"lastEvaluatedAt":"2026-08-23T01:00:00Z","correctCount":1,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb
  ),
  (
    'p0-later',
    '{"current_day":1,"exp":16,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:01:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":9},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":9,"lastEvaluatedAt":"2026-08-23T01:01:00Z","correctCount":2,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb
  );

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'initial'),
      'learning_complete',
      'question-a'
    ) ->> 'evidence_changed'
  )::boolean,
  true,
  'the first changed P0 save registers evidence'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  1::bigint,
  'the first changed save advances revision once'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where user_id = '21000000-0000-0000-0000-000000000009'
      and event_key = 'learning_complete:question-a'
  ),
  1,
  'the completion uses one typed stable event key'
);

select is(
  (
    select progress_payload
    from public.progress_readiness_completions
    where user_id = '21000000-0000-0000-0000-000000000009'
      and trigger_type = 'learning_complete'
      and trigger_id = 'question-a'
  ),
  (select payload from task9_payloads where label = 'initial'),
  'the completion binds its original full progress payload'
);

select is(
  (
    select payload_fingerprint
    from public.progress_readiness_completions
    where user_id = '21000000-0000-0000-0000-000000000009'
      and trigger_type = 'learning_complete'
      and trigger_id = 'question-a'
  ),
  md5((select payload::text from task9_payloads where label = 'initial')),
  'the stored fingerprint is derived from canonical jsonb'
);

select is(
  (
    select count(*)::integer
    from public.claim_exam_readiness_recalculation(
      '21000000-0000-0000-0000-000000000009',
      'learning_complete',
      'question-a',
      'readiness-v1',
      'fe-scheme-v6',
      30
    )
  ),
  1,
  'the original completion can claim its recalculation job'
);

create temporary table task9_original_job as
select job_id
from public.exam_readiness_recalculation_jobs
where user_id = '21000000-0000-0000-0000-000000000009'
  and trigger_type = 'learning_complete'
  and trigger_id = 'question-a';

select lives_ok(
  $$
    select public.fail_exam_readiness_recalculation(
      (select job_id from task9_original_job),
      1,
      'temporary_failure'
    )
  $$,
  'a temporary recalculation failure leaves the progress completion retryable'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'initial'),
      'learning_complete',
      'question-a'
    ) ->> 'trigger_registered'
  )::boolean,
  true,
  'an exact retry reuses the registered readiness association'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'initial'),
      'learning_complete',
      'question-a'
    ) ->> 'replayed'
  )::boolean,
  true,
  'an exact immediate retry is identified without another progress write'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  1::bigint,
  'exact retries do not advance revision'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'non-p0-later'),
      'learning_complete',
      'unrelated-progress-only'
    ) ->> 'trigger_registered'
  )::boolean,
  false,
  'a non-evidence progress change does not register a readiness trigger'
);

select is(
  (select exp from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  16,
  'non-evidence progress still persists'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  1::bigint,
  'non-evidence progress does not advance revision'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'initial'),
      'learning_complete',
      'question-a'
    ) ->> 'replayed'
  )::boolean,
  true,
  'a delayed exact retry after a later non-P0 write is recognized'
);

select is(
  (select exp from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  16,
  'the delayed exact retry does not regress later non-P0 progress'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  1::bigint,
  'the delayed exact retry does not duplicate the evidence revision'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where user_id = '21000000-0000-0000-0000-000000000009'
  ),
  1,
  'the delayed exact retry does not duplicate the evidence event'
);

select is(
  (
    select count(*)::integer
    from public.claim_exam_readiness_recalculation(
      '21000000-0000-0000-0000-000000000009',
      'learning_complete',
      'question-a',
      'readiness-v1',
      'fe-scheme-v6',
      30
    )
  ),
  1,
  'the delayed exact retry can reclaim its failed job'
);

select is(
  (
    select job.job_id::text
    from public.exam_readiness_recalculation_jobs job
    where job.user_id = '21000000-0000-0000-0000-000000000009'
      and job.trigger_type = 'learning_complete'
      and job.trigger_id = 'question-a'
  ),
  (select job_id::text from task9_original_job),
  'the reclaimed recalculation keeps the original job identity'
);

select is(
  (
    select attempt_count
    from public.exam_readiness_recalculation_jobs
    where user_id = '21000000-0000-0000-0000-000000000009'
      and trigger_type = 'learning_complete'
      and trigger_id = 'question-a'
  ),
  2,
  'the same job records the retry attempt'
);

select throws_ok(
  $$
    select public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      jsonb_set(
        (select payload from task9_payloads where label = 'initial'),
        '{exp}',
        '999'::jsonb
      ),
      'learning_complete',
      'question-a'
    )
  $$,
  '23505',
  'progress readiness trigger conflicts with original payload',
  'the same trigger rejects a different full payload before mutation'
);

select is(
  (select exp from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  16,
  'a conflicting non-P0 payload cannot mutate current progress'
);

select throws_ok(
  $$
    select public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'p0-later'),
      'learning_complete',
      'question-a'
    )
  $$,
  '23505',
  'progress readiness trigger conflicts with original payload',
  'the same trigger rejects different P0 facts before mutation'
);

select is(
  (select topic_mastery_stats -> 'topic-a' ->> 'masteryScore' from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  '8',
  'a conflicting P0 payload cannot mutate current progress'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'p0-later'),
      'learning_complete',
      'question-b'
    ) ->> 'evidence_changed'
  )::boolean,
  true,
  'a new stable completion can persist changed P0 evidence'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  2::bigint,
  'the second distinct evidence completion advances revision once'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where user_id = '21000000-0000-0000-0000-000000000009'
  ),
  2,
  'only evidence-changing completion keys are registered'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      (select payload from task9_payloads where label = 'initial'),
      'learning_complete',
      'question-a'
    ) ->> 'replayed'
  )::boolean,
  true,
  'an exact retry remains recognizable after a later P0 completion'
);

select is(
  (select exp from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  16,
  'the old exact retry does not regress later general progress'
);

select is(
  (select topic_mastery_stats -> 'topic-a' ->> 'masteryScore' from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  '9',
  'the old exact retry does not regress later P0 mastery facts'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  2::bigint,
  'the old exact retry does not duplicate a revision after later P0 evidence'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where user_id = '21000000-0000-0000-0000-000000000009'
  ),
  2,
  'the old exact retry does not duplicate an event after later P0 evidence'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_recalculation_jobs
    where user_id = '21000000-0000-0000-0000-000000000009'
      and trigger_type = 'learning_complete'
      and trigger_id = 'question-a'
  ),
  1,
  'the old exact retry does not duplicate the recalculation job'
);

select is(
  (
    select job.job_id::text
    from public.exam_readiness_recalculation_jobs job
    where job.user_id = '21000000-0000-0000-0000-000000000009'
      and job.trigger_type = 'learning_complete'
      and job.trigger_id = 'question-a'
  ),
  (select job_id::text from task9_original_job),
  'the recalculation job identity is stable after later P0 evidence'
);

select is(
  (
    select count(*)::integer
    from public.progress_readiness_completions
    where user_id = '21000000-0000-0000-0000-000000000009'
  ),
  3,
  'one idempotency record exists per distinct completion trigger'
);

insert into public.line_users (id, line_user_id)
values
  ('21000000-0000-0000-0000-000000000010', 'assessment-progress-test-user'),
  ('21000000-0000-0000-0000-000000000011', 'assessment-progress-other-user');

insert into public.assessment_sessions (
  session_id,
  user_id,
  source,
  mode,
  status,
  started_at,
  question_count
) values
  (
    '22000000-0000-4000-8000-000000000010',
    '21000000-0000-0000-0000-000000000010',
    'mock',
    'exam',
    'in_progress',
    '2026-08-23T02:00:00Z',
    0
  ),
  (
    '22000000-0000-4000-8000-000000000011',
    '21000000-0000-0000-0000-000000000010',
    'checkpoint',
    'exam',
    'in_progress',
    '2026-08-23T02:00:00Z',
    0
  ),
  (
    '22000000-0000-4000-8000-000000000012',
    '21000000-0000-0000-0000-000000000011',
    'mock',
    'exam',
    'in_progress',
    '2026-08-23T02:00:00Z',
    0
  );

select lives_ok(
  $$
    select public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000010',
      '22000000-0000-4000-8000-000000000010',
      '2026-08-23T02:30:00Z',
      '[]'::jsonb
    )
  $$,
  'assessment facts can commit before their P0 finalization'
);

select is(
  coalesce((
    select revision
    from public.exam_readiness_evidence_state
    where user_id = '21000000-0000-0000-0000-000000000010'
  ), 0::bigint),
  0::bigint,
  'assessment completion alone does not publish a new evidence revision'
);

select throws_ok(
  $$
    select public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000010',
      (select payload from task9_payloads where label = 'initial'),
      'assessment',
      '22000000-0000-4000-8000-000000000011'
    )
  $$,
  '23503',
  'assessment readiness trigger requires a completed session owned by the user',
  'an in-progress session cannot publish assessment readiness'
);

select throws_ok(
  $$
    select public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000010',
      (select payload from task9_payloads where label = 'initial'),
      'assessment',
      '22000000-0000-4000-8000-000000000012'
    )
  $$,
  '23503',
  'assessment readiness trigger requires a completed session owned by the user',
  'another user session cannot publish assessment readiness'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000010',
      (select payload from task9_payloads where label = 'initial'),
      'assessment',
      '22000000-0000-4000-8000-000000000010'
    ) ->> 'trigger_registered'
  )::boolean,
  true,
  'a completed assessment publishes readiness only with its P0 transaction'
);

select is(
  (select topic_mastery_stats -> 'topic-a' ->> 'masteryScore'
   from public.user_progress
   where user_id = '21000000-0000-0000-0000-000000000010'),
  '8',
  'the assessment P0 payload is authoritative when readiness becomes visible'
);

select is(
  (select revision from public.exam_readiness_evidence_state
   where user_id = '21000000-0000-0000-0000-000000000010'),
  1::bigint,
  'assessment finalization advances evidence exactly once after P0 persists'
);

select is(
  (select count(*)::integer
   from public.exam_readiness_evidence_events
   where user_id = '21000000-0000-0000-0000-000000000010'
     and event_key = 'assessment:22000000-0000-4000-8000-000000000010'),
  1,
  'the finalization owns the stable assessment evidence event'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000010',
      (select payload from task9_payloads where label = 'initial'),
      'assessment',
      '22000000-0000-4000-8000-000000000010'
    ) ->> 'replayed'
  )::boolean,
  true,
  'an exact assessment finalization retry reuses the frozen payload'
);

select is(
  (select revision from public.exam_readiness_evidence_state
   where user_id = '21000000-0000-0000-0000-000000000010'),
  1::bigint,
  'an exact assessment retry does not duplicate its evidence revision'
);

select is(
  (select count(*)::integer
   from public.progress_readiness_completions
   where user_id = '21000000-0000-0000-0000-000000000010'
     and trigger_type = 'assessment'
     and trigger_id = '22000000-0000-4000-8000-000000000010'),
  1,
  'an exact assessment retry keeps one trigger identity'
);

select * from finish();
rollback;
