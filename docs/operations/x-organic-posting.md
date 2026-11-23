# X自動投稿・集客計測の運用

## 実装と初期状態

GitHub Actions `.github/workflows/x-organic-post.yml` が毎日22:00 UTC（翌日07:00 JST）に起動する。
Node.js 22のCLIから既存Anthropic SDK、専用Supabase Secrets、X API v2を直接利用する。
外部SNS投稿サービス、追加インフラは使わない。投稿APIをWebアプリに公開しない。
初期値は `X_POST_ENABLED=false`、`X_POST_DRY_RUN=true`。実投稿には両方の明示変更が必要。
未設定のSecretsを補うために既存アプリのDBへ自動接続することはない。

曜日は月:問題、火:用語、水:ひっかけ、木:勉強法、金:週末チャレンジ、土:学習ノウハウ、日:サービス紹介。
問題は公開済み・ハッシュ一致・出典確認済み・図表なしに限り、問題、全選択肢、正答、解説をそのまま使う。
独自問題は現状draft、公式問題も全文では加重280字を超えるため、現在の月・水は用語に切り替わる。
公式過去問の教育利用条件は[IPA FAQ](https://www.ipa.go.jp/shiken/faq.html)と[過去問題の利用案内](https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html)を確認（2026-10-14）。出典を付記し、改変・第三者図表の転載は行わない。
土曜は制度変更の自動生成を行わず、学習ノウハウを使用する。最新ニュースを追加する場合は、公式根拠と確認日をGit上でレビューしたコンテンツとして追加する。

AIは公開コンテンツID、投稿日、承認済み本文候補、投稿履歴、禁止事項、サービス価値、URLを受け取り、JSONを返す。
根拠のない文章を防ぐため、事実部分は承認済みブロックと完全一致を要求する。AIはフック、参照コンテンツ、リンク有無を選ぶ。
自由な事実の追加・問題の要約は拒否する。自己申告の品質判定だけでなく、JSON型、テーマ、根拠、本文、URL、加重文字数、類似性を検証する。
日本語140〜250字という目安より、Xの加重280字制限を優先する（日本語は通常2、URLは23）。[公式文字数仕様](https://docs.x.com/fundamentals/counting-characters)推奨の`twitter-text`を使用する。
学習履歴、回答、ユーザーIDなどをAIへ送らない。既存の採点APIは呼ばない。

## GitHub Secrets / Variables

Repository Settings → Secrets and variables → Actions で設定する。Secretsの値をログやコマンド履歴に貼らない。

| Secrets | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | 既存Anthropic環境のAPIキー。別のSaaSは不要 |
| `X_POST_SUPABASE_URL` | 投稿先DBのURL（検証時は検証DB、本番有効化時は本番DB） |
| `X_POST_SUPABASE_SERVICE_ROLE_KEY` | 上記DBと対になるサービスロールキー。NEXT_PUBLICを付けない |
| `X_API_KEY` / `X_API_SECRET` | XアプリのConsumer Key / Secret |
| `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` | 対象アカウントのOAuth 1.0aユーザートークン |

| Variables | 初期値・意味 |
|---|---|
| `X_POST_ENABLED` | `false`（実投稿許可） |
| `X_POST_DRY_RUN` | `true`（Xの読取・書込をともに呼ばない） |
| `X_POST_ACCOUNT_ID` | 対象Xアカウントの数値ID。ハンドル名ではない |
| `X_POST_TIMES_JST` | `07:00`、複数枠は`07:00,19:00`（最大4枠） |
| `X_POST_DAILY_LIMIT` | `1`（最大4）。予定日と実際のAPI要求日の両方で上限判定 |
| `X_POST_MONTHLY_AI_LIMIT` | `31`（最大124）。失敗・DRY_RUNも予約数に含む |
| `X_POST_AI_MODEL` | 未設定時は既存`ANTHROPIC_MODEL`/既定Claudeモデル |
| `X_POST_SITE_ORIGIN` | `https://shikaku-mochit.com` |

時刻・頻度を変える場合はVariablesとworkflowの`on.schedule`を一緒に変更する。
`X_POST_TIMES_JST=07:00,19:00 npm run x:post -- schedule` でUTC cron候補を表示できる。
cronと設定の不一致は停止する。Actionsのスケジュールは遅延し得る（7時ちょうどの実行保証はない）。
予定枠は`github.event.schedule`から直近の予定UTC時刻を復元し、JSTの日付が変わっても同じ枠を使う。
24時間以上の遅延はGitHubのイベントに予定日が含まれず識別できない。手動で`--slot`を指定して運用者が確認する。
手動`--slot`は設定時刻に一致し、未来でなく、過去24時間以内に限る（fixtureを除く）。

## X Developer Console

[認証マッピング](https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping)と[投稿ガイド](https://docs.x.com/x-api/posts/manage-tweets/integrate)確認日: 2026-10-14。

1. 対象アカウントでDeveloper Appを作成/選択し、User authenticationを設定。
2. OAuth 1.0aのApp permissionsを**Read and Write**にする。DM権限は不要。
3. アプリ自身の対象アカウント用Access TokenとSecretを発行。Read onlyから変更した場合は再発行する。
4. 上記4種類をSecretsへ保存し、対象ユーザーの数値IDを`X_POST_ACCOUNT_ID`に設定する。
5. クレジット残高と請求上限を確認。無制限のauto-rechargeを設定しない。
6. プロフィールに自動投稿アカウントである旨と運用者を明記し、[X自動化ルール](https://help.x.com/en/rules-and-policies/x-automation)を確認する。

実投稿直前に`GET /2/users/me`でユーザーIDを照合する。認証失敗・ID不一致なら投稿しない。
投稿は`POST https://api.x.com/2/tweets`に1回だけ送る。OAuth署名は標準Node cryptoで生成する。
401/403/429等の4xxはfailed、通信切断・タイムアウト・408・5xx・不正な成功応答はuncertain。
429も自動リトライせず、次の予定枠まで待つ。返信・フォロー・いいね・トレンド操作は実装していない。

[公式レート制限](https://docs.x.com/x-api/fundamentals/rate-limits)は投稿100/15分/ユーザー、10,000/24時間/アプリ（2026-10-14確認）。本実装の上限はこれより小さい。
[公式料金](https://docs.x.com/x-api/getting-started/pricing)は従量制で、通常作成$0.015、URL付き作成$0.200/要求。31投稿なら$0.465〜$6.20/月に、本人確認GETとAI料金が加わる。
詳細分析は自社サイト計測を優先し、X分析APIの定期取得は実装していない。
Xの所有データ取得は条件を満たせば$0.001/resource、通常のPost read等は別料金。閲覧/いいね等の取得可能なフィールドはユーザー認証・投稿所有者・現行契約の条件をConsoleと公式仕様で確認してから追加する。
価格は変更され得るため、有効化時に再確認する。

## Supabase適用

正本は`supabase/migrations/20261013153920_x_organic_posts.sql`。`schema.sql`は手編集・直接適用しない。
サービスロール専用の`x_posting_accounts`、`x_social_posts`を追加。RLS有効・anon/authenticatedへのテーブル権限とRPC実行権限なし。
RPCはSECURITY INVOKER。service_role以外へ権限を付与しない。
既存テーブルは変更しない。`signup_attributions.ref`、`public_funnel_events.placement`で投稿を識別する。

まず使い捨て/検証DBへ通常のmigration手順で適用し、確認後に本番へ適用する。CLIの`--help`で利用バージョンの引数を確認する。

```bash
supabase link --project-ref <検証DBのref>
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

表示された適用対象を確認する。未適用のbaselineや無関係なmigrationが出たら、そのままpushしない。
本番では本番refへlinkし直し、同じ確認と適用を行う。baselineのDDLを既存本番へ再実行しない。
`scripts/generate-supabase-schema.sh`は使い捨てDBを全active migrationsから作り直した場合だけ使う。
初回実装時（2026-10-14）は投稿用Secrets未登録・リモートDB未適用だった。
2026-10-18に運用者の承認を受け、本番fe-questへ投稿用migrationを適用し、サービスロールの専用Secretsを登録した。
2026-10-21時点でXの4 SecretsとANTHROPIC_API_KEYの登録、XアプリのRead/Write権限とクレジット残高を確認した。
投稿有効化は本人確認とDRY_RUNの結果を確認してから行う。
投稿CLIは専用の`X_POST_SUPABASE_*`を必須にし、本番と検証を暗黙に混用しない。

## AI認証・モデルの診断

手動実行の `verify_ai=true` は他の入力より優先され、モデル情報取得とトークン数計算だけを実行する。
文章生成・DB操作・X操作・生成枠の再取得は行わない。`npm run x:post -- ai-check` でも実行できる。
API認証・モデル確認が成功しても、文章生成に使える残高までは保証しない。
生成時のエラーは `anthropic_http_401` 等のHTTP状態タグ、`anthropic_credit_balance_low`、
`anthropic_request_failed` で記録する。SDKのメッセージ・キー・レスポンス本文をログに出さない。
生成に失敗した予定枠は取得済みのまま残し、自動で再生成しない。

## X認証の事前確認

XのRead/Writeトークンを作成後、4つのX Secretsを登録する。
Actionsの手動実行で `verify_identity=true` を選ぶと、`dry_run` / `fixture` の値によらず、
X本人確認GETだけを1回実行する。AI・DB・投稿POSTは呼ばず、アカウントIDとハンドルだけをログに出す。
Xの読取API料金は発生する。想定ハンドル `itpassportsup` と異なる場合は失敗する。
成功時の `accountId` をRepository Variable `X_POST_ACCOUNT_ID` に設定してからDRY_RUNへ進む。
これは通常のDRY_RUNとは別の診断操作で、スケジュール起動には影響しない。

```bash
npm run x:post -- identity --username itpassportsup
```

## DRY_RUN

Node.js 22で`npm ci`を実行する。
認証情報・課金なしのオフライン検証（AI出力は明示fixture、DBはローカルJSON）:

```bash
npm run x:post -- run --dry-run --fixture --output /tmp/x-posts-dry-run.json
```

`ready`と本文を表示し、JSONへ保存する。fixtureは実投稿機能を持たず、`--dry-run`/DRY_RUN環境値がfalseなら停止する。
ローカルファイルロックで同時書込を拒否する。プロセス強制終了時に残る`.lock`ディレクトリは、他プロセスが停止していることを確認して手動で削除する。
同じファイル・同じ枠の再実行はskipped。別のfixtureを確認したいときは別出力ファイルを指定する。

検証DBと本物のAIで確認する（X Secretsは不要、AI料金は発生する）:

```bash
npm run x:post -- run --dry-run
npm run x:post -- report
```

事前に`ANTHROPIC_API_KEY`、`X_POST_ACCOUNT_ID`、`X_POST_SUPABASE_*`を安全な環境変数として設定する。
Actions → X organic educational post → Run workflowでもdry_run=trueで実行できる。
fixture=trueならSecretsなしのオフライン検証。workflowはmainからのみ実行可能。
DRY_RUNは文章生成・品質チェック・保存のみ。X本人確認GET、投稿POST、LPの稼働確認は実行しない。
実投稿前にリンク先のHTTP成功・HTML応答を確認し、URLリダイレクトや障害は投稿停止する。

## 本番有効化・停止

1. mainに実装が入っていることと、全必須検証を確認。
2. 本番DBへmigrationを適用し、Secretsが同じDBのURLとキーであることを確認。
3. 検証DBでDRY_RUNし、本文・モデル・根拠・投稿先・UTMを確認。
4. 本番DBへ接続するSecrets、XのRead/Writeトークン、数値アカウントIDを設定。
5. 運用者が明示的に`X_POST_ENABLED=true`、`X_POST_DRY_RUN=false`を設定する。
6. 次の予定枠を待つか、手動dry_run=falseで実行する。同じ枠でDRY_RUN済みなら再送しない。新しい枠を待つ。
7. X上の投稿と`npm run x:post -- report`を確認する。

停止は`X_POST_ENABLED=false`。設定済みでもdry_run=trueならXへ投稿しない。
すでに実行中のジョブは変更前の環境値で動くため、急停止はActionsジョブも停止する。送信済みか不明なら以下の復旧手順へ。

## 失敗・途中停止・結果不明

アカウント/予定枠の組合せは一度だけ取得可能。1枠1AI要求で、SDKリトライは0。
DB行ロックで同一アカウントの枠予約・品質保存・投稿開始を直列化する。内容ハッシュ・コンテンツID・bigram類似度0.72以上をDBでも拒否する。
投稿開始状態`publishing`をDBへ保存した後だけXへ送る。
通信結果不明・X成功後のDB保存失敗は決して自動再送しない。DB保存不能ならCLI出力の内部IDとX投稿IDが復旧の手掛かりになる。

```bash
npm run x:post -- recover
npm run x:post -- report
```

recoverは20分以上放置されたdraftをfailed、publishingをuncertainへ移す。readyは残す。readyを自動投稿に移すコマンドはない。
uncertain/readyはXアカウントを人が確認し、成功を確認した投稿IDと確認メモで確定する:

```bash
npm run x:post -- reconcile --id <内部UUID> --x-post-id <確認済みX投稿ID> --note '対象アカウントと投稿本文をX上で照合済み'
```

投稿がないと確認できた場合やDRY_RUNを取り消す場合、`--x-post-id`を省略してcancelledへ確定する。確認メモは10文字以上。
取消しても予定枠とAI予約上限は解放しない。古い枠を書き換えたり行を削除したりして再送しない。
誤ったX投稿IDで確定しないこと。reconcileは運用者の確認を前提にし、X分析APIを自動取得しない。

### 失敗理由（error_summary）の読み方（2026-11-22追記）

- `no_unused_content`: その曜日のテーマも代替の`terms`も、未使用の承認済み本文が残っていない。教材(承認済みsource)の追加が必要。品質基準は下げない。
- `quality_check_failed_<理由>`: AI出力が検証で落ちた。理由は固定タグ `invalid_schema` / `unsupported_content` / `invalid_length` / `duplicate_content` のみ（AIの文面は保存しない）。
- `ai_output_not_json`: AI応答がJSONとして読めない（単一のコードフェンスは許容）。
- 過去行の`quality_check_failed`（理由なし）は旧形式。2026-11-08/15/22（日曜）の3件は、日曜テーマ`service`の本文2件がどちらも履歴にあり重複判定で落ちたもの。現在は使用済み本文をAIに渡さず、テーマが尽きたら`terms`へ切り替える。

## 集客・コストレポート

`npm run x:post -- report`は投稿予定日・テーマ・状態・投稿ID・エラー概要、流入・登録数、テーマ別成果、月次API予約数と投稿料金概算をJSONで返す。
`public.x_post_performance()`もSQL Editorから利用できる（管理者/service_role限定）。

全CTAは`utm_source=x&utm_medium=social&utm_campaign=organic_x&utm_content=x-<UUID>&ref=x-<UUID>`。
公開ページ入口のviewだけに投稿IDをplacementとして保存する。
X投稿用refでは既存の流入元Cookieを上書きせず、本来の招待（ref=betaなど）の優先処理は維持する。既存のクリック位置計測は維持する。
登録は既存first-touch Cookie（30日）のrefを利用し、beta特典のrefとは別の値になる。
カラム追加や認証処理変更はない。リンクなし投稿の成果は直接帰属できない。

visitsは入口view数、visitorsは投稿別の匿名visitor_idのユニーク数、signupsは既存first-touch登録数。
転換率はsignups/visitors。訪問と登録を別々に集計してjoinによる水増しを防ぐ。
匿名訪問をユーザーと照合しないため、厳密なコホート転換率ではなく参考指標。別端末、Cookie拒否、広告ブロック等で欠測する。
テーマ別visitorsは投稿別ユニーク数の合計で、同じ訪問者が複数投稿から来れば複数回数える。
レポート内の月次AI数は請求実績ではなく上限用の予約数（failed/DRY_RUNを含む）。
月次X概算は要求開始を基に算出するため未送信の途中停止も含み得る。本人確認GET・AIトークン料金は含めない。
1要求の生成上限は1200 output tokens、月次既定31回。入力には公開候補と直近40投稿までを使う。
正確な請求額はAnthropic ConsoleとX Developer Consoleで確認する。

## Xメトリクスの読み取り（P0・読み取り専用）

`lib/growth/xPosting/metricsClient.ts` が `GET /2/tweets` を1回だけ呼ぶ（POST/DB書き込み/再試行なし）。

```bash
npm run x:post -- metrics --fixture                 # オフラインfixture。認証情報・通信・DBなし
X_METRICS_LIVE_READ=true npm run x:post -- metrics --ids <X投稿ID,...>   # 実API（従量課金）。運用者の明示承認後のみ
```

- 実API読み取りは `X_METRICS_LIVE_READ=true` が無いと通信前に `x_metrics_live_read_not_enabled` で止まる。1回の上限は `X_METRICS_MAX_READS`（既定10・最大100）。出力に `estimatedUsd`（0.005ドル/投稿の概算）を出す。
- `--owned` で `non_public_metrics` / `organic_metrics` も要求する（自分の投稿・作成30日以内・ユーザーコンテキストのみ）。
- 取得できなかった値は `null`。`collectionStatus` は `ok/unavailable/permission_error/rate_limited/failed`、`errorCode` は固定タグで、Xの本文メッセージは出さない。
- 詳細・出典は `docs/x-growth-engine/PROGRESS.md`。

## Xメトリクスの定期収集（P1・読み取り専用）

`.github/workflows/x-metrics-collect.yml` が6時間ごと（03:15 / 09:15 / 15:15 / 21:15 JST）に `npm run x:growth -- collect` を実行する。実際の投稿は 10:30〜13:30 JST ごろ（投稿ジョブの開始が遅れるため）なので、1日2回の実行では各窓に1回しか入らず、再試行の機会が無かった（2026-11-23 に変更）。対象が無い実行ではXへ通信しない。投稿・返信・いいね・リポスト・フォローは一切しない。**既定では何もしない**。

| Variable | 既定 | 意味 |
|---|---|---|
| `X_METRICS_ENABLED` | `false` | 緊急停止スイッチ。`true` 以外なら定期ジョブ自体が起動せず、手動実行でも `{"state":"disabled"}` で止まる（DBにもXにも触れない） |
| `X_METRICS_DRY_RUN` | `true` | 計測対象と概算費用を出すだけ。DBにもXにも書き込まない（手動実行では `dry_run` 入力が優先、既定 true） |
| `X_METRICS_LIVE_READ` | `false` | `true` のときだけXへ読み取りリクエストを送る（従量課金） |
| `X_METRICS_DAILY_READ_BUDGET` / `X_METRICS_MONTHLY_READ_BUDGET` | `10` / `120` | 読み取り件数の上限（JSTの日・月）。失敗した要求も予約分を数える |
| `X_METRICS_MAX_READS` | `10` | 1回のリクエストで読む最大件数（最大100） |
| `X_METRICS_MAX_ATTEMPTS` | `2` | 同じ段階を再試行してよい回数（rate_limited / failed のみ） |
| `X_METRICS_OWNED` | `true` | 自分の投稿だけの指標（organic / non_public）も要求する。権限エラーが続くなら `false` |

Secrets は既存の `X_POST_SUPABASE_URL` / `X_POST_SUPABASE_SERVICE_ROLE_KEY` / `X_API_*` を使う。Anthropicキーは使わない。

処理の流れ: 緊急停止 → 計測対象の段階をDBから取得（自社・公開済み・7日以内、24h=[22,40)時間 / 72h=[70,88)時間）→ 件数と概算費用 → dry-runならここで終了 → 窓を過ぎた段階を missed として記録 → live-readの確認 → **予算をDBで原子的に予約** → `GET /2/tweets` を1回 → 投稿ごとに冪等に保存。

- 同じ投稿・同じ段階の行は1つだけ（UNIQUE）。`ok` / `unavailable` / `permission_error` は確定で、再取得しない。`rate_limited` / `failed` だけを窓の中で `X_METRICS_MAX_ATTEMPTS` 回まで再試行する（次回の実行時。同じ実行の中では再試行しない）。
- 429 を受けたら reset 時刻まで次の実行は `rate_limit_wait` で止まる。実行中の予約が残っていれば `run_in_progress`。30分放置された予約は `interrupted` として扱う。
- 取れなかった値は NULL。0 は本当に0のときだけ。他人の投稿が返ってきた場合（author_id が違う）は `x_metrics_not_own_post` として数値を保存しない。
- 各行には計測時点の `x_post_performance()`（入口view・匿名visitor・登録）も保存する。

```bash
npm run x:growth -- collect --fixture   # オフライン（メモリ上のPostgres＋本物のmigration）。秘密情報・通信不要
npm run x:growth -- collect --dry-run   # 本番DBを読むだけ（計測対象と概算費用）
npm run x:growth -- report --days 14    # 投稿ごとの 24h/72h と サイト流入・登録（読み取りのみ）
```

費用の目安: 1日1投稿×2段階 ≒ 月60件の読み取り × $0.005 ≒ **月$0.30**。既定の月間上限120件 = $0.60。

本番で使い始める手順（**それぞれ運用者の承認が必要**）:
1. migration `20261122160000_x_growth_engine.sql` をまず検証用DB（Supabaseブランチ等）に適用し、`collect --dry-run` で確認する。
2. 本番DBに適用する（このPRでは適用していない）。
3. Actions の「X metrics snapshot (read-only)」を手動実行し、`verify_post_id` に直近の公開投稿IDを1件入れる（約$0.005・GETは1回・DBには触れない）。出力の `responseShape` で、返ってきたフィールド名・author_idの一致・権限エラーの有無・レート制限ヘッダーを確認する。
4. Variables を `X_METRICS_ENABLED=true` にする（dry-runのまま数日様子を見る）→ `X_METRICS_DRY_RUN=false` → `X_METRICS_LIVE_READ=true` の順に進める。止めるときは `X_METRICS_ENABLED=false`。

## X Growth Engine P2〜P4（表現の実験・週次 PDCA）

### 全体の流れ
仮説 → 実験（2群）→ 投稿（既存の投稿 workflow）→ 計測（P1 の収集）→ 週次の分析（ルール）→ 次の仮説（提案だけ）。
**本番で動かすには、下の「有効化のチェックリスト」の各段階で運用者の承認が必要。** マージしただけでは何も変わらない。

### 切り替え（すべて既定はオフ）
| 変数 | 既定 | 効果 |
|---|---|---|
| `X_GROWTH_EXPERIMENTS_ENABLED` | `false` | `true` かつ DB に running の実験があるときだけ、投稿 workflow が実験の経路を使う。止めると次の投稿から従来の経路に戻る |
| `x_growth_experiments.status` | `draft` | `running` は同時に1つだけ。`paused` / `completed` にすれば、その場で実験の割付が止まる |
| `X_GROWTH_WEEKLY_ENABLED` | `false` | 週次の分析 workflow（月曜 09:15 JST）の緊急停止スイッチ |
| `X_GROWTH_WEEKLY_SAVE` | `false` | レビューと仮説を DB に保存するか（保存しなくてもレポートは Actions の Summary と artifact に出る） |
| `X_GROWTH_AI_ANALYSIS` | `false` | AI による解釈の文章（週1回・Anthropic）。数値は計算結果と照合し、合わなければ捨てる |
| P1 の `X_METRICS_*` | — | 変えない（今の値のまま収集が続く） |

### 実験の経路での安全策
- 割付はコード（`((d mod 7) + 週 + seed) mod 2`）で決める。LLM は実験の経路では呼ばない。
- 本文は承認済みの英略語データからテンプレートで作り、検証でもう一度作り直して完全一致を確かめる。加えて、文字数・重複・禁止表現（合格率・100%・最新・URL・@・いいね/リポストの誘導など）・メタデータを確認する。
- `analogy`（たとえ）は `data/x-growth/analogies.json` の承認済みの項目だけを使う。今ある12件はすべて draft で、本番では使われない。
- 候補が作れなければ従来の経路で投稿し、標本には数えない（`quality.reasons` に `experiment_fallback:<理由>` を残す）。タグ付けに失敗したら投稿しない。
- 1日の投稿数・時刻・予約・二重投稿の防止・結果不明のときに再送しない動作は、既存の投稿 workflow のまま。

### 週次の判定（ルール）
欠損率 > 30% → 計測を直す（pause）／有効な標本 < 最低数 → 続ける・延長する／曜日・時刻・題材の偏り → やり直す／95%CI が1をまたぐ → 差なし／外れ値を除くと結論が変わる → やり直す／それ以外 → 「探索的な傾向」（1回の実験では確定しない）。別の実験で同じ向きなら「再現を確認」。それでも**採用は提案だけで、自動では変えない**。
運用アラートに「要対応」（結果不明の投稿・20分以上 publishing のまま・メトリクスの権限エラー）があると、週次のジョブを失敗（exit 2）にして GitHub から通知が届く。

### コマンド
```bash
npm run x:growth -- preview --days 28                     # 実験の割付と本文をオフラインで確認（fixture の実験）
npm run x:post -- run --fixture --dry-run --experiment-file test/fixtures/xGrowth/experiment.json --slot 2026-12-05T22:00:00.000Z
npm run x:growth -- weekly --fixture --scenario realistic   # 週次レポートをオフラインで（realistic/empty/incomplete/biased/outlier/lead/high_missing）
npm run x:growth -- weekly                                  # 本番の DB を読む（X_GROWTH_WEEKLY_ENABLED=true が必要。保存は X_GROWTH_WEEKLY_SAVE=true のときだけ）
```

### 環境の分け方
- **開発**: PGlite（メモリ上の Postgres に本物の migration を適用）＋偽の X・偽の AI。`npm test` と `--fixture` の各コマンド。
- **staging**: ローカルの Supabase（colima＋Supabase CLI。費用なし）。Supabase のブランチは Pro プランが必要で使えない。`it-learning-app-2` は Cloudflare pilot なので使わない。
- **本番**: `fe-quest`。migration の適用・変数の変更・実験の開始は、それぞれ運用者の承認のあとだけ。

### 費用
- 実験の経路: AI を呼ばない（従来の経路より AI 費用が減る）。X の投稿費用は今と同じ（1日1件・リンクなし $0.015）。
- 計測: P1 のまま（月 $0.30 前後、上限 月 $0.60）。
- 週次の分析: DB の読み取りだけ。AI による解釈を有効にすると週1回（約1,000トークン程度）。

### ロールバック（P2/P3 の migration）
新しいテーブル・列・関数だけを消す。既存の投稿の行や P1 のテーブルは変わらない。
```sql
begin;
drop function if exists public.save_x_growth_review(timestamptz,timestamptz,uuid,jsonb,text,text,text,text,jsonb), public.x_growth_ops_summary(text,timestamptz),
  public.x_growth_hypothesis_outcomes(timestamptz), public.x_growth_review_history(timestamptz), public.x_growth_list_experiments(), public.x_growth_analysis_rows(text,timestamptz,timestamptz);
drop table if exists public.x_growth_hypotheses;
drop index if exists public.x_growth_reviews_period_experiment;
alter table public.x_growth_reviews drop column if exists action, drop column if exists report_version;
drop function if exists public.tag_x_post_experiment(uuid,uuid,text,text,text,text), public.active_x_experiment(timestamptz);
drop index if exists public.x_growth_experiments_one_running;
alter table public.x_growth_experiments drop constraint if exists x_growth_experiments_two_variants, drop constraint if exists x_growth_experiments_running_has_period,
  drop column if exists hypothesis_key, drop column if exists config;
delete from supabase_migrations.schema_migrations where version in ('20261123090000', '20261123120000');
commit;
```
すぐに止めたいだけなら、ロールバックは不要。`X_GROWTH_EXPERIMENTS_ENABLED=false` にするか、実験を `paused` にする。

### 型・リンク・時刻の実験の広げ方（2026-11-23 追加）

**使える型（8つ）**: 今の形（定義から・対照群）／問いかけから／よくある混同を正す／ミニクイズ／○×クイズ（`true_false`）／英語の意味から分解する（`word_parts`）／試験のキーワードから当てる（`keyword_hint`）／たとえ（承認済みの項目だけ）。いずれも英略語データの文字列を一字一句使う。

**1つの実験で変えるのは1つだけ**（型・リンク・投稿時刻のどれか）。2つ以上違う実験は登録の時点で拒否される。
- リンク: 片方の群に、その用語の単語帳ページ（`/words/<id>`、UTM つき）を付ける。**X の投稿費用がリンク付きは1件 $0.20**（リンクなしは $0.015）。8週間で各群16件なら約 $3 の増加。
  - **費用は 2026-11-23 に運用者が了承済み。** 実施の順番は「型をひと通り試した後」（自動下書きの順番のまま）。
  - `X_GROWTH_LINK_COST_APPROVED=true` のときだけ、週次の自動下書きがリンクの比較を下書きにする。
  - **月の上限** `X_GROWTH_LINK_MONTHLY_USD_LIMIT`（既定 0 = リンクを投稿しない）。今月のリンク付き投稿（X への送信を始めたもの）× $0.20 に1件を足して上限を超えるなら、その日はリンクなしの従来の経路で投稿し、標本には数えない（`experiment_fallback:link_budget_exceeded`）。
- 投稿時刻: 例 07:00 vs 19:00。始めるには、(1) `X_POST_TIMES_JST=07:00,19:00`、(2) 投稿 workflow に 19:00 JST（`0 10 * * *`）の実行を追加する、の2つが必要（どちらも承認が必要）。1日1件の上限は変わらない。割り当てられた時刻でない枠は、枠を取らずに skip するので、同じ日のもう一方の枠で投稿される。時刻の実験では、時刻の差を「偏り」として扱わない。

**次の実験の自動下書き**（`X_GROWTH_AUTO_DRAFT=true` かつ `X_GROWTH_WEEKLY_SAVE=true` のとき）:
- 週次の分析で一番上の仮説が「型の比較」で、承認待ちの下書きが無く、今の実験の残りが14日以内なら、次の実験を **draft** で作る（同じ仮説の下書きは1つまで）。リンクと時刻の比較は自動では下書きにしない（費用や設定の変更が要るため）。
- 開始は、今の実験が終わった次の月曜 00:00 JST。期間は8週間（2週間で曜日が均等になるので、週の数は偶数）。対象の曜日は今の実験と同じ。承認済みの内容だけで事前に確認し、各群が最低数に届かなければ作らない。
- 週次レポートの「次の実験の下書き」に id が出る。**下書きのままでは投稿に使われない。**

**ワンクリックで開始・停止**: Actions の「X growth experiment approval」を手動実行し、`experiment_id` と `approve` / `pause` を選ぶ。
- approve: 下書きを承認済みの内容だけでもう一度確認してから running にする。ほかに running の実験があれば拒否する。
- pause: running の実験を止める（次の投稿から従来の経路に戻る）。
- migration `20261124090000_x_growth_drafts.sql`（本番への適用は承認が必要）。

### 有効化のチェックリスト（上から順に。各段階に承認が必要）
1. PR をマージする（マージだけでは何も変わらない）。
2. staging（ローカル Supabase）で P2/P3 の migration を確認する（このPRで実施済み。PROGRESS.md を参照）。
3. **本番に P2/P3 の migration を適用する**（承認が必要）。適用後に表・関数・RLS・権限・既存の投稿 RPC を確認する。
4. 週次の分析を dry-run で有効にする: `X_GROWTH_WEEKLY_ENABLED=true`（保存しない）。最初のレポートを確認する。
5. 保存を有効にする: `X_GROWTH_WEEKLY_SAVE=true`（承認が必要）。
6. 最初の実験を DB に `draft` で作り、内容を確認したら `running` にする（**承認が必要**）。`x:growth preview` で28日分の本文を事前に確認する。
7. `X_GROWTH_EXPERIMENTS_ENABLED=true` にする（**承認が必要**）。最初の数日は、毎日の投稿の本文・タグ（`variant_id` など）・P1 の計測を確認する。
8. （任意）`X_GROWTH_AI_ANALYSIS=true`（週1回の AI 費用。承認が必要）。
9. （任意）analogy を使うなら、`data/x-growth/analogies.json` の各項目を人が確認し、`approved: true`・`reviewedBy`・`reviewedAt` を入れる。

## 検証と制約

`npm run typecheck` / `npm run lint` / `npm test`で検証する。外部APIはモックし、DBはPGliteでSQLを実行する。
オフラインDRY_RUNを別途実行する。問題バンクは変更していない。
PGliteは単一インスタンス内でSQLを直列処理するため、本番Postgresの複数コネクション負荷検証の代替ではない。
承認済みコンテンツIDは再利用しないため、使い切ったら投稿を止めて候補を追加・レビューする。日曜サービス素材など候補の少ないテーマは早めに追加が必要。
接続先・Secrets・Xアカウント未設定でもコード、モック検証、fixture DRY_RUNは利用可能。本物のAI生成・X投稿・GitHub定時実行・実登録による本番計測は運用者の設定後に検証する。

## 今回の検証結果（2026-10-14）

- Node.js 22.23.3、`npm run typecheck`: 成功。
- `npm run lint`: エラー0。既存のMemberSiteDioramaSceneの未使用変数、AccountLinkSettingsの内部遷移に警告2件。
- `npm test`: 329ファイル / 3,589テスト成功。投稿関連は8ファイル / 43テスト。
- `npm run build` / `npm run build:vinext`: 成功。デプロイコマンドは実行していない。
- fixture DRY_RUN: `ready`、JSON保存、同一枠再実行skippedを確認。外部API課金なし。
- LP、教材体験、過去問、用語、学習ガイド: 公開URLでHTTP 200確認。
- 独立コードレビュー: first-touch上書きの指摘を修正し、実コンポーネントのCookie保持テストで検証。
- 既存PublicTrialテストは現行CPU教材と古い論理回路の期待値がずれていたため、公開教材を開いて電源OFFする操作と非保存性の検証に更新。教材実装は変更なし。
- 本番X投稿、実AI課金呼び出し、リモートDB適用は未実施。問題データ変更なしのためvalidate:questionsは追加実行対象外。

## 変更ファイル一覧

- `.github/workflows/x-organic-post.yml`
- `lib/growth/xPosting/core.ts`
- `lib/growth/xPosting/sources.ts`
- `lib/growth/xPosting/generator.ts`
- `lib/growth/xPosting/xClient.ts`
- `lib/growth/xPosting/runner.ts`
- `lib/growth/xPosting/store.ts`
- `lib/growth/xPosting/fixtureStore.ts`
- `lib/growth/xPosting/usage.ts`
- `scripts/x-posting/run.mjs`
- `supabase/migrations/20261013153920_x_organic_posts.sql`
- `components/growth/AttributionCapture.tsx`
- `components/growth/FunnelTracker.tsx`
- `lib/growth/funnel.ts`
- `types/twitter-text.d.ts`
- `package.json`
- `package-lock.json`
- `test/xPosting.test.ts`
- `test/xPostingRunner.test.ts`
- `test/xPostingDatabase.test.ts`
- `test/xPostingAttribution.test.ts`
- `test/xPostingCapture.test.tsx`
- `test/xPostingCli.test.ts`
- `test/xPostingSources.test.ts`
- `test/xPostingUsage.test.ts`
- `test/PublicTrial.test.tsx`
- `docs/superpowers/plans/2026-10-14-x-organic-posting.md`
- `docs/operations/x-organic-posting.md`
