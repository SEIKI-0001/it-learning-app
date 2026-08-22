begin;

create schema if not exists extensions;
create extension if not exists dblink with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(59);

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
  ('20000000-0000-0000-0000-000000000003', 'readiness-test-user-3'),
  ('20000000-0000-0000-0000-000000000006', 'readiness-test-user-6');

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

do $dblink_setup$
declare
  v_server_address text := host(inet_server_addr());
  v_connection text := format(
    'hostaddr=%L dbname=%L user=%L password=postgres',
    v_server_address,
    current_database(),
    current_user
  );
begin
  if v_server_address is null then
    raise exception 'concurrency tests require a TCP pgTAP connection';
  end if;

  perform dblink_connect('readiness_lock_holder', v_connection);
  perform dblink_connect('readiness_waiter', v_connection);
  perform dblink_connect('readiness_claim_one', v_connection);
  perform dblink_connect('readiness_claim_two', v_connection);

  perform dblink_exec(
    'readiness_lock_holder',
    $remote$
      delete from public.line_users
      where id in (
        '20000000-0000-0000-0000-000000000004'::uuid,
        '20000000-0000-0000-0000-000000000005'::uuid
      )
    $remote$
  );
  perform dblink_exec(
    'readiness_lock_holder',
    $remote$
      insert into public.line_users (id, line_user_id)
      values
        ('20000000-0000-0000-0000-000000000004', 'readiness-dblink-user-4'),
        ('20000000-0000-0000-0000-000000000005', 'readiness-dblink-user-5')
    $remote$
  );
  perform dblink_exec(
    'readiness_lock_holder',
    $remote$
      insert into public.exam_readiness_evidence_state (user_id, revision)
      values
        ('20000000-0000-0000-0000-000000000004', 0),
        ('20000000-0000-0000-0000-000000000005', 1)
    $remote$
  );
  perform dblink_exec(
    'readiness_lock_holder',
    $remote$
      insert into public.exam_readiness_evidence_events (
        user_id,
        event_key,
        revision
      ) values (
        '20000000-0000-0000-0000-000000000005',
        'dblink:terminal-boundary',
        1
      )
    $remote$
  );
end;
$dblink_setup$;

do $claim_wait_setup$
begin
  perform dblink_exec('readiness_lock_holder', 'begin');
  perform locked.user_id
  from dblink(
    'readiness_lock_holder',
    $remote$
      select user_id
      from public.exam_readiness_evidence_state
      where user_id = '20000000-0000-0000-0000-000000000004'
      for update
    $remote$
  ) as locked(user_id uuid);

  perform dblink_send_query(
    'readiness_waiter',
    $remote$
      select
        attempt_count,
        extract(epoch from lease_expires_at - clock_timestamp())::double precision
          as remaining_seconds
      from public.claim_exam_readiness_recalculation(
        '20000000-0000-0000-0000-000000000004',
        'blocked_claim',
        'boundary',
        'exam-readiness-rule-v1',
        'ip-3field-2026',
        2
      )
    $remote$
  );
  perform pg_sleep(2.25);
  perform dblink_exec('readiness_lock_holder', 'commit');
end;
$claim_wait_setup$;

create temporary table readiness_claim_after_wait (
  attempt_count integer,
  remaining_seconds double precision
) on commit drop;

insert into pg_temp.readiness_claim_after_wait
select remote.attempt_count, remote.remaining_seconds
from dblink_get_result('readiness_waiter')
  as remote(attempt_count integer, remaining_seconds double precision);

do $drain_claim_waiter$
begin
  perform remote.attempt_count
  from dblink_get_result('readiness_waiter')
    as remote(attempt_count integer, remaining_seconds double precision);
end;
$drain_claim_waiter$;

select is(
  (
    select attempt_count
    from pg_temp.readiness_claim_after_wait
  ),
  1,
  'a claim blocked past the lease duration still acquires attempt one'
);

select ok(
  (
    select remaining_seconds > 1.25
    from pg_temp.readiness_claim_after_wait
  ),
  'a blocked claim receives a full lease measured after lock acquisition'
);

