# 学習の記録 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 日次・直近7日の週次・CP突破を、固定factsと再試行可能なAI文章を持つ学習史として保存・閲覧する。
**Architecture:** Supabaseに統一記録表を追加し、既存factsと詳細UIを再利用。認証済みAPIで生成・一覧・詳細・既読を提供し、定期処理と閲覧時の補完で処理を進める。
**Tech Stack:** Next.js 16.2.9 / React 19 / TypeScript / Supabase PostgreSQL / 既存Gemini / Vitest・PGlite・Playwright。
**Spec:** docs/superpowers/specs/2026-09-26-learning-journal-design.md

## Global Constraints

- Progressと既存5つのナビを維持。Progressの「くわしく見る」、その他、週間レポートからリンクする。
- 期間は現行の対象日を含む直近7暦日。クライアントのローカルtimezoneで生成し保存する。
- 確定factsは不変。templateは同じfactsでAI再試行可能。成功AIは固定。
- 日次は回答または完了済みの実学習がある日だけ。
- NEWに加え「今週の振り返りが届いています」「レポートを見る →」。時系列を保持。
- 内部user ID、RLS、欠測非捏造、保守的移行、根拠検証を維持。mainのみ本番。

## Review Focus

- 日付変更・タイムゾーン・月跨ぎでも直近7日という意味が変わらない（Task 1）。
- 回答が二系統で保存されても二重計上せず、別の解き直しは残る（Task 1）。
- 複数端末・ジョブ競合でもfacts/成功AI/初回閲覧日時が上書きされない（Task 2/3）。
- 旧CP・欠測時間・0活動日に架空の数値や成長を作らない（Task 1/2）。
- 認証・統合・通信失敗・長い履歴でも他ユーザーの履歴や空表示を誤って返さない（Task 3/4）。

### Task 1: 期間・集計・文章の純関数

Files: 新規 lib/journal/model.ts, lib/journal/facts.ts, test/journalFacts.test.ts。既存 lib/weeklyReportFacts.ts, lib/weeklyReportNarrative.ts。
Interfaces: JournalSnapshot, JournalRecord; buildJournalSnapshot(input)は保存済み回答・進捗・対象日・timezoneから指標、weeklyFacts、根拠、templateを返す。mergeJournalAnswersで二系統の履歴を照合する。
- [ ] 現行7日、活動なし、過去誤答の回復、欠測、重複のテストを先に追加し失敗を確認。
- [ ] 期間を明示指定できるよう既存facts関数を拡張（既存呼び出しの挙動を維持）。日次・週次で共通の根拠を使う。
- [ ] npm test -- test/journalFacts.test.ts test/weeklyReport.test.ts を通す。
- [ ] 明示ファイル指定でコミット。

### Task 2: DBとCPの原子的snapshot

Files: supabase/migrations/*_learning_journal.sql（CLIで採番）, test/journalDatabase.test.ts, lib/auth/accountMerge.ts。
Interfaces: learning_journal_records、記録保護trigger、CP保存trigger、AI lease RPC、既読更新。内部ユーザーを参照する。
- [ ] PGliteで不変facts、template→AI、AI上書き拒否、CP初回のみ、既読再更新防止を先にテスト。
- [ ] 表・制約・RLS・service_role限定の処理を追加。CP進捗更新時にその場の事実を保存。外部AIは別処理。
- [ ] アカウント統合は元レコードを消さず移行キーで保持する。
- [ ] npm test -- test/journalDatabase.test.ts を通してコミット。

### Task 3: サーバー生成とAPI

Files: lib/journal/repository.ts, lib/journal/service.ts, app/api/journal/route.ts, app/api/journal/[recordId]/route.ts, app/api/journal/[recordId]/view/route.ts, app/api/cron/learning-journal/route.ts, workers/line-reminder-cron/src/*。
Interfaces: ensureJournal(db,userId,timezone), processJournalNarrative(db,record), listJournal(db,userId,month,type)。認証はgetInternalUserId。read APIは本文のuserIdを使わない。
- [ ] 認証、所有者、DB失敗、AI失敗→再試行→成功固定、ページ分割、既読のテストを先に追加。
- [ ] 取得可能な全履歴をページ分割し、活動日だけ保存。直近7日レポートは初回と7日ごとに固定保存。未完了日次を翌日確定。
- [ ] leaseとbackoffで同一factsのAIを再試行。既存Gemini・検証を使う。
- [ ] 定期処理は既存cronの認証規約を利用し、対象ユーザーを小分けに処理。初回閲覧で補完。
- [ ] 対象テストを通してコミット。

### Task 4: タイムライン・保存済み詳細・導線

Files: app/journal/page.tsx, app/journal/[recordId]/page.tsx, components/journal/*, components/report/WeeklyReportView.tsx, app/progress/page.tsx, app/more/page.tsx, app/report/page.tsx, components/BottomNav.tsx, test/journalView.test.tsx。
Interfaces: JournalTimeline(records,month,type), JournalDetail(record)。週次詳細は保存narrativeを受け取り、再生成しない。
- [ ] フィルター・月選択・未読CTA・詳細表示後のみ既読・取得失敗・過去詳細不変のテストを先に追加。
- [ ] 画像に合わせた紙、紺、金、線、マーカー、カードをCSS moduleで実装。週次概要は4指標と短文。詳細は全分析を表示。
- [ ] キーボード、320px幅、reduced-motion、CP一度の演出、空状態、エラー状態を実装。
- [ ] Progressを保持し「くわしく見る」とその他に追加。既存/reportも維持し学習の記録へリンク。
- [ ] 対象テストとブラウザー表示を確認しコミット。

### Task 5: 統合検証・反映

- [ ] npm run typecheck / npm run lint / npm test を全件実行。
- [ ] モバイル・PCで画像基準の視覚確認、月・種類・未読・詳細・CP・再読み込みを確認。
- [ ] 独立レビューでDB/API/UIとユーザーの5点を確認し、重要な指摘を修正。
- [ ] migration適用・cron接続を既存サービスで検証。新規サービスは追加しない。
- [ ] origin/mainを再fetchし、必要な統合と検証を済ませmainへマージ・push。共有作業ツリーの変更は触らない。

## 2026-09-27 検証記録

- origin/main（5705ef9）を統合。Progressと現行の週間期間を維持。
- Node 22.18.0で typecheck / lint / 全279ファイル3077テスト成功。
- Playwrightでモバイル・PC、月と種類の切り替え、未読CTA、詳細表示後の既読を確認。
- 独立レビューで指摘された選択中フィルターの再クリック、timezone更新を修正。
- 画面表示中の回答時間を計測し、未計測の旧データは欠測のまま保存。
- AI再試行は既存cronで5分ごと、通知処理は従来どおり毎時。
- mainへの反映、実DB migration、公開環境の確認はこれから実施。
