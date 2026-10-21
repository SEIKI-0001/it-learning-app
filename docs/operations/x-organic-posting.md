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
