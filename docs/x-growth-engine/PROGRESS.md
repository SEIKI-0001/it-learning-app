# X Growth Engine 進捗記録

## P0: 監査と計測APIのテスト（2026-11-22 JST）

ブランチ: `feat/x-growth-p0`（`origin/main` e4aa578 から）。実X投稿 0件、X APIへの実リクエスト 0件、本番DBへの書き込み・migration 0件、本番設定（Variables/Secrets/`X_POST_ENABLED`/`X_POST_DRY_RUN`）の変更なし。

### 1. 監査: `quality_check_failed` の原因（再現・修正済み）

確認した事実（すべて読み取りのみ）:

- `gh run list --workflow x-organic-post.yml`: 直近12回の失敗は 2026-11-15 と 11-22 の2回だけで、どちらも日曜。ログの出力は `{"state":"failed","error":"quality_check_failed"}`。
- 本番DB `x_social_posts`（SELECTのみ）: `quality_check_failed` は 11-08、11-15、11-22 の3件で、すべて日曜。
- 日曜のテーマは `themeForSlot()` で `service` になる。`availableSources("service")` の本文は **2件だけ**（`service-trial-core`、`service-learning`）。
  - `service-trial-core` は 10-25 の行が `ready` のまま残っている（`history()` は ready も重複判定に含める）。
  - `service-learning` は 11-01 に `published`。
- そのため、11-08 以降の日曜は AI がどちらの本文を選んでも `validateGenerated()` が `duplicate_content` を投げる。runner はこれを一律 `quality_check_failed` として保存していた。つまり **毎週日曜に必ず失敗する構造的な不具合**で、AIの品質の問題ではなかった。

同じ構造の潜在不具合:

- AI に渡す `approvedPosts` は「全フック×リンク有無」の組合せで、文字数チェックは `HOOKS[0]` でしか行っていなかった。長いフックを選ぶと、提示どおりの本文でも `invalid_length` で落ちうる。
- `availableSources()` は10件に切り出してから使用済みかを見ないため、`terms` 系でも10件の窓が使用済みで埋まると同じ失敗になりうる。
- `JSON.parse` の失敗（コードフェンス付きの応答など）は `content_generation_failed` に埋もれ、原因を区別できない。過去の `content_generation_failed`（10-21、10-27、10-28、11-04、11-07）は、ログに理由が残っていないため原因は特定できない（**未確定**）。

修正（安全装置は弱めていない。`validateGenerated()`、DBの重複拒否、文字数・根拠チェックはそのまま）:

| 変更 | ファイル |
|---|---|
| `approvedCandidates()`: 検証を通る本文だけ（文字数OK・履歴と非類似）を作る共通関数。AIへの提示とrunnerの事前フィルタで同じものを使う | `lib/growth/xPosting/core.ts`, `generator.ts` |
| runner は先に履歴を読み、未使用候補のある source だけを渡す。テーマが尽きたら承認済みの `terms` に切り替え、それも無ければ `no_unused_content` で失敗（AIを呼ばない） | `runner.ts` |
| `availableSources(theme, slot, history)` は使用済みを除いてから10件に切る | `sources.ts` |
| 失敗理由: `quality_check_failed_<固定タグ>`（invalid_schema / unsupported_content / invalid_length / duplicate_content）、`ai_output_not_json`、`no_unused_content`。自由文は保存しない | `runner.ts`, `generator.ts` |

運用者向けの注意: 10-25 の `ready` 行（service-trial-core）は投稿されないまま残っている。X上に投稿が無いことを確認したら `reconcile --id <UUID> --note ...` で cancelled に確定できる。**本番DBは触っていない。**

### 2. OAuth 1.0a 署名の修正

- 旧 `signOAuth()` は oauth_* だけを署名し、URLのクエリ（`ids`、`tweet.fields`）を署名に含めていなかった → GET /2/tweets では 401 になる。
- 並べ替えが `localeCompare` だった（RFC 5849 はバイト順を要求。`Z` と `a` などで順序が逆になる）。
- 修正後はクエリとフォームのパラメータ（`extraParams`）も署名し、エンコード後の名前→値のバイト順で並べる。ヘッダーには oauth_* だけを入れる。既存の POST /2/tweets（JSON本文は署名対象外）と GET /2/users/me は従来どおりの署名になる。
- 証拠: X公式の署名例（creating-a-signature、期待値 `hCtSmYh+iHYCEqBWrE7C7hYmtUk=`）と一致する。旧実装では、この例・クエリ署名・バイト順の3テストがすべて失敗し、新実装ではすべて成功することを確認した。

### 3. 読み取り専用メトリクスクライアント

`lib/growth/xPosting/metricsClient.ts`

- `fetchPostMetrics({ ids, ownedMetrics }, creds, { fetcher, now })`: fetch を差し替えられる（依存注入）。GETを1回だけ送り、`redirect: "error"`、15秒でタイムアウト。POST・DB・再試行は無い。
- `parseMetricsResponse(body, ids, measuredAt)`: 純関数で、オフラインfixtureをそのまま解析できる。
- 出力: 投稿ごとに `collectionStatus`（`ok/unavailable/permission_error/rate_limited/failed`、DATA_MODEL の値と同じ）、`errorCode`（固定タグ）、`measuredAt`、`createdAt`、`ageHours`、`impressions/likes/reposts/replies/quotes/bookmarks`、`organic`（自分の投稿だけの指標）。
- 欠損時の扱い: 値が無い・数値でない・負の値なら `null`。返ってきた投稿でも `impression_count` が読めなければ `unavailable / x_metrics_impressions_missing` とし、**0では埋めない**。本当に0のときは0のまま。部分エラー（`errors[]`）は problem type で `x_metrics_not_found` / `x_metrics_not_authorized` / `x_metrics_resource_unavailable` に分類する。HTTP 401/403 は `permission_error`、429 は `rate_limited`（`x-rate-limit-reset` を保存）、5xx・通信失敗・JSON不正は `failed`。Xのエラーメッセージは出力に含めない。
- ID は 1〜100件・数字19桁以内・重複除去。条件に合わなければ通信前に例外を投げる。
- CLI: `npm run x:post -- metrics --fixture` はオフラインで、認証情報・通信・DBを使わない。実APIは `X_METRICS_LIVE_READ=true` と `--ids` が必須で、件数の上限は `X_METRICS_MAX_READS`（既定10）。フラグが無ければ通信前に `x_metrics_live_read_not_enabled` で止まる。
- fixture: `test/fixtures/xMetrics/get-tweets-mixed.json`（合成値。全指標あり／本当の0とrepost_count表記／欠損・不正値／not found／not authorized の5件）。

