-- 公開ページ（/kakomon・/kaisetsu・/guide・/words・/lp）の回遊イベント。
-- 「過去問 → 図解解説 → LP / 登録」のどこで落ちているかを数える（lib/growth/funnel.ts）。
--
-- 個人を特定する情報は持たない:
--   visitor_id    … ブラウザが作る乱数（アカウントとは結びつけない）
--   referrer_host … 外部の直前サイトのホスト名だけ（パスやクエリは保存しない）
--   ref_path      … 自サイト内の直前ページのパス（クエリなし）
--
-- 書き込みは service role（/api/funnel）経由のみ。RLS 有効・公開ポリシー無し。

create table if not exists public.public_funnel_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event text not null check (event in ('view', 'answer_open', 'click')),
  path text not null check (char_length(path) <= 255),
  target_path text check (target_path is null or char_length(target_path) <= 255),
  placement text check (placement is null or char_length(placement) <= 64),
  ref_path text check (ref_path is null or char_length(ref_path) <= 255),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  visitor_id text check (visitor_id is null or char_length(visitor_id) <= 32)
);

create index if not exists public_funnel_events_created_idx
  on public.public_funnel_events (created_at desc);

alter table public.public_funnel_events enable row level security;
revoke all on public.public_funnel_events from public, anon, authenticated;
