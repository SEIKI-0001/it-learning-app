-- 目次の共有カタログ。
--
-- ユーザーが目次のスクショ（または貼り付け）で登録した参考書の章立てを共通の土台に残し、
-- 他のユーザーが同じ本を登録するときに選べるようにする。
--   reference_book_catalog             … 本（書名＋版）ごと・章立ての構造ごとに1行
--     normalized_key  … 正規化した書名＋版（照合用）
--     structure_hash  … 章・節の名前と紐づけの指紋（同じ構造の提出を1行にまとめる）
--     chapters        … 共有するのは章・節の名前・キーワード・トピックの紐づけだけ。
--                       メモ・読了状況・計画・ユーザーの情報は含めない（API が取り除いてから入れる）
--     status          … pending（未確認）/ approved（運営が承認）/ hidden（非表示）
--     submit_count    … 別々の利用者からの提出数（統合されたアカウントは1人として数える）
--   reference_book_catalog_submissions … 誰が提出したか（重複提出の防止と人数の数え直し用）。
--                       他の利用者には見せない。
-- 他の利用者に出すのは approved か、submit_count >= 2 のもの（hidden は出さない）。
-- 読み書きは service role（API Route）経由のみ。RLS 有効・公開ポリシー無し。

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.reference_book_catalog (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null check (char_length(normalized_key) between 1 and 200),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  publisher text check (publisher is null or char_length(publisher) <= 100),
  edition text check (edition is null or char_length(edition) <= 100),
  chapters jsonb not null check (jsonb_typeof(chapters) = 'array'),
  structure_hash text not null check (char_length(structure_hash) between 1 and 64),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  submit_count integer not null default 0 check (submit_count >= 0),
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_key, structure_hash)
);

create index if not exists reference_book_catalog_key_idx
  on public.reference_book_catalog (normalized_key);

create table if not exists public.reference_book_catalog_submissions (
  catalog_id uuid not null references public.reference_book_catalog(id) on delete cascade,
  user_id uuid not null references public.line_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (catalog_id, user_id)
);

alter table public.reference_book_catalog enable row level security;
alter table public.reference_book_catalog_submissions enable row level security;
