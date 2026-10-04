-- 参考書順の学習計画（Book mode）のための列追加。すべて追加のみ・既存データは変えない。
--
-- user_reference_books
--   book_id        … 本そのものの永続 id。書名・版違いを区別し、切替履歴・計画の復元に使う。
--                    既存行には default で自動採番される。本を別の本へ切り替えたら新しい id になる
--                    （採番は /api/reference-book/save が判断する）。
--   source         … どこから作った本か {kind: 'preset'|'catalog', id}。手入力・目次読み取りは null。
--   study_plan     … 参考書順の計画（ユニットごとの予定日など）。章構成とは独立に更新されるので別列。
--   archived_books … 切り替え前の本（読了状態・計画ごと）。最大5冊。端末内アーカイブの DB 版。
--
-- user_profiles
--   study_order_preference … 新規学習の順番の希望。null（未設定）は従来どおりアプリ順。
--
-- 書き込みは従来どおり service role（API Route）経由のみ。RLS・ポリシーは変更しない。

set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.user_reference_books
  add column if not exists book_id uuid not null default gen_random_uuid(),
  add column if not exists source jsonb
    check (source is null or jsonb_typeof(source) = 'object'),
  add column if not exists study_plan jsonb
    check (study_plan is null or jsonb_typeof(study_plan) = 'object'),
  add column if not exists archived_books jsonb not null default '[]'::jsonb
    check (jsonb_typeof(archived_books) = 'array' and jsonb_array_length(archived_books) <= 5);

alter table public.user_profiles
  add column if not exists study_order_preference text
    check (study_order_preference is null or study_order_preference in ('app', 'book'));
