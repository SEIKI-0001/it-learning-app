begin;

set local search_path = extensions, public, pg_catalog;

select plan(28);

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

create extension if not exists dblink with schema extensions;

select extensions.dblink_connect_u(
  'recorder_first',
  format('dbname=%s', current_database())
);
select extensions.dblink_connect_u(
  'completion_second',
  format('dbname=%s', current_database())
);
select extensions.dblink_connect_u(
  'completion_first',
  format('dbname=%s', current_database())
);
select extensions.dblink_connect_u(
  'recorder_second',
  format('dbname=%s', current_database())
);

select extensions.dblink_exec(
  'recorder_first',
  $setup$
    insert into public.line_users (id, line_user_id) values
      ('23000000-0000-0000-0000-000000000001', 'assessment-lock-user-1'),
      ('23000000-0000-0000-0000-000000000002', 'assessment-lock-user-2');
    insert into public.assessment_sessions (
      session_id, user_id, source, mode, started_at, question_count
    ) values
      (
        '24000000-0000-4000-8000-000000000001',
        '23000000-0000-0000-0000-000000000001',
        'mock', 'exam', '2026-08-29T01:00:00Z', 1
      ),
      (
        '24000000-0000-4000-8000-000000000002',
        '23000000-0000-0000-0000-000000000002',
        'mock', 'exam', '2026-08-29T01:00:00Z', 1
      );
  $setup$
);

select extensions.dblink_exec('recorder_first', 'begin');

select results_eq(
  $$
    select state, saved
    from extensions.dblink(
      'recorder_first',
      $remote$
        select state, saved
        from public.record_assessment_question_attempts_with_exposure(
          '23000000-0000-0000-0000-000000000001',
          '24000000-0000-4000-8000-000000000001',
          '[{
            "question_id":"recorder-locks-first",
            "question_type":"mock_exam",
            "topic_id":"topic-a",
            "selected_answer":"A",
            "is_correct":true,
            "answered_at":"2026-08-29T01:10:00Z",
            "attempt_group_id":"24000000-0000-4000-8000-000000000001"
          }]'::jsonb
        )
      $remote$
    ) as result(state text, saved boolean)
  $$,
  $$values ('first'::text, true)$$,
  'the recorder inserts while retaining its session-row lock'
);

select is(
  extensions.dblink_send_query(
    'completion_second',
    $remote$
      select (
        public.complete_assessment_session(
          '23000000-0000-0000-0000-000000000001',
          '24000000-0000-4000-8000-000000000001',
          '2026-08-29T02:00:00Z',
          '[{
            "idempotency_key":"assessment:lock-first:q1",
            "canonical_question_id":"recorder-locks-first",
            "topic_id":"topic-a",
            "field_id":"technology",
            "is_correct":true,
            "first_attempt_state":"first",
            "answered_at":"2026-08-29T01:10:00Z"
          }]'::jsonb
        ) ->> 'completed_now'
      )::boolean
    $remote$
  ),
  1,
  'completion starts on a genuinely concurrent connection'
);

select pg_sleep(0.2);

select is(
  extensions.dblink_is_busy('completion_second'),
  1,
  'completion waits while the recorder owns the session lock'
);

select extensions.dblink_exec('recorder_first', 'commit');

select results_eq(
  $$
    select completed_now
    from extensions.dblink_get_result('completion_second')
      as result(completed_now boolean)
  $$,
  $$values (true)$$,
  'completion proceeds after the recorder commits its inserted attempt'
);

select results_eq(
  $$
    select session.status, count(attempt.attempt_id)::bigint
    from public.assessment_sessions session
    left join public.question_attempts attempt
      on attempt.user_id = session.user_id
      and attempt.attempt_group_id = session.session_id::text
    where session.session_id = '24000000-0000-4000-8000-000000000001'
    group by session.status
  $$,
  $$values ('completed'::text, 1::bigint)$$,
  'recorder-first ordering leaves a completed session with its attempt'
);

select extensions.dblink_exec('completion_first', 'begin');

select results_eq(
  $$
    select completed_now
    from extensions.dblink(
      'completion_first',
      $remote$
        select (
          public.complete_assessment_session(
            '23000000-0000-0000-0000-000000000002',
            '24000000-0000-4000-8000-000000000002',
            '2026-08-29T02:00:00Z',
            '[]'::jsonb
          ) ->> 'completed_now'
        )::boolean
      $remote$
    ) as result(completed_now boolean)
  $$,
  $$values (true)$$,
  'completion can acquire and retain the session lock first'
);

select extensions.dblink_exec(
  'recorder_second',
  $remote$
    create or replace function pg_temp.try_assessment_record()
    returns text
    language plpgsql
    as $function$
    begin
      perform *
      from public.record_assessment_question_attempts_with_exposure(
        '23000000-0000-0000-0000-000000000002',
        '24000000-0000-4000-8000-000000000002',
        '[{
          "question_id":"completion-locks-first",
          "question_type":"mock_exam",
          "topic_id":"topic-a",
          "selected_answer":"A",
          "is_correct":true,
          "answered_at":"2026-08-29T01:10:00Z",
          "attempt_group_id":"24000000-0000-4000-8000-000000000002"
        }]'::jsonb
      );
      return 'saved';
    exception when others then
      return sqlstate;
    end;
    $function$;
  $remote$
);

select is(
  extensions.dblink_send_query(
    'recorder_second',
    'select pg_temp.try_assessment_record()'
  ),
  1,
  'the recorder starts on a second genuinely concurrent connection'
);

select pg_sleep(0.2);

select is(
  extensions.dblink_is_busy('recorder_second'),
  1,
  'the recorder waits while completion owns the session lock'
);

select extensions.dblink_exec('completion_first', 'commit');

select results_eq(
  $$
    select outcome
    from extensions.dblink_get_result('recorder_second') as result(outcome text)
  $$,
  $$values ('23503'::text)$$,
  'after completion commits the waiting recorder rejects the terminal session'
);

select is(
  (
    select count(*)::integer
    from public.question_attempts
    where user_id = '23000000-0000-0000-0000-000000000002'
      and attempt_group_id = '24000000-0000-4000-8000-000000000002'
  ),
  0,
  'completion-first ordering inserts zero attempt rows'
);

select extensions.dblink_exec(
  'recorder_first',
  $cleanup$
    delete from public.line_users
    where id in (
      '23000000-0000-0000-0000-000000000001',
      '23000000-0000-0000-0000-000000000002'
    );
  $cleanup$
);

select extensions.dblink_disconnect('recorder_first');
select extensions.dblink_disconnect('completion_second');
select extensions.dblink_disconnect('completion_first');
select extensions.dblink_disconnect('recorder_second');

select * from finish();
rollback;
