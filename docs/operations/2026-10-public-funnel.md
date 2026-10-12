# 公開ページの回遊計測（過去問 → 図解解説 → LP / 登録）

過去問ページ（/kakomon）が LP への導線として機能しているかを数えるための計測。
記録先は `public_funnel_events`（`supabase/migrations/20261012090000_public_funnel_events.sql`）、
送信は `components/growth/FunnelTracker.tsx`（/kakomon・/kaisetsu・/guide・/words・/lp に載る）。
登録した人の流入元は従来どおり `signup_attributions`（first-touch）で見る。

## 記録しているもの

| event | いつ | 主な列 |
| --- | --- | --- |
| `view` | 公開ページを表示した | `path` / `ref_path`（自サイト内の直前ページ）/ `referrer_host`（外部の直前サイト） |
| `answer_open` | 過去問の「正解と解説を見る」を開いた | `path` |
| `click` | 自サイト内リンクを押した | `path` / `target_path` / `placement` |

`placement`（リンクの置き場所）:

- `kakomon_answer_kaisetsu` … 解説を開いた中の「○○を図解で見る」（2026-10 追加）
- `kakomon_bottom_kaisetsu` … ページ下部の「この問題のテーマを基礎から学ぶ」（従来の位置）
- `cta_start` / `cta_lp` … 各ページ末尾 CTA の「無料で始める」/「機能と料金を見る」

`visitor_id` はブラウザが作る乱数（アカウントと結びつけない）。クローラーは保存しない。

## 見方（Supabase SQL Editor）

過去問の漏斗（直近 28 日・人数ベース）:

```sql
with e as (
  select * from public_funnel_events where created_at > now() - interval '28 days'
)
select
  count(distinct visitor_id) filter (where event = 'view' and path like '/kakomon/%/%') as kakomon_viewers,
  count(distinct visitor_id) filter (where event = 'answer_open') as answer_openers,
  count(distinct visitor_id) filter (where event = 'click' and path like '/kakomon/%' and target_path like '/kaisetsu/%') as to_kaisetsu,
  count(distinct visitor_id) filter (where event = 'view' and path like '/kaisetsu/%' and ref_path like '/kakomon/%') as kaisetsu_from_kakomon,
  count(distinct visitor_id) filter (where event = 'click' and placement in ('cta_start', 'cta_lp')) as cta_clickers,
  count(distinct visitor_id) filter (where event = 'view' and path like '/lp%') as lp_viewers
from e;
```

図解リンクの置き場所の比較:

```sql
select placement, count(*) as clicks, count(distinct visitor_id) as people
from public_funnel_events
where event = 'click' and placement like 'kakomon_%'
group by placement order by clicks desc;
```

登録まで進んだ人の着地ページ（first-touch）:

```sql
select landing_path, count(*) from signup_attributions
where created_at > now() - interval '28 days'
group by landing_path order by count desc;
```

母数が少ないうちは割合より人数そのものを見る。Search Console のクリック数（過去問ページ）と
`kakomon_viewers` が大きくずれていたら、計測漏れ（ブロッカー等）を疑う。
