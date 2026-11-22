# データ構造案（既存Schemaを破壊しない）

## 既存テーブル
- `public.x_social_posts`: 公開済み `x_post_id`、`theme`、`utm_content`、`destination_url`、`generation`、ステータス等は既存仕様のまま保持。
- `public.x_post_performance()`: Webサイトから集計したvisits/visitors/signups。X上のインプレッションを含まない。

## 新テーブル
1. `x_growth_experiments`
   - id UUID PK, name, hypothesis, status (`draft/approved/running/paused/completed`), primary_metric, start_at, end_at, min_posts_per_variant, variants JSONB, allocation_seed, experiment_version, created_at
2. `x_growth_post_metrics`
   - id UUID PK, post_id UUID FK `x_social_posts`, x_post_id TEXT, measured_at TIMESTAMPTZ, age_hours NUMERIC, snapshot_stage (`24h/72h/7d/manual`), impressions BIGINT NULL, likes BIGINT NULL, reposts BIGINT NULL, replies BIGINT NULL, quotes BIGINT NULL, bookmarks BIGINT NULL, organic JSONB NULL, metric_source TEXT, collection_status (`ok/unavailable/permission_error/rate_limited/failed`), error_code TEXT NULL, UNIQUE(post_id,snapshot_stage) [再取得するなら新規履歴テーブルを別定義]
3. `x_growth_reviews`
   - id UUID, period_start/end, experiment_id, report JSONB, decision (`continue/inconclusive/propose_change/stop`), ai_analysis TEXT, approved BOOLEAN default false, generated_at
4. `x_growth_candidate_posts` （将来の手動レビュー/媒体対応用）
   - id UUID, experiment_id, variant_id, topic_id, draft JSONB, checks JSONB, status (`draft/approved/rejected/published`), created_at

## 既存テーブルへの追加列
`x_social_posts`に `experiment_id UUID NULL`, `variant_id TEXT NULL`, `content_style TEXT NULL`, `topic_id TEXT NULL`, `generation_version TEXT NULL`, `metrics_eligible BOOLEAN DEFAULT FALSE` を追加。既存レコードはNULL許容のまま、過去21投稿を無理に再分類しない。

## P1で実装した差分（2026-11-22・`supabase/migrations/20261122160000_x_growth_engine.sql`）
- 上の1〜3と`x_social_posts`の追加列を実装。4 `x_growth_candidate_posts` は P2 で作る。
- 追加: `x_growth_metric_runs`（API読み取りの予約台帳。日次/月次の予算、同時実行の禁止、レート制限の待機、中断の記録）。
- `x_growth_post_metrics` に追加した列: `run_id`, `site_visits/site_visitors/site_signups`（計測時点の`x_post_performance()`の値）、`attempt_count`（同じ段階の再試行回数・上限あり）、`created_at/updated_at`。制約: `ok` なら impressions は必須、`ok` 以外なら error_code は必須。
- 段階の窓: 24h=[22,40)時間、72h=[70,88)時間。窓を過ぎても計測できなかった段階は `unavailable / x_metrics_window_missed`（attempt 0・読み取りなし）として記録する。
- `metrics_eligible` は実験の有効標本かどうかの印（P2/P3で使う）。P1の収集対象は「自社アカウントの公開済み投稿・7日以内」で、この印には依存しない。
- RPC（すべて SECURITY INVOKER・service_role専用）: `x_metrics_due`, `reserve_x_metrics_reads`, `record_x_metrics_snapshot`, `mark_x_metrics_missed`, `finish_x_metrics_run`, `x_growth_post_report`。
- migrationファイルは `supabase` CLI が手元に無いため手で作成した（名前の形式は同じ）。

## 原則
- 移行前後で投稿予約/一意性/冪等性/既存RPCの動作を変更しない。拡張は加算的に。
- 新テーブルにRLS有効、anon/authenticated権限なし、service_role専用。特別な理由のないSECURITY DEFINER禁止。
- マイグレーションの正本は `supabase/migrations/`。CLIの利用可能なコマンドを`--help`で確認し、`supabase migration new x_growth_engine`で生成する。
- 本番DBには自動適用しない。まず検証環境へ適用し、テスト/権限確認後に明示承認。
- 収集APIのOAuth1署名では**GETクエリ文字列（ids, tweet.fieldsなど）も署名対象**。既存`signOAuth`は現状OAuth項目のみを署名しているため、GETクエリ付きAPIでの署名方式を検証・修正する。Xのユーザーコンテキストで呼ぶこと。
- `GET /2/tweets`は最大100件/リクエスト。閲覧回数・有機指標の有無は実際の認可とレスポンスで検証。未取得はNULL、勝手に0を埋めない。
- API読み取り費用は公式料金で概算・上限確認し、1日に同じ投稿を不要に再読しない。取得対象は公開済み自社投稿のみ。

## CLI案（実装後に使用）
- `npm run x:growth -- collect --fixture`
- `npm run x:growth -- collect --dry-run`
- `npm run x:growth -- experiment-plan --fixture`
- `npm run x:growth -- generate-candidates --fixture`
- `npm run x:growth -- report --fixture`
- `npm run x:growth -- report` [DB読取の費用等確認]

これらは目標インターフェースであり、**現在のrepoで動くコマンドではない**。
