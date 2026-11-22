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