### 4. フィールド・認証・価格の出典（2026-11-22 に docs.x.com で確認）

- https://docs.x.com/x-api/fundamentals/metrics
  - `public_metrics`: `retweet_count`、`reply_count`、`like_count`、`quote_count`、`bookmark_count`、`impression_count`（動画は `view_count`）。どの認証でも取得できる。
  - `non_public_metrics`（`impression_count`、`url_link_clicks`、`user_profile_clicks`、`engagements` ほか）と `organic_metrics`: ユーザーコンテキスト必須・自分の投稿のみ。原文は "only available for posts created within the last 30 days"。
- https://docs.x.com/x-api/posts/get-posts-by-ids
  - `GET /2/tweets`。`ids` は1〜100件、各IDは `^[0-9]{1,19}$`。応答は `data[]`、`errors[]`（Problem: resource-not-found / not-authorized-for-resource / resource-unavailable）、`meta`。
  - このスキーマではリポスト数が `repost_count` と表記され、metricsページの `retweet_count` と食い違う → クライアントは両方を受け付ける。
  - フィールド指定のクエリ名は metrics ページの例どおり `tweet.fields` を使った（スキーマ本文では名前を確認できず、**実レスポンスでの確認は未実施**）。
- https://docs.x.com/x-api/getting-started/pricing（ページに日付の記載なし）
  - "Posts: Read" は $0.005 per resource。Owned Reads（$0.001）の対象は `/2/users/{id}/...` だけで、`GET /2/tweets` は含まれない。
  - 投稿作成は $0.015、URL付きは $0.200。従量課金プランの上限は月300万 Post reads。同じ投稿は24時間（UTC）内なら重複課金されない。
  - クライアントの概算は `ESTIMATED_USD_PER_POST_READ = 0.005`。21件の公開投稿を24h/72hの2回読むと、約 21×2×$0.005 = $0.21。
- レート制限: 公式ページから GET /2/tweets の数値を確認できなかった（**未確認**）。429 と reset ヘッダーで安全側に止まる実装にした。

### 5. 計測できない場合の代替案

1. **30日を過ぎた投稿・権限不足**: `public_metrics.impression_count` だけを使う（自分の投稿でなくても取得できる公開値）。取れなければ `null` と理由を保存する。
2. **APIの課金・権限が使えない場合**: X Analytics の投稿別CSVエクスポートを手動で取り込む（P1で取り込み経路を検討）。値は運用者が入れる `manual` スナップショットとし、推測値は入れない。
3. **サイト流入**: 既存の `x_post_performance()`（UTM）に加え、プロフィールリンクに `utm_content=x-profile` を付けて、プロフィール経由の流入を分けて数える（EXPERIMENT_POLICY のとおり）。

### 6. テスト結果（証拠）

| コマンド | 結果 |
|---|---|
| `npx vitest run test/xPosting`（変更前） | 9 files / 55 tests passed |
| `npx vitest run test/xPosting`（変更後） | **11 files / 83 tests passed**（追加: `xPostingMetrics.test.ts` 18件、`xPostingQualityRegression.test.ts` 8件、CLI 2件） |
| `npm run typecheck` | 成功（exit 0） |
| `npx eslint lib/growth/xPosting scripts/x-posting/run.mjs test/xPosting*.test.ts` | 指摘なし |
| `npm test`（Node 22.18.0 = `.nvmrc`/CI と同じ） | **360 files / 3971 tests passed** |
| `npm test`（ローカル Node 26.3.0） | 3 files / 15 tests failed（`NetworkQuest*.test.tsx`、`todayVocabQuizCompletion.test.ts`）。`window.localStorage` が undefined になる Node 26 の環境差で、**未変更の origin/main でも同じ3ファイルが失敗**することを `git stash` で確認した。X関連ではない |
| `npm run x:post -- metrics --fixture` | ok×2 / unavailable×2 / permission_error×1、`estimatedUsdIfLive: 0.025` |

回帰テストで固定した点: 日曜・service枯渇 → terms で ready（AIには未使用の source だけを渡す）／全テーマ枯渇 → `no_unused_content` でAI・投稿なし／品質の失敗理由タグ／長すぎる候補の除外／X公式署名例・クエリ署名・バイト順／null と 0 の区別／HTTP・通信・JSON不正の分類と1回限りの送信／ライブ読み取りのフラグと件数上限。

### 7. 未確認・ブロッカー（P1 以降で要確認）

- **実APIでの確認は未実施**（課金を伴うため、運用者の承認が必要）。次を実際に確かめる必要がある: 現在のアプリ権限で `public_metrics.impression_count` が返るか、`--owned` で 30日以内の投稿の `organic_metrics` が返るか、`tweet.fields` の名前、`repost_count`/`retweet_count` のどちらが返るか。手順は、承認後に `X_METRICS_LIVE_READ=true npm run x:post -- metrics --ids <直近の公開投稿1件>`（約$0.005）。
- 過去の `content_generation_failed` 5件の原因（ログに残っていない）。今後は `ai_output_not_json` 等で区別できる。
- 10-25 の `ready` 行の扱い（運用者が判断）。
- 本番ワークフローへの反映: このPRのマージ後、次の日曜（11-29）は terms に切り替わって投稿される想定。本番の有効/無効の設定は変えていない。

