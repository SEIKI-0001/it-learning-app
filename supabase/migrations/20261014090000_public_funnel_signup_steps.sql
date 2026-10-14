-- 回遊イベントに「無料体験 → 登録 → 最初の学習問題」までの段階を足す（lib/growth/funnel.ts の FUNNEL_EVENTS）。
--   trial_start / trial_complete          … /lp/try の体験を操作した・最後のスライドまで進んだ
--   login_start                           … /login の Google / LINE ボタン（placement で区別）
--   onboarding_view 〜 first_answer       … 初回設定を開いた端末で、最初の問題に答えるまで（端末ごとに各1回）
-- 個人を特定する情報を持たない方針は変えない（visitor_id は端末の乱数、アカウントとは結びつけない）。

alter table public.public_funnel_events
  drop constraint if exists public_funnel_events_event_check;

alter table public.public_funnel_events
  add constraint public_funnel_events_event_check check (event in (
    'view', 'answer_open', 'click',
    'trial_start', 'trial_complete',
    'login_start',
    'onboarding_view', 'onboarding_complete', 'today_view', 'lesson_open',
    'first_question_view', 'first_answer'
  ));
