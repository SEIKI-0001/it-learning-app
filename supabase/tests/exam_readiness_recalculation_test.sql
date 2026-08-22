begin;

select plan(47);

select has_function(
  'public',
  'register_exam_readiness_evidence',
  array['uuid', 'text'],
  'the idempotent evidence registrar exists'
);

select has_function(
  'public',
  'claim_exam_readiness_recalculation',
  array['uuid', 'text', 'text', 'text', 'text', 'integer'],
  'the serialized recalculation claim exists'
);

select has_function(
  'public',
  'complete_exam_readiness_recalculation',
  array['uuid', 'bigint', 'integer', 'jsonb'],
  'the atomic completion function exists'
);

select has_function(
  'public',
  'fail_exam_readiness_recalculation',
  array['uuid', 'integer', 'text'],
  'the retryable failure function exists'
);

insert into public.line_users (id, line_user_id)
values
  ('20000000-0000-0000-0000-000000000001', 'readiness-test-user-1'),
  ('20000000-0000-0000-0000-000000000002', 'readiness-test-user-2'),
  ('20000000-0000-0000-0000-000000000003', 'readiness-test-user-3');

select is(
  public.register_exam_readiness_evidence(
    '20000000-0000-0000-0000-000000000001',
    'learning:session-1'
  ),
  1::bigint,
  'the first evidence event advances revision to one'
);

select is(
  public.register_exam_readiness_evidence(
    '20000000-0000-0000-0000-000000000001',
    'learning:session-1'
  ),
  1::bigint,
  'a repeated evidence event key does not advance revision'
);

select is(
  public.register_exam_readiness_evidence(
    '20000000-0000-0000-0000-000000000001',
    'review:outcome-1'
  ),
  2::bigint,
  'a different evidence event key advances revision once'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_evidence_events
    where user_id = '20000000-0000-0000-0000-000000000001'
  ),
  2,
  'one evidence event row exists per unique event key'
);

select is(
  (
    select count(*)::integer
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000001',
      'learning_session',
      'session-1',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  ),
  1,
  'the first recalculation claim acquires the user lease'
);

select results_eq(
  $$
    select status, attempt_count, evidence_revision
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  $$,
  $$values ('processing'::text, 1, 2::bigint)$$,
  'the initial job captures processing state and evidence revision'
);

select is(
  (
    select count(*)::integer
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000001',
      'review',
      'outcome-1',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  ),
  0,
  'a second active recalculation for the same user cannot acquire a lease'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'review'
      and trigger_id = 'outcome-1'
  ),
  0,
  'a lease-blocked claim does not create a job row'
);

select lives_ok(
  $$
    select public.fail_exam_readiness_recalculation(
      (
        select job_id
        from public.exam_readiness_recalculation_jobs
        where user_id = '20000000-0000-0000-0000-000000000001'
          and trigger_type = 'learning_session'
          and trigger_id = 'session-1'
      ),
      1,
      'calculator_failed'
    )
  $$,
  'a processing job can be failed without rolling back its evidence'
);

select results_eq(
  $$
    select job.status, job.error_code, state.lease_job_id
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000001'
      and job.trigger_type = 'learning_session'
      and job.trigger_id = 'session-1'
  $$,
  $$values ('failed'::text, 'calculator_failed'::text, null::uuid)$$,
  'failure releases the per-user lease'
);

select results_eq(
  $$
    select job_id
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000001',
      'learning_session',
      'session-1',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  $$,
  $$
    select job_id
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  $$,
  'retry reclaims the same failed job row'
);

select results_eq(
  $$
    select status, attempt_count, evidence_revision
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  $$,
  $$values ('processing'::text, 2, 2::bigint)$$,
  'reclaim increments attempt state without inserting a second row'
);

