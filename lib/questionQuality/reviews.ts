import type { QuestionRecord } from "@/types/questionBank";
import type {
  QualityFinding,
  QuestionReviewDecision,
  QuestionReviewRecord,
} from "@/types/questionQuality";

// ============================================================================
// 公開前レビュー記録の検証。
// ----------------------------------------------------------------------------
// レビュー記録は data/question-bank/reviews/<question-id>.json に1問1ファイルで置く。
// ここは純関数だけを持ち、ファイル読み込みは呼び出し側（テスト・スクリプト）で行う。
// lib 配下から fs を触ると Next のバンドルに引きずり込まれるため。
//
// 「承認が必要な問題」の考え方:
//   ai_generated      … 人が作っていないので、承認なしに公開できてはいけない
//   modified_official … 原文を改変しているので、改変の妥当性を人が見る必要がある
//   official_past     … 原文出題。既存の reviewedAt / reviewedBy で足りる
//   app_original      … 人が作っている。類似度が review_required のときだけ承認を要求する
// ============================================================================

const DECISIONS: QuestionReviewDecision[] = ["approve", "revise", "reject"];

/** 承認記録が必須になる origin。 */
export const REVIEW_REQUIRED_ORIGINS: QuestionRecord["origin"][] = [
  "ai_generated",
  "modified_official",
];

/** レビュー記録の形が正しいか（値の型・必須項目）。 */
export function validateReviewRecord(
  review: QuestionReviewRecord,
  fileName: string,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const add = (rule: string, message: string, severity: "blocker" | "warning" = "blocker") =>
    findings.push({ questionId: review.questionId, severity, rule, message });

  if (!review.questionId?.trim()) {
    add("review-question-id", `${fileName}: questionId が空です。`);
  } else if (fileName !== `${review.questionId}.json`) {
    // ファイル名とIDがずれると「レビュー済みのはずが引けない」事故になる。
    add(
      "review-file-name",
      `レビュー記録のファイル名は "<questionId>.json" にしてください（${fileName} / questionId: "${review.questionId}"）。`,
    );
  }

  if (!Number.isInteger(review.version) || review.version < 1) {
    add("review-version", `version は1以上の整数である必要があります: ${review.version}`);
  }
  if (!review.contentReviewedBy?.trim()) {
    add("review-content-reviewer", "contentReviewedBy が空です。");
  }
  if (!review.explanationReviewedBy?.trim()) {
    add("review-explanation-reviewer", "explanationReviewedBy が空です。");
  }
  if (!review.reviewedAt?.trim() || Number.isNaN(Date.parse(review.reviewedAt))) {
    add("review-reviewed-at", `reviewedAt が日時として解釈できません: "${review.reviewedAt}"`);
  }
  if (!DECISIONS.includes(review.decision)) {
    add("review-decision", `decision は ${DECISIONS.join(" / ")} のみ許可されます: "${review.decision}"`);
  }

  // 自己レビューは「見た」という記録の価値が下がる。止めはしないが必ず目に付くようにする。
  const author = review.authoredBy?.trim();
  if (author) {
    const reviewers = [
      review.contentReviewedBy,
      review.explanationReviewedBy,
      review.similarityReviewedBy,
    ].filter((r): r is string => Boolean(r?.trim()));

    if (reviewers.every((r) => r.trim() === author)) {
      add(
        "review-self-review",
        `作成者（${author}）とレビュー者が同一です。可能なら別の人に確認してもらってください。`,
        "warning",
      );
    }
  }

  return findings;
}

/**
 * 問題1件について、レビュー記録が公開条件を満たしているか。
 *
 * @param review 対応するレビュー記録（無ければ undefined）
 * @param similarityNeedsReview 類似度検査が review_required 帯だったか
 */
export function checkReviewGate(
  q: QuestionRecord,
  review: QuestionReviewRecord | undefined,
  similarityNeedsReview: boolean,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const add = (rule: string, message: string, severity: "blocker" | "warning" = "blocker") =>
    findings.push({ questionId: q.id, severity, rule, message });

  const needsApproval =
    q.status === "published" &&
    (REVIEW_REQUIRED_ORIGINS.includes(q.origin) || similarityNeedsReview);

  if (!needsApproval) {
    // 公開していない問題にレビュー記録があるのは正常（承認済みで公開待ち）。
    // 版ずれだけは、いま気づけるように見ておく。
    if (review && review.version !== q.version) {
      add(
        "review-version-stale",
        `レビュー記録の version（${review.version}）が問題の version（${q.version}）と一致しません。本文を直したら再レビューが必要です。`,
        "warning",
      );
    }
    return findings;
  }

  if (!review) {
    add(
      "review-record-required",
      `origin "${q.origin}"${similarityNeedsReview ? "（かつ類似度が review_required 帯）" : ""} の問題を published にするには data/question-bank/reviews/${q.id}.json のレビュー記録が必要です。`,
    );
    return findings;
  }

  if (review.decision !== "approve") {
    add(
      "review-not-approved",
      `レビュー結果が "${review.decision}" です。published にできるのは "approve" のときだけです。`,
    );
  }
  if (review.version !== q.version) {
    // 古い版の承認で新しい本文を通さない。
    add(
      "review-version-mismatch",
      `レビュー記録の version（${review.version}）が問題の version（${q.version}）と一致しません。本文を直したら再レビューしてください。`,
    );
  }
  if (similarityNeedsReview && !review.similarityReviewedBy?.trim()) {
    add(
      "review-similarity-required",
      "類似度が review_required 帯です。similarityReviewedBy（類似度検査を確認した人）が必要です。",
    );
  }

  return findings;
}
