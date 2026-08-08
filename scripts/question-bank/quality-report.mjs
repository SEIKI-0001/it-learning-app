// 問題バンクの品質レポートを生成する。
//
// 使い方:
//   npm run questions:quality-report
//   npm run questions:quality-report -- --update-baseline
//
// 出力:
//   reports/question-quality/latest.json  … 機械可読。問題ID / severity / rule / 根拠 / 最類似 / スコア
//   reports/question-quality/latest.md    … 人が読む用
//
// 方針:
//   - 出力は決定的。実行時刻を含めないので、内容が変わらなければ git diff も出ない。
//   - blocker が1件でもあれば終了コード 1 で落とす。
//     （公開可否の正は npm run validate:questions だが、
//       CI でこのスクリプトだけを回しても同じ結論になるようにしておく）
//   - --fail-on-new-warnings を付けると、ベースラインに無い warning でも落とす。
//     CI ではこれを付ける。既存問題に残る warning は直さないと決めた分だけを
//     ベースラインに固定してあるので、そこから増えた＝今回の変更で悪化した、と見なせる。
//     手元での実行では付けない（直している最中に落ちると読みにくいため）。
//   - --update-baseline を付けたときだけ data/question-bank/quality-baseline.json を書き換える。
//     既存問題に残る「直さない warning」を固定し、新規悪化だけを検出できるようにするため。
//     blocker はベースラインの対象にしない。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { getAllQuestions } = await import("../../lib/questionBank/loader.ts");
const { loadReviewRecords } = await import("../../lib/questionQuality/reviewStore.ts");
const { buildBaseline, buildQualityReport, diffAgainstBaseline, renderQualityReportMarkdown } =
  await import("../../lib/questionQuality/report.ts");

const OUT_DIR = path.join(ROOT, "reports/question-quality");
const OUT_JSON = path.join(OUT_DIR, "latest.json");
const OUT_MD = path.join(OUT_DIR, "latest.md");
const BASELINE_PATH = path.join(ROOT, "data/question-bank/quality-baseline.json");

const BASELINE_NOTE =
  "既存問題に残る既知の warning。npm run questions:quality-report -- --update-baseline で再生成する。" +
  "ここに載っている warning は「見た上で直さないと決めたもの」で、新しく増えた warning だけを検証で落とす。";

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    return { schemaVersion: 1, note: BASELINE_NOTE, knownWarnings: [] };
  }
}

function main() {
  const updateBaseline = process.argv.includes("--update-baseline");
  const failOnNewWarnings = process.argv.includes("--fail-on-new-warnings");

  const questions = getAllQuestions();
  const reviews = loadReviewRecords(ROOT);

  const report = buildQualityReport({
    questions,
    reviews: reviews.byQuestionId,
    reviewFileNames: reviews.fileNames,
  });

  // 壊れたレビュー記録は buildQualityReport からは見えないので、ここで足す。
  for (const { fileName, message } of reviews.parseErrors) {
    report.findings.unshift({
      questionId: fileName.replace(/\.json$/, ""),
      severity: "blocker",
      rule: "review-file-parse",
      message: `レビュー記録が JSON として読めません: ${message}`,
    });
    report.summary.blockerCount += 1;
  }

  const baseline = updateBaseline
    ? buildBaseline(report, BASELINE_NOTE)
    : loadBaseline();

  if (updateBaseline) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  }

  const diff = diffAgainstBaseline(report, baseline);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(OUT_MD, renderQualityReportMarkdown(report, diff), "utf8");

  console.log(`問題数: ${report.summary.questionCount}`);
  console.log(`blocker: ${report.summary.blockerCount}`);
  console.log(`warning: ${report.summary.warningCount}（新規 ${diff.newWarnings.length}）`);
  if (diff.resolvedWarnings.length > 0) {
    console.log(
      `解消済み warning: ${diff.resolvedWarnings.length} 件（--update-baseline でベースラインを更新できます）`,
    );
  }
  console.log(`  出力: ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`  出力: ${path.relative(ROOT, OUT_MD)}`);
  if (updateBaseline) {
    console.log(`  更新: ${path.relative(ROOT, BASELINE_PATH)}（${baseline.knownWarnings.length} 件）`);
  }

  if (report.summary.blockerCount > 0) {
    console.error("\nblocker があります。公開前に解消してください。");
    for (const f of report.findings.filter((x) => x.severity === "blocker").slice(0, 20)) {
      console.error(`  - [${f.rule}] ${f.questionId}: ${f.message}`);
    }
    process.exitCode = 1;
  }

  // ベースラインに無い warning は「今回の変更で増えたもの」。
  // 直すか、見た上で残すと決めてベースラインを更新するか、どちらかを求める。
  if (failOnNewWarnings && diff.newWarnings.length > 0) {
    console.error(`\nベースラインに無い warning が ${diff.newWarnings.length} 件あります。`);
    for (const key of diff.newWarnings.slice(0, 20)) {
      const [questionId, rule] = key.split("::");
      const finding = report.findings.find(
        (f) => f.questionId === questionId && f.rule === rule,
      );
      console.error(`  - [${rule}] ${questionId}: ${finding?.message ?? ""}`);
    }
    console.error(
      "\n直すか、見た上で残すと決めるなら --update-baseline でベースラインを更新してください。",
    );
    process.exitCode = 1;
  }
}

main();
