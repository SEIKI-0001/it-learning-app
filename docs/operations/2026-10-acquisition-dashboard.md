# 集客分析ダッシュボード（/admin/acquisition）

流入元ごとの「訪問 → 登録 → 学習開始 → 再学習」を 7・30・90 日で見る管理画面。
これまで `scripts/acquisition/signup-sources.sql` を手で流していた集計を画面と CSV にしたもの。

## 見られるもの

| 区分 | 内容 |
| --- | --- |
| 合計 | 訪問・登録・学習開始・再学習（学習開始と再学習は登録に対する割合つき） |
| チャネル比較 | X / 自然検索 / note / その他・不明 |
| 流入元・キャンペーン別 | `signup-sources.sql` と同じ行の切り方（source × campaign）＋訪問 |
| キャンペーン・投稿別 | utm_campaign 単位の行と、X 自動投稿（organic_x）の投稿 ID ごとの行。投稿日時・テーマ・X の URL つき |
| CSV | 上の全行を1ファイルに（`section` 列で total / channel / source / post を区別。投稿行は post_* 列つき） |

## 数え方

| 指標 | 定義 | 出どころ |
| --- | --- | --- |
| 登録 | 期間内に作られた `line_users`（`merged_into is null`・除外アカウントを除く） | line_users |
| 流入元 | `coalesce(utm_source, referrer_host, '(none)')`（初回訪問の first-touch） | signup_attributions |
| 学習開始 | そのアカウントの回答記録が1件以上 | question_attempts |
| 再学習 | 回答日（answered_at の JST 日付）が2日以上 | question_attempts |
| 訪問 | 公開ページの `view` のうち自サイト内の移動でないもの（`ref_path is null`）を `visitor_id` で重複除去 | public_funnel_events |

- 期間は「今日（JST）を含む直近 N 日」の JST 0 時から。学習開始・再学習はその人たちを**今日まで**追った数なので、7日は再学習が少なく出る。
- チャネルは utm_source を優先し、無ければ referrer のホスト名で決める（`lib/growth/acquisition.ts` の `classifyChannel`）。
  訪問側は utm を保存していないので referrer のホスト名で決めるが、X 投稿の入口 view（placement に投稿 ID）は
  X アプリが referrer を落としても X に数える。
  `search.google.com` は Search Console（運営の確認作業）なので自然検索に含めない。
- アカウントの回答記録は、ログイン時に端末から同期された登録前の回答も含む（`signup-sources.sql` と同じ。2026-10-14 時点で該当0件）。

### 訪問→登録は「転換率」ではない

`public_funnel_events.visitor_id` は端末の乱数で、アカウントとは結びつけていない。画面の「登録/訪問」は
別々に数えた2つの数の比（参考値）で、同じ人を追った転換率として扱わない。主な理由:

- 登録は Cookie `fq_attr` の first-touch（30日）で、訪問は期間内の閲覧。期間の端で人がずれる。
- 公開ページを通らずに `/` やアプリ画面から登録した人は、訪問側に出ない。
- localStorage を使えない環境の閲覧は1件ずつ別の訪問として数える。

厳密な転換率が必要になったら、`signup_attributions` に `visitor_id` を写すのではなく、
登録完了時に「登録した」という匿名イベント（アカウント ID を持たない）を `public_funnel_events` に1件書き、
同じ visitor_id の view と突き合わせる設計にする。アカウントと閲覧履歴を結びつけずに済む。今回は未実装。

## テスト・運営アカウントの除外

UUID を Git に入れないため、環境変数で指定する（本番は Cloudflare の secret / vars）。

| 変数 | 中身 |
| --- | --- |
| `ACQUISITION_EXCLUDED_USER_IDS` | 除外する `line_users.id`（カンマか空白区切り）。SQL の `excluded_user_ids` と同じ値 |
| `ACQUISITION_EXCLUDED_VISITOR_IDS` | 運営の端末の `fq_vid`（ブラウザの localStorage）。訪問の数から除く |

形の合わない値は黙って捨てる。画面上部に「除外 n アカウント／n 端末」が出るので、効いているかはそこで確認する。
`fq_vid` はブラウザの DevTools で `localStorage.getItem("fq_vid")` を実行して調べる。

## 投稿別の成果（X 自動投稿との取り決め）

X 自動投稿（`docs/operations/x-organic-posting.md`）が先に main に入り、**既存テーブルを変えずに**
投稿を識別する方式を決めている。このダッシュボードはそれをそのまま読むだけで、DB スキーマは変えていない。

| 何を | どこに | 値 |
| --- | --- | --- |
| 投稿リンク | 本文の URL | `utm_source=x&utm_medium=social&utm_campaign=organic_x&utm_content=x-<UUID>&ref=x-<UUID>` |
| 登録 | `signup_attributions.ref` | 投稿 ID（first-touch Cookie 経由） |
| 訪問 | `public_funnel_events.placement`（入口の view だけ） | 投稿 ID |
| 投稿の情報 | `x_social_posts.utm_content` | 投稿 ID → 予定日時・テーマ・状態・URL |

- 投稿 ID の形は `^x-[a-z0-9-]{1,60}$`（`lib/growth/xPosting/core.ts` の `buildPostUrl`）。`ref=beta` などの招待コードは投稿として扱わない。
- `x_social_posts` の migration が本番に未適用でも、投稿 ID の行は出る（注意が1行出て、日時・テーマが空になる）。
- 自動投稿以外のリンク（毎日1問の `daily_q`、note の `study_order` など）はキャンペーン単位で並ぶ。
  投稿単位で比べたくなったら、自動投稿と同じく `ref` に投稿 ID を入れる方式に揃える（新しい列は足さない）。
- `npm run x:post -- report` / `public.x_post_performance()` は全期間・除外なしの集計なので、期間と除外を揃えたいときはこの画面を使う。

## 本番反映

1. マージしてデプロイする（DB の変更はない）。
2. 必要なら `ACQUISITION_EXCLUDED_USER_IDS` / `ACQUISITION_EXCLUDED_VISITOR_IDS` を設定する。
3. `scripts/acquisition/dashboard-check.sql`（除外 UUID を手元で入れる）の結果と、
   7・30・90 日それぞれの画面の合計・流入元別が一致することを確かめる。

## 認可

`/admin/*` と `/api/admin/*` は `proxy.ts` の Basic 認証（`ADMIN_PASSWORD`）で守られ、
`/api/admin/acquisition` は Route Handler 内でも `adminAuthFailure` を呼ぶ（Proxy をすり抜けても拒否する）。
読み取り専用で状態を変えないため、同一オリジン要求（`adminMutationFailure`）は付けていない。
