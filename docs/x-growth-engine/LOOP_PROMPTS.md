# Claude Code Ralph Loop 実行プロンプト

## 準備
リポジトリ `SEIKI-0001/it-learning-app` のルートでClaude Codeを起動する。Ralph Loop公式プラグインの設定が必要。既存 `CLAUDE.md` を上書きしない。

```text
/plugin install ralph-loop@claude-plugins-official
```

プラグインを利用できない場合は、同等の「1タスク選択→変更→テスト→修正→再テスト」を手動または標準Claude Codeで実施してよい。

## Loop 1: P0 監査・計測API実装
```text
/ralph-loop "Read docs/x-growth-engine/{CURRENT_STATE,PRD,EXPERIMENT_POLICY,DATA_MODEL,TASKS}.md. Implement P0 ONLY. The current repo already auto-posts to X. Preserve all existing X publishing safety. Audit 2026-11-22 quality_check_failed and existing posting/tests. Build a typed READ-ONLY X metrics client with dependency-injected fetch and full OAuth1 GET query parameter signing. Verify current field/authorization availability from official X docs; test with offline fixture, no real X API calls. Run existing xPosting tests, typecheck, relevant new tests. Fix failures, append real evidence and blockers to docs/x-growth-engine/PROGRESS.md. NEVER write to X, alter X_POST_ENABLED or X_POST_DRY_RUN, print secrets, migrate production DB, or trigger paid requests. On pass output <promise>X_GROWTH_P0_DONE</promise>; on a real blocker, document and stop without claiming success." --max-iterations 10 --completion-promise "X_GROWTH_P0_DONE"
```

## Loop 2: P1 メトリクス収集
```text
/ralph-loop "Read all docs/x-growth-engine/*.md and PROGRESS.md. Implement P1 ONLY: add-only migration definition, 24h/72h immutable metrics snapshots, NULL on missing X data, idempotent collection, UTM visits/signups join, fixture and staging tests. Keep migrations local; DO NOT apply changes to production DB. Protect RLS and service-role-only access. No external X write, no billable X read without approval. Run all existing and new tests. Record results in PROGRESS.md. Output <promise>X_GROWTH_P1_DONE</promise> only when checks pass." --max-iterations 12 --completion-promise "X_GROWTH_P1_DONE"
```

## Loop 3: P2 投稿実験・生成方式
```text
/ralph-loop "Read docs/x-growth-engine/*.md. Implement P2 ONLY: experiment and variant assignment at fixed daily slot, four supported educational expression templates, structured generation tied to approved sources, accurate fact validation, duplicate safeguards, preview & dry-run. Start with controlled two-arm experiment (definition-first vs question-first) and randomized balanced allocation by weekday. Preserve existing publishing idempotency, quota, credential checks, unknown-state handling, and sensitive-data restrictions. Do not post anything live. Generate >12 fixtures and verify them; rerun entire xPosting tests and typecheck. Update PROGRESS.md. Output <promise>X_GROWTH_P2_DONE</promise> only if all checks pass." --max-iterations 12 --completion-promise "X_GROWTH_P2_DONE"
```

## Loop 4: P3 週次レポート・PDCA
```text
/ralph-loop "Read docs/x-growth-engine/*.md. Implement P3 ONLY: deterministic weekly metrics aggregation, sample-size guard, missing metrics reporting, AI hypothesis suggestion with JSON schema and evidence. Never auto-declare statistically significant winners from 7-14 posts. Write next-week draft experiment but require approval to change policy. Add scheduled workflow in disabled-by-default test mode; do not make paid X calls or publish posts. Regression test, report fixture test and documentation. Output <promise>X_GROWTH_P3_DONE</promise> only on full test pass." --max-iterations 10 --completion-promise "X_GROWTH_P3_DONE"
```

## 本番運用移行（P4）
P4は明示的なユーザー承認後に別タスクとして扱う。Claude Codeの反復ループに本番DB変更・課金API実行・X書き込みを自動で委ねない。先に差分/料金/投稿例/テスト証跡を人間がレビューする。
