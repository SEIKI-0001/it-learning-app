-- P1-2: shared assessment persistence and fenced Exam Readiness recalculation.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.assessment_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.line_users (id) on delete cascade,
  source text not null check (source in ('checkpoint', 'summary', 'mock', 'official_past')),
  mode text not null check (mode in ('practice', 'exam')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null,
  completed_at timestamptz,
  question_count integer not null check (question_count >= 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  first_count integer not null default 0 check (first_count >= 0),
  seen_count integer not null default 0 check (seen_count >= 0),
  unknown_count integer not null default 0 check (unknown_count >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (user_id, session_id),
  check (answered_count <= question_count),
  check (correct_count <= answered_count),
  check (first_count + seen_count + unknown_count = answered_count),
  check (
    (status = 'in_progress' and completed_at is null)
    or (status in ('completed', 'abandoned') and completed_at is not null)
  )
);

create table public.assessment_session_answers (
  answer_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.line_users (id) on delete cascade,
  session_id uuid not null,
  idempotency_key text not null check (length(idempotency_key) > 0),
  canonical_question_id text not null check (length(canonical_question_id) > 0),
  topic_id text not null check (length(topic_id) > 0),
  field_id text not null check (length(field_id) > 0),
  is_correct boolean not null,
  first_attempt_state text not null
    check (first_attempt_state in ('first', 'seen', 'unknown')),
  answered_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (user_id, idempotency_key),
  foreign key (user_id, session_id)
    references public.assessment_sessions (user_id, session_id)
    on delete cascade
);

create table public.exam_readiness_evidence_state (
  user_id uuid primary key references public.line_users (id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  lease_job_id uuid,
  lease_expires_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  check (
    (lease_job_id is null and lease_expires_at is null)
    or (lease_job_id is not null and lease_expires_at is not null)
  )
);

create table public.exam_readiness_evidence_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.line_users (id) on delete cascade,
  event_key text not null check (length(event_key) > 0),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default statement_timestamp(),
  unique (user_id, event_key),
  unique (user_id, revision)
);

create table public.exam_readiness_recalculation_jobs (
  job_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.line_users (id) on delete cascade,
  trigger_type text not null check (length(trigger_type) > 0),
  trigger_id text not null check (length(trigger_id) > 0),
  model_version text not null check (length(model_version) > 0),
  exam_scheme_version text not null check (length(exam_scheme_version) > 0),
  status text not null default 'processing'
    check (status in ('processing', 'succeeded', 'failed')),
  evidence_revision bigint not null check (evidence_revision >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_expires_at timestamptz,
  error_code text,
  result jsonb,
  started_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (user_id, trigger_type, trigger_id, model_version, exam_scheme_version)
);

create table public.exam_readiness_current (
  user_id uuid primary key references public.line_users (id) on delete cascade,
  evidence_revision bigint not null check (evidence_revision >= 0),
  model_version text not null check (length(model_version) > 0),
  exam_scheme_version text not null check (length(exam_scheme_version) > 0),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  calculation_reference_time timestamptz not null,
  calculated_at timestamptz not null,
  valid_until timestamptz,
  updated_at timestamptz not null default statement_timestamp()
);

create table public.exam_readiness_snapshots (
  user_id uuid not null references public.line_users (id) on delete cascade,
  snapshot_date date not null,
  model_version text not null check (length(model_version) > 0),
  exam_scheme_version text not null check (length(exam_scheme_version) > 0),
  evidence_revision bigint not null check (evidence_revision >= 0),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  calculation_reference_time timestamptz not null,
  calculated_at timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, snapshot_date, model_version, exam_scheme_version)
);

alter table public.assessment_sessions owner to postgres;
alter table public.assessment_session_answers owner to postgres;
alter table public.exam_readiness_evidence_state owner to postgres;
alter table public.exam_readiness_evidence_events owner to postgres;
alter table public.exam_readiness_recalculation_jobs owner to postgres;
alter table public.exam_readiness_current owner to postgres;
alter table public.exam_readiness_snapshots owner to postgres;

create index assessment_sessions_user_status_completed_idx
  on public.assessment_sessions (user_id, status, completed_at desc);
create index assessment_session_answers_user_answered_idx
  on public.assessment_session_answers (user_id, answered_at desc);
create index assessment_session_answers_session_idx
  on public.assessment_session_answers (session_id, answered_at);
create index exam_readiness_evidence_events_user_revision_idx
  on public.exam_readiness_evidence_events (user_id, revision desc);
create index exam_readiness_recalculation_jobs_user_status_lease_idx
  on public.exam_readiness_recalculation_jobs (user_id, status, lease_expires_at);
create index exam_readiness_snapshots_user_date_idx
  on public.exam_readiness_snapshots (user_id, snapshot_date desc);

create or replace function public.keep_assessment_session_question_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.question_count is distinct from old.question_count then
    raise exception 'assessment session question_count is immutable'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

alter function public.keep_assessment_session_question_count() owner to postgres;
revoke all on function public.keep_assessment_session_question_count() from public;
revoke all on function public.keep_assessment_session_question_count() from anon;
revoke all on function public.keep_assessment_session_question_count() from authenticated;
revoke all on function public.keep_assessment_session_question_count() from service_role;

create trigger assessment_sessions_keep_question_count
before update of question_count on public.assessment_sessions
for each row execute function public.keep_assessment_session_question_count();

alter table public.assessment_sessions enable row level security;
alter table public.assessment_session_answers enable row level security;
alter table public.exam_readiness_evidence_state enable row level security;
alter table public.exam_readiness_evidence_events enable row level security;
alter table public.exam_readiness_recalculation_jobs enable row level security;
alter table public.exam_readiness_current enable row level security;
alter table public.exam_readiness_snapshots enable row level security;

revoke all on table public.assessment_sessions from public;
revoke all on table public.assessment_sessions from anon;
revoke all on table public.assessment_sessions from authenticated;
grant select, insert, update, delete on table public.assessment_sessions to service_role;

revoke all on table public.assessment_session_answers from public;
revoke all on table public.assessment_session_answers from anon;
revoke all on table public.assessment_session_answers from authenticated;
grant select, insert, update, delete on table public.assessment_session_answers to service_role;

revoke all on table public.exam_readiness_evidence_state from public;
revoke all on table public.exam_readiness_evidence_state from anon;
revoke all on table public.exam_readiness_evidence_state from authenticated;
grant select, insert, update, delete on table public.exam_readiness_evidence_state to service_role;

revoke all on table public.exam_readiness_evidence_events from public;
revoke all on table public.exam_readiness_evidence_events from anon;
revoke all on table public.exam_readiness_evidence_events from authenticated;
grant select, insert, update, delete on table public.exam_readiness_evidence_events to service_role;

revoke all on table public.exam_readiness_recalculation_jobs from public;
revoke all on table public.exam_readiness_recalculation_jobs from anon;
revoke all on table public.exam_readiness_recalculation_jobs from authenticated;
grant select, insert, update, delete on table public.exam_readiness_recalculation_jobs to service_role;

revoke all on table public.exam_readiness_current from public;
revoke all on table public.exam_readiness_current from anon;
revoke all on table public.exam_readiness_current from authenticated;
grant select, insert, update, delete on table public.exam_readiness_current to service_role;

revoke all on table public.exam_readiness_snapshots from public;
revoke all on table public.exam_readiness_snapshots from anon;
revoke all on table public.exam_readiness_snapshots from authenticated;
grant select, insert, update, delete on table public.exam_readiness_snapshots to service_role;

create or replace function public.register_exam_readiness_evidence(
  p_user_id uuid,
  p_event_key text
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_revision bigint;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;
  if p_event_key is null or length(btrim(p_event_key)) = 0 then
    raise exception 'p_event_key is required' using errcode = '22023';
  end if;

  insert into public.exam_readiness_evidence_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select revision
  into v_revision
  from public.exam_readiness_evidence_state
  where user_id = p_user_id
  for update;

  if exists (
    select 1
    from public.exam_readiness_evidence_events
    where user_id = p_user_id
      and event_key = p_event_key
  ) then
    return v_revision;
  end if;

  v_revision := v_revision + 1;

  insert into public.exam_readiness_evidence_events (
    user_id,
    event_key,
    revision
  ) values (
    p_user_id,
    p_event_key,
    v_revision
  )
  on conflict (user_id, event_key) do nothing;

  update public.exam_readiness_evidence_state
  set revision = v_revision,
      updated_at = statement_timestamp()
  where user_id = p_user_id;

  return v_revision;
end;
$$;

alter function public.register_exam_readiness_evidence(uuid, text) owner to postgres;
revoke all on function public.register_exam_readiness_evidence(uuid, text) from public;
revoke all on function public.register_exam_readiness_evidence(uuid, text) from anon;
revoke all on function public.register_exam_readiness_evidence(uuid, text) from authenticated;
revoke all on function public.register_exam_readiness_evidence(uuid, text) from service_role;
grant execute on function public.register_exam_readiness_evidence(uuid, text) to service_role;

create or replace function public.claim_exam_readiness_recalculation(
  p_user_id uuid,
  p_trigger_type text,
  p_trigger_id text,
  p_model_version text,
  p_exam_scheme_version text,
  p_lease_seconds integer
)
returns setof public.exam_readiness_recalculation_jobs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.exam_readiness_evidence_state%rowtype;
  v_job public.exam_readiness_recalculation_jobs%rowtype;
  v_now timestamptz := statement_timestamp();
  v_lease_expires_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;
  if p_trigger_type is null or length(btrim(p_trigger_type)) = 0
    or p_trigger_id is null or length(btrim(p_trigger_id)) = 0
    or p_model_version is null or length(btrim(p_model_version)) = 0
    or p_exam_scheme_version is null or length(btrim(p_exam_scheme_version)) = 0 then
    raise exception 'recalculation trigger and version values are required'
      using errcode = '22023';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 1 or p_lease_seconds > 3600 then
    raise exception 'p_lease_seconds must be between 1 and 3600'
      using errcode = '22023';
  end if;

  v_lease_expires_at := v_now + make_interval(secs => p_lease_seconds);

  insert into public.exam_readiness_evidence_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_state
  from public.exam_readiness_evidence_state
  where user_id = p_user_id
  for update;

  select *
  into v_job
  from public.exam_readiness_recalculation_jobs
  where user_id = p_user_id
    and trigger_type = p_trigger_type
    and trigger_id = p_trigger_id
    and model_version = p_model_version
    and exam_scheme_version = p_exam_scheme_version
  for update;

  if found and v_job.status = 'succeeded' then
    return next v_job;
    return;
  end if;

  if v_state.lease_job_id is not null
    and v_state.lease_expires_at > v_now then
    return;
  end if;

  insert into public.exam_readiness_recalculation_jobs (
    user_id,
    trigger_type,
    trigger_id,
    model_version,
    exam_scheme_version,
    status,
    evidence_revision,
    attempt_count,
    lease_expires_at,
    started_at,
    updated_at
  ) values (
    p_user_id,
    p_trigger_type,
    p_trigger_id,
    p_model_version,
    p_exam_scheme_version,
    'processing',
    v_state.revision,
    1,
    v_lease_expires_at,
    v_now,
    v_now
  )
  on conflict (user_id, trigger_type, trigger_id, model_version, exam_scheme_version)
  do update
  set status = 'processing',
      evidence_revision = excluded.evidence_revision,
      attempt_count = exam_readiness_recalculation_jobs.attempt_count + 1,
      lease_expires_at = excluded.lease_expires_at,
      error_code = null,
      result = null,
      started_at = excluded.started_at,
      completed_at = null,
      updated_at = excluded.updated_at
  where exam_readiness_recalculation_jobs.status = 'failed'
    or (
      exam_readiness_recalculation_jobs.status = 'processing'
      and exam_readiness_recalculation_jobs.lease_expires_at <= statement_timestamp()
    )
  returning * into v_job;

  if not found then
    return;
  end if;

  update public.exam_readiness_evidence_state
  set lease_job_id = v_job.job_id,
      lease_expires_at = v_job.lease_expires_at,
      updated_at = v_now
  where user_id = p_user_id;

  return next v_job;
end;
$$;

alter function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) owner to postgres;
revoke all on function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) from public;
revoke all on function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) from anon;
revoke all on function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) from authenticated;
revoke all on function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) from service_role;
grant execute on function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) to service_role;

