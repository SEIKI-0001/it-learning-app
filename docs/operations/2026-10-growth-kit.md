# 外部ユーザー10人：10月の追加施策と運用素材

`2026-09-first-ten-users.md` の続き。成果の定義・除外ルール・禁止事項はそちらに従う。
2026-10-03 時点で、9/29の開始以降の新規登録は0件（`scripts/acquisition/signup-sources.sql` で確認）。

## 方針

- 新ドメインの検索流入は成果まで数か月かかる。10人は X の勉強垢界隈へこちらから出向いて集める。
- 最初の10人は「βテスター」として迎え、Pro 3か月と引き換えに感想をもらう。売上より学びを優先する。
- 公開過去問と解説をそのまま X に貼れる単位として使う。投稿・記事・シェアのリンクには必ず utm を付ける。
- 広告費は0円。自動フォロー・自動リプ・無差別DM・架空の利用者や感想は使わない。

## 今回の実装（PR: feat/growth-10-users）

| 仕組み | 内容 |
| --- | --- |
| 流入元の記録 | 初回訪問の utm・ref・外部サイトのホスト名を Cookie `fq_attr` に保存。Google 登録直後に `signup_attributions` へ1行書く |
| βテスター特典 | `ref=beta` 付きリンクから登録した先着10名に Pro 90日を自動付与。上限は DB 関数 `grant_beta_pro` で直列化して守る |
| Xシェア | 公開過去問・テーマ別解説・模試結果に「Xでシェア」。共有URLには utm_source=x・utm_medium=share が付く |
| 集計 | `scripts/acquisition/signup-sources.sql` で流入元別の登録・回答・再訪・特典付与を数える |

LINE ボット経由の登録には流入元が付かない。Web の新規登録は Google ログインだけなので、10人の計測には足りる。

### 本番反映の手順

1. PR をマージする。
2. マイグレーション `20261003090000_signup_attributions.sql` を本番 fe-quest に適用する。
3. Cloudflare へ手動 deploy する（`npm run build:vinext` → `npx wrangler deploy --config dist/server/wrangler.json`）。
4. 自分の別 Google アカウントで `https://shikaku-mochit.com/lp/try?ref=beta&utm_source=test` から登録し、`signup_attributions` に行が入り `user_profiles.pro_until` が90日後になることを確かめる。確認後、そのアカウントの行は excluded_user_ids に入れる。テストで特典枠を1つ使うので、必要なら行の `beta_granted_at` を null に戻す。

## リンク一覧

| 用途 | URL |
| --- | --- |
| 毎日1問のリプ | 各問題ページ + `?utm_source=x&utm_medium=social&utm_campaign=daily_q`（原稿に記載済み） |
| βテスター招待 | `https://shikaku-mochit.com/lp/try?ref=beta&utm_source=x&utm_medium=social&utm_campaign=beta` |
| 勉強垢へのリプ | 解説ページ + `?utm_source=x&utm_medium=reply&utm_campaign=help` |
| note 記事 | `https://shikaku-mochit.com/lp/try?utm_source=note&utm_medium=article&utm_campaign=study_order` |
| Zenn 記事 | `https://shikaku-mochit.com/lp?utm_source=zenn&utm_medium=article&utm_campaign=devlog` |

## X：毎日1問

30日分の原稿は `2026-10-x-daily-questions.md`。本文は問題だけにし、答えと解説リンクは1〜3時間後に自分のリプで出す。

## X：βテスター募集（固定ポストにする）

```text
ITパスポートの学習アプリ「資格もちっと」のβテスターを10名募集します。

・教材93テーマと公式過去問500問を、図解と演習で
・試験日から逆算して「今日やること」を出します
・お礼に有料プラン（Pro）を3か月無料に

使ってみて、分かりにくかったところを1つ教えてください。
下のリンクからGoogleで登録すると自動で付与されます（10名に達したら終了）
https://shikaku-mochit.com/lp/try?ref=beta&utm_source=x&utm_medium=social&utm_campaign=beta
#ITパスポート #勉強垢
```

- 10名に達したら固定ポストを外し、「募集は終了しました」と追記する。残り枠は `signup-sources.sql` 末尾のクエリで見る。
- 感想は DM かリプでもらう。内容を指定しない。良い感想だけを選んで公開しない。LP に載せるときは本人の許可を取る。

## X：勉強垢への返信テンプレ