select is(
  public.complete_exam_readiness_recalculation(
    (
      select job_id
      from public.exam_readiness_recalculation_jobs
      where user_id = '20000000-0000-0000-0000-000000000001'
        and trigger_type = 'learning_session'
        and trigger_id = 'session-1'
    ),
    2,
    1,
    '{
      "score":70,
      "band":"approaching",
      "modelVersion":"exam-readiness-rule-v1",
      "examSchemeVersion":"ip-3field-2026",
      "calculationReferenceTime":"2026-08-22T15:10:00Z",
      "calculatedAt":"2026-08-22T15:15:00Z",
      "validUntil":null,
      "snapshotDate":"2026-08-23"
    }'::jsonb
  ),
  'stale'::text,
  'worker attempt one cannot complete after attempt two reclaims the row'
);

select lives_ok(
  $$
    select public.fail_exam_readiness_recalculation(
      (
        select job_id
        from public.exam_readiness_recalculation_jobs
        where user_id = '20000000-0000-0000-0000-000000000001'
          and trigger_type = 'learning_session'
          and trigger_id = 'session-1'
      ),
      1,
      'superseded_worker'
    )
  $$,
  'worker attempt one failure becomes a no-op after attempt two reclaims the row'
);

select results_eq(
  $$
    select job.status, job.attempt_count, state.lease_job_id = job.job_id
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000001'
      and job.trigger_type = 'learning_session'
      and job.trigger_id = 'session-1'
  $$,
  $$values ('processing'::text, 2, true)$$,
  'superseded completion and failure leave the newer attempt and lease active'
);

select is(
  (
    select count(*)::integer
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000002',
      'learning_session',
      'other-session',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  ),
  1,
  'a different user can hold an independent lease'
);

select lives_ok(
  $$
    select public.fail_exam_readiness_recalculation(
      (
        select job_id
        from public.exam_readiness_recalculation_jobs
        where user_id = '20000000-0000-0000-0000-000000000002'
          and trigger_id = 'other-session'
      ),
      1,
      'test_cleanup'
    )
  $$,
  'the independent user lease can be released'
);

select is(
  public.register_exam_readiness_evidence(
    '20000000-0000-0000-0000-000000000001',
    'review:outcome-2'
  ),
  3::bigint,
  'new evidence can arrive while TypeScript calculates outside a transaction'
);

select is(
  public.complete_exam_readiness_recalculation(
    (
      select job_id
      from public.exam_readiness_recalculation_jobs
      where user_id = '20000000-0000-0000-0000-000000000001'
        and trigger_type = 'learning_session'
        and trigger_id = 'session-1'
    ),
    2,
    2,
    '{
      "score":72,
      "band":"approaching",
      "modelVersion":"exam-readiness-rule-v1",
      "examSchemeVersion":"ip-3field-2026",
      "calculationReferenceTime":"2026-08-22T15:20:00Z",
      "calculatedAt":"2026-08-22T15:30:00Z",
      "validUntil":null,
      "snapshotDate":"2026-08-23"
    }'::jsonb
  ),
  'stale'::text,
  'a stale evidence revision is rejected'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_current
    where user_id = '20000000-0000-0000-0000-000000000001'
  ),
  0,
  'stale completion writes no current result'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_snapshots
    where user_id = '20000000-0000-0000-0000-000000000001'
  ),
  0,
  'stale completion writes no snapshot'
);

select results_eq(
  $$
    select job.status, job.error_code, state.lease_job_id
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000001'
      and job.trigger_type = 'learning_session'
      and job.trigger_id = 'session-1'
  $$,
  $$values ('failed'::text, 'stale_evidence'::text, null::uuid)$$,
  'stale completion makes the same row immediately retryable and releases its lease'
);

select results_eq(
  $$
    select job_id
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000001',
      'learning_session',
      'session-1',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  $$,
  $$
    select job_id
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  $$,
  'the stale job row is reclaimed for latest evidence'
);

