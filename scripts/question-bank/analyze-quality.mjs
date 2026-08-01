// 回答実績（question_attempts）から実測難易度と品質異常を算出し、
// question_quality_metrics へ保存する。
//
// 使い方:
//   npm run questions:analyze-quality
//   npm run questions:analyze-quality -- --dry-run     # DB へ書かずレポートだけ作る
//   npm run questions:analyze-quality -- --fixture <path>  # JSON を入力にして動作確認する
//
// 必要な環境変数:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   （RLS をバイパスするため service role が必要）
//
// 出力:
//   reports/question-quality/difficulty.json
//   reports/question-quality/difficulty.md
//
// 方針:
//   - 主指標は「同一ユーザー・同一問題・同一version の最初の回答」だけ。
//     復習で正答率が上がる分を難易度に混ぜない（lib/questionQuality/metrics.ts 参照）。
//   - user_id はレポートに一切出さない。集計にしか使わず、出力するのは問題単位の値だけ。
//     回答日時・attempt_id も出さない（少人数の問題では個人が特定されうるため）。
//   - 同じ入力なら同じ結果になる。実行時刻はレポート本文に含めない
//     （calculated_at は DB 側にだけ持つ）。
//   - 回答が0件でも正常終了する。すべて insufficient として扱う。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { getAllQuestions } = await import("../../lib/questionBank/loader.ts");
const { aggregateQuestionMetrics, renderMetricsMarkdown } = await import(
  "../../lib/questionQuality/metrics.ts"
);

const OUT_DIR = path.join(ROOT, "reports/question-quality");
const OUT_JSON = path.join(OUT_DIR, "difficulty.json");
const OUT_MD = path.join(OUT_DIR, "difficulty.md");

