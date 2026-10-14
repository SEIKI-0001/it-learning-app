# 無料体験 → 登録 → 最初の学習問題 の計測

`/lp/try` で体験した人が、登録して最初の確認問題に答えるまでのどこで止まるかを数える。
記録先は公開ページと同じ `public_funnel_events`（[2026-10-public-funnel.md](2026-10-public-funnel.md)）。
イベントを足すための制約変更は `supabase/migrations/20261014090000_public_funnel_signup_steps.sql`
（**本番に適用するまで新しいイベントは保存されず、黙って捨てられる**）。

## 導線（2026-10 変更後）

```
/lp/try（登録不要）
  ├ 体験を操作 ……………………… trial_start
  ├ 最後のスライドまで進む …… trial_complete
  │    → 完了カード（続けるメリット3点）＋ スマホは画面下に固定の登録ボタン（閉じられる）
  └ 登録ボタン …………………… click / placement = trial_done_signup | trial_sticky_signup | trial_bottom_signup
/login?next=/onboarding&from=trial
  ├ 表示 …………………………… view（path = /login）
  └ Google / LINE を押す ……… login_start / placement = login_google | login_line
（Google 認可 → /auth/callback：新規なら signup_attributions に流入元を記録）
/onboarding
  ├ フォームを表示 ……………… onboarding_view   ← ここから先は「この端末で初回設定を開いた人」だけ
  └ 「この内容でプランを作る」 onboarding_complete
/today ……………………………………… today_view
/learn/…/<トピック>（レッスン） … lesson_open
確認問題が画面に入る …………… first_question_view
最初の問題に答える ………………… first_answer   ← 以降この端末では送らない（14日で期限切れ）
```

- 登録後の段階は端末ごとに各1回（`lib/growth/firstRunFunnel.ts`、localStorage `fq_first_run`）。
- `visitor_id` は公開ページと同じ端末の乱数なので、**同じ端末なら体験 → 登録後まで同じ人として数えられる**。
  アカウントとは結びつけない（Google で別端末に移った人はそこで途切れる）。
- LINE で登録した人は LINE アプリへ移るので、/login の `login_start(login_line)` の先は
  LINEのトークから /onboarding を開いた時点で別の visitor_id になることがある。
- 設定済みの人が /onboarding に来た場合は /today へ戻す（プランの作り直しで進捗が初期化されるのを防ぐ）。

## 見方（Supabase SQL Editor）

体験 → 登録画面（直近 28 日・人数）:

```sql
with e as (select * from public_funnel_events where created_at > now() - interval '28 days')
select
  count(distinct visitor_id) filter (where event = 'view' and path = '/lp/try') as trial_viewers,
  count(distinct visitor_id) filter (where event = 'trial_start') as trial_started,
  count(distinct visitor_id) filter (where event = 'trial_complete') as trial_completed,
  count(distinct visitor_id) filter (where event = 'click' and placement like 'trial_%_signup') as signup_cta_clickers,
  count(distinct visitor_id) filter (where event = 'view' and path = '/login') as login_viewers,
  count(distinct visitor_id) filter (where event = 'login_start') as login_starters
from e;
```

登録ボタンの置き場所の比較:

```sql
select placement, count(*) as clicks, count(distinct visitor_id) as people
from public_funnel_events
where event = 'click' and placement like 'trial_%'
group by placement order by clicks desc;
```

登録後、最初の問題までの離脱点（直近 28 日・人数。上から順に減っていく）:

```sql
with e as (select * from public_funnel_events where created_at > now() - interval '28 days'),
steps(ord, step) as (values
  (1, 'onboarding_view'), (2, 'onboarding_complete'), (3, 'today_view'),
  (4, 'lesson_open'), (5, 'first_question_view'), (6, 'first_answer'))
select s.ord, s.step, count(distinct e.visitor_id) as people
from steps s left join e on e.event = s.step
group by s.ord, s.step order by s.ord;
```

体験から来た人だけに絞る（同じ端末で trial_complete がある人の、登録後の到達）:

```sql
with e as (select * from public_funnel_events where created_at > now() - interval '28 days'),
trial as (select distinct visitor_id from e where event = 'trial_complete' and visitor_id is not null)
select event, count(distinct visitor_id) as people
from e join trial using (visitor_id)
where event in ('login_start', 'onboarding_view', 'onboarding_complete', 'today_view',
                'lesson_open', 'first_question_view', 'first_answer')
group by event order by people desc;
```

母数が少ないうちは割合より人数を見る。`first_question_view` はあるのに `first_answer` が
少なければ問題の難しさ・表示、`lesson_open` で止まるなら解説の長さを疑う。
