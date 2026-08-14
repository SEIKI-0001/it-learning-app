-- ============================================================================
-- AI採点の回答記録（学習記録）を保存する（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 背景:
--   これまで AI採点は ai_usage_logs（回数制限・分析用のメタログ）にしか残らず、
--   ユーザーの回答本文や採点結果（点数・良かった点・解説など）は保存されていなかった。
--   選択式の user_answers と同じ思想で、AI採点専用の「学習記録」テーブルを新設する。
--
-- 設計:
--   - 1採点(成功)1行・追記。回数カウントは引き続き ai_usage_logs が担う（責務分離）。
--   - 集計しやすいよう score / grade / is_correct は列で持ち、詳細は jsonb result にも残す。
--   - アクセスは service role 経由のみ（RLS 有効・公開ポリシーなし）。
-- 何度実行しても安全なように IF NOT EXISTS を使う。
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.ai_grading_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.line_users(id) on delete cascade,

  question_id       text not null,
  category          text,
  user_answer       text not null,

  -- 採点結果（集計用の主要スカラ）
  score             integer not null,
  grade             text not null,
  is_correct        boolean not null,

  -- 採点結果（表示用の詳細）
  summary           text,
  good_points       text[] not null default '{}',
  missing_points    text[] not null default '{}',
  feedback          text,
  model_answer      text,
  next_review_theme text,

  -- 採点に使われたエンジン
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
