-- 意見箱（「その他」ページ）に寄せられたユーザーの声。
--
-- 1投稿1行。固定アンケートの user_feedback とは別に、自由記述の改善要望・誤りの指摘・不具合報告を集める。
--   category … improvement（改善してほしい）/ mistake（間違いを見つけた）/ bug（不具合）/ other
--   body     … 本文（1〜2000文字）
--   context  … どの画面・どの問題か（任意、200文字まで）
--   status   … 運営側の対応状況 new / read / done（運営が Supabase 上で更新する）
--
-- 書き込みは service role（/api/opinions）経由のみ。RLS 有効・公開ポリシー無し。

create table if not exists public.user_opinions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.line_users(id) on delete cascade,
  category text not null
    check (category in ('improvement', 'mistake', 'bug', 'other')),
  body text not null
    check (char_length(btrim(body)) between 1 and 2000),
  context text
    check (context is null or char_length(context) <= 200),
  status text not null default 'new'
    check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists user_opinions_created_at_idx
  on public.user_opinions (created_at desc);

create index if not exists user_opinions_user_created_idx
  on public.user_opinions (user_id, created_at desc);

alter table public.user_opinions enable row level security;
revoke all on public.user_opinions from public, anon, authenticated;