create or replace function public.complete_exam_readiness_recalculation(
  p_job_id uuid,
  p_expected_evidence_revision bigint,
  p_expected_attempt integer,
  p_result jsonb
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_job public.exam_readiness_recalculation_jobs%rowtype;
  v_state public.exam_readiness_evidence_state%rowtype;
  v_revision bigint;
  v_result jsonb;
  v_calculation_reference_time timestamptz;
  v_calculated_at timestamptz;
  v_valid_until timestamptz;
  v_snapshot_date date;
begin
  if p_job_id is null or p_expected_evidence_revision is null
    or p_expected_attempt is null or p_result is null
    or jsonb_typeof(p_result) <> 'object' then
    raise exception 'job, revision, attempt, and object result are required'
      using errcode = '22023';
  end if;

  select user_id
  into v_user_id
  from public.exam_readiness_recalculation_jobs
  where job_id = p_job_id;

  if not found then
    raise exception 'recalculation job not found' using errcode = 'P0002';
  end if;

  select *
  into v_state
  from public.exam_readiness_evidence_state
  where user_id = v_user_id
  for update;

  select *
  into v_job
  from public.exam_readiness_recalculation_jobs
  where job_id = p_job_id
  for update;

  if v_job.status <> 'processing'
    or v_job.attempt_count <> p_expected_attempt
    or v_job.lease_expires_at <= statement_timestamp()
    or v_state.lease_job_id is distinct from v_job.job_id
    or v_state.lease_expires_at is distinct from v_job.lease_expires_at then
    return 'stale';
  end if;

  v_revision := v_state.revision;
  if v_revision <> p_expected_evidence_revision then
    update public.exam_readiness_recalculation_jobs
    set status = 'failed',
        lease_expires_at = null,
        error_code = 'stale_evidence',
        completed_at = statement_timestamp(),
        updated_at = statement_timestamp()
    where job_id = p_job_id
      and attempt_count = p_expected_attempt;

    update public.exam_readiness_evidence_state
    set lease_job_id = null,
        lease_expires_at = null,
        updated_at = statement_timestamp()
    where user_id = v_job.user_id
      and lease_job_id = p_job_id;

    return 'stale';
  end if;

  if v_job.evidence_revision <> p_expected_evidence_revision then
    raise exception 'expected evidence revision does not match claimed revision'
      using errcode = '22023';
  end if;
  if p_result ->> 'modelVersion' is distinct from v_job.model_version
    or p_result ->> 'examSchemeVersion' is distinct from v_job.exam_scheme_version then
    raise exception 'result versions do not match claimed versions'
      using errcode = '22023';
  end if;

  begin
    v_calculation_reference_time :=
      nullif(p_result ->> 'calculationReferenceTime', '')::timestamptz;
    v_calculated_at := nullif(p_result ->> 'calculatedAt', '')::timestamptz;
    v_valid_until := nullif(p_result ->> 'validUntil', '')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow then
    raise exception 'result timestamps are invalid' using errcode = '22007';
  end;

  if v_calculation_reference_time is null or v_calculated_at is null then
    raise exception 'calculationReferenceTime and calculatedAt are required'
      using errcode = '22023';
  end if;
  if v_valid_until is not null and v_valid_until <= v_calculation_reference_time then
    raise exception 'validUntil must be later than calculationReferenceTime'
      using errcode = '22023';
  end if;

  v_snapshot_date := (v_calculated_at at time zone 'Asia/Tokyo')::date;
  v_result := jsonb_set(
    p_result,
    '{snapshotDate}',
    to_jsonb(v_snapshot_date::text),
    true
  );

  insert into public.exam_readiness_current (
    user_id,
    evidence_revision,
    model_version,
    exam_scheme_version,
    result,
    calculation_reference_time,
    calculated_at,
    valid_until,
    updated_at
  ) values (
    v_job.user_id,
    p_expected_evidence_revision,
    v_job.model_version,
    v_job.exam_scheme_version,
    v_result,
    v_calculation_reference_time,
    v_calculated_at,
    v_valid_until,
    statement_timestamp()
  )
  on conflict (user_id) do update
  set evidence_revision = excluded.evidence_revision,
      model_version = excluded.model_version,
      exam_scheme_version = excluded.exam_scheme_version,
      result = excluded.result,
      calculation_reference_time = excluded.calculation_reference_time,
      calculated_at = excluded.calculated_at,
      valid_until = excluded.valid_until,
      updated_at = excluded.updated_at;

  insert into public.exam_readiness_snapshots (
    user_id,
    snapshot_date,
    model_version,
    exam_scheme_version,
    evidence_revision,
    result,
    calculation_reference_time,
    calculated_at,
    valid_until,
    updated_at
  ) values (
    v_job.user_id,
    v_snapshot_date,
    v_job.model_version,
    v_job.exam_scheme_version,
    p_expected_evidence_revision,
    v_result,
    v_calculation_reference_time,
    v_calculated_at,
    v_valid_until,
    statement_timestamp()
  )
  on conflict (user_id, snapshot_date, model_version, exam_scheme_version) do update
  set evidence_revision = excluded.evidence_revision,
      result = excluded.result,
      calculation_reference_time = excluded.calculation_reference_time,
      calculated_at = excluded.calculated_at,
      valid_until = excluded.valid_until,
      updated_at = excluded.updated_at;

  update public.exam_readiness_recalculation_jobs
  set status = 'succeeded',
      lease_expires_at = null,
      error_code = null,
      result = v_result,
      completed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where job_id = p_job_id
    and attempt_count = p_expected_attempt;

  update public.exam_readiness_evidence_state
  set lease_job_id = null,
      lease_expires_at = null,
      updated_at = statement_timestamp()
  where user_id = v_job.user_id
    and lease_job_id = p_job_id;

  return 'saved';
end;
$$;

alter function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) owner to postgres;
revoke all on function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) from public;
revoke all on function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) from anon;
revoke all on function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) from authenticated;
revoke all on function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) from service_role;
grant execute on function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) to service_role;

