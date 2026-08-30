-- GENERATED SNAPSHOT — DO NOT EDIT OR APPLY MANUALLY.
-- Source of truth: supabase/migrations.
-- Regenerate from a local database rebuilt from the active migrations with:
-- scripts/generate-supabase-schema.sh

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."admin_dashboard_summary"("p_today_start" timestamp with time zone, "p_user_limit" integer DEFAULT 50, "p_user_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with
  overview as (
    select
      (select count(*) from line_users) as total_users,
      (select count(*) from user_profiles where exam_date is not null) as exam_date_users,
      (select count(distinct user_id) from user_answers where answered_at >= p_today_start) as today_study_users,
      (select count(*) from user_answers where answered_at >= p_today_start) as today_answers,
      (
        select count(*) from user_progress
        where jsonb_array_length(coalesce(review_queue, '[]'::jsonb)) > 0
      ) as review_queue_users
  ),
  accuracy as (
    select
      count(*) as total_answers,
      count(*) filter (where is_correct) as correct_answers
    from user_answers
  ),
  topic_mastery as (
    select jsonb_agg(
      jsonb_build_object(
        'topicId', topic_id,
        'learners', learners,
        'avgMastery', avg_mastery
      )
      order by topic_id
    ) as value
    from (
      select
        entry.key as topic_id,
        count(*)::integer as learners,
        round(avg((entry.value #>> '{}')::numeric))::integer as avg_mastery
      from user_progress progress
      cross join lateral jsonb_each(coalesce(progress.topic_mastery, '{}'::jsonb)) entry
      where jsonb_typeof(entry.value) = 'number'
      group by entry.key
    ) aggregates
  ),
  weak_fields as (
    select jsonb_agg(jsonb_build_object('field', field, 'count', count) order by field) as value
    from (
      select field, count(*)::integer as count
      from user_profiles profile
      cross join lateral unnest(coalesce(profile.weak_fields, '{}'::text[])) field
      group by field
    ) aggregates
  ),
  weak_tags as (
    select jsonb_agg(jsonb_build_object('tag', tag, 'count', count) order by count desc, tag) as value
    from (
      select tag, count(*)::integer as count
      from user_answers
      where not is_correct and tag is not null and tag <> ''
      group by tag
    ) aggregates
  ),
  recent_answers as (
    select jsonb_agg(
      jsonb_build_object(
        'userId', user_id,
        'displayName', display_name,
        'topicId', topic_id,
        'tag', tag,
        'isCorrect', is_correct,
        'answeredAt', answered_at
      ) order by answered_at desc
    ) as value
    from (
      select
        answer.user_id,
        coalesce(
          nullif(trim(user_row.display_name), ''),
          nullif(trim(user_row.email), ''),
          nullif(left(user_row.line_user_id, 8), ''),
          left(user_row.id::text, 8)
        ) as display_name,
        answer.topic_id,
        answer.tag,
        answer.is_correct,
        answer.answered_at
      from user_answers answer
      join line_users user_row on user_row.id = answer.user_id
      order by answer.answered_at desc
      limit 30
    ) rows
  ),
  users as (
    select jsonb_agg(
      jsonb_build_object(
        'userId', id,
        'lineUserId', line_user_id,
        'displayName', display_name,
        'examDate', exam_date,
        'completedTopics', completed_topics,
        'reviewQueue', review_queue,
        'exp', exp,
        'level', level,
        'streakCount', streak_count,
        'lastPlayedAt', last_played_at,
        'createdAt', created_at
      ) order by last_played_at desc nulls last, created_at desc
    ) as value
    from (
      select
        user_row.id,
        user_row.line_user_id,
        coalesce(
          nullif(trim(user_row.display_name), ''),
          nullif(trim(user_row.email), ''),
          nullif(left(user_row.line_user_id, 8), ''),
          left(user_row.id::text, 8)
        ) as display_name,
        profile.exam_date,
        coalesce(array_length(progress.completed_topics, 1), 0) as completed_topics,
        jsonb_array_length(coalesce(progress.review_queue, '[]'::jsonb)) as review_queue,
        coalesce(progress.exp, 0) as exp,
        coalesce(progress.level, 0) as level,
        coalesce(progress.streak_count, 0) as streak_count,
        progress.last_played_at,
        user_row.created_at
      from line_users user_row
      left join user_profiles profile on profile.user_id = user_row.id
      left join user_progress progress on progress.user_id = user_row.id
      order by progress.last_played_at desc nulls last, user_row.created_at desc
      limit greatest(1, least(p_user_limit, 100))
      offset greatest(0, p_user_offset)
    ) rows
  )
  select jsonb_build_object(
    'overview', jsonb_build_object(
      'totalUsers', overview.total_users,
      'examDateUsers', overview.exam_date_users,
      'todayStudyUsers', overview.today_study_users,
      'todayAnswers', overview.today_answers,
      'reviewQueueUsers', overview.review_queue_users
    ),
    'accuracy', jsonb_build_object(
      'totalAnswers', accuracy.total_answers,
      'correctAnswers', accuracy.correct_answers
    ),
    'topicMastery', coalesce(topic_mastery.value, '[]'::jsonb),
    'weakFields', coalesce(weak_fields.value, '[]'::jsonb),
    'weakTagRanking', coalesce(weak_tags.value, '[]'::jsonb),
    'recentAnswers', coalesce(recent_answers.value, '[]'::jsonb),
    'users', coalesce(users.value, '[]'::jsonb)
  )
  from overview, accuracy, topic_mastery, weak_fields, weak_tags, recent_answers, users;
$$;


ALTER FUNCTION "public"."admin_dashboard_summary"("p_today_start" timestamp with time zone, "p_user_limit" integer, "p_user_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_one_time_purchase"("p_user_id" "uuid", "p_plan_key" "text", "p_months" integer, "p_amount_total" integer, "p_currency" "text", "p_stripe_checkout_session_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
begin
  insert into public.billing_purchases (
    user_id,
    kind,
    plan_key,
    months,
    amount_total,
    currency,
    stripe_checkout_session_id,
    stripe_payment_intent_id
  ) values (
    p_user_id,
    'one_time',
    p_plan_key,
    p_months,
    p_amount_total,
    p_currency,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id
  )
  on conflict (stripe_checkout_session_id) do nothing;

  if not found then
    return false;
  end if;

  perform 1
    from public.user_profiles
    where user_id = p_user_id
    for update;

  insert into public.user_profiles (
    user_id,
    pro_until,
    plan_updated_at,
    stripe_customer_id
  ) values (
    p_user_id,
    now() + make_interval(months => p_months),
    now(),
    p_stripe_customer_id
  )
  on conflict (user_id) do update
  set pro_until = greatest(
        now(),
        coalesce(public.user_profiles.pro_until, now())
      ) + make_interval(months => p_months),
      plan_updated_at = now(),
      stripe_customer_id = coalesce(
        excluded.stripe_customer_id,
        public.user_profiles.stripe_customer_id
      );

  return true;
end;
$$;


ALTER FUNCTION "public"."apply_one_time_purchase"("p_user_id" "uuid", "p_plan_key" "text", "p_months" integer, "p_amount_total" integer, "p_currency" "text", "p_stripe_checkout_session_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."exam_readiness_recalculation_jobs" (
    "job_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_id" "text" NOT NULL,
    "model_version" "text" NOT NULL,
    "exam_scheme_version" "text" NOT NULL,
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "evidence_revision" bigint NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "lease_expires_at" timestamp with time zone,
    "error_code" "text",
    "result" "jsonb",
    "started_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "exam_readiness_recalculation_jobs_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "exam_readiness_recalculation_jobs_evidence_revision_check" CHECK (("evidence_revision" >= 0)),
    CONSTRAINT "exam_readiness_recalculation_jobs_exam_scheme_version_check" CHECK (("length"("exam_scheme_version") > 0)),
    CONSTRAINT "exam_readiness_recalculation_jobs_model_version_check" CHECK (("length"("model_version") > 0)),
    CONSTRAINT "exam_readiness_recalculation_jobs_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'succeeded'::"text", 'failed'::"text"]))),
    CONSTRAINT "exam_readiness_recalculation_jobs_trigger_id_check" CHECK (("length"("trigger_id") > 0)),
    CONSTRAINT "exam_readiness_recalculation_jobs_trigger_type_check" CHECK (("length"("trigger_type") > 0))
);


ALTER TABLE "public"."exam_readiness_recalculation_jobs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_exam_readiness_recalculation"("p_user_id" "uuid", "p_trigger_type" "text", "p_trigger_id" "text", "p_model_version" "text", "p_exam_scheme_version" "text", "p_lease_seconds" integer) RETURNS SETOF "public"."exam_readiness_recalculation_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_state public.exam_readiness_evidence_state%rowtype;
  v_job public.exam_readiness_recalculation_jobs%rowtype;
  v_now timestamptz;
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

  -- Capture wall-clock time only after every lease-protecting lock is held.
  -- statement_timestamp() would be frozen before any lock wait.
  v_now := clock_timestamp();
  v_lease_expires_at := v_now + make_interval(secs => p_lease_seconds);

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
      and exam_readiness_recalculation_jobs.lease_expires_at <= v_now
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


ALTER FUNCTION "public"."claim_exam_readiness_recalculation"("p_user_id" "uuid", "p_trigger_type" "text", "p_trigger_id" "text", "p_model_version" "text", "p_exam_scheme_version" "text", "p_lease_seconds" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_exam_readiness_recalculation"("p_user_id" "uuid", "p_trigger_type" "text", "p_trigger_id" "text", "p_model_version" "text", "p_exam_scheme_version" "text", "p_lease_seconds" integer) IS 'Claims or reclaims one versioned trigger row under the per-user calculation lease.';



CREATE OR REPLACE FUNCTION "public"."complete_assessment_session"("p_user_id" "uuid", "p_session_id" "uuid", "p_completed_at" timestamp with time zone, "p_answers" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_session public.assessment_sessions%rowtype;
  v_answer jsonb;
  v_answered_count integer;
  v_correct_count integer;
  v_first_count integer;
  v_seen_count integer;
  v_unknown_count integer;
begin
  if p_user_id is null or p_session_id is null or p_completed_at is null then
    raise exception 'assessment session identity and completion time are required'
      using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'assessment session answers must be an array'
      using errcode = '22023';
  end if;

  select session.*
  into v_session
  from public.assessment_sessions session
  where session.user_id = p_user_id
    and session.session_id = p_session_id
  for update;

  if not found then
    raise exception 'assessment session not found' using errcode = 'P0002';
  end if;
  if p_completed_at < v_session.started_at then
    raise exception 'assessment completion precedes start' using errcode = '22023';
  end if;

  for v_answer in select value from jsonb_array_elements(p_answers)
  loop
    if jsonb_typeof(v_answer) <> 'object'
      or (select count(*) from jsonb_object_keys(v_answer)) <> 7
      or not (
        v_answer ? 'idempotency_key'
        and v_answer ? 'canonical_question_id'
        and v_answer ? 'topic_id'
        and v_answer ? 'field_id'
        and v_answer ? 'is_correct'
        and v_answer ? 'first_attempt_state'
        and v_answer ? 'answered_at'
      )
      or jsonb_typeof(v_answer -> 'idempotency_key') <> 'string'
      or jsonb_typeof(v_answer -> 'canonical_question_id') <> 'string'
      or jsonb_typeof(v_answer -> 'topic_id') <> 'string'
      or jsonb_typeof(v_answer -> 'field_id') <> 'string'
      or jsonb_typeof(v_answer -> 'is_correct') <> 'boolean'
      or jsonb_typeof(v_answer -> 'first_attempt_state') <> 'string'
      or jsonb_typeof(v_answer -> 'answered_at') <> 'string'
      or length(btrim(v_answer ->> 'idempotency_key')) = 0
      or length(btrim(v_answer ->> 'canonical_question_id')) = 0
      or length(btrim(v_answer ->> 'topic_id')) = 0
      or length(btrim(v_answer ->> 'field_id')) = 0
      or (v_answer ->> 'first_attempt_state') not in ('first', 'seen', 'unknown') then
      raise exception 'invalid assessment session answer'
        using errcode = '22023';
    end if;

    -- Force timestamp parsing before any write so malformed payloads roll back cleanly.
    perform (v_answer ->> 'answered_at')::timestamptz;
  end loop;

  if jsonb_array_length(p_answers) > v_session.question_count then
    raise exception 'assessment answers exceed immutable question count'
      using errcode = '22023';
  end if;
  if (
    select count(*) <> count(distinct answer.idempotency_key)
      or count(*) <> count(distinct answer.canonical_question_id)
    from jsonb_to_recordset(p_answers) as answer(
      idempotency_key text,
      canonical_question_id text
    )
  ) then
    raise exception 'assessment answers contain duplicate identities'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(*) filter (where is_correct)::integer,
    count(*) filter (where first_attempt_state = 'first')::integer,
    count(*) filter (where first_attempt_state = 'seen')::integer,
    count(*) filter (where first_attempt_state = 'unknown')::integer
  into
    v_answered_count,
    v_correct_count,
    v_first_count,
    v_seen_count,
    v_unknown_count
  from jsonb_to_recordset(p_answers) as answer(
    is_correct boolean,
    first_attempt_state text
  );

  if v_session.status = 'completed' then
    if v_session.completed_at is distinct from p_completed_at
      or v_session.answered_count <> v_answered_count
      or v_session.correct_count <> v_correct_count
      or v_session.first_count <> v_first_count
      or v_session.seen_count <> v_seen_count
      or v_session.unknown_count <> v_unknown_count
      or exists (
        select 1
        from jsonb_to_recordset(p_answers) as answer(
          idempotency_key text,
          canonical_question_id text,
          topic_id text,
          field_id text,
          is_correct boolean,
          first_attempt_state text,
          answered_at timestamptz
        )
        where not exists (
          select 1
          from public.assessment_session_answers stored
          where stored.user_id = p_user_id
            and stored.session_id = p_session_id
            and stored.idempotency_key = answer.idempotency_key
            and stored.canonical_question_id = answer.canonical_question_id
            and stored.topic_id = answer.topic_id
            and stored.field_id = answer.field_id
            and stored.is_correct = answer.is_correct
            and stored.first_attempt_state = answer.first_attempt_state
            and stored.answered_at = answer.answered_at
        )
      ) then
      raise exception 'assessment session completion conflicts with stored facts'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'session', to_jsonb(v_session),
      'completed_now', false
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'assessment session is terminal' using errcode = '23505';
  end if;

  insert into public.assessment_session_answers (
    user_id,
    session_id,
    idempotency_key,
    canonical_question_id,
    topic_id,
    field_id,
    is_correct,
    first_attempt_state,
    answered_at
  )
  select
    p_user_id,
    p_session_id,
    answer.idempotency_key,
    answer.canonical_question_id,
    answer.topic_id,
    answer.field_id,
    answer.is_correct,
    answer.first_attempt_state,
    answer.answered_at
  from jsonb_to_recordset(p_answers) as answer(
    idempotency_key text,
    canonical_question_id text,
    topic_id text,
    field_id text,
    is_correct boolean,
    first_attempt_state text,
    answered_at timestamptz
  );

  update public.assessment_sessions
  set status = 'completed',
      completed_at = p_completed_at,
      answered_count = v_answered_count,
      correct_count = v_correct_count,
      first_count = v_first_count,
      seen_count = v_seen_count,
      unknown_count = v_unknown_count,
      updated_at = clock_timestamp()
  where user_id = p_user_id
    and session_id = p_session_id
    and status = 'in_progress'
  returning * into v_session;

  if not found then
    raise exception 'assessment session transition lost its lock'
      using errcode = '40001';
  end if;

  return jsonb_build_object(
    'session', to_jsonb(v_session),
    'completed_now', true
  );
end;
$$;


ALTER FUNCTION "public"."complete_assessment_session"("p_user_id" "uuid", "p_session_id" "uuid", "p_completed_at" timestamp with time zone, "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_evidence_revision" bigint, "p_expected_attempt" integer, "p_result" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
  v_now timestamptz;
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

  v_now := clock_timestamp();

  if v_job.status <> 'processing'
    or v_job.attempt_count <> p_expected_attempt
    or v_job.lease_expires_at <= v_now
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
        completed_at = v_now,
        updated_at = v_now
    where job_id = p_job_id
      and attempt_count = p_expected_attempt;

    update public.exam_readiness_evidence_state
    set lease_job_id = null,
        lease_expires_at = null,
        updated_at = v_now
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
    v_now
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
    v_now
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
      completed_at = v_now,
      updated_at = v_now
  where job_id = p_job_id
    and attempt_count = p_expected_attempt;

  update public.exam_readiness_evidence_state
  set lease_job_id = null,
      lease_expires_at = null,
      updated_at = v_now
  where user_id = v_job.user_id
    and lease_job_id = p_job_id;

  return 'saved';
end;
$$;


ALTER FUNCTION "public"."complete_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_evidence_revision" bigint, "p_expected_attempt" integer, "p_result" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_evidence_revision" bigint, "p_expected_attempt" integer, "p_result" "jsonb") IS 'Fences by attempt and evidence revision, then atomically saves current and Tokyo-dated snapshot state.';



CREATE OR REPLACE FUNCTION "public"."fail_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_attempt" integer, "p_error_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_user_id uuid;
  v_job public.exam_readiness_recalculation_jobs%rowtype;
  v_state public.exam_readiness_evidence_state%rowtype;
  v_now timestamptz;
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

  v_now := clock_timestamp();

  if v_job.status <> 'processing'
    or v_job.attempt_count <> p_expected_attempt
    or v_job.lease_expires_at <= v_now
    or v_state.lease_job_id is distinct from v_job.job_id
    or v_state.lease_expires_at is distinct from v_job.lease_expires_at then
    return;
  end if;

  update public.exam_readiness_recalculation_jobs
  set status = 'failed',
      lease_expires_at = null,
      error_code = nullif(p_error_code, ''),
      completed_at = v_now,
      updated_at = v_now
  where job_id = p_job_id
    and attempt_count = p_expected_attempt;

  update public.exam_readiness_evidence_state
  set lease_job_id = null,
      lease_expires_at = null,
      updated_at = v_now
  where user_id = v_job.user_id
    and lease_job_id = p_job_id;
end;
$$;


ALTER FUNCTION "public"."fail_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_attempt" integer, "p_error_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fail_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_attempt" integer, "p_error_code" "text") IS 'Fails only the matching live attempt; superseded worker failures are no-ops.';



CREATE OR REPLACE FUNCTION "public"."keep_assessment_session_question_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.question_count is distinct from old.question_count then
    raise exception 'assessment session question_count is immutable'
      using errcode = '22023';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."keep_assessment_session_question_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_question_exposure_answer_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended('question-exposure-user' || chr(31) || new.user_id::text, 0)
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."lock_question_exposure_answer_write"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lock_question_exposure_answer_write"() IS 'Serializes all persisted answer writers per user for first-attempt classification.';



CREATE OR REPLACE FUNCTION "public"."record_assessment_question_attempts_with_exposure"("p_user_id" "uuid", "p_session_id" "uuid", "p_attempts" "jsonb") RETURNS TABLE("question_id" "text", "state" "text", "attempted_before" boolean, "first_attempt_at" timestamp with time zone, "attempt_count" bigint, "saved" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_source text;
  v_mode text;
  v_status text;
  v_result record;
  v_attempt jsonb;
  v_persisted public.question_attempts%rowtype;
  v_receipt public.assessment_attempt_receipts%rowtype;
begin
  if p_user_id is null or p_session_id is null then
    raise exception 'assessment session identity is required'
      using errcode = '22023';
  end if;

  select source, mode, status
  into v_source, v_mode, v_status
  from public.assessment_sessions
  where user_id = p_user_id
    and session_id = p_session_id
  for update;

  if not found or v_status <> 'in_progress' then
    raise exception 'assessment session is not an owned in-progress recording target'
      using errcode = '23503';
  end if;

  if p_attempts is null
    or jsonb_typeof(p_attempts) <> 'array'
    or jsonb_array_length(p_attempts) = 0 then
    raise exception 'p_attempts must be a non-empty JSON array'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_attempts) as item(value)
    where jsonb_typeof(item.value) <> 'object'
      or nullif(item.value ->> 'question_id', '') is null
      or nullif(item.value ->> 'question_type', '') is null
      or nullif(item.value ->> 'topic_id', '') is null
      or jsonb_typeof(item.value -> 'is_correct') <> 'boolean'
  ) then
    raise exception 'p_attempts contained an invalid assessment attempt'
      using errcode = '22023';
  end if;

  if (
    select count(*) <> count(distinct item.value ->> 'question_id')
    from jsonb_array_elements(p_attempts) as item(value)
  ) then
    raise exception 'p_attempts contained duplicate assessment questions'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_attempts) as item(value)
    where item.value ->> 'attempt_group_id' is distinct from p_session_id::text
      or case item.value ->> 'question_type'
        when 'mini_exam' then 'checkpoint'
        when 'theme_exam' then 'summary'
        when 'mock_exam' then 'mock'
        when 'official_past' then 'official_past'
        else null
      end is distinct from v_source
      or (
        item.value ->> 'question_type' = 'official_past'
        and item.value ->> 'attempt_mode' is distinct from v_mode
      )
  ) then
    raise exception 'assessment attempt does not match its locked session'
      using errcode = '23503';
  end if;

  -- A receipt is the idempotency boundary for new writes. Existing historical
  -- duplicate rows have no receipt, so the migration never rewrites or rejects
  -- them. A retry must contain the exact caller-owned batch.
  if exists (
    select 1
    from jsonb_array_elements(p_attempts) as item(value)
    join public.assessment_attempt_receipts receipt
      on receipt.user_id = p_user_id
      and receipt.session_id = p_session_id
      and receipt.question_id = item.value ->> 'question_id'
  ) then
    for v_attempt in
      select item.value
      from jsonb_array_elements(p_attempts) with ordinality as item(value, ordinality)
      order by item.ordinality
    loop
      select receipt.* into v_receipt
      from public.assessment_attempt_receipts receipt
      where receipt.user_id = p_user_id
        and receipt.session_id = p_session_id
        and receipt.question_id = v_attempt ->> 'question_id';
      if not found then
        raise exception 'assessment attempt replay is missing a receipt'
          using errcode = '23505';
      end if;
      if v_receipt.payload is distinct from v_attempt then
        raise exception 'assessment attempt replay conflicts with stored facts'
          using errcode = '23505';
      end if;
      select attempt.* into v_persisted
      from public.question_attempts attempt
      where attempt.attempt_id = v_receipt.attempt_id;
      if not found then
        raise exception 'assessment attempt receipt lost its canonical row'
          using errcode = '40001';
      end if;
      question_id := v_receipt.question_id;
      state := case when v_persisted.is_first_attempt then 'first' else 'seen' end;
      attempted_before := not v_persisted.is_first_attempt;
      first_attempt_at := v_receipt.first_attempt_at;
      attempt_count := v_receipt.attempt_count;
      saved := false;
      return next;
    end loop;
    return;
  end if;

  -- The generic recorder remains the single P1-1 first-attempt authority. Its
  -- validation, advisory serialization, insert, and evidence registration all
  -- execute while this transaction still owns the assessment session row lock.
  for v_result in
    select recorder.*
    from public.record_question_attempts_with_exposure(
      p_user_id,
      p_attempts
    ) recorder
  loop
    select item.value
    into strict v_attempt
    from jsonb_array_elements(p_attempts) as item(value)
    where item.value ->> 'question_id' = v_result.question_id;

    select attempt.*
    into v_persisted
    from public.question_attempts attempt
    where attempt.user_id = p_user_id
      and attempt.attempt_group_id = p_session_id::text
      and attempt.question_id = v_result.question_id
      and attempt.question_version is not distinct from
        nullif(v_attempt ->> 'question_version', '')::integer
    order by attempt.answered_at desc, attempt.attempt_id desc
    limit 1;

    if not found then
      raise exception 'assessment attempt persistence lost its idempotent row'
        using errcode = '40001';
    end if;

    insert into public.assessment_attempt_receipts (
      user_id, session_id, question_id, attempt_id, payload,
      first_attempt_at, attempt_count
    ) values (
      p_user_id, p_session_id, v_result.question_id, v_persisted.attempt_id,
      v_attempt, v_result.first_attempt_at, v_result.attempt_count
    );

    question_id := v_result.question_id;
    state := case when v_persisted.is_first_attempt then 'first' else 'seen' end;
    attempted_before := not v_persisted.is_first_attempt;
    first_attempt_at := v_result.first_attempt_at;
    attempt_count := v_result.attempt_count;
    saved := v_result.saved;
    return next;
  end loop;
end;
$$;


ALTER FUNCTION "public"."record_assessment_question_attempts_with_exposure"("p_user_id" "uuid", "p_session_id" "uuid", "p_attempts" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_assessment_question_attempts_with_exposure"("p_user_id" "uuid", "p_session_id" "uuid", "p_attempts" "jsonb") IS 'Locks an owned in-progress assessment session, validates its batch, and records idempotent P1-1 exposure facts.';



CREATE OR REPLACE FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") RETURNS TABLE("question_id" "text", "state" "text", "attempted_before" boolean, "first_attempt_at" timestamp with time zone, "attempt_count" bigint, "saved" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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


ALTER FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") IS 'Records P1-1 exposure facts and registers one deterministic evidence event per newly inserted batch.';



CREATE OR REPLACE FUNCTION "public"."record_stripe_subscription_event"("p_stripe_subscription_id" "text", "p_stripe_customer_id" "text", "p_user_id" "uuid", "p_price_id" "text", "p_status" "text", "p_latest_event_created" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
begin
  insert into public.billing_subscriptions as subscription_state (
    stripe_subscription_id,
    stripe_customer_id,
    user_id,
    price_id,
    status,
    latest_event_created,
    updated_at
  ) values (
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_user_id,
    p_price_id,
    p_status,
    p_latest_event_created,
    now()
  )
  on conflict (stripe_subscription_id) do update
  set stripe_customer_id = excluded.stripe_customer_id,
      user_id = coalesce(excluded.user_id, subscription_state.user_id),
      price_id = coalesce(excluded.price_id, subscription_state.price_id),
      status = excluded.status,
      latest_event_created = excluded.latest_event_created,
      updated_at = now()
  where coalesce(subscription_state.latest_event_created, -1) <= excluded.latest_event_created;

  return found;
end;
$$;


ALTER FUNCTION "public"."record_stripe_subscription_event"("p_stripe_subscription_id" "text", "p_stripe_customer_id" "text", "p_user_id" "uuid", "p_price_id" "text", "p_status" "text", "p_latest_event_created" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_exam_readiness_evidence"("p_user_id" "uuid", "p_event_key" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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


ALTER FUNCTION "public"."register_exam_readiness_evidence"("p_user_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."register_exam_readiness_evidence"("p_user_id" "uuid", "p_event_key" "text") IS 'Advances a user evidence revision once for each stable event key.';



CREATE OR REPLACE FUNCTION "public"."save_user_progress_with_readiness_evidence"("p_user_id" "uuid", "p_progress" "jsonb", "p_trigger_type" "text" DEFAULT NULL::"text", "p_trigger_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_existing public.user_progress%rowtype;
  v_completion public.progress_readiness_completions%rowtype;
  v_evidence_changed boolean;
  v_event_key text;
  v_trigger_registered boolean := false;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;
  if p_progress is null
    or jsonb_typeof(p_progress) <> 'object'
    or (select count(*) from jsonb_object_keys(p_progress)) <> 13
    or not p_progress ?& array[
      'current_day', 'exp', 'level', 'completed_days', 'streak_count', 'weak_tags',
      'last_played_at', 'completed_topics', 'topic_mastery', 'topic_mastery_stats',
      'review_queue', 'weekly_plan', 'checkpoint_progress'
    ] then
    raise exception 'invalid progress payload' using errcode = '22023';
  end if;
  if jsonb_typeof(p_progress -> 'current_day') <> 'number'
    or jsonb_typeof(p_progress -> 'exp') <> 'number'
    or jsonb_typeof(p_progress -> 'level') <> 'number'
    or jsonb_typeof(p_progress -> 'completed_days') <> 'array'
    or jsonb_typeof(p_progress -> 'streak_count') <> 'number'
    or jsonb_typeof(p_progress -> 'weak_tags') <> 'array'
    or jsonb_typeof(p_progress -> 'completed_topics') <> 'array'
    or jsonb_typeof(p_progress -> 'topic_mastery') <> 'object'
    or jsonb_typeof(p_progress -> 'topic_mastery_stats') <> 'object'
    or jsonb_typeof(p_progress -> 'review_queue') <> 'array'
    or jsonb_typeof(p_progress -> 'weekly_plan') not in ('object', 'null')
    or jsonb_typeof(p_progress -> 'checkpoint_progress') not in ('object', 'null')
    or jsonb_typeof(p_progress -> 'last_played_at') not in ('string', 'null') then
    raise exception 'invalid progress payload' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_progress -> 'weak_tags') item
    where jsonb_typeof(item) <> 'string'
  ) or exists (
    select 1 from jsonb_array_elements(p_progress -> 'completed_topics') item
    where jsonb_typeof(item) <> 'string'
  ) or exists (
    select 1 from jsonb_array_elements(p_progress -> 'completed_days') item
    where jsonb_typeof(item) <> 'number'
  ) then
    raise exception 'invalid progress payload' using errcode = '22023';
  end if;
  if (p_trigger_type is null) <> (p_trigger_id is null)
    or (p_trigger_type is not null and p_trigger_type not in (
      'learning_complete',
      'review_complete',
      'assessment'
    ))
    or (p_trigger_id is not null and (length(btrim(p_trigger_id)) = 0 or length(p_trigger_id) > 4096)) then
    raise exception 'invalid progress readiness trigger' using errcode = '22023';
  end if;

  if p_trigger_type = 'assessment' and not exists (
    select 1
    from public.assessment_sessions assessment
    where assessment.user_id = p_user_id
      and assessment.session_id::text = p_trigger_id
      and assessment.status = 'completed'
  ) then
    raise exception 'assessment readiness trigger requires a completed session owned by the user'
      using errcode = '23503';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select progress.*
  into v_existing
  from public.user_progress progress
  where progress.user_id = p_user_id
  for update;

  if p_trigger_type is not null then
    select completion.*
    into v_completion
    from public.progress_readiness_completions completion
    where completion.user_id = p_user_id
      and completion.trigger_type = p_trigger_type
      and completion.trigger_id = p_trigger_id
    for update;

    if found then
      if v_completion.payload_fingerprint is distinct from md5(p_progress::text)
        or v_completion.progress_payload is distinct from p_progress then
        raise exception 'progress readiness trigger conflicts with original payload'
          using errcode = '23505';
      end if;

      return jsonb_build_object(
        'evidence_changed', false,
        'trigger_registered', v_completion.readiness_registered,
        'replayed', true
      );
    end if;
  end if;

  v_evidence_changed :=
    v_existing.topic_mastery_stats is distinct from (p_progress -> 'topic_mastery_stats')
    or v_existing.review_queue is distinct from (p_progress -> 'review_queue');
  v_event_key := case when p_trigger_type is null
    then null
    else p_trigger_type || ':' || p_trigger_id
  end;

  update public.user_progress
  set current_day = (p_progress ->> 'current_day')::integer,
      exp = (p_progress ->> 'exp')::integer,
      level = (p_progress ->> 'level')::integer,
      completed_days = array(
        select item.value::integer
        from jsonb_array_elements_text(p_progress -> 'completed_days') as item(value)
      ),
      streak_count = (p_progress ->> 'streak_count')::integer,
      weak_tags = array(
        select item.value
        from jsonb_array_elements_text(p_progress -> 'weak_tags') as item(value)
      ),
      last_played_at = (p_progress ->> 'last_played_at')::timestamptz,
      completed_topics = array(
        select item.value
        from jsonb_array_elements_text(p_progress -> 'completed_topics') as item(value)
      ),
      topic_mastery = p_progress -> 'topic_mastery',
      topic_mastery_stats = p_progress -> 'topic_mastery_stats',
      review_queue = p_progress -> 'review_queue',
      weekly_plan = p_progress -> 'weekly_plan',
      checkpoint_progress = p_progress -> 'checkpoint_progress',
      updated_at = clock_timestamp()
  where user_id = p_user_id;

  if v_event_key is not null
    and (v_evidence_changed or p_trigger_type = 'assessment') then
    perform public.register_exam_readiness_evidence(p_user_id, v_event_key);
    v_trigger_registered := true;
  end if;

  if v_event_key is not null then
    insert into public.progress_readiness_completions (
      user_id,
      trigger_type,
      trigger_id,
      progress_payload,
      payload_fingerprint,
      readiness_registered
    ) values (
      p_user_id,
      p_trigger_type,
      p_trigger_id,
      p_progress,
      md5(p_progress::text),
      v_trigger_registered
    );
  end if;

  return jsonb_build_object(
    'evidence_changed', v_evidence_changed,
    'trigger_registered', v_trigger_registered,
    'replayed', false
  );
end;
$$;


ALTER FUNCTION "public"."save_user_progress_with_readiness_evidence"("p_user_id" "uuid", "p_progress" "jsonb", "p_trigger_type" "text", "p_trigger_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_user_progress_with_readiness_evidence"("p_user_id" "uuid", "p_progress" "jsonb", "p_trigger_type" "text", "p_trigger_id" "text") IS 'Atomically binds a stable completion to its full payload, writes authoritative P0 progress once, and registers readiness for assessment finalization or changed mastery/review facts.';



CREATE TABLE IF NOT EXISTS "public"."ai_grading_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "category" "text",
    "user_answer" "text" NOT NULL,
    "score" integer NOT NULL,
    "grade" "text" NOT NULL,
    "is_correct" boolean NOT NULL,
    "summary" "text",
    "good_points" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "missing_points" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "feedback" "text",
    "model_answer" "text",
    "next_review_theme" "text",
    "provider" "text",
    "model" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_grading_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text",
    "question_id" "text",
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_attempt_receipts" (
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "first_attempt_at" timestamp with time zone,
    "attempt_count" bigint NOT NULL
);


ALTER TABLE "public"."assessment_attempt_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_session_answers" (
    "answer_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "canonical_question_id" "text" NOT NULL,
    "topic_id" "text" NOT NULL,
    "field_id" "text" NOT NULL,
    "is_correct" boolean NOT NULL,
    "first_attempt_state" "text" NOT NULL,
    "answered_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "assessment_session_answers_canonical_question_id_check" CHECK (("length"("canonical_question_id") > 0)),
    CONSTRAINT "assessment_session_answers_field_id_check" CHECK (("length"("field_id") > 0)),
    CONSTRAINT "assessment_session_answers_first_attempt_state_check" CHECK (("first_attempt_state" = ANY (ARRAY['first'::"text", 'seen'::"text", 'unknown'::"text"]))),
    CONSTRAINT "assessment_session_answers_idempotency_key_check" CHECK (("length"("idempotency_key") > 0)),
    CONSTRAINT "assessment_session_answers_topic_id_check" CHECK (("length"("topic_id") > 0))
);


ALTER TABLE "public"."assessment_session_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_sessions" (
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "question_count" integer NOT NULL,
    "answered_count" integer DEFAULT 0 NOT NULL,
    "correct_count" integer DEFAULT 0 NOT NULL,
    "first_count" integer DEFAULT 0 NOT NULL,
    "seen_count" integer DEFAULT 0 NOT NULL,
    "unknown_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "assessment_sessions_answered_count_check" CHECK (("answered_count" >= 0)),
    CONSTRAINT "assessment_sessions_check" CHECK (("answered_count" <= "question_count")),
    CONSTRAINT "assessment_sessions_check1" CHECK (("correct_count" <= "answered_count")),
    CONSTRAINT "assessment_sessions_check2" CHECK (((("first_count" + "seen_count") + "unknown_count") = "answered_count")),
    CONSTRAINT "assessment_sessions_check3" CHECK (((("status" = 'in_progress'::"text") AND ("completed_at" IS NULL)) OR (("status" = ANY (ARRAY['completed'::"text", 'abandoned'::"text"])) AND ("completed_at" IS NOT NULL)))),
    CONSTRAINT "assessment_sessions_correct_count_check" CHECK (("correct_count" >= 0)),
    CONSTRAINT "assessment_sessions_first_count_check" CHECK (("first_count" >= 0)),
    CONSTRAINT "assessment_sessions_mode_check" CHECK (("mode" = ANY (ARRAY['practice'::"text", 'exam'::"text"]))),
    CONSTRAINT "assessment_sessions_question_count_check" CHECK (("question_count" >= 0)),
    CONSTRAINT "assessment_sessions_seen_count_check" CHECK (("seen_count" >= 0)),
    CONSTRAINT "assessment_sessions_source_check" CHECK (("source" = ANY (ARRAY['checkpoint'::"text", 'summary'::"text", 'mock'::"text", 'official_past'::"text"]))),
    CONSTRAINT "assessment_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text"]))),
    CONSTRAINT "assessment_sessions_unknown_count_check" CHECK (("unknown_count" >= 0))
);


ALTER TABLE "public"."assessment_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "plan_key" "text" NOT NULL,
    "months" integer,
    "amount_total" integer,
    "currency" "text",
    "stripe_checkout_session_id" "text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_purchases_kind_check" CHECK (("kind" = ANY (ARRAY['one_time'::"text", 'subscription'::"text"])))
);


ALTER TABLE "public"."billing_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "user_id" "uuid",
    "price_id" "text",
    "status" "text" NOT NULL,
    "latest_event_created" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_progress_reports" (
    "report_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "selected_level" "text" NOT NULL,
    "estimated_completion_rate" integer,
    "optional_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_progress_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_study_tasks" (
    "task_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "task_type" "text" NOT NULL,
    "topic_id" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "planned_quantity" "text",
    "estimated_minutes" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "completion_source" "text" DEFAULT 'self_report'::"text" NOT NULL,
    "estimated_completion_rate" integer,
    "reason" "text",
    "source" "text" DEFAULT 'today_menu'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_study_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_readiness_current" (
    "user_id" "uuid" NOT NULL,
    "evidence_revision" bigint NOT NULL,
    "model_version" "text" NOT NULL,
    "exam_scheme_version" "text" NOT NULL,
    "result" "jsonb" NOT NULL,
    "calculation_reference_time" timestamp with time zone NOT NULL,
    "calculated_at" timestamp with time zone NOT NULL,
    "valid_until" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "exam_readiness_current_evidence_revision_check" CHECK (("evidence_revision" >= 0)),
    CONSTRAINT "exam_readiness_current_exam_scheme_version_check" CHECK (("length"("exam_scheme_version") > 0)),
    CONSTRAINT "exam_readiness_current_model_version_check" CHECK (("length"("model_version") > 0)),
    CONSTRAINT "exam_readiness_current_result_check" CHECK (("jsonb_typeof"("result") = 'object'::"text"))
);


ALTER TABLE "public"."exam_readiness_current" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_readiness_evidence_events" (
    "event_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "revision" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "exam_readiness_evidence_events_event_key_check" CHECK (("length"("event_key") > 0)),
    CONSTRAINT "exam_readiness_evidence_events_revision_check" CHECK (("revision" >= 0))
);


ALTER TABLE "public"."exam_readiness_evidence_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_readiness_evidence_state" (
    "user_id" "uuid" NOT NULL,
    "revision" bigint DEFAULT 0 NOT NULL,
    "lease_job_id" "uuid",
    "lease_expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "exam_readiness_evidence_state_check" CHECK (((("lease_job_id" IS NULL) AND ("lease_expires_at" IS NULL)) OR (("lease_job_id" IS NOT NULL) AND ("lease_expires_at" IS NOT NULL)))),
    CONSTRAINT "exam_readiness_evidence_state_revision_check" CHECK (("revision" >= 0))
);


ALTER TABLE "public"."exam_readiness_evidence_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_readiness_snapshots" (
    "user_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "model_version" "text" NOT NULL,
    "exam_scheme_version" "text" NOT NULL,
    "evidence_revision" bigint NOT NULL,
    "result" "jsonb" NOT NULL,
    "calculation_reference_time" timestamp with time zone NOT NULL,
    "calculated_at" timestamp with time zone NOT NULL,
    "valid_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "exam_readiness_snapshots_evidence_revision_check" CHECK (("evidence_revision" >= 0)),
    CONSTRAINT "exam_readiness_snapshots_exam_scheme_version_check" CHECK (("length"("exam_scheme_version") > 0)),
    CONSTRAINT "exam_readiness_snapshots_model_version_check" CHECK (("length"("model_version") > 0)),
    CONSTRAINT "exam_readiness_snapshots_result_check" CHECK (("jsonb_typeof"("result") = 'object'::"text"))
);


ALTER TABLE "public"."exam_readiness_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integrated_learning_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status_date" "date" NOT NULL,
    "overall_status" "text" NOT NULL,
    "readiness_score" integer,
    "input_progress_rate" integer,
    "basic_understanding_rate" integer,
    "flashcard_mastery_rate" integer,
    "exam_ready_rate" integer,
    "field_balance_score" integer,
    "weak_topic_count" integer,
    "exam_ready_topic_count" integer,
    "basic_understood_topic_count" integer,
    "review_needed_topic_count" integer,
    "weak_topics" "jsonb",
    "main_risks" "jsonb",
    "recommended_focus" "jsonb",
    "generated_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."integrated_learning_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_sessions" (
    "token" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:15:00'::interval) NOT NULL
);


ALTER TABLE "public"."line_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text",
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "email" "text"
);


