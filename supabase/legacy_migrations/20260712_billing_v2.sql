-- ============================================================================
-- マイグレーション: 課金体系v2（買い切り3プラン＋月額サブスク＋7日間無料記録期間）
-- 作成日: 2026-07-12
-- ----------------------------------------------------------------------------
-- 目的:
--   - 買い切り購入の有効期限 user_profiles.pro_until を追加
--     （Pro判定は plan='pro'（サブスク） OR pro_until > now()）
--   - 購入履歴テーブル billing_purchases を新設
--     （「その他」ページの購入履歴表示と webhook の冪等挿入に使う）
--
-- 安全性:
--   - すべて冪等（IF NOT EXISTS / ADD COLUMN IF NOT EXISTS）。何度実行しても壊れない。
--   - 既存テーブル・既存データの削除/変更なし（列追加と新テーブルのみ）。
--
-- 前提:
--   - 20260628_ai_grading_pro.txt 適用済み（user_profiles.plan / stripe_customer_id）
--   - 20260710_billing_webhook_retries.sql 適用済み（stripe_webhook_events）
--
-- 使い方:
--   Supabase ダッシュボード → SQL Editor に貼り付けて実行。
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) user_profiles: 買い切りProの有効期限。
--    NULL = 買い切り購入なし。購入ごとに max(now, pro_until) + Nヶ月 へ延長する。
-- ---------------------------------------------------------------------------
alter table if exists public.user_profiles
  add column if not exists pro_until timestamptz;

-- ---------------------------------------------------------------------------
-- 2) billing_purchases: 購入履歴（1購入1行・追記のみ）。
--    stripe_checkout_session_id の unique 制約で webhook 再送時の重複挿入を防ぐ。
-- ---------------------------------------------------------------------------
create table if not exists public.billing_purchases (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.line_users(id) on delete cascade,
  kind                        text not null check (kind in ('one_time', 'subscription')),
  plan_key                    text not null,
  months                      integer,
  amount_total                integer,
  currency                    text,
  stripe_checkout_session_id  text not null unique,
  stripe_payment_intent_id    text,
  created_at                  timestamptz not null default now()
);

create index if not exists billing_purchases_user_created_idx
  on public.billing_purchases(user_id, created_at desc);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定（既存方針と同じ）。
alter table public.billing_purchases enable row level security;

commit;