検索語の例：「ITパスポート 勉強中」「ITパスポート わからない」「ITパスポート 何から」。
相手が質問や困りごとを書いている投稿にだけ返す。宣伝目的と見られる返信は1日10件までにする。

困っている用語がはっきりしている投稿：

```text
横から失礼します。{用語}は「{一言のたとえ}」と考えると覚えやすいです。
図で整理したページを置いておきます（登録なしで読めます）
{解説URL}?utm_source=x&utm_medium=reply&utm_campaign=help
```

「何から始めればいいか」系の投稿：

```text
身近な話題の多いストラテジ系から入り、過去問は最後の3週間にまとめるのがおすすめです。
試験日を入れると1日の量を出してくれる学習アプリを作っているので、よければ試してみてください（教材と過去問は無料）
https://shikaku-mochit.com/lp/try?utm_source=x&utm_medium=reply&utm_campaign=help
```

返信には運営者であることを明記する（プロフィールで分かるようにしておく）。

## note 下書き（受験者向け）

タイトル：ITパスポート、何から始める？ 3分野を回る順番と過去問に入るタイミング

```text
※私が運営するITパスポート学習アプリ「資格もちっと」の考え方を紹介します。

ITパスポートは、ストラテジ系・マネジメント系・テクノロジ系の3分野から出題されます。
テキストを1ページ目から順に読むと、カタカナ用語の多いテクノロジ系で止まりがちです。

おすすめの順番は次の3段階です。

1. ストラテジ系から入る
   企業活動や法律など、ニュースや日常に近い話題が多く、最初の成功体験を作りやすい分野です。
2. テクノロジ系は「図で見てから用語」
   2進数やネットワークは、用語を覚える前に仕組みを一度見ると定着が早くなります。
3. 過去問は最後の3週間に集中
   全範囲を1周してから解くと、間違えた問題がそのまま弱点リストになります。

毎日の量は「試験日までの日数」で決まります。
試験日から逆算した1日の量を、まず書き出してみてください。

資格もちっとでは、教材93テーマを図解で学べ、公式過去問500問は登録なしで読めます。
試験日を入れると、その日にやることをアプリが出します。
https://shikaku-mochit.com/lp/try?utm_source=note&utm_medium=article&utm_campaign=study_order

分かりにくいところがあれば、コメントで教えてください。
```

公開前に、本文中の数字と仕様が最新の LP と一致しているか確かめる。

## Zenn 下書き（開発者向け）

タイトル：個人開発で ITパスポート学習アプリを作った：Next.js 16 + Cloudflare Workers + AI採点

構成案：

1. 作ったもの：試験日から逆算して今日の学習を出すアプリ。教材93テーマ、公式過去問500問、100問模試、AI採点。
2. 技術構成：Next.js 16 App Router、Cloudflare Workers（vinext ビルド）、Supabase、Stripe、Google ログイン。
3. 工夫した点：公式過去問の原文を変えずに出典つきで公開する仕組み、Pro と無料の AI 採点の振り分け、図解の3Dジオラマ化。
4. ハマった点：Vercel から Cloudflare への移行、本番と main の乖離、複数セッションでの作業ツリー共有。
5. 数字：登録者数は正直に書く（0から始めて何人になったか）。
6. 末尾：身近に受験予定の人がいたら紹介してほしい、という一文とリンク。

開発者は受験者ではないが、新人研修の担当者や身近な受験予定者への紹介と、被リンクによる検索の底上げを狙う。

## 週次ループ（毎週月曜）

1. `signup-sources.sql` を実行し、流入元別の登録・回答・再訪を `2026-09-first-ten-users.md` の台帳に1行追記する。
2. 投稿台帳から反応の良かった投稿の型を1つ選び、翌週はその型を増やす。
3. 登録はあるのに回答0なら、初回設定から最初の1問までの導線を自分のスマホで通しで確認する。
4. 登録0なら、投稿の型を変える前に LP の文面とリンク先を見直す。

## 目安

| 週 | やること | 累計の外部登録 |
| --- | --- | ---: |
| 10/6〜 | 本番反映、毎日1問開始、βテスター募集、note公開 | 2 |
| 10/13〜 | 勉強垢への返信を毎日、Zenn公開 | 5 |
| 10/20〜 | 登録者に感想を聞き、離脱点を1つ直す | 8 |
| 10/27〜 | 反応の良い型に集中、許可を得た感想をLPに掲載 | 10 |