do $claim_wait_cleanup$
begin
  perform remote.finished
  from dblink(
    'readiness_lock_holder',
    $remote$
      select 'finished'::text
      from public.exam_readiness_recalculation_jobs job
      cross join lateral public.fail_exam_readiness_recalculation(
        job.job_id,
        job.attempt_count,
        'test_cleanup'
      )
      where job.user_id = '20000000-0000-0000-0000-000000000004'
        and job.trigger_type = 'blocked_claim'
    $remote$
  ) as remote(finished text);
end;
$claim_wait_cleanup$;

do $concurrent_claims$
begin
  perform dblink_exec('readiness_lock_holder', 'begin');
  perform locked.user_id
  from dblink(
    'readiness_lock_holder',
    $remote$
      select user_id
      from public.exam_readiness_evidence_state
      where user_id = '20000000-0000-0000-0000-000000000004'
      for update
    $remote$
  ) as locked(user_id uuid);

  perform dblink_send_query(
    'readiness_claim_one',
    $remote$
      select job_id
      from public.claim_exam_readiness_recalculation(
        '20000000-0000-0000-0000-000000000004',
        'concurrent_one',
        'one',
        'exam-readiness-rule-v1',
        'ip-3field-2026',
        30
      )
    $remote$
  );
  perform dblink_send_query(
    'readiness_claim_two',
    $remote$
      select job_id
      from public.claim_exam_readiness_recalculation(
        '20000000-0000-0000-0000-000000000004',
        'concurrent_two',
        'two',
        'exam-readiness-rule-v1',
        'ip-3field-2026',
        30
      )
    $remote$
  );
  perform pg_sleep(0.1);
  perform dblink_exec('readiness_lock_holder', 'commit');
end;
$concurrent_claims$;

create temporary table readiness_concurrent_claim_results (
  claimant text not null,
  job_id uuid not null
) on commit drop;

insert into pg_temp.readiness_concurrent_claim_results (claimant, job_id)
select 'one', remote.job_id
from dblink_get_result('readiness_claim_one') as remote(job_id uuid)
union all
select 'two', remote.job_id
from dblink_get_result('readiness_claim_two') as remote(job_id uuid);

do $drain_concurrent_claims$
begin
  perform remote.job_id
  from dblink_get_result('readiness_claim_one') as remote(job_id uuid);
  perform remote.job_id
  from dblink_get_result('readiness_claim_two') as remote(job_id uuid);
end;
$drain_concurrent_claims$;

select is(
  (select count(*)::integer from pg_temp.readiness_concurrent_claim_results),
  1,
  'two independent same-user claims produce exactly one lease winner'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_recalculation_jobs
    where user_id = '20000000-0000-0000-0000-000000000004'
      and trigger_type in ('concurrent_one', 'concurrent_two')
  ),
  1,
  'the blocked concurrent claimant creates no second processing job'
);

select ok(
  (
    select state.lease_job_id = result.job_id
    from public.exam_readiness_evidence_state state
    cross join pg_temp.readiness_concurrent_claim_results result
    where state.user_id = '20000000-0000-0000-0000-000000000004'
  ),
  'the persisted per-user lease belongs to the sole concurrent winner'
);

do $concurrent_cleanup$
begin
  perform remote.finished
  from dblink(
    'readiness_lock_holder',
    $remote$
      select 'finished'::text
      from public.exam_readiness_recalculation_jobs job
      cross join lateral public.fail_exam_readiness_recalculation(
        job.job_id,
        job.attempt_count,
        'test_cleanup'
      )
      where job.user_id = '20000000-0000-0000-0000-000000000004'
        and job.status = 'processing'
    $remote$
  ) as remote(finished text);
end;
$concurrent_cleanup$;

