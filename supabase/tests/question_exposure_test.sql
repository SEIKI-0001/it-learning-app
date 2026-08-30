begin;

select plan(40);

select has_column(
  'public',
  'question_attempts',
  'is_first_attempt',
  'question_attempts stores the atomic first-attempt claim'
);

select col_not_null(
  'public',
  'question_attempts',
  'is_first_attempt',
  'first-attempt claims cannot be null'
);

select col_default_is(
  'public',
  'question_attempts',
  'is_first_attempt',
  'false',
  'attempt writers that bypass the RPC never claim first by default'
);

select has_index(
  'public',
  'question_attempts',
  'question_attempts_one_first_per_user_question_idx',
  'at most one first claim exists per user and canonical question'
);

select has_function(
  'public',
  'record_question_attempts_with_exposure',
  array['uuid', 'jsonb'],
  'the transactional batch recorder exists'
);

select is(
  has_function_privilege(
    'anon',
    'public.record_question_attempts_with_exposure(uuid,jsonb)',
    'execute'
  ),
  false,
  'anon cannot execute the privileged recorder'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.record_question_attempts_with_exposure(uuid,jsonb)',
    'execute'
  ),
  false,
  'authenticated cannot execute the privileged recorder directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.record_question_attempts_with_exposure(uuid,jsonb)',
    'execute'
  ),
  true,
  'service_role can execute the recorder after server validation'
);

select has_function(
  'public',
  'lock_question_exposure_answer_write',
  array[]::text[],
  'the shared answer-writer advisory lock exists'
);

select has_trigger(
  'public',
  'question_attempts',
  'lock_question_exposure_question_attempts',
  'question_attempts writers participate in the exposure lock'
);

select has_trigger(
  'public',
  'user_answers',
  'lock_question_exposure_user_answers',
  'legacy user_answers writers participate in the exposure lock'
);

select is(
  has_function_privilege(
    'service_role',
    'public.lock_question_exposure_answer_write()',
    'execute'
  ),
  false,
  'the trigger-only lock function cannot be called directly by service_role'
);

select ok(
  (
    select 'search_path=pg_catalog, public' = any(proconfig)
    from pg_proc
    where oid = 'public.record_question_attempts_with_exposure(uuid,jsonb)'::regprocedure
  ),
  'the security-definer recorder has a fixed search_path'
);

insert into public.line_users (id, line_user_id)
values
  ('10000000-0000-0000-0000-000000000001', 'exposure-test-user'),
  ('10000000-0000-0000-0000-000000000002', 'exposure-test-other-user');

select results_eq(
  $$
    select state, attempted_before, attempt_count
    from public.record_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '[{
        "question_id":"canonical-new",
        "question_type":"topic_quiz",
        "topic_id":"topic-a",
        "selected_answer":"A",
        "is_correct":true,
        "answered_at":"2026-08-15T01:00:00Z"
      }]'::jsonb
    )
  $$,
  $$values ('first'::text, false, 1::bigint)$$,
  'a canonical question with no persisted history is first'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where user_id = '10000000-0000-0000-0000-000000000001'
      and question_id = 'canonical-new'
      and is_first_attempt
  ),
  1,
  'the first response owns the single first-attempt marker'
);

insert into public.user_answers (
  user_id,
  question_id,
  selected_choice,
  is_correct,
  answered_at
) values (
  '10000000-0000-0000-0000-000000000001',
  'canonical-prior-wrong',
  'B',
  false,
  '2026-08-14T01:00:00Z'
);

select results_eq(
  $$
    select state, attempted_before, first_attempt_at, attempt_count
    from public.record_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '[{
        "question_id":"canonical-prior-wrong",
        "question_type":"mock_exam",
        "topic_id":"topic-a",
        "selected_answer":"A",
        "is_correct":true,
        "answered_at":"2026-08-15T02:00:00Z"
      }]'::jsonb
    )
  $$,
  $$values (
    'seen'::text,
    true,
    '2026-08-14T01:00:00Z'::timestamptz,
    2::bigint
  )$$,
  'a prior incorrect user_answers row makes another delivery path seen'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where user_id = '10000000-0000-0000-0000-000000000001'
      and question_id = 'canonical-prior-wrong'
      and is_first_attempt
  ),
  0,
  'a legacy-history question never gains a later first marker'
);