/** 1回あたりの取得件数。question_attempts は増え続けるのでページングする。 */
const PAGE_SIZE = 1000;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** .env.local を読む（Next のように自動では読まれないため）。 */
function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    let body;
    try {
      body = readFileSync(path.join(ROOT, name), "utf8");
    } catch {
      continue;
    }
    for (const line of body.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

/** question_attempts をすべて読む。 */
async function fetchAttempts(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("question_attempts")
      .select("attempt_id, user_id, question_id, question_version, selected_answer, is_correct, time_spent_seconds, answered_at")
      // 取得順を固定する。ページングの取りこぼし・重複を防ぐのと、
      // 「同じ入力なら同じ結果」を成り立たせるため。
      .order("answered_at", { ascending: true })
      .order("attempt_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`question_attempts の取得に失敗しました: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows.map(toAttemptRow);
}

function toAttemptRow(row) {
  return {
    attemptId: String(row.attempt_id),
    userId: String(row.user_id),
    questionId: String(row.question_id),
    questionVersion:
      row.question_version === null || row.question_version === undefined
        ? null
        : Number(row.question_version),
    selectedAnswer: row.selected_answer ?? null,
    isCorrect: Boolean(row.is_correct),
    timeSpentSeconds:
      row.time_spent_seconds === null || row.time_spent_seconds === undefined
        ? null
        : Number(row.time_spent_seconds),
    answeredAt: String(row.answered_at),
  };
}

/** 集計結果を question_quality_metrics へ upsert する。 */
async function upsertMetrics(supabase, metrics) {
  if (metrics.length === 0) return 0;

  const calculatedAt = new Date().toISOString();
  const payload = metrics.map((m) => ({
    question_id: m.questionId,
    question_version: m.questionVersion,
    calculated_at: calculatedAt,
    sample_status: m.sampleStatus,
    unique_user_count: m.uniqueUserCount,
    first_attempt_count: m.firstAttemptCount,
    all_attempt_count: m.allAttemptCount,
    first_attempt_correct_rate: m.firstAttemptCorrectRate,
    all_attempt_correct_rate: m.allAttemptCorrectRate,
    median_time_seconds: m.medianTimeSeconds,
    p90_time_seconds: m.p90TimeSeconds,
    unanswered_rate: m.unansweredRate,
    choice_counts: m.choiceCounts,
    choice_rates: m.choiceRates,
    recommended_difficulty: m.recommendedDifficulty,
    anomaly_flags: m.anomalyFlags,
  }));

  for (let from = 0; from < payload.length; from += PAGE_SIZE) {
    const chunk = payload.slice(from, from + PAGE_SIZE);
    const { error } = await supabase
      .from("question_quality_metrics")
      .upsert(chunk, { onConflict: "question_id,question_version" });
    if (error) throw new Error(`question_quality_metrics への保存に失敗しました: ${error.message}`);
  }

  return payload.length;
}

function writeReports(metrics, source) {
  mkdirSync(OUT_DIR, { recursive: true });
  // source を必ず残す。fixture 由来のレポートを実測値と取り違えると、
  // 架空の数字をもとに問題を直しかねない。
  writeFileSync(
    OUT_JSON,
    `${JSON.stringify({ schemaVersion: 1, source, metrics }, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(OUT_MD, renderMetricsMarkdown(metrics, source), "utf8");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fixturePath = argValue("--fixture");
  const questions = getAllQuestions();

  let attempts;
  let supabase = null;

  if (fixturePath) {
    // fixture 経由。Supabase に接続できない環境でも集計の中身を確認できるようにする。
    const raw = JSON.parse(readFileSync(path.resolve(process.cwd(), fixturePath), "utf8"));
    attempts = (Array.isArray(raw) ? raw : raw.attempts).map(toAttemptRow);
    console.log(`fixture から読み込みました: ${attempts.length} 件（${fixturePath}）`);
  } else {
    loadEnvLocal();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !serviceKey) {
      console.error("Supabase が設定されていないため集計できません。");
      console.error("");
      console.error("次の環境変数を .env.local に設定してから再実行してください:");
      console.error("  NEXT_PUBLIC_SUPABASE_URL");
      console.error("  SUPABASE_SERVICE_ROLE_KEY   （service role キー。RLS をバイパスするため必要）");
      console.error("");
      console.error("接続せずに集計の動作を確認したい場合は fixture を使えます:");
      console.error("  npm run questions:analyze-quality -- --fixture test/fixtures/questionAttempts.sample.json");
      process.exitCode = 1;
      return;
    }

    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    attempts = await fetchAttempts(supabase);
    console.log(`question_attempts を読み込みました: ${attempts.length} 件`);
  }

  const metrics = aggregateQuestionMetrics(attempts, questions);
  writeReports(metrics, fixturePath ? "fixture" : "supabase");

  const countBy = (status) => metrics.filter((m) => m.sampleStatus === status).length;
  console.log(`集計対象（問題×version）: ${metrics.length}`);
  console.log(
    `  reliable: ${countBy("reliable")} / provisional: ${countBy("provisional")} / insufficient: ${countBy("insufficient")}`,
  );
  console.log(`  異常フラグあり: ${metrics.filter((m) => m.anomalyFlags.length > 0).length}`);
  console.log(`  出力: ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`  出力: ${path.relative(ROOT, OUT_MD)}`);

  if (metrics.length === 0) {
    console.log("");
    console.log("回答履歴がありませんでした。すべて insufficient として扱います（異常ではありません）。");
  }

  if (supabase && !dryRun) {
    const saved = await upsertMetrics(supabase, metrics);
    console.log(`  question_quality_metrics へ保存: ${saved} 行`);
  } else if (dryRun) {
    console.log("  （--dry-run のため DB へは保存していません）");
  } else if (fixturePath) {
    console.log("  （fixture 実行のため DB へは保存していません）");
  }

  console.log("");
  console.log("注意: recommended_difficulty は推奨値です。");
  console.log("      QuestionRecord.estimatedDifficulty を自動更新することはありません。");
}

await main();
