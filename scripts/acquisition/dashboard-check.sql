-- Read-only: /admin/acquisition の数値を SQL で突き合わせる。Run against production fe-quest.
-- 数え方は signup-sources.sql と同じ（started_at だけを「今日(JST)を含む直近 N 日の JST 0 時」に置き換えたもの）。
-- excluded_user_ids には ACQUISITION_EXCLUDED_USER_IDS と同じ UUID を入れる（Git には入れない）。
-- 出力の signups / answered / returned / beta_granted が、ダッシュボードの「流入元・キャンペーン別」と
-- 合計タイルに一致すること。
with settings as (
  select array[]::uuid[] as excluded_user_ids
), periods as (
  select d as days,
         (date_trunc('day', now() at time zone 'Asia/Tokyo') - make_interval(days => d - 1))
           at time zone 'Asia/Tokyo' as started_at
  from unnest(array[7, 30, 90]) as d
), signups as (
  select p.days,
         u.id,
         coalesce(a.utm_source, a.referrer_host, '(none)') as source,
         a.utm_campaign as campaign,
         a.beta_granted_at,
         count(q.attempt_id) as answers,
         count(distinct (q.answered_at at time zone 'Asia/Tokyo')::date) as study_days
  from periods p
  cross join settings s
  join public.line_users u on u.created_at >= p.started_at
  left join public.signup_attributions a on a.user_id = u.id
  left join public.question_attempts q on q.user_id = u.id
  where u.merged_into is null
    and not (u.id = any(s.excluded_user_ids))
  group by p.days, u.id, a.utm_source, a.referrer_host, a.utm_campaign, a.beta_granted_at
)
select days,
       source,
       campaign,
       count(*) as signups,
       count(*) filter (where answers >= 1) as answered,
       count(*) filter (where study_days >= 2) as returned,
       count(*) filter (where beta_granted_at is not null) as beta_granted
from signups
group by grouping sets ((days), (days, source, campaign))
order by days, source nulls first, signups desc;

-- 訪問（画面の「訪問」列）。外部から入った view を端末で重複除去する。期間ごとに started_at を変えて流す。
-- X 投稿の入口 view（placement = x-<UUID>）は referrer が無くても画面では X に数える。
-- 運営の端末は ACQUISITION_EXCLUDED_VISITOR_IDS と同じ値を visitor_id not in (...) で外す。
-- select coalesce(referrer_host, '(none)') as source,
--        count(distinct coalesce(visitor_id, 'event:' || id)) as visits
--   from public.public_funnel_events
--  where event = 'view' and ref_path is null
--    and created_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') - interval '6 days') at time zone 'Asia/Tokyo'
--  group by grouping sets ((), (1)) order by 1 nulls first;