select results_eq(
  $$
    select status, attempt_count, evidence_revision
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  $$,
  $$values ('processing'::text, 3, 3::bigint)$$,
  'the reclaimed stale job captures the newest evidence revision'
);

select is(
  public.complete_exam_readiness_recalculation(
    (
      select job_id
      from public.exam_readiness_recalculation_jobs
      where user_id = '20000000-0000-0000-0000-000000000001'
        and trigger_type = 'learning_session'
        and trigger_id = 'session-1'
    ),
    3,
    3,
    '{
      "score":74,
      "band":"approaching",
      "modelVersion":"exam-readiness-rule-v1",
      "examSchemeVersion":"ip-3field-2026",
      "calculationReferenceTime":"2026-08-22T15:25:00Z",
      "calculatedAt":"2026-08-22T15:30:00Z",
      "validUntil":"2026-08-23T00:00:00Z",
      "snapshotDate":"2026-08-23"
    }'::jsonb
  ),
  'saved'::text,
  'the latest evidence revision is saved'
);

select results_eq(
  $$
    select evidence_revision, result ->> 'score'
    from public.exam_readiness_current
    where user_id = '20000000-0000-0000-0000-000000000001'
  $$,
  $$values (3::bigint, '74'::text)$$,
  'current state contains the latest complete result'
);

select results_eq(
  $$
    select snapshot_date, model_version, exam_scheme_version, result ->> 'score'
    from public.exam_readiness_snapshots
    where user_id = '20000000-0000-0000-0000-000000000001'
  $$,
  $$values (
    '2026-08-23'::date,
    'exam-readiness-rule-v1'::text,
    'ip-3field-2026'::text,
    '74'::text
  )$$,
  'the versioned snapshot uses the Tokyo date and the same result'
);

select results_eq(
  $$
    select job.status, state.lease_job_id, job.result ->> 'score'
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000001'
      and job.trigger_type = 'learning_session'
      and job.trigger_id = 'session-1'
  $$,
  $$values ('succeeded'::text, null::uuid, '74'::text)$$,
  'saving marks the job succeeded and releases the lease atomically'
);

select results_eq(
  $$
    select job_id, status
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000001',
      'learning_session',
      'session-1',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  $$,
  $$
    select job_id, 'succeeded'::text
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  $$,
  'a succeeded trigger returns its completed row'
);

select is(
  (
    select attempt_count
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000001'
      and trigger_type = 'learning_session'
      and trigger_id = 'session-1'
  ),
  3,
  'a succeeded retransmission does not increment attempts'
);

select is(
  public.register_exam_readiness_evidence(
    '20000000-0000-0000-0000-000000000003',
    'time-boundary:2026-08-23T00:00:00Z'
  ),
  1::bigint,
  'the expired-lease fixture starts at evidence revision one'
);

select is(
  (
    select count(*)::integer
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000003',
      'time_boundary',
      '2026-08-23T00:00:00Z',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  ),
  1,
  'the expiring worker acquires attempt one'
);

update public.exam_readiness_recalculation_jobs
set lease_expires_at = statement_timestamp() - interval '1 second'
where user_id = '20000000-0000-0000-0000-000000000003';

update public.exam_readiness_evidence_state
set lease_expires_at = statement_timestamp() - interval '1 second'
where user_id = '20000000-0000-0000-0000-000000000003';

select results_eq(
  $$
    select job_id, attempt_count
    from public.claim_exam_readiness_recalculation(
      '20000000-0000-0000-0000-000000000003',
      'time_boundary',
      '2026-08-23T00:00:00Z',
      'exam-readiness-rule-v1',
      'ip-3field-2026',
      60
    )
  $$,
  $$
    select job_id, 2
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000003'
  $$,
  'an expired processing row is reclaimed in place as attempt two'
);

