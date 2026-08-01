import type { QuestionOrigin, QuestionRecord, QuestionStatus } from "@/types/questionBank";
import type {
  QualityBaseline,
  QualityFinding,
  QualityReport,
  QuestionReviewRecord,
} from "@/types/questionQuality";
import { validateQuestions } from "@/lib/questionBank/validate";
import { checkSimilarityGate, needsSimilarityReview } from "@/lib/questionQuality/gate";
import { checkQuestionQuality } from "@/lib/questionQuality/rules";
import { checkReviewGate, validateReviewRecord } from "@/lib/questionQuality/reviews";
import {
  analyzeSimilarity,
  flattenSimilarityResults,
  type SimilarityMatch,
} from "@/lib/questionQuality/similarity";
import type { SimilarityBand } from "@/lib/questionQuality/thresholds";

// ============================================================================
// 品質レポートの組み立て。
// ----------------------------------------------------------------------------
// ここは純関数。ファイルの読み書きは呼び出し側（スクリプト・テスト）が行う。
//
// 出力に実行時刻を入れない。入れると再生成のたびに差分が出て、
// 「本当に検出内容が変わったのか」が git diff から読めなくなる
// （問題バンクのマニフェストと同じ方針）。
// ============================================================================

const ORIGINS: QuestionOrigin[] = [
  "official_past",
  "app_original",
  "ai_generated",
  "modified_official",
];

const STATUSES: QuestionStatus[] = [
  "draft",
  "content_verified",
  "explanation_verified",
  "published",
  "retired",
];

const BANDS: SimilarityBand[] = ["exact_duplicate", "block", "review_required", "notice", "ok"];

/** ベースラインのキー。問題ID × ルールで、同じ警告が再発したかを判定する。 */
export function baselineKey(finding: Pick<QualityFinding, "questionId" | "rule">): string {
  return `${finding.questionId}::${finding.rule}`;
}

const severityRank = (s: QualityFinding["severity"]) => (s === "blocker" ? 0 : 1);

/** 検出結果の並びを固定する（severity → questionId → rule）。 */
function sortFindings(findings: QualityFinding[]): QualityFinding[] {
  return [...findings].sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0) ||
      (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0),
  );
}

export type BuildReportInput = {
  questions: QuestionRecord[];
  /** questionId -> レビュー記録。ファイル読み込みは呼び出し側で行う。 */
  reviews: Map<string, QuestionReviewRecord>;
  /** レビュー記録のファイル名（形式検査のため）。questionId -> ファイル名。 */
  reviewFileNames?: Map<string, string>;
};

