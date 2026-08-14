-- ============================================================================
-- Google ログイン（Supabase Auth）連携 — 加算マイグレーション
-- ----------------------------------------------------------------------------
-- 目的:
--   Web 利用のアカウント本体を Google ログイン（Supabase Auth）に寄せつつ、
--   既存の LINE 起点ユーザー（line_users / user_progress / ...）を壊さない。
--
-- 方針（段階的移行・全面DB移行はしない）:
--   - 内部ユーザーの正体は今まで通り public.line_users.id（UUID）。
--     既存テーブルの外部キーはすべてここを指したまま無変更。
--   - line_users を「アカウント本体（ハブ）」として扱い、複数プロバイダを集約する:
--       line_user_id  … LINE（初回導線・通知）。Google 単独ユーザーは NULL。
--       auth_user_id  … Supabase Auth（Google）の auth.users.id。
--       email         … Google から取得した表示用メール。
--       stripe_customer_id … 既存（課金）。
--   - これにより LINE / Google / メール / Stripe を 1 ユーザーへ統合できる。
--
-- 何度実行しても安全なように IF NOT EXISTS / DROP NOT NULL を使う。
-- ============================================================================

-- Google 単独ユーザーには LINE userId が無いため、NOT NULL を外す。
-- （unique 制約は維持。Postgres では NULL は unique 上「互いに異なる」扱いなので
--   複数の Google 単独ユーザー＝line_user_id NULL が共存できる。）
alter table public.line_users alter column line_user_id drop not null;

-- Supabase Auth（Google）の auth.users.id と、表示用メール。
alter table public.line_users add column if not exists auth_user_id uuid;
alter table public.line_users add column if not exists email        text;

-- 1 つの Google アカウント = 1 つの内部ユーザー（部分ユニーク・NULL は対象外）。
create unique index if not exists line_users_auth_user_id_key
  on public.line_users(auth_user_id)
  where auth_user_id is not null;
