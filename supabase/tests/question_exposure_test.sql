begin;

select plan(19);

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
values ('10000000-0000-0000-0000-000000000001', 'exposure-test-user');

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

select * from finish();

rollback;
