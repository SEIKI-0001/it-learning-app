import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";

// ============================================================================
// production baseline から生成した question_attempts snapshot の検証。
// ----------------------------------------------------------------------------
// schema.sql はactive migrationsから再生成する読み取り用snapshotであり、
// 既存DBへの段階的な変更手順はlegacy migrationと運用手順書に保存する。
// ============================================================================

const SCHEMA = readFileSync(path.join(process.cwd(), "supabase/schema.sql"), "utf8");

/**
 * 行コメント（-- …）を落とした SQL。
 * コメントには説明のために "default now()" のような字面が出てくるので、
 * 「実際に何を実行するか」を見るときは必ずこちらを使う。
 */
const SCHEMA_SQL_ONLY = SCHEMA.split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

/** question_attempts に関わる文だけを取り出す（他テーブルの定義に引っかからないように）。 */
const ATTEMPT_STATEMENTS = SCHEMA_SQL_ONLY.split(";")
  .map((s) => s.trim())
  .filter((s) => s.includes("question_attempts"));

function statementsMatching(pattern: RegExp): string[] {
  return ATTEMPT_STATEMENTS.filter((s) => pattern.test(s));
}

// ---------------------------------------------------------------------------
// recorded_at（サーバ受信時刻）
// ---------------------------------------------------------------------------

describe("recorded_at のproduction snapshot", () => {
  it("nullableのまま現在のdefaultを保持している", () => {
    const recordedAtLine = createTableSql()
      .split("\n")
      .find((line) => /^\s*"recorded_at"\s/.test(line));

    expect(recordedAtLine).toBeDefined();
    expect(recordedAtLine).not.toMatch(/not null/i);
    expect(recordedAtLine).toMatch(/default\s+"now"\(\)/i);
  });

  it("クライアントが書ける answered_at とは別の列である", () => {
    expect(createTableSql()).toMatch(/"answered_at"\s+timestamp with time zone/i);
    expect(createTableSql()).toMatch(/"recorded_at"\s+timestamp with time zone/i);
  });
});

/** question_attempts の create table 文（コメントを落としたもの）。 */
function createTableSql(): string {
  return SCHEMA_SQL_ONLY.slice(
    SCHEMA_SQL_ONLY.indexOf('CREATE TABLE IF NOT EXISTS "public"."question_attempts"'),
  ).split(";")[0];
}

// ---------------------------------------------------------------------------
// 公式過去問の重複防止
// ---------------------------------------------------------------------------

describe("公式過去問の一意制約", () => {
  const uniqueIndex = statementsMatching(
    /create unique index[\s\S]*question_attempts_official_group_unique_idx/i,
  );

  it("user_id / attempt_group_id / question_id / question_version で一意にしている", () => {
    expect(uniqueIndex).toHaveLength(1);
    expect(uniqueIndex[0]).toMatch(
      /\(\s*"user_id"\s*,\s*"attempt_group_id"\s*,\s*"question_id"\s*,\s*"question_version"\s*\)/,
    );
  });

  it("部分索引にして、既存の保存経路を対象外にしている", () => {
    // 確認問題・過去問レベル・ミニ模試・模試は attempt_group_id を送らない。
    // 対象に入れると「同じ問題を何度も解き直す」既存挙動が壊れる。
    expect(uniqueIndex[0]).toMatch(/where[\s\S]*"attempt_group_id" IS NOT NULL/i);
  });

  it("question_version が null の行を対象外にしている", () => {
    // NULL どうしは一意制約では別物として扱われるため、
    // 対象に含めると「版が入っていない行なら何件でも入る」状態になる。
    expect(uniqueIndex[0]).toMatch(/"question_version" IS NOT NULL/i);
  });

  it("索引の作成前に既存行を消していない", () => {
    // generated snapshotへデータ変更を混ぜない。
    expect(SCHEMA_SQL_ONLY).not.toMatch(/\bdelete\s+from\b/i);
  });

  it("重複があったときの手順が別文書に残っている", () => {
    const operations = readFileSync(
      path.join(process.cwd(), "docs/question-bank/operations.md"),
      "utf8",
    );
    expect(operations).toContain("question_attempts_official_group_unique_idx");
  });
});