## P1: 永続化 + スナップショット収集（2026-11-22 JST）

ブランチ: `feat/x-growth-p1`（P0マージ後の `origin/main` 75eaf44 から、専用worktreeで作業）。本番DBへのデータ・スキーマの変更 0件（`information_schema` を読んで名前の衝突が無いことだけ確認）、本番Secrets/Variablesの変更なし、X APIへの実リクエスト 0件、投稿 0件。

### 実装

| 内容 | ファイル |
|---|---|
| add-only migration: `x_growth_experiments`、`x_growth_metric_runs`（予算台帳）、`x_growth_post_metrics`、`x_growth_reviews`、`x_social_posts` に null許容の6列を追加。RLS有効・anon/authenticatedは権限なし・service_roleには select/insert/update だけ（deleteなし）・RPCはすべて SECURITY INVOKER | `supabase/migrations/20261122160000_x_growth_engine.sql` |
| 収集の本体: 緊急停止 → 対象の段階 → 件数と費用の見積り → dry-run → missedの記録 → live-readの確認 → 予算の原子的な予約 → GETを1回 → 冪等な保存 | `lib/growth/xGrowth/collector.ts` |
| DB adapter（Supabase rpc／PGliteの両方が同じSQLを通る） | `lib/growth/xGrowth/store.ts` |
| オフライン用のPostgres（PGlite＋本物のmigration）と seed | `lib/growth/xGrowth/fixtureDb.ts`、`test/fixtures/xGrowth/collect.json` |
| CLI `npm run x:growth -- collect / report`（`--fixture`、`--dry-run`） | `scripts/x-growth/run.mjs`、`package.json` |
| 定期実行 workflow（08:15 / 20:15 JST。既定では起動しない） | `.github/workflows/x-metrics-collect.yml` |
| P0クライアント: `author_id` を要求し、他人の投稿は `x_metrics_not_own_post`（数値を保存しない） | `lib/growth/xPosting/metricsClient.ts` |
| ランブック・DATA_MODEL・TASKS の更新 | `docs/operations/x-organic-posting.md` ほか |

設計で決めたこと:
- **段階の窓**: 24h=[22,40)時間、72h=[70,88)時間。08:15 JST の実行で、07:00の投稿は約25h / 73h。遅れて実行されても窓の中なら測り、実際の経過時間（`age_hours`）と時刻（`measured_at`）を保存する。窓を過ぎたら `x_metrics_window_missed` として1回だけ記録し、違う経過時間の値で埋めない。
- **冪等性**: `UNIQUE(post_id, snapshot_stage)`。確定状態（ok / unavailable / permission_error）は上書きしない。`rate_limited` / `failed` だけを、窓の中で `attempt_count < X_METRICS_MAX_ATTEMPTS`（既定2）の間、次回の実行で再試行する。同じ実行の中では再試行しない。
- **費用**: X に送る前にDBで予約する（advisory lockでアカウントごとに直列化）。日次・月次の予算（JST）、同時に開いている実行は1つだけ、429のreset時刻まで待つ、30分放置された予約は interrupted。予約した件数は失敗しても数える（少なく見積もらない）。
- **帰属**: 保存時に既存の `x_post_performance()` をSQL内で呼び、投稿IDごとの visits / visitors / signups を行に保存する。読めなければ NULL。`x_growth_post_report()` は 24h/72h と現時点の帰属を投稿ごとに結合して返す。学習アプリ本体のコードは変えていない。
- **対象**: `account_id = X_POST_ACCOUNT_ID`、`status='published'`、`x_post_id` あり、公開から7日以内。さらにXの応答の `author_id` が一致しなければ数値を保存しない（二重の確認）。

### 費用の見積り
- 公式単価 "Posts: Read" $0.005/件（P0で確認済み）。1日1投稿×2段階 ≒ 月60件 ≒ **月$0.30**。既定の上限: 日10件・月120件（$0.60）・1回10件。
- dry-run と `collect --fixture` は費用0（Xに通信しない）。実行のたびに `plan.estimatedUsd` を出力する。

### テスト結果（すべて実行済み）

| コマンド | 結果 |
|---|---|
| `npx vitest run test/xGrowthDatabase.test.ts`（PGlite = PG17。本物のmigrationを適用） | 14 passed |
| `npx vitest run test/xGrowthCollector.test.ts`（PGlite＋本物のP0クライアント＋偽のfetch） | 11 passed |
| `npx vitest run test/xGrowthCli.test.ts`（別プロセスでCLIを実行・通信を記録＋workflowの既定値） | 7 passed |
| `npx vitest run test/xPosting test/xGrowth` | **14 files / 116 tests passed** |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0（errors 0。warnings 2件はX以外の既存ファイル） |
| 全体テスト（Node 22.18.0 = `.nvmrc`/CI と同じ。`npx -p node@22.18.0 -- node node_modules/vitest/vitest.mjs run`） | **363 files / 4004 tests passed** |
| `npm run x:growth -- collect --fixture` | partial（ok 1 / unavailable 2 / permission_error 1、missed 3、reads 4、$0.02）、exit 0 |
| `npm run x:growth -- collect`（環境変数なし） | `{"state":"disabled"}` |

テストで確認したこと: 2回収集しても重複しない（2回目はXへの通信0・行数そのまま）／確定行は上書きしない／再試行は上限まで／429でreset時刻まで待つ／403は確定し job は失敗／5xx・通信断・JSON不正は failed（NULLで保存）／全項目が取れない応答は全部NULL／他アカウント・未公開・7日超・他人の投稿は対象外／遅れて実行しても窓の中なら測り、窓を過ぎたら missed／日次・月次の予算・同時実行・中断／DB書き込み失敗があればXを再呼び出しせず job 失敗／緊急停止ではDBにもXにも触らない／dry-runでは書き込み0／有効にしても既定（dry-run）ならXへ通信0で、service key は出力されない／既存の投稿RPC（claim → prepare → begin → finish）は migration 適用後も動き、追加列は NULL/false／新しいテーブル・関数は anon/authenticated から使えず、SECURITY DEFINER も無い。