select is(
  (
    select count(*)::integer
    from public.record_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '[
        {
          "question_id":"canonical-batch-dedup",
          "question_type":"mock_exam",
          "topic_id":"topic-a",
          "selected_answer":"A",
          "is_correct":true,
          "answered_at":"2026-08-15T03:00:00Z"
        },
        {
          "question_id":"canonical-batch-dedup",
          "question_type":"review",
          "topic_id":"topic-a",
          "selected_answer":"B",
          "is_correct":false,
          "answered_at":"2026-08-15T03:00:01Z"
        }
      ]'::jsonb
    )
  ),
  1,
  'one batch records and classifies each canonical question once'
);

select is(
  (
    select count(*)::integer
    from public.record_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      (
        select jsonb_agg(jsonb_build_object(
          'question_id', 'canonical-load-' || n,
          'question_type', 'mock_exam',
          'topic_id', 'topic-a',
          'selected_answer', 'A',
          'is_correct', true,
          'answered_at', '2026-08-15T04:00:00Z'
        ))
        from generate_series(1, 100) n
      )
    )
  ),
  100,
  'a 100-question exam is classified in one set-based RPC call'
);

select has_index(
  'public',
  'question_attempts',
  'question_attempts_assessment_group_unique_idx',
  'null-version grouped assessment attempts have an idempotency boundary'
);

select has_function(
  'public',
  'record_assessment_question_attempts_with_exposure',
  array['uuid', 'uuid', 'jsonb'],
  'the session-locking assessment recorder exists'
);

select is(
  has_function_privilege(
    'anon',
    'public.record_assessment_question_attempts_with_exposure(uuid,uuid,jsonb)',
    'execute'
  ),
  false,
  'anon cannot execute the assessment recorder'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.record_assessment_question_attempts_with_exposure(uuid,uuid,jsonb)',
    'execute'
  ),
  false,
  'authenticated cannot execute the assessment recorder'
);

select is(
  has_function_privilege(
    'service_role',
    'public.record_assessment_question_attempts_with_exposure(uuid,uuid,jsonb)',
    'execute'
  ),
  true,
  'service_role can execute the assessment recorder'
);

select ok(
  (
    select 'search_path=pg_catalog, public' = any(proconfig)
    from pg_proc
    where oid =
      'public.record_assessment_question_attempts_with_exposure(uuid,uuid,jsonb)'::regprocedure
  ),
  'the assessment recorder has a fixed search_path'
);

insert into public.assessment_sessions (
  session_id, user_id, source, mode, status, started_at, completed_at, question_count
) values
  (
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'mock', 'exam', 'in_progress', '2026-08-29T01:00:00Z', null, 1
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'mock', 'exam', 'in_progress', '2026-08-29T01:00:00Z', null, 1
  ),
  (
    '11000000-0000-4000-8000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'official_past', 'practice', 'in_progress', '2026-08-29T01:00:00Z', null, 1
  ),
  (
    '11000000-0000-4000-8000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'mock', 'exam', 'completed', '2026-08-29T01:00:00Z',
    '2026-08-29T02:00:00Z', 1
  ),
  (
    '11000000-0000-4000-8000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'mock', 'exam', 'abandoned', '2026-08-29T01:00:00Z',
    '2026-08-29T02:00:00Z', 1
  );

select results_eq(
  $$
    select state, attempted_before, first_attempt_at, attempt_count, saved
    from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '[{
        "question_id":"assessment-replay-question",
        "question_type":"mock_exam",
        "topic_id":"topic-a",
        "selected_answer":"A",
        "is_correct":true,
        "answered_at":"2026-08-29T01:10:00Z",
        "attempt_group_id":"11000000-0000-4000-8000-000000000001"
      }]'::jsonb
    )
  $$,
  $$values (
    'first'::text,
    false,
    '2026-08-29T01:10:00Z'::timestamptz,
    1::bigint,
    true
  )$$,
  'an owned matching in-progress assessment inserts and returns exposure'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where user_id = '10000000-0000-0000-0000-000000000001'
      and attempt_group_id = '11000000-0000-4000-8000-000000000001'
  ),
  1,
  'the matching assessment stores one attempt row'
);

