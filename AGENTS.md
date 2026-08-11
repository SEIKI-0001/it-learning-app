# ブランチ運用：main が常に正

このリポジトリは唯一の正を `origin/main` に置く。手元の状態や作業ブランチではなく、
常に `origin/main` を基準にする。**本番は main から出る。main に無いものは本番に無い**を保つ
（過去にドラフトPRのプレビューを本番へ昇格させ、本番と main が乖離した）。

## 作業の始めと終わり

- **始め**: `git fetch origin` してから `origin/main` を起点に分岐する。既存ブランチを拾い直さない
  （main から50〜280コミット遅れた放置ブランチが多数ある）。
- **終わり**: main へマージして push するまでが1タスク。ブランチに置いたまま次の作業へ行かない。
  PR経由で進める場合も、マージされるまでを見届ける。
- **main へ入れる前に**: `npm run typecheck` / `npm run lint` / `npm test` を通す。
  問題（data/question-bank）を触ったときは `npm run validate:questions` も回す。

## 作業ツリーは複数セッションで共有されている

`/Users/seikikobayashi/Developer/it-learning-app` は複数のセッションが同時に使う。
自分だけが触っている前提で操作すると、他セッションの未コミットの変更が消える。

- `git checkout` / `switch` / `stash` で作業ツリーのブランチを奪わない。
  別ブランチで作業が必要なら `git worktree add <一時ディレクトリ> <branch>` で自分のツリーを作り、
  終わったら `git worktree remove` する。
- **コミットは `git add -A` を使わず、ファイルを明示列挙する**。一括 add は他セッションの変更や、
  `.projects/state.local.json`（Stripeのアカウント/プロジェクトID）のような
  リポジトリに入れてはいけないファイルまで巻き込む。
- コミット直前に `git status` を見て、自分の変更だけが載っていることを確認する。

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- stripe-projects-cli managed:agents-md:start -->
## Stripe Projects CLI

This repository is initialized for the Stripe project "it-learning-app".

## Tools used

- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the `projects` plugin to manage third-party services, credentials, and deployments for this project. Use the stripe-projects-cli to manage deploying and access to third party services.
<!-- stripe-projects-cli managed:agents-md:end -->
