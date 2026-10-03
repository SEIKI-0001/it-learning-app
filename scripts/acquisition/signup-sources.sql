-- Read-only: 流入元別の新規登録と利用状況。Run against production fe-quest.
-- signup_attributions は 2026-10 の流入元記録（/auth/callback）導入後の登録だけに入る。
-- 流入元の手がかりが無い登録は (none) にまとめる。運営・テスト用アカウントは
-- excluded_user_ids に入れて除外する（UUID は Git に入れず手元のコピーで指定する）。
with settings as (
  select timestamptz '2026-09-28 23:06:17.285351+00' as started_at,
         array[]::uuid[] as excluded_user_ids
), signups as (
  select u.id,
         coalesce(a.utm_source, a.referrer_host, '(none)') as source,
         coalesce(a.utm_campaign, '-') as campaign,
         a.ref,
         a.beta_granted_at,
         count(q.attempt_id) as answers,
         count(distinct (q.answered_at at time zone 'Asia/Tokyo')::date) as study_days
  from public.line_users u
  cross join settings s
  left join public.signup_attributions a on a.user_id = u.id
  left join public.question_attempts q on q.user_id = u.id
  where u.created_at >= s.started_at
    and u.merged_into is null
    and not (u.id = any(s.excluded_user_ids))
  group by u.id, a.utm_source, a.referrer_host, a.utm_campaign, a.ref, a.beta_granted_at
)
select source,
       campaign,
       count(*) as signups,
       count(*) filter (where answers >= 1) as answered,
       count(*) filter (where study_days >= 2) as returned,
       count(*) filter (where beta_granted_at is not null) as beta_granted
from signups
group by source, campaign
order by signups desc, source;

-- βテスター特典の残り枠（上限 10 = lib/growth/attribution.ts の BETA_CAP）。
-- select 10 - count(*) as beta_slots_left
--   from public.signup_attributions where beta_granted_at is not null;
