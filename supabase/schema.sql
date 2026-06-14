-- ============================================================================
-- FE Quest — Supabase スキーマ（ユーザー別進捗保存・検証データ収集用）
-- ============================================================================
-- 使い方:
--   Supabase ダッシュボード → SQL Editor にこのファイルの内容を貼り付けて実行。
--   何度実行しても安全なように IF NOT EXISTS / ON CONFLICT を使っています。
--
-- 設計方針（プロトタイプ）:
--   - すべてのアクセスはサーバー側の API Route から service role 経由で行う想定。
--   - RLS は有効化しておくが、公開ポリシーは作らない（= anon key では読み書き不可）。
--     service role キーは RLS をバイパスするため、API Route からは問題なく読み書きできる。
--   - これにより NEXT_PUBLIC_SUPABASE_ANON_KEY がクライアントに露出しても
--     DB は直接触れない（service role キーはサーバーのみ）。
-- ============================================================================

-- gen_random_uuid() を使うため
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- line_users : LINE userId と内部 user_id(UUID) の対応表
-- ---------------------------------------------------------------------------
create table if not exists public.line_users (
  id            uuid primary key default gen_random_uuid(),
  line_user_id  text not null unique,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_profiles : 初回診断（オンボーディング）の回答
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id        uuid primary key references public.line_users(id) on delete cascade,
  it_experience  text,
  daily_minutes  text,
  exam_plan      text,
  confidence     integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_progress : ユーザーごとの進捗（1ユーザー1行・UPSERT）
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id        uuid primary key references public.line_users(id) on delete cascade,
  current_day    integer not null default 1,
  exp            integer not null default 0,
  level          integer not null default 1,
  completed_days integer[] not null default '{}',
  streak_count   integer not null default 0,
  weak_tags      text[] not null default '{}',
  last_played_at timestamptz,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_answers : 回答履歴（1回答1行・追記）
-- ---------------------------------------------------------------------------
create table if not exists public.user_answers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.line_users(id) on delete cascade,
  question_id     text not null,
  day_no          integer not null,
  selected_choice text,
  is_correct      boolean not null,
  tag             text,
  answered_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists user_answers_user_id_idx on public.user_answers(user_id);
create index if not exists user_answers_tag_idx on public.user_answers(tag);

-- ---------------------------------------------------------------------------
-- user_feedback : 簡易フィードバック（Day1 / Day7 完了後）
-- ---------------------------------------------------------------------------
create table if not exists public.user_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.line_users(id) on delete cascade,
  day_no      integer,                 -- どのマイルストーンの直後か（1 or 7 を想定）
  q1_service  text,                    -- 最初に見て、何のサービスだと思いましたか？
  q2_tedious  text,                    -- 面倒だと感じたところはありましたか？
  q3_unclear  text,                    -- 分かりにくい言葉はありましたか？
  q4_onemore  text,                    -- もう1日分やってもいいと思いましたか？
  q5_easier   text,                    -- 普通の資格アプリより楽そうに感じましたか？
  created_at  timestamptz not null default now()
);
create index if not exists user_feedback_user_id_idx on public.user_feedback(user_id);

-- ---------------------------------------------------------------------------
-- line_sessions : LINE → Web を紐づける一時トークン
-- ---------------------------------------------------------------------------
create table if not exists public.line_sessions (
  token       text primary key,
  user_id     uuid not null references public.line_users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days')
);
create index if not exists line_sessions_user_id_idx on public.line_sessions(user_id);

-- ---------------------------------------------------------------------------
-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
-- ---------------------------------------------------------------------------
alter table public.line_users    enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_answers  enable row level security;
alter table public.user_feedback enable row level security;
alter table public.line_sessions enable row level security;

-- ============================================================================
-- ITパスポート学習コーチ への移行（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 既存の 7日版テーブルは壊さず、列の追加のみで拡張する。
-- 何度実行しても安全なように ADD COLUMN IF NOT EXISTS を使う。
-- 旧列(current_day / completed_days)はそのまま残す（後方互換）。
-- ============================================================================

-- user_profiles: 試験予定日・学習可能時間・苦手分野・学習スタイルを追加
alter table public.user_profiles add column if not exists exam_date        date;
alter table public.user_profiles add column if not exists weekday_minutes  integer;
alter table public.user_profiles add column if not exists holiday_minutes  integer;
alter table public.user_profiles add column if not exists weak_fields      text[] not null default '{}';
alter table public.user_profiles add column if not exists study_style      text;

-- user_progress: トピック単位の進捗（完了トピック・習熟度・復習キュー）を追加
alter table public.user_progress add column if not exists completed_topics text[] not null default '{}';
alter table public.user_progress add column if not exists topic_mastery    jsonb  not null default '{}';
alter table public.user_progress add column if not exists review_queue     jsonb  not null default '[]';
-- current_day は 7日固定ロジックの名残。新規行のデフォルトは1のまま（参照しない）。

-- user_answers: どのトピックの確認問題かを記録（旧 day_no は互換のため残す）
alter table public.user_answers  add column if not exists topic_id text;
create index if not exists user_answers_topic_id_idx on public.user_answers(topic_id);