do $terminal_boundary_setup$
begin
  perform claimed.job_id
  from dblink(
    'readiness_lock_holder',
    $remote$
      select job_id
      from public.claim_exam_readiness_recalculation(
        '20000000-0000-0000-0000-000000000005',
        'terminal_boundary',
        'complete',
        'exam-readiness-rule-v1',
        'ip-3field-2026',
        2
      )
    $remote$
  ) as claimed(job_id uuid);

  perform dblink_exec('readiness_lock_holder', 'begin');
  perform locked.user_id
  from dblink(
    'readiness_lock_holder',
    $remote$
      select user_id
      from public.exam_readiness_evidence_state
      where user_id = '20000000-0000-0000-0000-000000000005'
      for update
    $remote$
  ) as locked(user_id uuid);

  perform dblink_send_query(
    'readiness_waiter',
    $remote$
      select public.complete_exam_readiness_recalculation(
        (
          select job_id
          from public.exam_readiness_recalculation_jobs
          where user_id = '20000000-0000-0000-0000-000000000005'
            and trigger_type = 'terminal_boundary'
        ),
        1,
        1,
        '{
          "score":65,
          "band":"approaching",
          "modelVersion":"exam-readiness-rule-v1",
          "examSchemeVersion":"ip-3field-2026",
          "calculationReferenceTime":"2026-08-22T18:00:00Z",
          "calculatedAt":"2026-08-22T18:01:00Z",
          "validUntil":null,
          "snapshotDate":"2026-08-23"
        }'::jsonb
      )
    $remote$
  );
  perform pg_sleep(2.25);
  perform dblink_exec('readiness_lock_holder', 'commit');
end;
$terminal_boundary_setup$;

create temporary table readiness_blocked_complete_result (
  outcome text not null
) on commit drop;

insert into pg_temp.readiness_blocked_complete_result (outcome)
select remote.outcome
from dblink_get_result('readiness_waiter') as remote(outcome text);

do $drain_blocked_complete$
begin
  perform remote.outcome
  from dblink_get_result('readiness_waiter') as remote(outcome text);
end;
$drain_blocked_complete$;

select is(
  (select outcome from pg_temp.readiness_blocked_complete_result),
  'stale'::text,
  'completion that expires while blocked is rejected using post-lock time'
);

select results_eq(
  $$
    select
      job.status,
      job.attempt_count,
      job.result,
      state.lease_job_id = job.job_id,
      (select count(*)::integer from public.exam_readiness_current current
        where current.user_id = job.user_id),
      (select count(*)::integer from public.exam_readiness_snapshots snapshot
        where snapshot.user_id = job.user_id)
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000005'
  $$,
  $$values ('processing'::text, 1, null::jsonb, true, 0, 0)$$,
  'expired blocked completion preserves job, lease, current, and snapshot state'
);

do $blocked_fail_setup$
begin
  perform claimed.job_id
  from dblink(
    'readiness_lock_holder',
    $remote$
      select job_id
      from public.claim_exam_readiness_recalculation(
        '20000000-0000-0000-0000-000000000005',
        'terminal_boundary',
        'complete',
        'exam-readiness-rule-v1',
        'ip-3field-2026',
        2
      )
    $remote$
  ) as claimed(job_id uuid);

  perform dblink_exec('readiness_lock_holder', 'begin');
  perform locked.user_id
  from dblink(
    'readiness_lock_holder',
    $remote$
      select user_id
      from public.exam_readiness_evidence_state
      where user_id = '20000000-0000-0000-0000-000000000005'
      for update
    $remote$
  ) as locked(user_id uuid);

  perform dblink_send_query(
    'readiness_waiter',
    $remote$
      with failed as (
        select public.fail_exam_readiness_recalculation(
          (
            select job_id
            from public.exam_readiness_recalculation_jobs
            where user_id = '20000000-0000-0000-0000-000000000005'
              and trigger_type = 'terminal_boundary'
          ),
          2,
          'late_failure'
        )
      )
      select 'finished'::text from failed
    $remote$
  );
  perform pg_sleep(2.25);
  perform dblink_exec('readiness_lock_holder', 'commit');
end;
$blocked_fail_setup$;

create temporary table readiness_blocked_fail_result (
  outcome text not null
) on commit drop;

insert into pg_temp.readiness_blocked_fail_result (outcome)
select remote.outcome
from dblink_get_result('readiness_waiter') as remote(outcome text);

do $drain_blocked_fail$
begin
  perform remote.outcome
  from dblink_get_result('readiness_waiter') as remote(outcome text);
end;
$drain_blocked_fail$;

select results_eq(
  $$
    select
      job.status,
      job.attempt_count,
      job.error_code,
      state.lease_job_id = job.job_id
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000005'
  $$,
  $$values ('processing'::text, 2, null::text, true)$$,
  'failure that expires while blocked cannot fail the job or release its lease'
);

