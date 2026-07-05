-- ============================================================================
-- リカバリ案・計画修正 第4弾 — 立て直し提案（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 目的:
--   統合進捗（integrated_learning_status）から遅れ・弱点・リスクを検知し、
--   ルールベースで複数の「立て直し案（RecoveryPlanOption）」を提示・保存する。
--
-- 方針:
--   - AI連携は使わない。すべてルールベースで再現性を優先する（提案生成は lib/planAdjustment）。
--   - 計画変更は自動反映しない。ユーザーが accept した場合のみ user_progress.weekly_plan 等を補正。
--   - 受験日延期（postpone_exam）は「失敗」ではなく合格可能性を上げる選択肢として扱う。
--     exam_date は自動変更せず、selected_option_id に記録するだけ（設定画面での手動変更に委ねる）。
--   - アクセスは既存方針どおり service role 経由の API Route に限定（RLS 有効・公開ポリシー無）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- plan_adjustment_proposals : 立て直し提案（1提案1行）
-- ----------------------------------------------------------------------------
-- trigger_type: delay / weak_topics / low_exam_ready / low_flashcard / low_daily_progress / near_exam
-- severity    : slight / moderate / severe
-- status      : proposed / accepted / rejected / expired
create table if not exists public.plan_adjustment_proposals (
  proposal_id       uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.line_users(id) on delete cascade,
  status_date       date not null,
  source_status_id  uuid,             -- 元にした integrated_learning_status.id（任意）
  trigger_type      text not null,
  severity          text not null,
  headline          text not null,
  reason_summary    text,
  options           jsonb not null,   -- RecoveryPlanOption[]
  selected_option_id text,            -- accept 時に選ばれた optionId
  status            text not null default 'proposed',
  accepted_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists plan_adjustment_proposals_user_date_idx
  on public.plan_adjustment_proposals(user_id, status_date);
create index if not exists plan_adjustment_proposals_user_status_idx
  on public.plan_adjustment_proposals(user_id, status);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.plan_adjustment_proposals enable row level security;