### 未確認・ブロッカー
- **本番への適用は未実施**（指示どおり）。手順は、検証用DB（Supabaseブランチ等）に適用して `collect --dry-run` → 承認を得て本番に適用。ランブックの「本番で使い始める手順」を参照。
- **実APIでの確認は未実施**（課金のため承認が必要）。特に、`X_METRICS_OWNED=true`（non_public / organic を要求）で現在のアプリ権限がリクエスト全体を 403 にしないかが未確認。403 なら全段階が permission_error で確定してしまうため、最初は P0 の `x:post metrics --owned --ids <1件>`（約$0.005）で確かめる。だめなら `X_METRICS_OWNED=false`。
- `supabase/schema.sql`（生成物）は更新していない。再生成にはローカルの Supabase（Docker）が必要で、既存の X テーブル（P0以前）もこの snapshot に入っていない。
- GitHub の schedule は default branch（main）でしか動かない。マージしても `X_METRICS_ENABLED` を設定しない限り起動しない。
- PGlite での検証は単一接続なので、本当の並行実行の競合は advisory lock の設計に頼っている（Supabase本番と同じSQL）。

## P1 本番有効化（2026-11-23 JST）

### 状態（この時点）
- **本番DB `fe-quest`: P1 migration 適用済み**（version `20261122160000 x_growth_engine`、sha256 `7183c114…`。#263 の修正込み）
- **収集: 課金読み取りを有効化済み**（2026-11-23 07:44 JST、運用者の指示「turn on it」で `X_METRICS_DRY_RUN=false` / `X_METRICS_LIVE_READ=true`。`X_METRICS_ENABLED=true`）。いったん dry-run で確認してから切り替えた
- 予算の変数: 日10・月120・1回10・再試行2・`X_METRICS_OWNED=true`。投稿側の変数（`X_POST_*`）は変えていない

### 1. Preflight
- 本番 = `fe-quest`（kebebakugaxdidehzjnh）。投稿ジョブの結果と `x_social_posts` の行が一致することで確認
- staging: Supabase のブランチは **Pro プラン限定で作れない**（`PaymentRequiredException`）。無料枠の2プロジェクトは使い切っている。`it-learning-app-2` は Cloudflare pilot（live Stripe）用なので staging として使わない → **ローカルの Supabase（CLI 2.121.0 / Postgres 17.11、colima）** を staging にした（運用者が承認）
- Secrets: `X_API_*` 4つと `X_POST_SUPABASE_*` 2つがあることを名前で確認（値は見ていない）
- 発見した問題: 実際の投稿時刻は 10:30〜13:30 JST（投稿ジョブの開始が遅れる）。収集が1日2回だと各窓に1回しか入らない → **#262 で6時間ごとに変更**（マージ済み）

### 2. Staging（ローカル Supabase）
- 前提の再現: repo の migration で作った posting 関数7つの定義の md5 が**本番と完全一致**。funnel / signup / accounts テーブルの列も一致
- **発見した問題: Supabase の default privileges により、service_role に DELETE/TRUNCATE が残っていた**（PostgREST の DELETE が 204）。本番の `pg_default_acl` も同じ設定 → **#263 で migration を修正**（本番適用前・マージ済み）。PGlite でも default privileges を再現する回帰テストを追加
- 修正後: 新しい4テーブルは anon の select 401 / service_role の select 200 / service_role の DELETE 403。RPC 6つは anon で 401（予約行も作られない）
- 実際の CLI（PostgREST 経由・X は偽物）: disabled → dry_run → live_read_disabled → live（GET 1回、ok / NULL / not found、他アカウント・未公開は対象外）→ 2回目は nothing_due（X への通信0）→ report（サイト帰属 5/3/1）
- 既存の投稿RPC（claim / 同じ枠 / prepare / begin ×2 / finish / recover）は正常に動く
- rollback SQL を staging で実行 → 新しいテーブルだけ消え、既存の行と関数は変わらない → 再適用できる

