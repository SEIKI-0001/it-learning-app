-- GF-P0-006: LINE 学習リマインダーの設定と送信記録。
--
-- 通知は明示オプトイン制。ここに置くのは「送ってよいか」と「もう送ったか」だけで、
-- 学習データ（user_progress / question_attempts など）には一切書き戻さない。
-- push や Cron が失敗しても学習状態へ副作用が出ないための境界がこの2テーブル。
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- 通知設定。行が無い＝未オプトイン（既定で送らない）。
create table public.notification_preferences (
  user_id uuid primary key references public.line_users (id) on delete cascade,
  opt_in boolean not null default false,
  -- 定時リマインドを送るローカル時刻の「時」。分は持たない（Cron は毎時実行）。
  remind_hour smallint not null default 20 check (remind_hour between 0 and 23),
  -- IANA タイムゾーン。ローカル日付境界の判定に使う。
  timezone text not null default 'Asia/Tokyo'
    check (length(btrim(timezone)) > 0 and length(timezone) <= 64),
  -- 種別ごとの停止。opt_in が false ならすべて送らない。
  daily_reminder boolean not null default true,
  streak_risk boolean not null default true,
  comeback boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

alter table public.notification_preferences owner to postgres;
alter table public.notification_preferences enable row level security;

comment on table public.notification_preferences is
  'GF-P0-006 opt-in state, local reminder hour, timezone, and per-type switches for LINE study reminders.';

-- 送信記録。(user_id, notification_type, local_date) が冪等キーそのもの。
-- primary key が重複送信の唯一の防止機構で、アプリ側の判定はその前段の最適化にすぎない。
create table public.notification_deliveries (
  user_id uuid not null references public.line_users (id) on delete cascade,
  notification_type text not null check (
    notification_type in ('daily_reminder', 'streak_risk', 'comeback')
  ),
  local_date date not null,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  -- 監査用の最小情報のみ。本文やユーザーの学習内容は保存しない。
  detail text check (detail is null or length(detail) <= 512),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, notification_type, local_date)
);

alter table public.notification_deliveries owner to postgres;
alter table public.notification_deliveries enable row level security;

-- 同一ユーザー・同一ローカル日の通知総数（種別横断の上限）を数えるための索引。
create index notification_deliveries_user_local_date_idx
  on public.notification_deliveries (user_id, local_date);

comment on table public.notification_deliveries is
  'GF-P0-006 idempotency and audit record keyed by user, notification type, and the user local date. Never written back to learning state.';
