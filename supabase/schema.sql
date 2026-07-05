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
-- 学習開始日（ロードマップの経過日数の基点。オンボーディングで一度だけ設定）。
alter table public.user_profiles add column if not exists plan_start_date  date;
alter table public.user_profiles add column if not exists weekday_minutes  integer;
alter table public.user_profiles add column if not exists holiday_minutes  integer;
alter table public.user_profiles add column if not exists weak_fields      text[] not null default '{}';
alter table public.user_profiles add column if not exists study_style      text;

-- user_progress: トピック単位の進捗（完了トピック・習熟度・復習キュー）を追加
alter table public.user_progress add column if not exists completed_topics text[] not null default '{}';
alter table public.user_progress add column if not exists topic_mastery    jsonb  not null default '{}';
alter table public.user_progress add column if not exists review_queue     jsonb  not null default '[]';
-- 今週のタスクリスト（週初めに確定するスナップショット。null=未確定）。
alter table public.user_progress add column if not exists weekly_plan      jsonb;
-- current_day は 7日固定ロジックの名残。新規行のデフォルトは1のまま（参照しない）。

-- user_answers: どのトピックの確認問題かを記録（旧 day_no は互換のため残す）
alter table public.user_answers  add column if not exists topic_id text;
create index if not exists user_answers_topic_id_idx on public.user_answers(topic_id);

-- ---------------------------------------------------------------------------
-- user_word_progress : 英略語単語帳の進捗（1ユーザー1単語1行・UPSERT）
-- ---------------------------------------------------------------------------
-- localStorage(fequest:wordlistProgress) と二重保存する。クライアントは epoch ms を
-- 扱うが、DB は timestamptz（API Route 側で相互変換）。
--   status           : new / learning / weak / mastered
--   last_self_rating : remembered / vague / forgot / null
create table if not exists public.user_word_progress (
  user_id          uuid not null references public.line_users(id) on delete cascade,
  word_id          text not null,

  status           text not null default 'new',
  correct_count    integer not null default 0,
  wrong_count      integer not null default 0,
  review_count     integer not null default 0,

  last_reviewed_at timestamptz,
  next_review_at   timestamptz,
  last_self_rating text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  primary key (user_id, word_id)
);
create index if not exists user_word_progress_user_id_idx on public.user_word_progress(user_id);
create index if not exists user_word_progress_status_idx on public.user_word_progress(status);
create index if not exists user_word_progress_next_review_at_idx on public.user_word_progress(next_review_at);
create index if not exists user_word_progress_updated_at_idx on public.user_word_progress(updated_at);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.user_word_progress enable row level security;

-- ============================================================================
-- AI採点 Pro（有料）／課金連携（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 既存テーブルは壊さず、列の追加と新テーブルのみで拡張する。
-- 何度実行しても安全なように ADD COLUMN IF NOT EXISTS / IF NOT EXISTS を使う。
-- ============================================================================

-- user_profiles: 契約プラン（free / pro）と Stripe 連携情報を追加。
--   plan               : 'free'（無料・Gemini採点）/ 'pro'（有料・Claude Sonnet採点）
--   stripe_customer_id : Stripe の customer ID（解約/更新の webhook 紐づけ用）
alter table public.user_profiles add column if not exists plan               text not null default 'free';
alter table public.user_profiles add column if not exists stripe_customer_id text;
alter table public.user_profiles add column if not exists plan_updated_at    timestamptz;
create index if not exists user_profiles_stripe_customer_id_idx on public.user_profiles(stripe_customer_id);

-- ---------------------------------------------------------------------------
-- ai_usage_logs : AI採点の利用ログ（1採点1行・追記）。回数制限と分析に使う。
--   provider : gemini / claude
--   status   : success / error / rate_limited
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.line_users(id) on delete cascade,
  provider    text not null,
  model       text,
  question_id text,
  status      text not null default 'success',
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_logs_user_id_idx on public.ai_usage_logs(user_id);
create index if not exists ai_usage_logs_user_created_idx on public.ai_usage_logs(user_id, created_at);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.ai_usage_logs enable row level security;

-- ============================================================================
-- Google ログイン（Supabase Auth）連携（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 詳細は supabase/migrations/20260628_google_auth.sql を参照。
-- line_users を「アカウント本体（ハブ）」とし、LINE / Google / メール / Stripe を集約する。
--   line_user_id : LINE（初回導線）。Google 単独ユーザーは NULL。
--   auth_user_id : Supabase Auth（Google）の auth.users.id。
--   email        : Google から取得した表示用メール。
-- 既存テーブルの外部キーは今まで通り public.line_users.id を指したまま無変更。
-- ============================================================================
alter table public.line_users alter column line_user_id drop not null;
alter table public.line_users add column if not exists auth_user_id uuid;
alter table public.line_users add column if not exists email        text;
create unique index if not exists line_users_auth_user_id_key
  on public.line_users(auth_user_id)
  where auth_user_id is not null;

-- ============================================================================
-- AI採点の回答記録（学習記録）（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 詳細は supabase/migrations/20260628_ai_grading_records.sql を参照。
-- ai_usage_logs（回数制限・分析用メタログ）とは別に、ユーザーの回答本文と採点結果を
-- 1採点(成功)1行で残す。選択式の user_answers に対応する AI採点版の学習記録。
-- ============================================================================
create table if not exists public.ai_grading_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.line_users(id) on delete cascade,

  question_id       text not null,
  category          text,
  user_answer       text not null,

  score             integer not null,
  grade             text not null,
  is_correct        boolean not null,

  summary           text,
  good_points       text[] not null default '{}',
  missing_points    text[] not null default '{}',
  feedback          text,
  model_answer      text,
  next_review_theme text,

  provider          text,
  model             text,

  created_at        timestamptz not null default now()
);
create index if not exists ai_grading_records_user_id_idx
  on public.ai_grading_records(user_id);
