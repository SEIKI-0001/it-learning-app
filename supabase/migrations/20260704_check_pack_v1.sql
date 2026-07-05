-- ============================================================================
-- 到達度判定型・低入力進捗管理 第2弾 — 確認パック（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 目的:
--   1) 確認問題・過去問レベル問題・ミニ模試の回答ログを保存する
--   2) 確認パック（確認問題＋単語帳＋過去問レベル問題）の実施結果を保存する
--
-- 方針:
--   - 自己申告では理解度・本番対応力を上げない。
--     確認問題＝基礎理解 / 単語帳＝用語定着 / 過去問レベル＝本番対応力。
--   - 本番対応OK（exam_ready）は過去問レベル問題の結果で判定する。
--   - アクセスは既存方針どおり service role 経由の API Route に限定
--     （RLS 有効・公開ポリシー無）。
--   - 既存の user_answers は壊さない。確認問題は当面 user_answers と
--     question_attempts の二重保存でも可。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- question_attempts : 問題（確認問題 / 過去問レベル / ミニ模試）の回答ログ
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
  source_task_id      uuid                     -- 対応する daily_study_tasks.task_id（任意）
);

create index if not exists question_attempts_user_topic_idx
  on public.question_attempts(user_id, topic_id);
create index if not exists question_attempts_user_type_idx
  on public.question_attempts(user_id, question_type);
create index if not exists question_attempts_user_answered_idx
  on public.question_attempts(user_id, answered_at);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.question_attempts enable row level security;

-- ----------------------------------------------------------------------------
-- topic_check_pack_attempts : 確認パックの実施結果
-- ----------------------------------------------------------------------------
-- result_status: passed / review_needed / weak / incomplete
--   - passed        : 過去問レベル問題で本番対応OK
--   - review_needed  : 基準未達（要復習）
--   - weak           : 同一トピックで複数回未達
--   - incomplete     : 途中までしか実施していない
create table if not exists public.topic_check_pack_attempts (
  attempt_id             uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.line_users(id) on delete cascade,
  pack_id                text not null,
  topic_id               text not null,
  started_at             timestamptz,
  completed_at           timestamptz,
  quiz_score_rate        integer,             -- 0〜100（確認問題の正答率）
  flashcard_score_rate   integer,             -- 0〜100（単語帳 mastered 相当率）
  exam_level_score_rate  integer,             -- 0〜100（過去問レベル問題の正答率）
  result_status          text not null default 'incomplete',
  next_action            text,
  created_at             timestamptz not null default now()
);

create index if not exists topic_check_pack_attempts_user_topic_idx
  on public.topic_check_pack_attempts(user_id, topic_id);
create index if not exists topic_check_pack_attempts_user_created_idx
  on public.topic_check_pack_attempts(user_id, created_at);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.topic_check_pack_attempts enable row level security;
