begin;

select plan(15);

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

select has_index(
  'public',
  'question_attempts',
  'question_attempts_user_question_answered_at_idx',
  'question_attempt history lookup is indexed'
);

select has_index(
  'public',
  'user_answers',
  'user_answers_user_question_answered_at_idx',
  'legacy answer history lookup is indexed'
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

select * from finish();

rollback;
