-- GENERATED SNAPSHOT — DO NOT EDIT OR APPLY MANUALLY.
-- Source of truth: supabase/migrations.
-- Regenerate from a local database rebuilt from the active migrations with:
-- supabase db dump --local --schema public --file supabase/schema.sql

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


CREATE OR REPLACE FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") RETURNS TABLE("question_id" "text", "state" "text", "attempted_before" boolean, "first_attempt_at" timestamp with time zone, "attempt_count" bigint, "saved" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_question_id text;
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

  -- Every overlapping batch acquires the same keys in the same order. The hash
  -- can over-serialize on collision, but it cannot allow two first claims.
  for v_question_id in
    select input.question_id
    from pg_temp.question_exposure_input input
    order by input.question_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(p_user_id::text || chr(31) || v_question_id, 0)
    );
  end loop;

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


COMMENT ON FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") IS 'Records a validated attempt batch and returns transaction-safe first/seen exposure.';



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

SET default_tablespace = '';

SET default_table_access_method = "heap";


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


CREATE TABLE IF NOT EXISTS "public"."integrated_learning_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status_date" "date" NOT NULL,
    "overall_status" "text" NOT NULL,
    "readiness_score" integer NOT NULL,
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



CREATE INDEX "billing_purchases_user_created_idx" ON "public"."billing_purchases" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "billing_subscriptions_customer_idx" ON "public"."billing_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "billing_subscriptions_user_idx" ON "public"."billing_subscriptions" USING "btree" ("user_id");



CREATE INDEX "daily_progress_reports_user_date_idx" ON "public"."daily_progress_reports" USING "btree" ("user_id", "date");



CREATE INDEX "daily_study_tasks_user_date_idx" ON "public"."daily_study_tasks" USING "btree" ("user_id", "date");



CREATE INDEX "daily_study_tasks_user_topic_idx" ON "public"."daily_study_tasks" USING "btree" ("user_id", "topic_id");



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



CREATE INDEX "question_attempts_user_question_answered_at_idx" ON "public"."question_attempts" USING "btree" ("user_id", "question_id", "answered_at");



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



CREATE INDEX "user_answers_user_question_answered_at_idx" ON "public"."user_answers" USING "btree" ("user_id", "question_id", "answered_at");



CREATE INDEX "user_feedback_user_id_idx" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "user_profiles_stripe_customer_id_idx" ON "public"."user_profiles" USING "btree" ("stripe_customer_id");



CREATE INDEX "user_word_progress_next_review_at_idx" ON "public"."user_word_progress" USING "btree" ("next_review_at");



CREATE INDEX "user_word_progress_status_idx" ON "public"."user_word_progress" USING "btree" ("status");



CREATE INDEX "user_word_progress_updated_at_idx" ON "public"."user_word_progress" USING "btree" ("updated_at" DESC);



CREATE INDEX "user_word_progress_user_id_idx" ON "public"."user_word_progress" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."ai_grading_records"
    ADD CONSTRAINT "ai_grading_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_purchases"
    ADD CONSTRAINT "billing_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."daily_progress_reports"
    ADD CONSTRAINT "daily_progress_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_study_tasks"
    ADD CONSTRAINT "daily_study_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integrated_learning_status"
    ADD CONSTRAINT "integrated_learning_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_sessions"
    ADD CONSTRAINT "line_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plan_adjustment_proposals"
    ADD CONSTRAINT "plan_adjustment_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."line_users"("id") ON DELETE CASCADE;



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


ALTER TABLE "public"."billing_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_progress_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_study_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integrated_learning_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_adjustment_proposals" ENABLE ROW LEVEL SECURITY;


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



REVOKE ALL ON FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_question_attempts_with_exposure"("p_user_id" "uuid", "p_attempts" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_stripe_subscription_event"("p_stripe_subscription_id" "text", "p_stripe_customer_id" "text", "p_user_id" "uuid", "p_price_id" "text", "p_status" "text", "p_latest_event_created" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_stripe_subscription_event"("p_stripe_subscription_id" "text", "p_stripe_customer_id" "text", "p_user_id" "uuid", "p_price_id" "text", "p_status" "text", "p_latest_event_created" bigint) TO "service_role";



GRANT ALL ON TABLE "public"."ai_grading_records" TO "anon";
GRANT ALL ON TABLE "public"."ai_grading_records" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_grading_records" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



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
