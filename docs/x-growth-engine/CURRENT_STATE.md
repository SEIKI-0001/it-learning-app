# 現状確認（2026-11-22 JST）

## 対象
- GitHub: `SEIKI-0001/it-learning-app`（main）
- Supabase本番プロジェクト: `fe-quest`。**本番環境のDBは読み取り専用で確認済み。** これ以後のSQL/Secrets処理は環境を再確認すること。
- サイト: `https://shikaku-mochit.com`

## 現在のリポジトリ
- `.github/workflows/x-organic-post.yml`: 毎朝07:00 JST用Cron、`X_POST_ENABLED`、`X_POST_DRY_RUN`フラグ、手動fixture・verify_ai・verify_identity。
- `scripts/x-posting/run.mjs`: CLI run, ai-check, identity, recover, reconcile, report。
- `lib/growth/xPosting/{core,generator,runner,sources,store,xClient,usage}.ts`: 承認済みテキスト、Anthropic選択、投稿・DB処理、重複制御、X API v2。
- `test/xPosting*.test.ts`: 9ファイル。
- `supabase/migrations/20261013153920_x_organic_posts.sql`: `x_posting_accounts`, `x_social_posts`, `x_post_performance()` 等。Schema正本は `supabase/migrations/`。
- `docs/operations/x-organic-posting.md`: 設定・停止・復旧・コスト等のランブック。

## 本番DB集計スナップショット
- status=`published`: 21件、`failed`: 8件、`ready`: 1件。
- 公開済み21件のうち `destination_url` が設定された投稿: 0件。
- 投稿別UTM集計（`x_post_performance()`）: Visits/Visitors/Signups すべて0（プロフィール経由等の未計測流入まで0と断定しない）。
- 公開済みの投稿テーマ: terms 9、study 4、challenge 4、knowhow 3、service 1。
- 2026-11-22の投稿ジョブ: `failed` / `quality_check_failed`。
- 実際のXインプレッションやエンゲージメントを自動収集する既存実装は未確認。X閲覧数は不明。
- 直近の投稿は短い用語解説や学習アドバイス主体。本文のフックは `HOOKS` の4種の定型句に限定されている。

## 現行の保護機構（絶対に維持する）
- 既存教材と一致しない事実・問題文・正答を公開しない。
- `tweet`文字数（twitter-text）・根拠・重複テキスト・類似性チェック。
- OAuthユーザーID検証、定期投稿上限、DBアトミックな予約、publish未確定時の重複送信禁止。
- Secretsをログへ出さない。DRY_RUNはX読み書きなし。オフラインfixtureあり。
- 投稿が不明状態の場合には外部POSTを再発行せず、手動照合。

## 未確認（Claude Codeが確認すべき）
- 過去投稿の実際のインプレッション、APIで取得可能な指標の種類と権限。
- Actionsの直近実行ログ・現在のVariables/Secretsの正否。
- 本番投稿設定を今後継続すべきかの運用判断。
- 外部集客に対するLP/プロフィール誘導のCVR、Xアカウントのプロフィール訪問数。