create or replace function public.fail_exam_readiness_recalculation(
  p_job_id uuid,
  p_expected_attempt integer,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_job public.exam_readiness_recalculation_jobs%rowtype;
  v_state public.exam_readiness_evidence_state%rowtype;
begin
  if p_job_id is null or p_expected_attempt is null then
    raise exception 'p_job_id and p_expected_attempt are required'
      using errcode = '22023';
  end if;

  select user_id
  into v_user_id
  from public.exam_readiness_recalculation_jobs
  where job_id = p_job_id;

  if not found then
    return;
  end if;

  select *
  into v_state
  from public.exam_readiness_evidence_state
  where user_id = v_user_id
  for update;

  select *
  into v_job
  from public.exam_readiness_recalculation_jobs
  where job_id = p_job_id
  for update;

  if v_job.status <> 'processing'
    or v_job.attempt_count <> p_expected_attempt
    or v_job.lease_expires_at <= statement_timestamp()
    or v_state.lease_job_id is distinct from v_job.job_id
    or v_state.lease_expires_at is distinct from v_job.lease_expires_at then
    return;
  end if;

  update public.exam_readiness_recalculation_jobs
  set status = 'failed',
      lease_expires_at = null,
      error_code = nullif(p_error_code, ''),
      completed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where job_id = p_job_id
    and attempt_count = p_expected_attempt;

  update public.exam_readiness_evidence_state
  set lease_job_id = null,
      lease_expires_at = null,
      updated_at = statement_timestamp()
  where user_id = v_job.user_id
    and lease_job_id = p_job_id;
end;
$$;

alter function public.fail_exam_readiness_recalculation(uuid, integer, text) owner to postgres;
revoke all on function public.fail_exam_readiness_recalculation(uuid, integer, text) from public;
revoke all on function public.fail_exam_readiness_recalculation(uuid, integer, text) from anon;
revoke all on function public.fail_exam_readiness_recalculation(uuid, integer, text) from authenticated;
revoke all on function public.fail_exam_readiness_recalculation(uuid, integer, text) from service_role;
grant execute on function public.fail_exam_readiness_recalculation(uuid, integer, text) to service_role;

-- Preserve the P1-1 recorder contract and add exactly one stable evidence event
-- for the sorted answer facts in a batch that inserted at least one row.
create or replace function public.record_question_attempts_with_exposure(
  p_user_id uuid,
  p_attempts jsonb
)
returns table (
  question_id text,
  state text,
  attempted_before boolean,
  first_attempt_at timestamptz,
  attempt_count bigint,
  saved boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;
  if p_attempts is null
    or jsonb_typeof(p_attempts) <> 'array'
    or jsonb_array_length(p_attempts) = 0 then
    raise exception 'p_attempts must be a non-empty JSON array' using errcode = '22023';
  end if;

  create temporary table if not exists question_exposure_input (
    ordinal bigint not null,
    question_id text primary key,
    question_type text not null,
    topic_id text not null,
    selected_answer text,
    is_correct boolean not null,
    mistake_reason text,
    answered_at timestamptz not null,
    time_spent_seconds integer,
    source_task_id uuid,
    question_origin text,
    question_version integer,
    exam_year integer,
    attempt_mode text,
    official_exam_field text,
    attempt_group_id text
  ) on commit drop;
  truncate table pg_temp.question_exposure_input;

  insert into pg_temp.question_exposure_input (
    ordinal,
    question_id,
    question_type,
    topic_id,
    selected_answer,
    is_correct,
    mistake_reason,
    answered_at,
    time_spent_seconds,
    source_task_id,
    question_origin,
    question_version,
    exam_year,
    attempt_mode,
    official_exam_field,
    attempt_group_id
  )
  select distinct on (parsed.question_id)
    parsed.ordinal,
    parsed.question_id,
    parsed.question_type,
    parsed.topic_id,
    parsed.selected_answer,
    parsed.is_correct,
    parsed.mistake_reason,
    parsed.answered_at,
    parsed.time_spent_seconds,
    parsed.source_task_id,
    parsed.question_origin,
    parsed.question_version,
    parsed.exam_year,
    parsed.attempt_mode,
    parsed.official_exam_field,
    parsed.attempt_group_id
  from (
    select
      item.ordinality as ordinal,
      nullif(item.value ->> 'question_id', '') as question_id,
      nullif(item.value ->> 'question_type', '') as question_type,
      nullif(item.value ->> 'topic_id', '') as topic_id,
      item.value ->> 'selected_answer' as selected_answer,
      (item.value ->> 'is_correct')::boolean as is_correct,
      item.value ->> 'mistake_reason' as mistake_reason,
      coalesce(
        nullif(item.value ->> 'answered_at', '')::timestamptz,
        statement_timestamp()
      ) as answered_at,
      nullif(item.value ->> 'time_spent_seconds', '')::integer as time_spent_seconds,
      nullif(item.value ->> 'source_task_id', '')::uuid as source_task_id,
      item.value ->> 'question_origin' as question_origin,
      nullif(item.value ->> 'question_version', '')::integer as question_version,
      nullif(item.value ->> 'exam_year', '')::integer as exam_year,
      item.value ->> 'attempt_mode' as attempt_mode,
      item.value ->> 'official_exam_field' as official_exam_field,
      item.value ->> 'attempt_group_id' as attempt_group_id
    from jsonb_array_elements(p_attempts) with ordinality as item(value, ordinality)
  ) parsed
  where parsed.question_id is not null
    and parsed.question_type is not null
    and parsed.topic_id is not null
    and parsed.is_correct is not null
  order by parsed.question_id, parsed.ordinal;

  if not exists (select 1 from pg_temp.question_exposure_input) then
    raise exception 'p_attempts contained no valid attempts' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('question-exposure-user' || chr(31) || p_user_id::text, 0)
  );

  create temporary table if not exists question_exposure_before (
    question_id text primary key,
    attempted_before boolean not null,
    first_attempt_at timestamptz,
    attempt_count bigint not null
  ) on commit drop;
  truncate table pg_temp.question_exposure_before;

  insert into pg_temp.question_exposure_before (
    question_id,
    attempted_before,
    first_attempt_at,
    attempt_count
  )
  select
    input.question_id,
    count(fact.question_id) > 0,
    min(fact.answered_at),
    count(fact.question_id)
  from pg_temp.question_exposure_input input
  left join (
    select distinct
      history.question_id,
      history.answered_at,
      history.selected_answer,
      history.is_correct
    from (
      select
        qa.question_id,
        qa.answered_at,
        qa.selected_answer,
        qa.is_correct
      from public.question_attempts qa
      where qa.user_id = p_user_id
        and qa.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
      union all
      select
        ua.question_id,
        ua.answered_at,
        ua.selected_choice as selected_answer,
        ua.is_correct
      from public.user_answers ua
      where ua.user_id = p_user_id
        and ua.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
    ) history
  ) fact on fact.question_id = input.question_id
  group by input.question_id;

  create temporary table if not exists question_exposure_inserted (
    question_id text primary key,
    is_first_attempt boolean not null
  ) on commit drop;
  truncate table pg_temp.question_exposure_inserted;

  with inserted as (
    insert into public.question_attempts (
      user_id,
      question_id,
      question_type,
      topic_id,
      selected_answer,
      is_correct,
      mistake_reason,
      answered_at,
      time_spent_seconds,
      source_task_id,
      question_origin,
      question_version,
      exam_year,
      attempt_mode,
      official_exam_field,
      attempt_group_id,
      is_first_attempt
    )
    select
      p_user_id,
      input.question_id,
      input.question_type,
      input.topic_id,
      input.selected_answer,
      input.is_correct,
      input.mistake_reason,
      input.answered_at,
      input.time_spent_seconds,
      input.source_task_id,
      input.question_origin,
      input.question_version,
      input.exam_year,
      input.attempt_mode,
      input.official_exam_field,
      input.attempt_group_id,
      not before.attempted_before
    from pg_temp.question_exposure_input input
    join pg_temp.question_exposure_before before using (question_id)
    on conflict do nothing
    returning question_attempts.question_id, question_attempts.is_first_attempt
  )
  insert into pg_temp.question_exposure_inserted (question_id, is_first_attempt)
  select inserted.question_id, inserted.is_first_attempt
  from inserted;

  if exists (select 1 from pg_temp.question_exposure_inserted) then
    perform public.register_exam_readiness_evidence(
      p_user_id,
      (
        select 'question-attempt-batch:' || md5(
          string_agg(
            jsonb_build_object(
              'questionId', input.question_id,
              'questionType', input.question_type,
              'topicId', input.topic_id,
              'selectedAnswer', input.selected_answer,
              'isCorrect', input.is_correct,
              'answeredAtEpochMicros',
                floor(extract(epoch from input.answered_at) * 1000000)::bigint,
              'questionVersion', input.question_version,
              'attemptGroupId', input.attempt_group_id
            )::text,
            chr(30)
            order by input.question_id
          )
        )
        from pg_temp.question_exposure_input input
        join pg_temp.question_exposure_inserted inserted using (question_id)
      )
    );
  end if;

  return query
  with current_facts as (
    select distinct
      history.question_id,
      history.answered_at,
      history.selected_answer,
      history.is_correct
    from (
      select
        qa.question_id,
        qa.answered_at,
        qa.selected_answer,
        qa.is_correct
      from public.question_attempts qa
      where qa.user_id = p_user_id
        and qa.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
      union all
      select
        ua.question_id,
        ua.answered_at,
        ua.selected_choice as selected_answer,
        ua.is_correct
      from public.user_answers ua
      where ua.user_id = p_user_id
        and ua.question_id in (
          select exposure_input.question_id
          from pg_temp.question_exposure_input exposure_input
        )
    ) history
  ), current_totals as (
    select
      input.question_id,
      min(fact.answered_at) as first_attempt_at,
      count(fact.question_id) as attempt_count
    from pg_temp.question_exposure_input input
    left join current_facts fact using (question_id)
    group by input.question_id
  )
  select
    input.question_id,
    case
      when before.attempted_before then 'seen'
      when coalesce(inserted.is_first_attempt, false) then 'first'
      else 'seen'
    end as state,
    before.attempted_before,
    totals.first_attempt_at,
    totals.attempt_count,
    inserted.question_id is not null as saved
  from pg_temp.question_exposure_input input
  join pg_temp.question_exposure_before before using (question_id)
  join current_totals totals using (question_id)
  left join pg_temp.question_exposure_inserted inserted using (question_id)
  order by input.ordinal;
end;
$$;

alter function public.record_question_attempts_with_exposure(uuid, jsonb) owner to postgres;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb) from public;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb) from anon;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb) from authenticated;
revoke all on function public.record_question_attempts_with_exposure(uuid, jsonb) from service_role;
grant execute on function public.record_question_attempts_with_exposure(uuid, jsonb) to service_role;

comment on function public.register_exam_readiness_evidence(uuid, text) is
  'Advances a user evidence revision once for each stable event key.';
comment on function public.claim_exam_readiness_recalculation(uuid, text, text, text, text, integer) is
  'Claims or reclaims one versioned trigger row under the per-user calculation lease.';
comment on function public.complete_exam_readiness_recalculation(uuid, bigint, integer, jsonb) is
  'Fences by attempt and evidence revision, then atomically saves current and Tokyo-dated snapshot state.';
comment on function public.fail_exam_readiness_recalculation(uuid, integer, text) is
  'Fails only the matching live attempt; superseded worker failures are no-ops.';
comment on function public.record_question_attempts_with_exposure(uuid, jsonb) is
  'Records P1-1 exposure facts and registers one deterministic evidence event per newly inserted batch.';