### 3. 実 X API の確認（承認済みの1回だけ・$0.005）
- workflow run 45078532892（`verify_post_id=2123974232505798744`、2026-11-21 11:58 JST の自社投稿）
- `GET /2/tweets?ids=…&tweet.fields=author_id,created_at,public_metrics,non_public_metrics,organic_metrics` → **HTTP 200、errors なし、author_id が一致**
- 返ってきたフィールド: public_metrics = bookmark/impression/like/quote/reply/**retweet**_count、non_public_metrics = engagements/impression_count/user_profile_clicks、organic_metrics = impression/like/reply/retweet_count/user_profile_clicks（`url_link_clicks` はリンクなし投稿なので返らない）
- 値: 43.6h で impressions 12（public / organic / non_public すべて12）、反応は0
- レート制限: limit 5000 / remaining 4999。**owned metrics は今の権限で取れる**（`X_METRICS_OWNED=true` のままでよい）

### 4. 本番 migration
- 適用前: posts 30（published 21）、funnel 719、signups 2、x_growth テーブル 0、posting 関数の md5 は7つとも staging と一致
- 投稿ジョブが動いていないことを確認してから、ファイルの内容を1トランザクション（lock_timeout 5s）で実行し、`supabase_migrations.schema_migrations` に記録
- 適用後: 行数は変わらず、追加列は30行すべて NULL/false、posting 関数の md5 は変わらず、4テーブルとも RLS 有効、権限は service_role の INSERT/SELECT/UPDATE だけ、RPC 6つは SECURITY INVOKER・anon 不可・service_role 可
- Security Advisor: 新しいテーブルは「RLS enabled no policy」（INFO）だけで、既存の service_role 専用テーブル44個と同じ（意図どおり）

### 5. 収集の有効化（dry-run）
- 緊急停止: `X_METRICS_ENABLED=false` で手動実行 → `{"state":"disabled"}`
- `X_METRICS_ENABLED=true`（dry-run）で手動実行 → `{"state":"dry_run","plan":{"dueStages":0,"reads":0,"missedStages":10,"estimatedUsd":0}}`。本番DBへの書き込みは0（metric rows 0 / runs 0）
- `x_growth_post_report()` は本番で7日分6投稿を返す（スナップショットはまだ無いので NULL、サイト帰属は実数0）

### 6. これから観察すること（**まだ起きていない**）
- dry-run は6時間ごとに動き、各回の `plan` に対象の段階と概算費用を出す（書き込み・X通信なし）
- 課金読み取りを始めるときは `X_METRICS_DRY_RUN=false` と `X_METRICS_LIVE_READ=true`（**運用者の承認が必要**）。最初の実行で、窓を過ぎた10段階が missed として記録される（読み取りなし）
- 窓の目安（投稿は 10:30〜13:30 JST ごろ）: 24h の窓は翌日 08:30〜翌々日 03:30 ごろ → 15:15 / 21:15 / 03:15 の実行で取る。72h の窓は3日後 08:30〜4日後 03:30 ごろ → 同じく 15:15 / 21:15 / 03:15
- 有効にしたら確認すること: 最初の ok 行の `impressions`・`age_hours`・`organic`、`x_growth_metric_runs` の予約件数と `estimated_usd`、`rate_limited` / `permission_error` が無いこと、日次・月次の上限の消費
- `supabase/schema.sql`（生成物）は未更新のまま（X テーブルは P0 以前から未収録）

### 7. 課金読み取りの有効化（2026-11-23 07:44 JST）
- 運用者の指示で `X_METRICS_DRY_RUN=false` / `X_METRICS_LIVE_READ=true` に変更した
- 直後に手動で実行（run 45079357015）→ `{"state":"nothing_due","missedRecorded":10}`。この時点で対象の段階は無く、**X への読み取りは0件・$0**
- 本番DB: 窓を過ぎた10段階（24h ×6・72h ×4）が `unavailable / x_metrics_window_missed`、attempt 0、値はすべて NULL で記録された。`x_growth_metric_runs` は0件（予約なし）
- **最初の実際の計測（まだ起きていない）**: 11/20 11:47 JST の投稿の 72h 窓（11/23 09:47〜11/24 03:47 JST）→ 11/23 15:15 JST の定期実行で1件読む見込み（約$0.005）。11/21 の投稿の 72h は 11/24 15:15 JST ごろ。11/23 以降の投稿の 24h は、翌日 15:15 JST ごろから

## P2: 投稿表現の実験基盤（2026-11-23 JST）

ブランチ `feat/x-growth-p2-p4`（main 2ec3f00 から）。計画は `PLAN_P2_P4.md`。本番への適用・投稿・課金リクエストは0件。P1 の本番収集は触っていない。

### 実装
| 内容 | ファイル |
|---|---|
| 承認済みの英略語データ（157語）→ トピックの事実。文字列は一字一句コピーし、使用済みかどうかは見出しで判定する | `lib/growth/xGrowth/topics.ts` |
| 型のレジストリ: `definition_first`（今の形・対照群）、`question_first`、`misconception`（`trapExplanations` / `differenceAxis`）、`mini_quiz`（選択肢は `confusedWith`、正解と一行説明つき）、`analogy`（承認済みのライブラリだけ）。`kind: text｜image` で画像の型を後から足せる | `lib/growth/xGrowth/styles.ts`、`data/x-growth/analogies.json`（12件はすべて draft で本番では使えない） |
| 実験モデル: variant は2つだけ、決定論的に割り付ける、トピックは両方の型が使える共通部分から variant と関係なく選ぶ、候補を作る、LLM と独立に検証する | `lib/growth/xGrowth/experiment.ts` |
| runner への組み込み: `experiment` 依存は任意。割付はコード → 下書きの行にタグ付け → prepare の順。実験の経路では LLM を呼ばない。候補が作れなければ既存の経路に戻して理由を記録し、タグ付けに失敗したら投稿を止める | `lib/growth/xPosting/runner.ts`、`store.ts`、`fixtureStore.ts` |
| migration（本番未適用）: `hypothesis_key` / `config` を追加、running の実験は1つだけ、running なら variant は2つ、`active_x_experiment()`、`tag_x_post_experiment()`（draft の行にだけ・実験と一致する値だけ受け付ける）。SECURITY INVOKER・service_role 専用 | `supabase/migrations/20261123090000_x_growth_experiments.sql` |
| プレビュー: `npm run x:growth -- preview --days 28 [--experiment-file …] [--allow-draft-library]`（オフライン）。`x:post run --fixture --dry-run --experiment-file …` | `lib/growth/xGrowth/preview.ts`、`scripts/x-growth/run.mjs`、`scripts/x-posting/run.mjs` |

### 決めたこと
- **事実は承認済みデータからだけ。** 検証では、主張された topic と型からもう一度テンプレートを作り直し、本文が完全一致することを求める。加えて、文字数・重複（見出し＋bigram）・禁止表現（合格率、100%、最新、@、URL、いいね/リポストの誘導など）・メタデータ（実験/variant/型/版）・URLなし・出典の一致を確認する。
- **実験の経路で LLM を使わない。** 候補はすべてテンプレート由来なので、LLM が variant や表現を選ぶ余地を残さない。AI の生成は既存の経路（実験の対象外・失敗時の戻り先）にそのまま残る。
- **割付** = `((d mod 7) + floor(d/7) + seedBit) mod 2`。最初の式 `(d + floor(d/7))` では週の切れ目で反転せず、28日で 12/16 に偏った。テスト中に見つけて直した。
- **既存の動作を変えない。** `X_GROWTH_EXPERIMENTS_ENABLED=true` と、DB 上で running の実験が両方そろわない限り、今の投稿経路と同じ。投稿頻度・時刻・上限は変えていない。

### テスト（実行済み）
- `test/xGrowthExperiment.test.ts` 20件: すべての型の全レンダリング（500件以上）が承認済みの文字列を含む／対照群が本番の terms 投稿と一字一句同じ／28日で 14:14・各曜日が週ごとに A↔B／同じ入力なら同じ結果・seed で反転／トピックが variant に依存しない／不正な実験設定を拒否／**4つの組み合わせで28日分の候補**（glossary 系は各28件、analogy は draft ライブラリで11件）でメタデータ完全・トピックの重複なし／不正な内容（事実の改変・合格率の主張・variant/型/topic の改ざん・LLM 版の文字列・URL・出典・重複・停止中の実験・本番での draft の analogy）を拒否／runner: 依存なしなら従来どおり、実験ありなら LLM なし・タグ付け後に prepare、失敗時は理由つきで従来経路、タグ付け失敗なら止める
- `test/xGrowthExperimentDb.test.ts` 6件（PGlite・本物の migration）: running は1つ、variant は2つ、期間内だけ取得、タグ付けの一致・二重拒否・期間外/停止中の拒否、権限、CLI（fixture の投稿にメタデータが保存される）、preview（28件・14:14）
- X関連: 16 files / 145 tests passed、typecheck exit 0、eslint 指摘なし

## P3: 定期 PDCA 評価エンジン（2026-11-23 JST）

本番への適用・保存・AI 呼び出しは0件（すべてオフラインの fixture と PGlite）。

### 実装
| 内容 | ファイル |
|---|---|
| 分析: 各群の割付・公開・失敗・**計測待ち（72h の窓 [70,88) がまだ閉じていない）**・有効・欠損（理由の内訳）・欠損率、72h/24h の分布（中央値・四分位・最小/最大・幾何平均・**実数の0**・log 尺度の外れ値）、反応数と反応率、サイトの訪問/訪問者/登録、曜日・投稿時刻・題材の分野 | `lib/growth/xGrowth/analysis.ts` |
| 効果: B/A の中央値の比を、seed つき bootstrap（2000回）の 95%CI で見る。外れ値を除いたものも同時に計算する | 同上 |
| 判定（ルールだけ）: 欠損率 > 30% → `data_quality_issue`／有効な標本 < 最低数 → `insufficient_data`／曜日・時刻・題材の偏り → `biased`／CI が1をまたぐ → `no_clear_difference`／外れ値を除くと結論が変わる → `outlier_sensitive`／それ以外 → `exploratory_lead`（1回の実験は探索的なだけ）。別の実験で同じ仮説・同じ向きなら `validated_lead`。対応は continue / pause / repeat / replace / propose_adoption（**採用は提案だけ**） | 同上 |
| 仮説（最大3つ、ルールで作る）: 計測の修正・再現・延長・やり直し・探索。180日以内に `no_effect` だった仮説は出さない（偏りや外れ値でのやり直しは理由を記録すれば可）。未比較の型があれば探索の枠を1つ残す | `lib/growth/xGrowth/hypotheses.ts` |
| AI による解釈（任意、既定はオフ）: 計算結果の JSON だけを渡す。**文章中の数値がすべて計算結果にあること**、「勝者・有意・確定」などの断定が無いこと（validated の場合を除く）を確認し、満たさなければ文章を捨てて理由を記録する | `lib/growth/xGrowth/aiAnalysis.ts` |
| 日本語の週次レポート（まとめ・健全性・実験の表・効果と CI・偏り・副次指標・判断・次の仮説・注意） | `lib/growth/xGrowth/weeklyReport.ts` |
| 保存（冪等）: 期間×実験ごとに1行（NULL は期間全体の行で仮説を持つ）。2回目は作らず既存の id を返す。仮説は新規作成時だけ入れる。期間が終わった実験の判定で、同じ key の未決の仮説に outcome を付ける | `lib/growth/xGrowth/weekly.ts`、migration `20261123120000_x_growth_pdca.sql`（本番未適用） |
| 合成 fixture: realistic / empty / incomplete / biased / outlier / lead / high_missing（決定論的・実データではない） | `lib/growth/xGrowth/weeklyFixtures.ts` |
| CLI `npm run x:growth -- weekly [--fixture --scenario … --fake-ai …] [--output file.md]`、週次 workflow `x-growth-weekly.yml`（月曜 09:15 JST。既定で起動しない・保存しない・AI なし） | `scripts/x-growth/run.mjs`、`.github/workflows/x-growth-weekly.yml` |
| 投稿 workflow に `X_GROWTH_EXPERIMENTS_ENABLED`（既定 false）を渡すだけ。スケジュール・上限は変えていない | `.github/workflows/x-organic-post.yml` |

### 途中で見つけて直したこと
- high_missing のデータが「標本不足」と判定されていた → 欠損率を先に判定するように変更（収集が壊れているときの本当の原因は欠損）。
- fixture: 72h の窓が開く前の投稿にも 72h の値が入っていた → 経過時間に応じて NULL にした（計測待ちを正しく再現）。外れ値の日が B 群に当たらないことがあった → 15日目以降の最初の B の日に入れるように修正。

### テスト（実行済み）
`test/xGrowthWeekly.test.ts` 24件:
- 6つのシナリオの判定と対応（realistic → 標本不足・やり直し、incomplete → 継続、biased → 偏り、outlier → 差なし、lead → 探索的、high_missing → 計測を直す）
- ルールが有望と判定しない限り leader を出さない／1回の強い実験は「探索的」止まりでレポートに「勝者・有意」と書かない／同じ向きで再現すれば validated で、採用は提案だけ（逆向きの履歴なら validated にしない）
- 5000の外れ値でも有望にならない（平均は中央値の5倍以上にぶれるが、ルールは使わない）
- 空のデータでも安全に出力できる／決定論的／実数の0は有効で、欠損は理由つきで数える／窓が開いている投稿は計測待ち
- 仮説は3つ以内・探索の枠あり・no_effect の再提案なし・やり直しの理由
- AI ガード（計算に無い数値・断定・失敗を拒否、正しい文章は通す）／期間（月曜 00:00 JST 区切り）
- PGlite での保存: 2回目は何も作らず変えない、判断と対応、履歴、outcome の更新、DB でも仮説は3つまで
- CLI: 既定は disabled、全シナリオがオフラインで動く、偽 AI の数値は拒否

`test/xGrowthWorkflows.test.ts` 4件（週次は既定で停止・保存しない・AI キーは AI が有効なときだけ渡す・X の認証情報なし・式の展開による注入なし／投稿 workflow の実験は既定でオフ・スケジュールと上限は変えていない）。

X関連: 18 files / 173 tests passed、typecheck exit 0、eslint 指摘なし。

## P4: 本番導入の準備（2026-11-23 JST）

本番への適用・変数の変更・投稿・課金リクエスト・AI 呼び出しは0件。P1 の本番収集は触っていない。

### 実装
| 内容 | ファイル |
|---|---|
| **オフラインの E2E**: PGlite に本物の migration を適用し、偽の X・偽の投稿で通す。実験（running）→ 28枠の投稿（候補 → 検証 → タグ付け → prepare → begin → publish → finish）→ 6時間ごとの収集（24h/72h）→ 週次の分析と保存 → 次の仮説。各段階をもう一度実行して冪等性も確かめる | `test/xGrowthE2E.test.ts` |
| 運用アラート: 結果不明・20分以上 publishing のまま（要対応）、1日以上 ready のまま、メトリクスの権限エラー（要対応）、失敗・中断・レート制限、今月の読み取りが上限の80%、欠損率 > 30%、失敗した投稿。それぞれに次の対応を書く。「要対応」があれば週次のジョブを exit 2 にして GitHub から通知させる | `lib/growth/xGrowth/health.ts`、`x_growth_ops_summary()`（P3 の migration に追加）、`weeklyReport.ts` |
| 運用ドキュメント: 切り替え・安全策・判定・コマンド・環境の分け方（開発=PGlite / staging=ローカル Supabase / 本番=fe-quest）・費用・P2/P3 のロールバック SQL・**有効化のチェックリスト** | `docs/operations/x-organic-posting.md` |

### E2E の結果（`test/xGrowthE2E.test.ts` 3件・実行済み）
- 28枠: published 27・uncertain 1（publish の通信断）。**同じ枠の再実行はすべて skipped**、publish は合計28回（uncertain は再送しない）、**LLM は1回も呼ばれない**、28行すべてタグ付き・metrics_eligible、A:B = 14:14、content_hash に重複なし。
- 収集: 6時間ごとに130回以上実行し、published の27件それぞれに 24h ok・72h ok がちょうど1つずつ。経過時間は 24h が [22,40)・72h が [70,88) の中。最後にもう一度実行しても nothing_due で、X への通信は増えない。GET だけで本文なし。
- 週次: 有効な標本 13/14、B が A の約3倍でも判定は **exploratory_lead**（1回の実験では勝者にしない）、対応は repeat、uncertain の投稿について **要対応のアラート**、1番目の仮説は再現（`hook_question_vs_definition_replication`）。2回目の保存は created=false で、行は増えない。新しい実験は作られない（自動で有効化しない）。

### staging（ローカル Supabase、CLI 2.121.0 / Postgres 17.11、費用0）
- 前提: repo の migration で本番と同じ状態を作り、P1 まで適用 → P2（sha256 a011df3b…）と P3（e5eb8fde…）を適用。既存の posting 関数7つの md5 は**本番と一致したまま**。
- PostgREST: `x_growth_hypotheses` は anon の select 401・service_role の select 200・service_role の DELETE 403。新しい RPC 8つはすべて anon で 401（anon の保存でレビュー行は作られない）。
- **実際の投稿 CLI**（`x:post run`、dry-run、`X_GROWTH_EXPERIMENTS_ENABLED=true`、Anthropic キーなし・X の認証情報なし）→ `ready`、本文は question_first（DDoS）、DB の `variant_id=B / content_style / topic_id / generation_version / metrics_eligible=true`、generation の JSON にも同じメタデータ。同じ枠の2回目は `skipped`。キーが無いのに成功した＝実験の経路で LLM を使っていない。
- **実際の週次 CLI**（`x:growth weekly`、保存 ON）を2回 → 1回目は created=true、2回目は created=false（同じ id）。レビュー2行・仮説2件・すべて proposed のまま・実験は1件のまま。
- ロールバック SQL（runbook のもの）を実行 → P2/P3 のテーブル・関数・列だけが消え、P1 のテーブル4つと既存の投稿は残る → 再適用できる。
- 終了後に staging と colima を止めた（作業前の状態に戻した）。

### テスト（実行済み）
- X関連: **20 files / 181 tests passed**（P2〜P4 で62件追加: 実験 20・実験 DB 6・週次 24・workflow 4・健全性 5・E2E 3）
- `npm run typecheck`: exit 0（途中、テストの BigInt リテラルで失敗したので文字列に直した）
- `npm run lint`: errors 0（warnings は X 以外の既存ファイル2件。自分のコードの未使用変数1件は直した）
- 全体テスト（Node 22.18.0）: 下の最終確認を参照

### 承認が必要な残り（本番）
docs/operations/x-organic-posting.md の「有効化のチェックリスト」のとおり:
1. P2/P3 の migration を本番に適用する
2. 週次の分析を有効にする（最初は保存しない）→ 保存を有効にする
3. 最初の実験を draft で作り、preview で確認して running にする
4. `X_GROWTH_EXPERIMENTS_ENABLED=true`
5. （任意）AI による解釈、analogy の承認
- 全体テスト（Node 22.18.0 = `.nvmrc`/CI と同じ、P4 の最終状態で実行）: **369 files / 4069 tests passed**（開始時は 363 / 4007）

## 型の追加・リンク/時刻の実験・次の実験の自動下書き（2026-11-23 JST）

ユーザーの依頼:「閲覧が伸びなければ、題材だけでなく型もどんどん変えていけるように」。今できる範囲で 1) 次の実験の自動下書きとワンクリック承認、2) 型の追加、3) 時刻・リンクの実験 を実装した。画像つき投稿は、X へのメディアのアップロードと画像の生成・権利確認が必要なため未実装（P5 に残す）。

### 実装
| 内容 | ファイル |
|---|---|
| 型を3つ追加: `word_parts`（英語の分解: `words`/`fullName`）、`true_false`（○×: `confusedWith` の日本語名で誤った文を作り、答え×と `trapExplanations` を付ける）、`keyword_hint`（`examKeywords` から当てる）。使える題材は 154 / 126 / 156 件 | `lib/growth/xGrowth/styles.ts`、`topics.ts` |
| variant に `withLink` / `postTimeJst` を追加。**2群の違いは1つだけ**（型・リンク・時刻）。リンクは `/words/<id>` に UTM を付け、検証ではその URL だけを許す。時刻は、割り当てと違う枠を claim の前に skip する | `lib/growth/xGrowth/experiment.ts`、`lib/growth/xPosting/runner.ts`、`preview.ts` |
| 分析: 時刻の実験では時刻の差を偏りにしない。結果に `factor` を出す | `analysis.ts` |
| 仮説: 新しい型を探索の対象に追加。型をひと通り試した後に、リンクと時刻の比較を提案する（費用と設定変更の注意つき） | `hypotheses.ts` |
| 次の実験の自動下書き: 型の比較だけ・承認待ちが無いとき・今の実験の残りが14日以内・次の月曜から8週間・承認済みの内容で事前確認。週次レポートに表示する | `drafts.ts`、`weekly.ts`、`weeklyReport.ts` |
| 承認と停止: `x:growth approve|pause --id`。Actions の「X growth experiment approval」（手動だけ・main だけ・X の認証情報なし） | `scripts/x-growth/run.mjs`、`.github/workflows/x-growth-approve.yml` |
| migration（本番未適用）: `created_by`/`approved_at`、同じ仮説で開いている実験は1つまで、`create_x_experiment_draft()`（冪等）、`approve_x_experiment()`（ほかに running があれば拒否）、`pause_x_experiment()` | `supabase/migrations/20261124090000_x_growth_drafts.sql` |

### テスト（実行済み）
- `test/xGrowthNext.test.ts` 19件: 新しい型の文字列はすべて英略語データどおり（400件以上）／各型で28日・14:14・題材の重複なし／1つの要因だけの実験（6つの不正な組み合わせを拒否）／リンク（URL の形と位置、別の URL・リンクなし・余計なリンクの拒否、runner で行き先の確認と本文）／時刻（割り当てと違う枠は claim の前に skip、割り当ての時刻なら投稿、対象外の曜日は skip しない、時刻の差を偏りにしない）／仮説（新しい型から探索し、その後にリンクと時刻）／自動下書き（開始日・期間・事前確認・待機中・残りが長い・型の比較が無い・奇数週を拒否）／PGlite（週次の自動下書きは1回だけ・draft のまま・approve で running・2回目の approve は拒否・pause、自動下書きは既定でオフ、ほかに running があれば拒否、未承認のたとえは承認時の確認で拒否）／workflow（承認は手動だけ・既定でオフ）
- 既存のテストの変更: 実験 DB のテストで、同じ仮説の draft を2つ作れないことを確認するように書き換えた（新しい制約どおり）
- X関連: **21 files / 200 tests passed**、typecheck exit 0、eslint 指摘なし
- 全体テスト（Node 22.18.0）: 下の最終確認を参照

### 承認が必要な残り
1. migration `20261124090000` を本番に適用する
2. `X_GROWTH_AUTO_DRAFT=true` にする（作られるのは下書きだけ）
3. 時刻の実験を行うなら: `X_POST_TIMES_JST` と投稿 workflow の cron を追加する
4. リンクの実験を行うなら: 費用の増加を承認する
- 全体テスト（Node 22.18.0、最終状態）: **370 files / 4088 tests passed**

## リンク付き投稿の費用の了承と上限（2026-11-23 JST）

- **運用者の判断（2026-11-23）**: リンクの実験の費用（リンク付きは X の投稿が1件 $0.20、8週間・各群16件で約 $3 の増加）を了承。実施は「型をひと通り試した後」（今の自動下書きの順番のまま）。
- 実装:
  - `planNextDraft(..., { allowLinkDrafts })`: `X_GROWTH_LINK_COST_APPROVED=true` のときだけ、リンクの比較（型は同じ・リンクだけ違う）を下書きにする。時刻の比較は引き続き下書きにしない。
  - runner: リンクの群は `linkAllowed()` が true のときだけ投稿する。無い、または上限を超える場合は、リンクなしの従来の経路に戻して標本に数えない（`link_budget_exceeded`）。
  - `SupabasePostStore.monthlyLinkSpendUsd()`: 今月（JST）の、リンク付きで X への送信を始めた投稿 × $0.20（少なく見積もらないよう、送信の試行で数える）。
  - 月の上限 `X_GROWTH_LINK_MONTHLY_USD_LIMIT`（既定 0 = 投稿しない、最大 50）を投稿 workflow に、`X_GROWTH_LINK_COST_APPROVED` を週次 workflow に渡す。
- テスト: 上限を超える／上限が無い → リンクなしに戻り、タグ付けしない／了承後だけリンクの比較を下書きにする／workflow の既定値。X関連 **203 tests passed**、typecheck・eslint 問題なし。
- 全体テスト（Node 22.18.0）: **370 files / 4091 tests passed**