create index if not exists ai_grading_records_user_created_idx
  on public.ai_grading_records(user_id, created_at);
create index if not exists ai_grading_records_question_id_idx
  on public.ai_grading_records(question_id);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.ai_grading_records enable row level security;

-- ============================================================================
-- 参考書アウトライン（ユーザーごとの章構成）（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 詳細は supabase/migrations/20260701_reference_book.sql を参照。
-- 参考書は書籍・年度・版で章構成が違うため固定データにせず、ユーザーごとに
-- 編集できる「アウトライン」として 1ユーザー1冊で保存する（章構成は jsonb）。
-- ============================================================================
create table if not exists public.user_reference_books (
  user_id    uuid primary key references public.line_users(id) on delete cascade,
  title      text,
  publisher  text,
  edition    text,
  active     boolean not null default true,
  note       text,
  chapters   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.user_reference_books enable row level security;

-- ============================================================================
-- 到達度判定型・低入力進捗管理 第1弾（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 詳細は supabase/migrations/20260704_study_progress_v1.sql を参照。
--   daily_study_tasks    : /today のメニューを日次タスクとして保存（重複作成しない）
--   daily_progress_reports: 1日1回の達成度報告（低入力・同日上書き）
--   topic_progress       : トピック別ステージ（理解度は確認問題結果でのみ判定）
-- アクセスは既存方針どおり service role 経由（RLS 有効・公開ポリシー無）。
-- ============================================================================
create table if not exists public.daily_study_tasks (
  task_id                   uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.line_users(id) on delete cascade,
  date                      date not null,
  task_type                 text not null,
  topic_id                  text not null default '',
  title                     text not null default '',
  planned_quantity          text,
  estimated_minutes         integer,
  status                    text not null default 'pending',
  completion_source         text not null default 'self_report',
  estimated_completion_rate integer,
  reason                    text,
  source                    text not null default 'today_menu',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint daily_study_tasks_unique_per_day
    unique (user_id, date, task_type, topic_id, title)
);
create index if not exists daily_study_tasks_user_date_idx
  on public.daily_study_tasks(user_id, date);
create index if not exists daily_study_tasks_user_topic_idx
  on public.daily_study_tasks(user_id, topic_id);
alter table public.daily_study_tasks enable row level security;

create table if not exists public.daily_progress_reports (
  report_id                 uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.line_users(id) on delete cascade,
  date                      date not null,
  selected_level            text not null,
  estimated_completion_rate integer,
  optional_reason           text,
  created_at                timestamptz not null default now(),
  constraint daily_progress_reports_unique_per_day unique (user_id, date)
);
create index if not exists daily_progress_reports_user_date_idx
  on public.daily_progress_reports(user_id, date);
alter table public.daily_progress_reports enable row level security;

create table if not exists public.topic_progress (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.line_users(id) on delete cascade,
  topic_id                  text not null,
  stage                     text not null default 'not_started',
  latest_quiz_score         integer,
  latest_exam_level_score   integer,
  quiz_attempt_count        integer not null default 0,
  exam_level_attempt_count  integer not null default 0,
  consecutive_failed_count  integer not null default 0,
  last_attempted_at         timestamptz,
  next_review_at            timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint topic_progress_unique_per_topic unique (user_id, topic_id)
);
create index if not exists topic_progress_user_idx
  on public.topic_progress(user_id);
create index if not exists topic_progress_user_stage_idx
  on public.topic_progress(user_id, stage);
alter table public.topic_progress enable row level security;

-- ----------------------------------------------------------------------------
-- question_attempts : 問題（確認問題 / 過去問レベル / ミニ模試）の回答ログ（第2弾）
-- ----------------------------------------------------------------------------
create table if not exists public.question_attempts (
  attempt_id          uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.line_users(id) on delete cascade,
  question_id         text not null,
  question_type       text not null,          -- topic_quiz / exam_level / mini_exam
  topic_id            text not null,
  selected_answer     text,
  is_correct          boolean not null,
  mistake_reason      text,
  answered_at         timestamptz not null default now(),
  time_spent_seconds  integer,
  source_task_id      uuid
);
create index if not exists question_attempts_user_topic_idx
  on public.question_attempts(user_id, topic_id);
create index if not exists question_attempts_user_type_idx
  on public.question_attempts(user_id, question_type);
create index if not exists question_attempts_user_answered_idx
  on public.question_attempts(user_id, answered_at);
alter table public.question_attempts enable row level security;

-- ----------------------------------------------------------------------------
-- topic_check_pack_attempts : 確認パックの実施結果（第2弾）
-- ----------------------------------------------------------------------------
create table if not exists public.topic_check_pack_attempts (
  attempt_id             uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.line_users(id) on delete cascade,
  pack_id                text not null,
  topic_id               text not null,
  started_at             timestamptz,
  completed_at           timestamptz,
  quiz_score_rate        integer,
  flashcard_score_rate   integer,
  exam_level_score_rate  integer,
  result_status          text not null default 'incomplete', -- passed / review_needed / weak / incomplete
  next_action            text,
  created_at             timestamptz not null default now()
);
create index if not exists topic_check_pack_attempts_user_topic_idx
  on public.topic_check_pack_attempts(user_id, topic_id);
create index if not exists topic_check_pack_attempts_user_created_idx
  on public.topic_check_pack_attempts(user_id, created_at);
alter table public.topic_check_pack_attempts enable row level security;
