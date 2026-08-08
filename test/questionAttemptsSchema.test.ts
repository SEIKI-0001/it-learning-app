import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";

// ============================================================================
// question_attempts のスキーマ定義（supabase/schema.sql）の検証。
// ----------------------------------------------------------------------------
// ここで見ているのは「稼働中DBへ適用したときに、既存データがどうなるか」。
// 新規DBだけを見ていると気づけない差が出るところを押さえる。
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

describe("recorded_at の追加手順", () => {
  const addColumn = statementsMatching(/add column if not exists\s+recorded_at/i);
  const setDefault = statementsMatching(
    /alter column\s+recorded_at\s+set default\s+now\(\)/i,
  );

  it("既存DB向けに recorded_at を足している", () => {
    expect(addColumn).toHaveLength(1);
  });

  it("列の追加時に既定値を付けていない（既存行に現在時刻を入れないため）", () => {
    // PostgreSQL 11 以降、default 付きで add column すると既存行にもその値が入る。
    // そうなると「この列ができる前に保存された行」に、あとから見た現在時刻が
    // 受信時刻として入ってしまい、answered_at との突き合わせが意味を失う。
    expect(addColumn[0]).not.toMatch(/default/i);
    expect(addColumn[0]).not.toMatch(/now\(\)/i);
  });

  it("既定値は別の文で後から付ける", () => {
    expect(setDefault).toHaveLength(1);
  });

  it("列を足してから既定値を付ける順序になっている", () => {
    // 順序が逆だと（存在しない列に default を付けようとして）失敗する。
    const addIndex = SCHEMA_SQL_ONLY.indexOf(addColumn[0]);
    const defaultIndex = SCHEMA_SQL_ONLY.indexOf(setDefault[0]);
    expect(addIndex).toBeGreaterThan(-1);
    expect(defaultIndex).toBeGreaterThan(addIndex);
  });

  it("not null 制約を付けていない（既存行が null で残るため）", () => {
    expect(addColumn[0]).not.toMatch(/not null/i);
    expect(setDefault[0]).not.toMatch(/not null/i);

    const recordedAtLine = createTableSql()
      .split("\n")
      .find((line) => /^\s*recorded_at\s/.test(line));

    expect(recordedAtLine).toBeDefined();
    expect(recordedAtLine).not.toMatch(/not null/i);
  });

  it("新規DBの create table 側にも recorded_at がある", () => {
    expect(createTableSql()).toMatch(/recorded_at\s+timestamptz/i);
  });

  it("クライアントが書ける answered_at とは別の列である", () => {
    // answered_at はクライアント申告（既定値はサーバ時刻）、recorded_at は受信時刻。
    // 片方に寄せると、申告日時が疑わしいときの突き合わせができなくなる。
    expect(createTableSql()).toMatch(/answered_at\s+timestamptz\s+not null/i);
    expect(createTableSql()).toMatch(/recorded_at\s+timestamptz/i);
  });
});

/** question_attempts の create table 文（コメントを落としたもの）。 */
function createTableSql(): string {
  return SCHEMA_SQL_ONLY.slice(
    SCHEMA_SQL_ONLY.indexOf("create table if not exists public.question_attempts"),
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
      /\(\s*user_id\s*,\s*attempt_group_id\s*,\s*question_id\s*,\s*question_version\s*\)/,
    );
  });

  it("部分索引にして、既存の保存経路を対象外にしている", () => {
    // 確認問題・過去問レベル・ミニ模試・模試は attempt_group_id を送らない。
    // 対象に入れると「同じ問題を何度も解き直す」既存挙動が壊れる。
    expect(uniqueIndex[0]).toMatch(/where[\s\S]*attempt_group_id is not null/i);
  });

  it("question_version が null の行を対象外にしている", () => {
    // NULL どうしは一意制約では別物として扱われるため、
    // 対象に含めると「版が入っていない行なら何件でも入る」状態になる。
    expect(uniqueIndex[0]).toMatch(/question_version is not null/i);
  });

  it("索引の作成前に既存行を消していない", () => {
    // schema.sql は「あるべき姿の宣言」であって、既存データを消す場所ではない。
    // 重複の片付けは人が手順に沿って実行する。
    expect(SCHEMA_SQL_ONLY).not.toMatch(/\bdelete\s+from\b/i);
  });

  it("重複があったときの手順書への導線がある", () => {
    // 重複が残っているDBではこの索引の作成が失敗する。
    // 黙って行が消えるより、止まって手順書へ誘導するほうを選んでいる。
    expect(SCHEMA).toContain("docs/question-bank/operations.md");
  });
});
