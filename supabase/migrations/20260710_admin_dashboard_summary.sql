-- 管理ダッシュボードの集計をDB側で完結させる。
-- user_answers 全件をAPIへ転送せず、集計値・直近30件・ユーザー1ページだけを返す。

create or replace function public.admin_dashboard_summary(
  p_today_start timestamptz,
  p_user_limit integer default 50,
  p_user_offset integer default 0
)
returns jsonb
language sql
security definer
set search_path = public
as $$
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

revoke all on function public.admin_dashboard_summary(timestamptz, integer, integer) from public;
grant execute on function public.admin_dashboard_summary(timestamptz, integer, integer) to service_role;
