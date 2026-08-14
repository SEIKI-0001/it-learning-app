-- ============================================================================
-- 参考書アウトライン（ユーザーごとの章構成）
-- ----------------------------------------------------------------------------
-- 参考書は書籍・年度・版で章構成が違うため固定データにせず、ユーザーごとに
-- 編集できる「アウトライン」として保存する。1ユーザー1冊（user_id を主キー）。
-- 章構成は可変構造のため jsonb でまるごと保存する。
-- アクセスは既存方針どおり service role 経由の API Route に限定（RLS 有効・公開ポリシー無）。
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
