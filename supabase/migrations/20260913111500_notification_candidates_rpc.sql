-- GF-P0-006: 通知対象の判定材料を1回の呼び出しで返す。
--
-- なぜまとめるか:
--   Cron の1回の実行で REST を4本（設定・LINE連携・進捗・当日の配信記録）引いていた。
--   本番の PostgREST が終日 "Warp server error: Thread killed by timeout manager" を出しており、
--   往復が多いほど 504 に当たる確率が上がる。実際に通知が4時間連続で出せなかった。
--   1本にまとめて被弾面を減らし、同時に同一スナップショットで判定できるようにする。
--
-- 判定そのものはここに持ち込まない。誰にいつ何を送るかは従来どおり
-- lib/notifications/schedule.ts の純関数が決める（timezone とローカル日付の扱いを
-- SQL とアプリの2か所に分けない）。この関数は材料を集めるだけ。
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.list_due_notification_candidates(
  p_delivery_window_start date,
  p_delivery_window_end date,
  p_limit integer default 500
)
returns table (
  user_id uuid,
  line_user_id text,
  opt_in boolean,
  remind_hour smallint,
  timezone text,
  daily_reminder boolean,
  streak_risk boolean,
  comeback boolean,
  last_played_at timestamptz,
  streak_count integer,
  deliveries jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    preference.user_id,
    line_user.line_user_id,
    preference.opt_in,
    preference.remind_hour,
    preference.timezone,
    preference.daily_reminder,
    preference.streak_risk,
    preference.comeback,
    progress.last_played_at,
    coalesce(progress.streak_count, 0) as streak_count,
    -- 配信記録は前後1日ぶんを渡す。ユーザーごとにローカル日付が前後するため、
    -- どの行が「その人の今日」かの判定はアプリ側で行う。
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'notification_type', delivery.notification_type,
            'local_date', delivery.local_date
          )
        )
        from public.notification_deliveries delivery
        where delivery.user_id = preference.user_id
          and delivery.local_date between p_delivery_window_start and p_delivery_window_end
      ),
      '[]'::jsonb
    ) as deliveries
  from public.notification_preferences preference
  left join public.line_users line_user on line_user.id = preference.user_id
  left join public.user_progress progress on progress.user_id = preference.user_id
  where preference.opt_in
  order by preference.user_id
  limit greatest(coalesce(p_limit, 500), 0);
$$;

alter function public.list_due_notification_candidates(date, date, integer) owner to postgres;
revoke all on function public.list_due_notification_candidates(date, date, integer) from public;
revoke all on function public.list_due_notification_candidates(date, date, integer) from anon;
revoke all on function public.list_due_notification_candidates(date, date, integer) from authenticated;
revoke all on function public.list_due_notification_candidates(date, date, integer) from service_role;
grant execute on function public.list_due_notification_candidates(date, date, integer) to service_role;

comment on function public.list_due_notification_candidates(date, date, integer) is
  'GF-P0-006 collects opt-in preferences, LINE linkage, progress, and recent delivery records in one round trip. Decides nothing: scheduling stays in lib/notifications/schedule.ts.';
