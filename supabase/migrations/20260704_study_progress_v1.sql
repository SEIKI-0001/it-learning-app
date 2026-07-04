-- ============================================================================
-- 到達度判定型・低入力進捗管理 第1弾（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 目的:
--   1) /today で生成した今日の学習メニューを日次タスクとして保存する
--   2) 1日1回の達成度報告（低入力ボタン）を保存する
--   3) 確認問題の結果からトピック別ステージ（理解度）を更新する
--
-- 方針:
--   - 学習時間・分量の目安は計画側で使う。ユーザーには細かい報告をさせない。
--   - 日次達成度は「外部学習の推定」に使う自己申告（completion_source=self_report）。
--   - 理解度判定は自己申告ではなく確認問題結果（completion_source=app_actual）で行う。
--   - アクセスは既存方針どおり service role 経由の API Route に限定（RLS 有効・公開ポリシー無）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- daily_study_tasks : 今日出したタスク（/today のメニューを保存）
-- ----------------------------------------------------------------------------
create table if not exists public.daily_study_tasks (
  task_id                   uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.line_users(id) on delete cascade,
  date                      date not null,
  task_type                 text not null, -- textbook / diagram / topic_quiz / flashcard / exam_level / review
  topic_id                  text not null default '', -- unique を安定させるため空文字既定（NULL 不使用）
  title                     text not null default '',
  planned_quantity          text,          -- 分量の目安（例: "1テーマ"）。細かい数値は必須にしない。
  estimated_minutes         integer,
  status                    text not null default 'pending', -- pending / completed / partially_completed / skipped
  completion_source         text not null default 'self_report', -- self_report / app_actual
  estimated_completion_rate integer,       -- 0〜100（達成度報告からの推定）
  reason                    text,          -- 「今日これをやる理由」
  source                    text not null default 'today_menu',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- 同日・同種・同トピック・同タイトルのタスクは重複させない（メニュー再保存でも増えない）。
  constraint daily_study_tasks_unique_per_day
    unique (user_id, date, task_type, topic_id, title)
);

create index if not exists daily_study_tasks_user_date_idx
  on public.daily_study_tasks(user_id, date);
create index if not exists daily_study_tasks_user_topic_idx
  on public.daily_study_tasks(user_id, topic_id);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.daily_study_tasks enable row level security;

-- ----------------------------------------------------------------------------
-- daily_progress_reports : 1日1回の達成度報告（低入力）
-- ----------------------------------------------------------------------------
create table if not exists public.daily_progress_reports (
  report_id                 uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.line_users(id) on delete cascade,
  date                      date not null,
  selected_level            text not null, -- all / half / little / none / rest
  estimated_completion_rate integer,       -- all=100 / half=50 / little=25 / none=0 / rest=null
  optional_reason           text,          -- no_time / difficult / tired / forgot / other（任意・NULL可）
  created_at                timestamptz not null default now(),
  -- 1日1回。再入力は同日上書き。
  constraint daily_progress_reports_unique_per_day unique (user_id, date)
);

create index if not exists daily_progress_reports_user_date_idx
  on public.daily_progress_reports(user_id, date);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.daily_progress_reports enable row level security;

-- ----------------------------------------------------------------------------
-- topic_progress : トピック別ステージ（理解度）管理
-- ----------------------------------------------------------------------------
-- stage 候補:
--   not_started / input_guided / check_pending / basic_understood /
--   terms_stabilizing / exam_check_pending / exam_ready / review_needed /
--   weak / deferred
-- 「basic_understood 以上」への昇格は確認問題結果のみで行う（自己申告では上げない）。
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

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.topic_progress enable row level security;
