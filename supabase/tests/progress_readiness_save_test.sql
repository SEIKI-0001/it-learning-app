begin;

set local search_path = extensions, public, pg_catalog;

select plan(17);

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

insert into public.line_users (id, line_user_id)
values ('21000000-0000-0000-0000-000000000009', 'progress-readiness-test-user');

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      '{"current_day":1,"exp":15,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:00:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":8},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":8,"lastEvaluatedAt":"2026-08-23T01:00:00Z","correctCount":1,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb,
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
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      '{"current_day":1,"exp":15,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:00:00+00:00","completed_topics":["topic-a"],"topic_mastery":{"topic-a":8},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":8,"lastEvaluatedAt":"2026-08-23T01:00:00Z","correctCount":1,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"reason":"scheduled","dueAt":"2026-08-26T01:00:00Z","topicId":"topic-a"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb,
      'learning_complete',
      'question-a'
    ) ->> 'trigger_registered'
  )::boolean,
  true,
  'a semantic-identical retry finds the existing trigger'
);

select is(
  (select revision from public.exam_readiness_evidence_state where user_id = '21000000-0000-0000-0000-000000000009'),
  1::bigint,
  'the identical retry does not advance revision'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      '{"current_day":1,"exp":16,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:00:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":8},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":8,"lastEvaluatedAt":"2026-08-23T01:00:00Z","correctCount":1,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb,
      'learning_complete',
      'unrelated-progress-only'
    ) ->> 'trigger_registered'
  )::boolean,
  false,
  'a non-evidence progress change does not register a new trigger'
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

select throws_ok(
  $$
    select public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      '{"current_day":1,"exp":16,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:00:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":9},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":9,"lastEvaluatedAt":"2026-08-23T01:01:00Z","correctCount":2,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb,
      'learning_complete',
      'question-a'
    )
  $$,
  '23505',
  'progress readiness trigger conflicts with stored evidence',
  'a stable trigger cannot be reused for conflicting evidence facts'
);

select is(
  (select topic_mastery_stats -> 'topic-a' ->> 'masteryScore' from public.user_progress where user_id = '21000000-0000-0000-0000-000000000009'),
  '8',
  'a conflicting retry rolls back the progress write'
);

select is(
  (
    public.save_user_progress_with_readiness_evidence(
      '21000000-0000-0000-0000-000000000009',
      '{"current_day":1,"exp":16,"level":1,"completed_days":[],"streak_count":1,"weak_tags":[],"last_played_at":"2026-08-23T01:01:00Z","completed_topics":["topic-a"],"topic_mastery":{"topic-a":9},"topic_mastery_stats":{"topic-a":{"topicId":"topic-a","masteryScore":9,"lastEvaluatedAt":"2026-08-23T01:01:00Z","correctCount":2,"incorrectCount":0,"reviewSuccessCount":0,"recentEvidence":[]}},"review_queue":[{"topicId":"topic-a","dueAt":"2026-08-26T01:00:00Z","reason":"scheduled"}],"weekly_plan":null,"checkpoint_progress":null}'::jsonb,
      'learning_complete',
      'question-b'
    ) ->> 'evidence_changed'
  )::boolean,
  true,
  'a new stable completion can persist changed evidence'
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

select * from finish();
rollback;