do $dblink_cleanup$
begin
  perform dblink_exec(
    'readiness_lock_holder',
    $remote$
      delete from public.line_users
      where id in (
        '20000000-0000-0000-0000-000000000004'::uuid,
        '20000000-0000-0000-0000-000000000005'::uuid
      )
    $remote$
  );
  perform dblink_disconnect('readiness_claim_two');
  perform dblink_disconnect('readiness_claim_one');
  perform dblink_disconnect('readiness_waiter');
  perform dblink_disconnect('readiness_lock_holder');
end;
$dblink_cleanup$;

do $atomic_setup$
begin
  perform public.register_exam_readiness_evidence(
    '20000000-0000-0000-0000-000000000006',
    'atomic:fixture'
  );
  perform job_id
  from public.claim_exam_readiness_recalculation(
    '20000000-0000-0000-0000-000000000006',
    'atomic_test',
    'fixture',
    'exam-readiness-rule-v1',
    'ip-3field-2026',
    60
  );
end;
$atomic_setup$;

create temporary table readiness_atomic_before
on commit drop
as
select
  job.status,
  job.attempt_count,
  job.lease_expires_at as job_lease_expires_at,
  job.result,
  state.lease_job_id,
  state.lease_expires_at as state_lease_expires_at
from public.exam_readiness_recalculation_jobs job
join public.exam_readiness_evidence_state state using (user_id)
where job.user_id = '20000000-0000-0000-0000-000000000006';

create or replace function pg_temp.raise_readiness_snapshot_failure()
returns trigger
language plpgsql
as $$
begin
  raise exception 'forced readiness snapshot failure' using errcode = 'P0001';
end;
$$;

create trigger exam_readiness_test_snapshot_failure
before insert or update on public.exam_readiness_snapshots
for each statement execute function pg_temp.raise_readiness_snapshot_failure();

select throws_ok(
  $completion$
    select public.complete_exam_readiness_recalculation(
      (
        select job_id
        from public.exam_readiness_recalculation_jobs
        where user_id = '20000000-0000-0000-0000-000000000006'
      ),
      1,
      1,
      '{
        "score":68,
        "band":"approaching",
        "modelVersion":"exam-readiness-rule-v1",
        "examSchemeVersion":"ip-3field-2026",
        "calculationReferenceTime":"2026-08-22T17:00:00Z",
        "calculatedAt":"2026-08-22T17:01:00Z",
        "validUntil":null,
        "snapshotDate":"2026-08-23"
      }'::jsonb
    )
  $completion$,
  'P0001',
  'forced readiness snapshot failure',
  'a later snapshot failure aborts completion after the current write'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_current
    where user_id = '20000000-0000-0000-0000-000000000006'
  ),
  0,
  'failed completion rolls back the earlier current-state write'
);

select is(
  (
    select count(*)::integer
    from public.exam_readiness_snapshots
    where user_id = '20000000-0000-0000-0000-000000000006'
  ),
  0,
  'failed completion leaves no snapshot write'
);

select results_eq(
  $$
    select
      job.status,
      job.attempt_count,
      job.lease_expires_at,
      job.result,
      state.lease_job_id,
      state.lease_expires_at
    from public.exam_readiness_recalculation_jobs job
    join public.exam_readiness_evidence_state state using (user_id)
    where job.user_id = '20000000-0000-0000-0000-000000000006'
  $$,
  $$
    select
      status,
      attempt_count,
      job_lease_expires_at,
      result,
      lease_job_id,
      state_lease_expires_at
    from pg_temp.readiness_atomic_before
  $$,
  'failed completion restores the exact job and lease state from before the call'
);

drop trigger if exists exam_readiness_test_snapshot_failure
  on public.exam_readiness_snapshots;

do $atomic_cleanup$
begin
  perform public.fail_exam_readiness_recalculation(
    (
      select job_id
      from public.exam_readiness_recalculation_jobs
      where user_id = '20000000-0000-0000-0000-000000000006'
    ),
    1,
    'test_cleanup'
  );
end;
$atomic_cleanup$;

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
