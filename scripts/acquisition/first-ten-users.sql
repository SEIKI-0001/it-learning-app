-- Read-only acquisition report. Run against production fe-quest.
-- Starts with the 2026-09-29 08:06 JST baseline. Existing accounts do not count.
-- These are candidate accounts, not verified distinct external people.
-- Keep internal/test user UUIDs in a private query copy, never in Git.
with settings as (
  select timestamptz '2026-09-28 23:06:17.285351+00' as started_at,
         array[]::uuid[] as excluded_user_ids
), candidates as (
  select u.id, u.created_at, p.plan, p.pro_until,
         count(a.attempt_id) as answers,
         count(distinct (a.answered_at at time zone 'Asia/Tokyo')::date) as study_days
  from public.line_users u
  cross join settings s
  left join public.user_profiles p on p.user_id = u.id
  left join public.question_attempts a
    on a.user_id = u.id and a.recorded_at >= s.started_at
  where u.created_at >= s.started_at
    and u.merged_into is null
    and not (u.id = any(s.excluded_user_ids))
  group by u.id, u.created_at, p.plan, p.pro_until
)
select now() as measured_at,
       (select started_at from settings) as campaign_started_at,
       count(*) as new_accounts,
       count(*) filter (where answers >= 1) as activated_candidate_accounts,
       count(*) filter (where answers >= 3) as three_answer_candidate_accounts,
       count(*) filter (where study_days >= 2) as returning_candidate_accounts,
       count(*) filter (where answers >= 1 and (plan = 'pro' or pro_until > now())) as activated_pro_accounts,
       greatest(0, 10 - count(*) filter (where answers >= 1)) as remaining_candidate_accounts
from candidates;