/** 問題バンク全体を検査して品質レポートを組み立てる。 */
export function buildQualityReport({
  questions,
  reviews,
  reviewFileNames,
}: BuildReportInput): QualityReport {
  const findings: QualityFinding[] = [];

  // 1. データとしての整合性（既存の validate をレポートにも載せる）。
  //    validate:questions と二重に見えるが、レポートだけを見た人が
  //    「データは正しい前提」を確認できるようにしておく。
  for (const issue of validateQuestions(questions)) {
    findings.push({
      questionId: issue.questionId ?? "(全体)",
      severity: "blocker",
      rule: issue.rule,
      message: issue.message,
    });
  }

  // 2. 類似度（全問総当たり）。
  const similarityResults = analyzeSimilarity(questions);

  // 3. 問題ごとの検査。
  for (const q of questions) {
    findings.push(...checkQuestionQuality(q));

    const result = similarityResults.get(q.id);
    findings.push(...checkSimilarityGate(q, result));
    findings.push(...checkReviewGate(q, reviews.get(q.id), needsSimilarityReview(q, result)));
  }

  // 4. レビュー記録そのものの検査。
  for (const [questionId, review] of [...reviews.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    findings.push(
      ...validateReviewRecord(review, reviewFileNames?.get(questionId) ?? `${questionId}.json`),
    );
    if (!questions.some((q) => q.id === review.questionId)) {
      findings.push({
        questionId: review.questionId || questionId,
        severity: "blocker",
        rule: "review-question-resolvable",
        message: `レビュー記録が存在しない問題ID "${review.questionId}" を指しています。`,
      });
    }
  }

  const sorted = sortFindings(findings);
  const matches = flattenSimilarityResults(similarityResults);
  const originById = new Map(questions.map((q) => [q.id, q.origin]));

  const bandCounts = Object.fromEntries(BANDS.map((b) => [b, 0])) as Record<SimilarityBand, number>;
  for (const m of matches) bandCounts[m.band] += 1;

  return {
    schemaVersion: 1,
    summary: {
      questionCount: questions.length,
      blockerCount: sorted.filter((f) => f.severity === "blocker").length,
      warningCount: sorted.filter((f) => f.severity === "warning").length,
      byOrigin: Object.fromEntries(
        ORIGINS.map((o) => [o, questions.filter((q) => q.origin === o).length]),
      ) as Record<QuestionOrigin, number>,
      byStatus: Object.fromEntries(
        STATUSES.map((s) => [s, questions.filter((q) => q.status === s).length]),
      ) as Record<QuestionStatus, number>,
      similarityBandCounts: bandCounts,
    },
    findings: sorted,
    similarities: matches.map((m: SimilarityMatch) => ({
      questionId: m.questionId,
      origin: originById.get(m.questionId) ?? "app_original",
      matchedQuestionId: m.matchedQuestionId,
      matchedOrigin: m.matchedOrigin,
      band: m.band,
      promptScore: round(m.scores.promptScore),
      fullScore: round(m.scores.fullScore),
      correctChoiceScore: round(m.scores.correctChoiceScore),
      score: round(m.scores.score),
    })),
  };
}

/** レポートの数値は3桁に丸める（浮動小数の末尾差で差分が出るのを防ぐ）。 */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// ベースライン
// ---------------------------------------------------------------------------

/**
 * 既知 warning との差分。
 *
 * 既存の246問には、直さない（直すと出題内容が変わる）warning が残る。
 * それを毎回赤くしても意味がないので、既知のものはベースラインに固定し、
 * 「新しく増えた warning」だけを見る。blocker はベースラインの対象にしない
 * （既知でも公開させない、が blocker の定義のため）。
 */
export function diffAgainstBaseline(
  report: QualityReport,
  baseline: QualityBaseline,
): { newWarnings: QualityFinding[]; resolvedWarnings: string[] } {
  const known = new Set(baseline.knownWarnings);
  const current = report.findings.filter((f) => f.severity === "warning");
  const currentKeys = new Set(current.map(baselineKey));

  return {
    newWarnings: current.filter((f) => !known.has(baselineKey(f))),
    resolvedWarnings: [...known].filter((k) => !currentKeys.has(k)).sort(),
  };
}

/** 現在の warning からベースラインを作り直す（--update-baseline 用）。 */
export function buildBaseline(report: QualityReport, note: string): QualityBaseline {
  return {
    schemaVersion: 1,
    note,
    knownWarnings: [
      ...new Set(report.findings.filter((f) => f.severity === "warning").map(baselineKey)),
    ].sort(),
  };
}

// ---------------------------------------------------------------------------
// Markdown 出力
// ---------------------------------------------------------------------------

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** 人が読むためのレポート。CLI の出力と同じ内容を Markdown にする。 */
export function renderQualityReportMarkdown(
  report: QualityReport,
  diff: { newWarnings: QualityFinding[]; resolvedWarnings: string[] },
): string {
  const { summary } = report;
  const lines: string[] = [];

  lines.push("# 問題品質レポート");
  lines.push("");
  lines.push("`npm run questions:quality-report` の出力。実行時刻は含めない（再生成で無意味な差分を出さないため）。");
  lines.push("");

  lines.push("## サマリ");
  lines.push("");
  lines.push("| 指標 | 件数 |");
  lines.push("| --- | ---: |");
  lines.push(`| 問題数 | ${summary.questionCount} |`);
  lines.push(`| blocker | ${summary.blockerCount} |`);
  lines.push(`| warning | ${summary.warningCount} |`);
  lines.push(`| うち新規 warning（ベースライン外） | ${diff.newWarnings.length} |`);
  lines.push("");

  lines.push("### 出所別");
  lines.push("");
  lines.push("| origin | 件数 |");
  lines.push("| --- | ---: |");
  for (const [origin, count] of Object.entries(summary.byOrigin)) {
    lines.push(`| ${origin} | ${count} |`);
  }
  lines.push("");

  lines.push("### 公開状態別");
  lines.push("");
  lines.push("| status | 件数 |");
  lines.push("| --- | ---: |");
  for (const [status, count] of Object.entries(summary.byStatus)) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push("");

  lines.push("### 類似度の帯");
  lines.push("");
  lines.push("| band | 件数 |");
  lines.push("| --- | ---: |");
  for (const [band, count] of Object.entries(summary.similarityBandCounts)) {
    lines.push(`| ${band} | ${count} |`);
  }
  lines.push("");

  const blockers = report.findings.filter((f) => f.severity === "blocker");
  lines.push("## blocker");
  lines.push("");
  if (blockers.length === 0) {
    lines.push("なし。");
  } else {
    lines.push("| 問題ID | rule | 根拠 | 最類似 | スコア |");
    lines.push("| --- | --- | --- | --- | ---: |");
    for (const f of blockers) {
      lines.push(
        `| ${escapeCell(f.questionId)} | ${f.rule} | ${escapeCell(f.message)} | ${
          f.similarity ? escapeCell(f.similarity.matchedQuestionId) : "-"
        } | ${f.similarity ? f.similarity.score.toFixed(3) : "-"} |`,
      );
    }
  }
  lines.push("");

  lines.push("## 新規 warning（ベースライン外）");
  lines.push("");
  if (diff.newWarnings.length === 0) {
    lines.push("なし。");
  } else {
    lines.push("| 問題ID | rule | 根拠 | 最類似 | スコア |");
    lines.push("| --- | --- | --- | --- | ---: |");
    for (const f of diff.newWarnings) {
      lines.push(
        `| ${escapeCell(f.questionId)} | ${f.rule} | ${escapeCell(f.message)} | ${
          f.similarity ? escapeCell(f.similarity.matchedQuestionId) : "-"
        } | ${f.similarity ? f.similarity.score.toFixed(3) : "-"} |`,
      );
    }
  }
  lines.push("");

  const warnings = report.findings.filter((f) => f.severity === "warning");
  lines.push("## warning（全件）");
  lines.push("");
  if (warnings.length === 0) {
    lines.push("なし。");
  } else {
    const byRule = new Map<string, number>();
    for (const f of warnings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

    lines.push("| rule | 件数 |");
    lines.push("| --- | ---: |");
    for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) {
      lines.push(`| ${rule} | ${count} |`);
    }
    lines.push("");
    lines.push("<details><summary>明細</summary>");
    lines.push("");
    lines.push("| 問題ID | rule | 根拠 | 最類似 | スコア |");
    lines.push("| --- | --- | --- | --- | ---: |");
    for (const f of warnings) {
      lines.push(
        `| ${escapeCell(f.questionId)} | ${f.rule} | ${escapeCell(f.message)} | ${
          f.similarity ? escapeCell(f.similarity.matchedQuestionId) : "-"
        } | ${f.similarity ? f.similarity.score.toFixed(3) : "-"} |`,
      );
    }
    lines.push("");
    lines.push("</details>");
  }
  lines.push("");

  lines.push("## 類似度の検出結果");
  lines.push("");
  const reportable = report.similarities.filter((s) => s.band !== "notice");
  if (reportable.length === 0) {
    lines.push("notice 帯より上の検出はなし。");
  } else {
    lines.push("| 問題ID | origin | 最類似 | 相手のorigin | band | prompt | 全体 | 正答本文 |");
    lines.push("| --- | --- | --- | --- | --- | ---: | ---: | ---: |");
    for (const s of reportable) {
      lines.push(
        `| ${escapeCell(s.questionId)} | ${s.origin} | ${escapeCell(s.matchedQuestionId)} | ${s.matchedOrigin} | ${s.band} | ${s.promptScore.toFixed(3)} | ${s.fullScore.toFixed(3)} | ${s.correctChoiceScore.toFixed(3)} |`,
      );
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
