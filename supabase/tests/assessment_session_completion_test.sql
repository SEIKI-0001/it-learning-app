begin;

set local search_path = extensions, public, pg_catalog;

select plan(18);

select has_function(
  'public',
  'complete_assessment_session',
  array['uuid', 'uuid', 'timestamp with time zone', 'jsonb'],
  'the atomic assessment completion function exists'
);

insert into public.line_users (id, line_user_id)
values
  ('21000000-0000-0000-0000-000000000001', 'assessment-test-user-1'),
  ('21000000-0000-0000-0000-000000000002', 'assessment-test-user-2');

insert into public.assessment_sessions (
  session_id, user_id, source, mode, started_at, question_count
) values
  (
    '22000000-0000-4000-8000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    'mock', 'exam', '2026-08-23T01:00:00Z', 2
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '21000000-0000-0000-0000-000000000001',
    'checkpoint', 'exam', '2026-08-23T01:00:00Z', 1
  ),
  (
    '22000000-0000-4000-8000-000000000003',
    '21000000-0000-0000-0000-000000000001',
    'summary', 'exam', '2026-08-23T01:00:00Z', 1
  ),
  (
    '22000000-0000-4000-8000-000000000004',
    '21000000-0000-0000-0000-000000000001',
    'mock', 'exam', '2026-08-23T01:00:00Z', 1
  );

select is(
  (
    public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000001',
      '22000000-0000-4000-8000-000000000001',
      '2026-08-23T02:00:00Z',
      '[{"idempotency_key":"assessment:q1","canonical_question_id":"q1","topic_id":"tech-binary-data","field_id":"technology","is_correct":true,"first_attempt_state":"first","answered_at":"2026-08-23T01:01:00Z"}]'::jsonb
    ) ->> 'completed_now'
  )::boolean,
  true,
  'an in-progress session completes now'
);

select results_eq(
  $$
    select status, question_count, answered_count, correct_count,
      first_count, seen_count, unknown_count
    from public.assessment_sessions
    where session_id = '22000000-0000-4000-8000-000000000001'
  $$,
  $$values ('completed'::text, 2, 1, 1, 1, 0, 0)$$,
  'completion derives counts and keeps the unanswered denominator'
);

select is(
  (
    select count(*)::integer
    from public.assessment_session_answers
    where session_id = '22000000-0000-4000-8000-000000000001'
  ),
  1,
  'only answered questions are stored'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where user_id = '21000000-0000-0000-0000-000000000001'
      and event_key = 'assessment:22000000-0000-4000-8000-000000000001'
  ),
  0,
  'completion defers its stable evidence event until the P0 transaction'
);

select is(
  (
    public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000001',
      '22000000-0000-4000-8000-000000000001',
      '2026-08-23T02:00:00Z',
      '[{"idempotency_key":"assessment:q1","canonical_question_id":"q1","topic_id":"tech-binary-data","field_id":"technology","is_correct":true,"first_attempt_state":"first","answered_at":"2026-08-23T01:01:00Z"}]'::jsonb
    ) ->> 'completed_now'
  )::boolean,
  false,
  'an identical retry is an idempotent no-op'
);

select is(
  coalesce((
    select revision
    from public.exam_readiness_evidence_state
    where user_id = '21000000-0000-0000-0000-000000000001'
  ), 0::bigint),
  0::bigint,
  'an identical retry still does not publish evidence before P0'
);

select throws_ok(
  $$
    select public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000001',
      '22000000-0000-4000-8000-000000000001',
      '2026-08-23T02:00:01Z',
      '[]'::jsonb
    )
  $$,
  '23505',
  'assessment session completion conflicts with stored facts',
  'a conflicting completion retry is rejected'
);

update public.assessment_sessions
set status = 'abandoned', completed_at = '2026-08-23T02:00:00Z'
where session_id = '22000000-0000-4000-8000-000000000002';

select throws_ok(
  $$
    select public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000001',
      '22000000-0000-4000-8000-000000000002',
      '2026-08-23T02:00:00Z',
      '[]'::jsonb
    )
  $$,
  '23505',
  'assessment session is terminal',
  'an abandoned session is immutable'
);

select throws_ok(
  $$
    update public.assessment_sessions
    set question_count = 99
    where session_id = '22000000-0000-4000-8000-000000000001'
  $$,
  '22023',
  'assessment session question_count is immutable',
  'the completed question denominator stays immutable'
);

select throws_ok(
  $$
    select public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000001',
      '22000000-0000-4000-8000-000000000003',
      '2026-08-23T02:00:00Z',
      '[{"idempotency_key":"invalid","canonical_question_id":"q1"}]'::jsonb
    )
  $$,
  '22023',
  'invalid assessment session answer',
  'an invalid answer aborts completion'
);

select is(
  (
    select status
    from public.assessment_sessions
    where session_id = '22000000-0000-4000-8000-000000000003'
  ),
  'in_progress',
  'invalid-answer rollback keeps the session in progress'
);

select is(
  (
    select count(*)::integer
    from public.assessment_session_answers
    where session_id = '22000000-0000-4000-8000-000000000003'
  ),
  0,
  'invalid-answer rollback stores no answers'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where event_key = 'assessment:22000000-0000-4000-8000-000000000003'
  ),
  0,
  'invalid-answer rollback registers no evidence event'
);

insert into public.assessment_session_answers (
  user_id, session_id, idempotency_key, canonical_question_id, topic_id,
  field_id, is_correct, first_attempt_state, answered_at
) values (
  '21000000-0000-0000-0000-000000000001',
  '22000000-0000-4000-8000-000000000003',
  'already-used-key', 'seed-q', 'tech-binary-data', 'technology', false, 'seen',
  '2026-08-23T01:10:00Z'
);

select throws_ok(
  $$
    select public.complete_assessment_session(
      '21000000-0000-0000-0000-000000000001',
      '22000000-0000-4000-8000-000000000004',
      '2026-08-23T02:00:00Z',
      '[{"idempotency_key":"already-used-key","canonical_question_id":"q2","topic_id":"tech-security-cia","field_id":"technology","is_correct":true,"first_attempt_state":"seen","answered_at":"2026-08-23T01:20:00Z"}]'::jsonb
    )
  $$,
  '23505',
  null,
  'a failed answer insert aborts completion'
);

select is(
  (
    select status
    from public.assessment_sessions
    where session_id = '22000000-0000-4000-8000-000000000004'
  ),
  'in_progress',
  'failed-insert rollback keeps the session in progress'
);

select is(
  (
    select count(*)::integer
    from public.assessment_session_answers
    where session_id = '22000000-0000-4000-8000-000000000004'
  ),
  0,
  'failed-insert rollback stores no answers for the target session'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where event_key = 'assessment:22000000-0000-4000-8000-000000000004'
  ),
  0,
  'failed-insert rollback registers no target evidence event'
);

select * from finish();
rollback;