ALTER TABLE "public"."line_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_adjustment_proposals" (
    "proposal_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status_date" "date" NOT NULL,
    "source_status_id" "uuid",
    "trigger_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "headline" "text" NOT NULL,
    "reason_summary" "text",
    "options" "jsonb" NOT NULL,
    "selected_option_id" "text",
    "status" "text" DEFAULT 'proposed'::"text" NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plan_adjustment_proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."progress_readiness_completions" (
    "user_id" "uuid" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_id" "text" NOT NULL,
    "progress_payload" "jsonb" NOT NULL,
    "payload_fingerprint" "text" NOT NULL,
    "readiness_registered" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "progress_readiness_completions_payload_fingerprint_check" CHECK (("length"("payload_fingerprint") = 32)),
    CONSTRAINT "progress_readiness_completions_progress_payload_check" CHECK (("jsonb_typeof"("progress_payload") = 'object'::"text")),
    CONSTRAINT "progress_readiness_completions_trigger_id_check" CHECK ((("length"("btrim"("trigger_id")) > 0) AND ("length"("trigger_id") <= 4096))),
    CONSTRAINT "progress_readiness_completions_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['learning_complete'::"text", 'review_complete'::"text", 'assessment'::"text"])))
);


ALTER TABLE "public"."progress_readiness_completions" OWNER TO "postgres";


COMMENT ON TABLE "public"."progress_readiness_completions" IS 'RPC-private idempotency records binding a stable learning/review/assessment completion to its original full progress payload and readiness association.';



CREATE TABLE IF NOT EXISTS "public"."question_attempts" (
    "attempt_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "topic_id" "text" NOT NULL,
    "selected_answer" "text",
    "is_correct" boolean NOT NULL,
    "mistake_reason" "text",
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_spent_seconds" integer,
    "source_task_id" "uuid",
    "question_origin" "text",
    "question_version" integer,
    "exam_year" integer,
    "attempt_mode" "text",
    "official_exam_field" "text",
    "attempt_group_id" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "is_first_attempt" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."question_attempts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."question_attempts"."question_type" IS 'topic_quiz / exam_level / mini_exam / mock_exam / official_past';



COMMENT ON COLUMN "public"."question_attempts"."is_first_attempt" IS 'True only for the atomic first persisted answer for one user and canonical question.';



CREATE TABLE IF NOT EXISTS "public"."question_quality_metrics" (
    "question_id" "text" NOT NULL,
    "question_version" integer NOT NULL,
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sample_status" "text" NOT NULL,
    "unique_user_count" integer DEFAULT 0 NOT NULL,
    "first_attempt_count" integer DEFAULT 0 NOT NULL,
    "all_attempt_count" integer DEFAULT 0 NOT NULL,
    "first_attempt_correct_rate" numeric(6,4),
    "all_attempt_correct_rate" numeric(6,4),
    "median_time_seconds" numeric(10,2),
    "p90_time_seconds" numeric(10,2),
    "unanswered_rate" numeric(6,4),
    "choice_counts" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "choice_rates" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recommended_difficulty" smallint,
    "anomaly_flags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."question_quality_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."question_quality_metrics" IS '問題ごとの実測難易度・品質指標のスナップショット。question_attempts から再生成できる派生データで、これ自体は正ではない。';



COMMENT ON COLUMN "public"."question_quality_metrics"."first_attempt_correct_rate" IS '主指標。同一ユーザー・同一問題・同一versionの最初の回答だけで計算した正答率。';



COMMENT ON COLUMN "public"."question_quality_metrics"."all_attempt_correct_rate" IS '参考値。全回答の正答率。復習で上がるため難易度判定には使わない。';



COMMENT ON COLUMN "public"."question_quality_metrics"."recommended_difficulty" IS '実測からの推奨難易度（1〜5）。QuestionRecord.estimatedDifficulty を自動更新してはいけない。';



CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "event_id" "text" NOT NULL,
    "event_type" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "event_payload" "jsonb",
    "processed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stripe_webhook_events_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'succeeded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_check_pack_attempts" (
    "attempt_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pack_id" "text" NOT NULL,
    "topic_id" "text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "quiz_score_rate" integer,
    "flashcard_score_rate" integer,
    "exam_level_score_rate" integer,
    "result_status" "text" DEFAULT 'incomplete'::"text" NOT NULL,
    "next_action" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."topic_check_pack_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_id" "text" NOT NULL,
    "stage" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "latest_quiz_score" integer,
    "latest_exam_level_score" integer,
    "quiz_attempt_count" integer DEFAULT 0 NOT NULL,
    "exam_level_attempt_count" integer DEFAULT 0 NOT NULL,
    "consecutive_failed_count" integer DEFAULT 0 NOT NULL,
    "last_attempted_at" timestamp with time zone,
    "next_review_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."topic_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "day_no" integer DEFAULT 0 NOT NULL,
    "selected_choice" "text",
    "is_correct" boolean NOT NULL,
    "tag" "text",
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "topic_id" "text"
);


ALTER TABLE "public"."user_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day_no" integer,
    "q1_service" "text",
    "q2_tedious" "text",
    "q3_unclear" "text",
    "q4_onemore" "text",
    "q5_easier" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "it_experience" "text",
    "daily_minutes" "text",
    "exam_plan" "text",
    "confidence" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exam_date" "date",
    "weekday_minutes" integer,
    "holiday_minutes" integer,
    "weak_fields" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "study_style" "text",
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "stripe_customer_id" "text",
    "plan_updated_at" timestamp with time zone,
    "plan_start_date" "date",
    "pro_until" timestamp with time zone
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "user_id" "uuid" NOT NULL,
    "current_day" integer DEFAULT 1 NOT NULL,
    "exp" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "completed_days" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "streak_count" integer DEFAULT 0 NOT NULL,
    "weak_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "last_played_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_topics" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "topic_mastery" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "review_queue" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "weekly_plan" "jsonb",
    "checkpoint_progress" "jsonb",
    "topic_mastery_stats" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_progress"."topic_mastery_stats" IS 'Topic単位のmasteryScore、評価日時、正誤回数、復習成功回数、直近評価根拠。旧データは推定せず空から開始。';



CREATE TABLE IF NOT EXISTS "public"."user_reference_books" (
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "publisher" "text",
    "edition" "text",
    "active" boolean DEFAULT true NOT NULL,
    "note" "text",
    "chapters" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_reference_books" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_word_progress" (
    "user_id" "uuid" NOT NULL,
    "word_id" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "correct_count" integer DEFAULT 0 NOT NULL,
    "wrong_count" integer DEFAULT 0 NOT NULL,
    "review_count" integer DEFAULT 0 NOT NULL,
    "last_reviewed_at" timestamp with time zone,
    "next_review_at" timestamp with time zone,
    "last_self_rating" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_word_progress_last_self_rating_check" CHECK ((("last_self_rating" IS NULL) OR ("last_self_rating" = ANY (ARRAY['remembered'::"text", 'vague'::"text", 'forgot'::"text"])))),
    CONSTRAINT "user_word_progress_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'learning'::"text", 'weak'::"text", 'mastered'::"text"])))
);


ALTER TABLE "public"."user_word_progress" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_grading_records"
    ADD CONSTRAINT "ai_grading_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_attempt_receipts"
    ADD CONSTRAINT "assessment_attempt_receipts_pkey" PRIMARY KEY ("user_id", "session_id", "question_id");



ALTER TABLE ONLY "public"."assessment_session_answers"
    ADD CONSTRAINT "assessment_session_answers_pkey" PRIMARY KEY ("answer_id");



ALTER TABLE ONLY "public"."assessment_session_answers"
    ADD CONSTRAINT "assessment_session_answers_user_id_idempotency_key_key" UNIQUE ("user_id", "idempotency_key");



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_user_id_session_id_key" UNIQUE ("user_id", "session_id");



ALTER TABLE ONLY "public"."billing_purchases"
    ADD CONSTRAINT "billing_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_purchases"
    ADD CONSTRAINT "billing_purchases_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("stripe_subscription_id");



ALTER TABLE ONLY "public"."daily_progress_reports"
    ADD CONSTRAINT "daily_progress_reports_pkey" PRIMARY KEY ("report_id");



ALTER TABLE ONLY "public"."daily_progress_reports"
    ADD CONSTRAINT "daily_progress_reports_unique_per_day" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."daily_study_tasks"
    ADD CONSTRAINT "daily_study_tasks_pkey" PRIMARY KEY ("task_id");



ALTER TABLE ONLY "public"."daily_study_tasks"
    ADD CONSTRAINT "daily_study_tasks_unique_per_day" UNIQUE ("user_id", "date", "task_type", "topic_id", "title");



ALTER TABLE ONLY "public"."exam_readiness_current"
    ADD CONSTRAINT "exam_readiness_current_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."exam_readiness_evidence_events"
    ADD CONSTRAINT "exam_readiness_evidence_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."exam_readiness_evidence_events"
    ADD CONSTRAINT "exam_readiness_evidence_events_user_id_event_key_key" UNIQUE ("user_id", "event_key");



ALTER TABLE ONLY "public"."exam_readiness_evidence_events"
    ADD CONSTRAINT "exam_readiness_evidence_events_user_id_revision_key" UNIQUE ("user_id", "revision");



ALTER TABLE ONLY "public"."exam_readiness_evidence_state"
    ADD CONSTRAINT "exam_readiness_evidence_state_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."exam_readiness_recalculation_jobs"
    ADD CONSTRAINT "exam_readiness_recalculation__user_id_trigger_type_trigger__key" UNIQUE ("user_id", "trigger_type", "trigger_id", "model_version", "exam_scheme_version");



ALTER TABLE ONLY "public"."exam_readiness_recalculation_jobs"
    ADD CONSTRAINT "exam_readiness_recalculation_jobs_pkey" PRIMARY KEY ("job_id");



ALTER TABLE ONLY "public"."exam_readiness_snapshots"
    ADD CONSTRAINT "exam_readiness_snapshots_pkey" PRIMARY KEY ("user_id", "snapshot_date", "model_version", "exam_scheme_version");



ALTER TABLE ONLY "public"."integrated_learning_status"
    ADD CONSTRAINT "integrated_learning_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrated_learning_status"
    ADD CONSTRAINT "integrated_learning_status_user_id_status_date_key" UNIQUE ("user_id", "status_date");



ALTER TABLE ONLY "public"."line_sessions"
    ADD CONSTRAINT "line_sessions_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."line_users"
    ADD CONSTRAINT "line_users_line_user_id_key" UNIQUE ("line_user_id");



ALTER TABLE ONLY "public"."line_users"
    ADD CONSTRAINT "line_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_adjustment_proposals"
    ADD CONSTRAINT "plan_adjustment_proposals_pkey" PRIMARY KEY ("proposal_id");



ALTER TABLE ONLY "public"."progress_readiness_completions"
    ADD CONSTRAINT "progress_readiness_completions_pkey" PRIMARY KEY ("user_id", "trigger_type", "trigger_id");



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("attempt_id");



ALTER TABLE ONLY "public"."question_quality_metrics"
    ADD CONSTRAINT "question_quality_metrics_pkey" PRIMARY KEY ("question_id", "question_version");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."topic_check_pack_attempts"
    ADD CONSTRAINT "topic_check_pack_attempts_pkey" PRIMARY KEY ("attempt_id");



ALTER TABLE ONLY "public"."topic_progress"
    ADD CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_progress"
    ADD CONSTRAINT "topic_progress_unique_per_topic" UNIQUE ("user_id", "topic_id");



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_reference_books"
    ADD CONSTRAINT "user_reference_books_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_word_progress"
    ADD CONSTRAINT "user_word_progress_pkey" PRIMARY KEY ("user_id", "word_id");



CREATE INDEX "ai_grading_records_question_id_idx" ON "public"."ai_grading_records" USING "btree" ("question_id");



CREATE INDEX "ai_grading_records_user_created_idx" ON "public"."ai_grading_records" USING "btree" ("user_id", "created_at");



CREATE INDEX "ai_grading_records_user_id_idx" ON "public"."ai_grading_records" USING "btree" ("user_id");



CREATE INDEX "ai_usage_logs_user_created_idx" ON "public"."ai_usage_logs" USING "btree" ("user_id", "created_at");



CREATE INDEX "ai_usage_logs_user_id_idx" ON "public"."ai_usage_logs" USING "btree" ("user_id");



CREATE INDEX "assessment_session_answers_session_idx" ON "public"."assessment_session_answers" USING "btree" ("session_id", "answered_at");



CREATE INDEX "assessment_session_answers_user_answered_idx" ON "public"."assessment_session_answers" USING "btree" ("user_id", "answered_at" DESC);



CREATE INDEX "assessment_sessions_user_status_completed_idx" ON "public"."assessment_sessions" USING "btree" ("user_id", "status", "completed_at" DESC);



CREATE INDEX "billing_purchases_user_created_idx" ON "public"."billing_purchases" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "billing_subscriptions_customer_idx" ON "public"."billing_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "billing_subscriptions_user_idx" ON "public"."billing_subscriptions" USING "btree" ("user_id");



CREATE INDEX "daily_progress_reports_user_date_idx" ON "public"."daily_progress_reports" USING "btree" ("user_id", "date");



CREATE INDEX "daily_study_tasks_user_date_idx" ON "public"."daily_study_tasks" USING "btree" ("user_id", "date");



CREATE INDEX "daily_study_tasks_user_topic_idx" ON "public"."daily_study_tasks" USING "btree" ("user_id", "topic_id");



CREATE INDEX "exam_readiness_evidence_events_user_revision_idx" ON "public"."exam_readiness_evidence_events" USING "btree" ("user_id", "revision" DESC);



CREATE INDEX "exam_readiness_recalculation_jobs_user_status_lease_idx" ON "public"."exam_readiness_recalculation_jobs" USING "btree" ("user_id", "status", "lease_expires_at");



CREATE INDEX "exam_readiness_snapshots_user_date_idx" ON "public"."exam_readiness_snapshots" USING "btree" ("user_id", "snapshot_date" DESC);



CREATE INDEX "integrated_learning_status_user_date_idx" ON "public"."integrated_learning_status" USING "btree" ("user_id", "status_date");



CREATE INDEX "line_sessions_expires_at_idx" ON "public"."line_sessions" USING "btree" ("expires_at");



CREATE INDEX "line_sessions_user_id_idx" ON "public"."line_sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "line_users_auth_user_id_key" ON "public"."line_users" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE INDEX "plan_adjustment_proposals_user_date_idx" ON "public"."plan_adjustment_proposals" USING "btree" ("user_id", "status_date");



CREATE INDEX "plan_adjustment_proposals_user_status_idx" ON "public"."plan_adjustment_proposals" USING "btree" ("user_id", "status");



CREATE INDEX "question_attempts_group_idx" ON "public"."question_attempts" USING "btree" ("user_id", "attempt_group_id");



CREATE UNIQUE INDEX "question_attempts_official_group_unique_idx" ON "public"."question_attempts" USING "btree" ("user_id", "attempt_group_id", "question_id", "question_version") WHERE (("attempt_group_id" IS NOT NULL) AND ("question_version" IS NOT NULL));



CREATE UNIQUE INDEX "question_attempts_one_first_per_user_question_idx" ON "public"."question_attempts" USING "btree" ("user_id", "question_id") WHERE "is_first_attempt";



CREATE INDEX "question_attempts_question_version_idx" ON "public"."question_attempts" USING "btree" ("question_id", "question_version");



CREATE INDEX "question_attempts_user_answered_idx" ON "public"."question_attempts" USING "btree" ("user_id", "answered_at");



CREATE INDEX "question_attempts_user_exam_year_idx" ON "public"."question_attempts" USING "btree" ("user_id", "exam_year");



CREATE INDEX "question_attempts_user_topic_idx" ON "public"."question_attempts" USING "btree" ("user_id", "topic_id");



CREATE INDEX "question_attempts_user_type_idx" ON "public"."question_attempts" USING "btree" ("user_id", "question_type");



CREATE INDEX "question_quality_metrics_difficulty_idx" ON "public"."question_quality_metrics" USING "btree" ("recommended_difficulty");



CREATE INDEX "question_quality_metrics_sample_status_idx" ON "public"."question_quality_metrics" USING "btree" ("sample_status");



CREATE INDEX "stripe_webhook_events_received_at_idx" ON "public"."stripe_webhook_events" USING "btree" ("received_at");



CREATE INDEX "stripe_webhook_events_status_updated_at_idx" ON "public"."stripe_webhook_events" USING "btree" ("status", "updated_at");



CREATE INDEX "topic_check_pack_attempts_user_created_idx" ON "public"."topic_check_pack_attempts" USING "btree" ("user_id", "created_at");



CREATE INDEX "topic_check_pack_attempts_user_topic_idx" ON "public"."topic_check_pack_attempts" USING "btree" ("user_id", "topic_id");



CREATE INDEX "topic_progress_user_idx" ON "public"."topic_progress" USING "btree" ("user_id");



CREATE INDEX "topic_progress_user_stage_idx" ON "public"."topic_progress" USING "btree" ("user_id", "stage");



CREATE INDEX "user_answers_answered_at_idx" ON "public"."user_answers" USING "btree" ("answered_at" DESC);



CREATE INDEX "user_answers_tag_idx" ON "public"."user_answers" USING "btree" ("tag");



CREATE INDEX "user_answers_topic_id_idx" ON "public"."user_answers" USING "btree" ("topic_id");



CREATE INDEX "user_answers_user_id_idx" ON "public"."user_answers" USING "btree" ("user_id");



CREATE INDEX "user_feedback_user_id_idx" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "user_profiles_stripe_customer_id_idx" ON "public"."user_profiles" USING "btree" ("stripe_customer_id");



CREATE INDEX "user_word_progress_next_review_at_idx" ON "public"."user_word_progress" USING "btree" ("next_review_at");



CREATE INDEX "user_word_progress_status_idx" ON "public"."user_word_progress" USING "btree" ("status");



CREATE INDEX "user_word_progress_updated_at_idx" ON "public"."user_word_progress" USING "btree" ("updated_at" DESC);



CREATE INDEX "user_word_progress_user_id_idx" ON "public"."user_word_progress" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "assessment_sessions_keep_question_count" BEFORE UPDATE OF "question_count" ON "public"."assessment_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."keep_assessment_session_question_count"();



CREATE OR REPLACE TRIGGER "lock_question_exposure_question_attempts" BEFORE INSERT OR UPDATE OF "user_id", "question_id" ON "public"."question_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."lock_question_exposure_answer_write"();



CREATE OR REPLACE TRIGGER "lock_question_exposure_user_answers" BEFORE INSERT OR UPDATE OF "user_id", "question_id" ON "public"."user_answers" FOR EACH ROW EXECUTE FUNCTION "public"."lock_question_exposure_answer_write"();



ALTER TABLE ONLY "public"."ai_grading_records"
    ADD CONSTRAINT "ai_grading_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_attempt_receipts"
    ADD CONSTRAINT "assessment_attempt_receipts_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."question_attempts"("attempt_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_session_answers"
    ADD CONSTRAINT "assessment_session_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_session_answers"
    ADD CONSTRAINT "assessment_session_answers_user_id_session_id_fkey" FOREIGN KEY ("user_id", "session_id") REFERENCES "public"."assessment_sessions"("user_id", "session_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_purchases"
    ADD CONSTRAINT "billing_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_progress_reports"
    ADD CONSTRAINT "daily_progress_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_study_tasks"
    ADD CONSTRAINT "daily_study_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_readiness_current"
    ADD CONSTRAINT "exam_readiness_current_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_readiness_evidence_events"
    ADD CONSTRAINT "exam_readiness_evidence_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_readiness_evidence_state"
    ADD CONSTRAINT "exam_readiness_evidence_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_readiness_recalculation_jobs"
    ADD CONSTRAINT "exam_readiness_recalculation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_readiness_snapshots"
    ADD CONSTRAINT "exam_readiness_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integrated_learning_status"
    ADD CONSTRAINT "integrated_learning_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_sessions"
    ADD CONSTRAINT "line_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_adjustment_proposals"
    ADD CONSTRAINT "plan_adjustment_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."progress_readiness_completions"
    ADD CONSTRAINT "progress_readiness_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_check_pack_attempts"
    ADD CONSTRAINT "topic_check_pack_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_progress"
    ADD CONSTRAINT "topic_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_answers"
    ADD CONSTRAINT "user_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reference_books"
    ADD CONSTRAINT "user_reference_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_word_progress"
    ADD CONSTRAINT "user_word_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."ai_grading_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_attempt_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_session_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_progress_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_study_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_readiness_current" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_readiness_evidence_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_readiness_evidence_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_readiness_recalculation_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_readiness_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integrated_learning_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_adjustment_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."progress_readiness_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_quality_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_check_pack_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_reference_books" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_word_progress" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_dashboard_summary"("p_today_start" timestamp with time zone, "p_user_limit" integer, "p_user_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_dashboard_summary"("p_today_start" timestamp with time zone, "p_user_limit" integer, "p_user_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_dashboard_summary"("p_today_start" timestamp with time zone, "p_user_limit" integer, "p_user_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_dashboard_summary"("p_today_start" timestamp with time zone, "p_user_limit" integer, "p_user_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_one_time_purchase"("p_user_id" "uuid", "p_plan_key" "text", "p_months" integer, "p_amount_total" integer, "p_currency" "text", "p_stripe_checkout_session_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_one_time_purchase"("p_user_id" "uuid", "p_plan_key" "text", "p_months" integer, "p_amount_total" integer, "p_currency" "text", "p_stripe_checkout_session_id" "text", "p_stripe_payment_intent_id" "text", "p_stripe_customer_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."exam_readiness_recalculation_jobs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_exam_readiness_recalculation"("p_user_id" "uuid", "p_trigger_type" "text", "p_trigger_id" "text", "p_model_version" "text", "p_exam_scheme_version" "text", "p_lease_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_exam_readiness_recalculation"("p_user_id" "uuid", "p_trigger_type" "text", "p_trigger_id" "text", "p_model_version" "text", "p_exam_scheme_version" "text", "p_lease_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_assessment_session"("p_user_id" "uuid", "p_session_id" "uuid", "p_completed_at" timestamp with time zone, "p_answers" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_assessment_session"("p_user_id" "uuid", "p_session_id" "uuid", "p_completed_at" timestamp with time zone, "p_answers" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_evidence_revision" bigint, "p_expected_attempt" integer, "p_result" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_evidence_revision" bigint, "p_expected_attempt" integer, "p_result" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fail_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_attempt" integer, "p_error_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fail_exam_readiness_recalculation"("p_job_id" "uuid", "p_expected_attempt" integer, "p_error_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."keep_assessment_session_question_count"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."lock_question_exposure_answer_write"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."record_assessment_question_attempts_with_exposure"("p_user_id" "uuid", "p_session_id" "uuid", "p_attempts" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_assessment_question_attempts_with_exposure"("p_user_id" "uuid", "p_session_id" "uuid", "p_attempts" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_stripe_subscription_event"("p_stripe_subscription_id" "text", "p_stripe_customer_id" "text", "p_user_id" "uuid", "p_price_id" "text", "p_status" "text", "p_latest_event_created" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_stripe_subscription_event"("p_stripe_subscription_id" "text", "p_stripe_customer_id" "text", "p_user_id" "uuid", "p_price_id" "text", "p_status" "text", "p_latest_event_created" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_exam_readiness_evidence"("p_user_id" "uuid", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_exam_readiness_evidence"("p_user_id" "uuid", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_user_progress_with_readiness_evidence"("p_user_id" "uuid", "p_progress" "jsonb", "p_trigger_type" "text", "p_trigger_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_user_progress_with_readiness_evidence"("p_user_id" "uuid", "p_progress" "jsonb", "p_trigger_type" "text", "p_trigger_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."ai_grading_records" TO "anon";
GRANT ALL ON TABLE "public"."ai_grading_records" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_grading_records" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_session_answers" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."billing_purchases" TO "anon";
GRANT ALL ON TABLE "public"."billing_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."daily_progress_reports" TO "anon";
GRANT ALL ON TABLE "public"."daily_progress_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_progress_reports" TO "service_role";



GRANT ALL ON TABLE "public"."daily_study_tasks" TO "anon";
GRANT ALL ON TABLE "public"."daily_study_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_study_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."exam_readiness_current" TO "service_role";



GRANT ALL ON TABLE "public"."exam_readiness_evidence_events" TO "service_role";



GRANT ALL ON TABLE "public"."exam_readiness_evidence_state" TO "service_role";



GRANT ALL ON TABLE "public"."exam_readiness_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."integrated_learning_status" TO "anon";
GRANT ALL ON TABLE "public"."integrated_learning_status" TO "authenticated";
GRANT ALL ON TABLE "public"."integrated_learning_status" TO "service_role";



GRANT ALL ON TABLE "public"."line_sessions" TO "anon";
GRANT ALL ON TABLE "public"."line_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."line_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."line_users" TO "anon";
GRANT ALL ON TABLE "public"."line_users" TO "authenticated";
GRANT ALL ON TABLE "public"."line_users" TO "service_role";



GRANT ALL ON TABLE "public"."plan_adjustment_proposals" TO "anon";
GRANT ALL ON TABLE "public"."plan_adjustment_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_adjustment_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."question_attempts" TO "anon";
GRANT ALL ON TABLE "public"."question_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."question_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."question_quality_metrics" TO "anon";
GRANT ALL ON TABLE "public"."question_quality_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."question_quality_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."topic_check_pack_attempts" TO "anon";
GRANT ALL ON TABLE "public"."topic_check_pack_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_check_pack_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."topic_progress" TO "anon";
GRANT ALL ON TABLE "public"."topic_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_answers" TO "anon";
GRANT ALL ON TABLE "public"."user_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_answers" TO "service_role";



GRANT ALL ON TABLE "public"."user_feedback" TO "anon";
GRANT ALL ON TABLE "public"."user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_reference_books" TO "anon";
GRANT ALL ON TABLE "public"."user_reference_books" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reference_books" TO "service_role";



GRANT ALL ON TABLE "public"."user_word_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_word_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_word_progress" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
