-- 学習ループP0: Topic Masteryの評価根拠を後方互換で保存する。
-- 既存のtopic_mastery（数値投影）はUI互換のため維持し、旧ユーザーを習得済みに
-- 推定しない。空オブジェクトから新しい問題回答だけを根拠として蓄積する。
-- production baselineには同一columnとcommentが既に含まれるため、本番適用時の
-- ADD COLUMN IF NOT EXISTSはno-opとなる。P0のリリース順序をmigration historyへ
-- 記録し、新規環境でbaseline -> P0の順を再現するためにこのmigrationを保持する。

begin;

alter table public.user_progress
  add column if not exists topic_mastery_stats jsonb not null default '{}';

comment on column public.user_progress.topic_mastery_stats is
  'Topic単位のmasteryScore、評価日時、正誤回数、復習成功回数、直近評価根拠。旧データは推定せず空から開始。';

commit;