select throws_ok(
  $$
    select * from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000002',
      '[{
        "question_id":"assessment-cross-user",
        "question_type":"mock_exam",
        "topic_id":"topic-a",
        "is_correct":true,
        "answered_at":"2026-08-29T01:11:00Z",
        "attempt_group_id":"11000000-0000-4000-8000-000000000002"
      }]'::jsonb
    )
  $$,
  '23503',
  'assessment session is not an owned in-progress recording target',
  'a cross-user assessment session is rejected'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where question_id = 'assessment-cross-user'
  ),
  0,
  'cross-user rejection inserts zero attempts'
);

select throws_ok(
  $$
    select * from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '[{
        "question_id":"assessment-wrong-source",
        "question_type":"theme_exam",
        "topic_id":"topic-a",
        "is_correct":true,
        "answered_at":"2026-08-29T01:12:00Z",
        "attempt_group_id":"11000000-0000-4000-8000-000000000001"
      }]'::jsonb
    )
  $$,
  '23503',
  'assessment attempt does not match its locked session',
  'an attempt mapped to the wrong assessment source is rejected'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where question_id = 'assessment-wrong-source'
  ),
  0,
  'wrong-source rejection inserts zero attempts'
);

select throws_ok(
  $$
    select * from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000003',
      '[{
        "question_id":"assessment-wrong-mode",
        "question_type":"official_past",
        "topic_id":"topic-a",
        "is_correct":true,
        "answered_at":"2026-08-29T01:13:00Z",
        "attempt_mode":"exam",
        "attempt_group_id":"11000000-0000-4000-8000-000000000003"
      }]'::jsonb
    )
  $$,
  '23503',
  'assessment attempt does not match its locked session',
  'an official attempt with the wrong mode is rejected'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where question_id = 'assessment-wrong-mode'
  ),
  0,
  'wrong-mode rejection inserts zero attempts'
);

select throws_ok(
  $$
    select * from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000004',
      '[{
        "question_id":"assessment-completed",
        "question_type":"mock_exam",
        "topic_id":"topic-a",
        "is_correct":true,
        "answered_at":"2026-08-29T01:14:00Z",
        "attempt_group_id":"11000000-0000-4000-8000-000000000004"
      }]'::jsonb
    )
  $$,
  '23503',
  'assessment session is not an owned in-progress recording target',
  'a completed assessment session rejects new attempts'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where question_id = 'assessment-completed'
  ),
  0,
  'completed-session rejection inserts zero attempts'
);

select throws_ok(
  $$
    select * from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000005',
      '[{
        "question_id":"assessment-abandoned",
        "question_type":"mock_exam",
        "topic_id":"topic-a",
        "is_correct":true,
        "answered_at":"2026-08-29T01:15:00Z",
        "attempt_group_id":"11000000-0000-4000-8000-000000000005"
      }]'::jsonb
    )
  $$,
  '23503',
  'assessment session is not an owned in-progress recording target',
  'an abandoned assessment session rejects new attempts'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where question_id = 'assessment-abandoned'
  ),
  0,
  'abandoned-session rejection inserts zero attempts'
);

create temporary table assessment_replay_revision (revision bigint not null);
insert into assessment_replay_revision (revision)
select revision
from public.exam_readiness_evidence_state
where user_id = '10000000-0000-0000-0000-000000000001';

select results_eq(
  $$
    select state, attempted_before, first_attempt_at, attempt_count, saved
    from public.record_assessment_question_attempts_with_exposure(
      '10000000-0000-0000-0000-000000000001',
      '11000000-0000-4000-8000-000000000001',
      '[{
        "question_id":"assessment-replay-question",
        "question_type":"mock_exam",
        "topic_id":"topic-a",
        "selected_answer":"A",
        "is_correct":true,
        "answered_at":"2026-08-29T01:10:00Z",
        "attempt_group_id":"11000000-0000-4000-8000-000000000001"
      }]'::jsonb
    )
  $$,
  $$values (
    'first'::text,
    false,
    '2026-08-29T01:10:00Z'::timestamptz,
    1::bigint,
    false
  )$$,
  'an exact replay returns the persisted first exposure without another insert'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where user_id = '10000000-0000-0000-0000-000000000001'
      and attempt_group_id = '11000000-0000-4000-8000-000000000001'
      and question_id = 'assessment-replay-question'
  ),
  1,
  'an exact assessment replay keeps one physical attempt row'
);

select is(
  (
    select revision
    from public.exam_readiness_evidence_state
    where user_id = '10000000-0000-0000-0000-000000000001'
  ),
  (select revision from assessment_replay_revision),
  'an exact assessment replay does not increment the evidence revision'
);

select * from finish();

rollback;
