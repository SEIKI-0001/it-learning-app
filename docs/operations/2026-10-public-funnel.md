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

## 英略語ページ（/words）→「1問で確認」→ 登録（2026-10-17 追加）

/words/[id] の定義表の下に4択1問（components/guide/WordMiniQuiz.tsx）を置いた。答えると
`answer_open`（placement=`words_quiz`）、答えたあとの登録ボタンは `click`（`words_quiz_cta`）、
LP ボタンは `click`（`words_quiz_lp`）。placement は自由トークンなので migration は不要。

```sql
with e as (
  select * from public_funnel_events
  where created_at > now() - interval '28 days' and path like '/words/%'
)
select
  count(distinct visitor_id) filter (where event = 'view') as word_viewers,
  count(distinct visitor_id) filter (where event = 'answer_open' and placement = 'words_quiz') as quiz_answerers,
  count(distinct visitor_id) filter (where event = 'click' and placement = 'words_quiz_cta') as quiz_signup_clicks,
  count(distinct visitor_id) filter (where event = 'click' and placement = 'words_quiz_lp') as quiz_lp_clicks,
  count(distinct visitor_id) filter (where event = 'click' and placement in ('cta_start', 'cta_lp')) as bottom_cta_clicks
from e;
```

基準値（変更前）:
- 回遊計測 10/4〜10/17 の14日で /words を見たのは3人（運営者の確認を含む可能性が高い）
- GSC 7日（10/8〜10/14）: /words/seo 表示51・平均60位、rfq 32・32位、rfi 31・53位、クリック0
- 取りにいく検索語の順位: 「rfp rfq」9.7位・「rfqとは」19位・「rfp rfi 違い」11〜100位
- 「seo 略」（50位）のような単体略語は大手用語辞典が強いので順位は追わない
