-- モチット AI 相談の利用イベント（計測＋1日の送信回数制限）。
--
-- 会話本文は保存しない（利用規約・プライバシーポリシーとの整合を確認するまで持たない）。
-- 残すのは「いつ・どのページで・どの入口から・どの種類の相談をしたか」だけ。
--
-- event  … mochit_open / mochit_message_sent / mochit_quick_action_clicked / mochit_question_help_opened /
--           mochit_reflection_started / mochit_reflection_completed / mochit_reflection_dismissed /
--           mochit_return_to_learning / mochit_error
-- page   … today / learn / progress / question / general
-- source … quick_action / free_input / reflection / button など
-- intent … status / today / plan / question / learn / reflection / general
--
-- 書き込みは service role（API Route）経由のみ。RLS 有効・公開ポリシー無し。

create table if not exists public.mochit_ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.line_users(id) on delete cascade,
  event text not null check (char_length(event) <= 64),
  page text check (page is null or char_length(page) <= 32),
  source text check (source is null or char_length(source) <= 32),
  intent text check (intent is null or char_length(intent) <= 32),
  created_at timestamptz not null default now()
);

create index if not exists mochit_ai_events_user_event_created_idx
  on public.mochit_ai_events (user_id, event, created_at);

alter table public.mochit_ai_events enable row level security;
revoke all on public.mochit_ai_events from public, anon, authenticated;