select is(
  public.complete_exam_readiness_recalculation(
    (
      select job_id
      from public.exam_readiness_recalculation_jobs
      where user_id = '20000000-0000-0000-0000-000000000003'
    ),
    1,
    1,
    '{
      "score":60,
      "band":"approaching",
      "modelVersion":"exam-readiness-rule-v1",
      "examSchemeVersion":"ip-3field-2026",
      "calculationReferenceTime":"2026-08-22T16:00:00Z",
      "calculatedAt":"2026-08-22T16:01:00Z",
      "validUntil":null,
      "snapshotDate":"2026-08-23"
    }'::jsonb
  ),
  'stale'::text,
  'the expired attempt cannot complete after same-revision reclaim'
);

select lives_ok(
  $$
    select public.fail_exam_readiness_recalculation(
      (
        select job_id
        from public.exam_readiness_recalculation_jobs
        where user_id = '20000000-0000-0000-0000-000000000003'
      ),
      1,
      'late_worker'
    )
  $$,
  'the expired attempt failure is a no-op after reclaim'
);

select results_eq(
  $$
    select job.status, job.attempt_count, state.lease_job_id = job.job_id
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000003'
  $$,
  $$values ('processing'::text, 2, true)$$,
  'the reclaimed attempt remains active after both stale worker callbacks'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_current
    where user_id = '20000000-0000-0000-0000-000000000003'
  ),
  0,
  'the stale expired worker wrote no current result'
);

select lives_ok(
  $$
    select public.fail_exam_readiness_recalculation(
      (
        select job_id
        from public.exam_readiness_recalculation_jobs
        where user_id = '20000000-0000-0000-0000-000000000003'
      ),
      2,
      'test_cleanup'
    )
  $$,
  'the live reclaimed attempt can still release its lease'
);

select is(
  (
    select count(*)::integer
    from public.record_question_attempts_with_exposure(
      '20000000-0000-0000-0000-000000000002',
      '[{
        "question_id":"practice-question-1",
        "question_type":"official_past",
        "topic_id":"topic-a",
        "selected_answer":"A",
        "is_correct":true,
        "answered_at":"2026-08-22T01:00:00Z",
        "question_version":1,
        "attempt_group_id":"practice-group-1"
      }]'::jsonb
    )
  ),
  1,
  'a per-question practice batch still records its answer'
);

select is(
  (
    select count(*)::integer
    from public.record_question_attempts_with_exposure(
      '20000000-0000-0000-0000-000000000002',
      '[{
        "question_id":"practice-question-1",
        "question_type":"official_past",
        "topic_id":"topic-a",
        "selected_answer":"A",
        "is_correct":true,
        "answered_at":"2026-08-22T01:00:00Z",
        "question_version":1,
        "attempt_group_id":"practice-group-1"
      }]'::jsonb
    )
  ),
  1,
  'a retransmitted practice batch remains callable and idempotent'
);

select results_eq(
  $$
    select revision, (
      select count(*)::integer
      from public.exam_readiness_evidence_events event
      where event.user_id = state.user_id
        and event.event_key like 'question-attempt-batch:%'
    )
    from public.exam_readiness_evidence_state state
    where user_id = '20000000-0000-0000-0000-000000000002'
  $$,
  $$values (1::bigint, 1)$$,
  'the same sorted answer fingerprints advance evidence exactly once'
);

select is(
  (
    select count(*)::integer
    from public.record_question_attempts_with_exposure(
      '20000000-0000-0000-0000-000000000002',
      '[{
        "question_id":"practice-question-2",
        "question_type":"topic_quiz",
        "topic_id":"topic-a",
        "selected_answer":"B",
        "is_correct":false,
        "answered_at":"2026-08-22T01:05:00Z"
      }]'::jsonb
    )
  ),
  1,
  'a different practice answer creates a new evidence fact'
);

select is(
  (
    select revision
    from public.exam_readiness_evidence_state
    where user_id = '20000000-0000-0000-0000-000000000002'
  ),
  2::bigint,
  'different sorted answer fingerprints advance evidence again'
);

select * from finish();

rollback;
