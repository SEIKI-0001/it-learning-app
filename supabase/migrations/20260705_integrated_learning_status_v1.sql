-- ============================================================================
-- 統合進捗判定 第3弾 — 統合進捗スナップショット（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 目的:
--   確認問題(基礎理解) / 単語帳(用語定着) / 過去問レベル(本番対応力) / 日次達成度 を
--   統合した「合格に対する現在地」を 1日1スナップショットで保存する。
--
-- 方針:
--   - 自己申告（日次達成度）は外部学習の推定にだけ使う。理解度・本番対応力の判定には使わない。
--   - ルールベースで再現性のある判定（AI提案・計画修正の自動反映は次フェーズ）。
--   - アクセスは既存方針どおり service role 経由の API Route に限定（RLS 有効・公開ポリシー無）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- integrated_learning_status : 統合進捗の日次スナップショット
-- ----------------------------------------------------------------------------
-- overall_status: on_track / slightly_delayed / delayed / recovery_needed / consultation_needed
create table if not exists public.integrated_learning_status (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references public.line_users(id) on delete cascade,
  status_date                   date not null,
  overall_status                text not null,
  readiness_score               integer not null,
  input_progress_rate           integer,          -- 0〜100 インプット進捗（自己申告推定）
  basic_understanding_rate      integer,          -- 0〜100 基礎理解率
  flashcard_mastery_rate        integer,          -- 0〜100 用語定着率
  exam_ready_rate               integer,          -- 0〜100 本番対応率
  field_balance_score           integer,          -- 0〜100 分野バランス
  weak_topic_count              integer,
  exam_ready_topic_count        integer,
  basic_understood_topic_count  integer,
  review_needed_topic_count     integer,
  weak_topics                   jsonb,            -- WeakTopic[]
  main_risks                    jsonb,            -- MainRisk[]
  recommended_focus             jsonb,            -- { textbook, review, examPractice }
  generated_message             text,
  created_at                    timestamptz not null default now(),

  unique (user_id, status_date)
);

create index if not exists integrated_learning_status_user_date_idx
  on public.integrated_learning_status(user_id, status_date);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.integrated_learning_status enable row level security;
