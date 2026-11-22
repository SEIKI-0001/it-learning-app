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
