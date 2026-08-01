import type { QuestionRecord } from "@/types/questionBank";
import type { QualityFinding } from "@/types/questionQuality";
import type { SimilarityMatch, SimilarityResult } from "@/lib/questionQuality/similarity";
import type { SimilarityBand } from "@/lib/questionQuality/thresholds";

// ============================================================================
// 類似度の検出結果を「公開してよいか」に変換する。
// ----------------------------------------------------------------------------
// 判定は origin ごとに違う。似ていること自体が問題なのではなく、
// 「似ていてはいけない関係で似ている」ことが問題だから。
//
//   app_original / ai_generated
//     公式問題や既存問題と酷似していたら、それは実質的な転載。
//     block 帯なら published にしない。review_required 帯なら人が見た記録を要求する。
//
//   modified_official
//     元の公式問題と似ているのは当たり前。ただし免除の条件として
//     official.derivedFromQuestionId で「どれを改変したか」を明示させる
//     （validate.ts が必須化している）。改変元以外との酷似は普通に止める。
//
//   official_past
//     原文を収録したもの。公式が似た問題を出していても、こちらでは直せない。
//     検出結果は報告するが公開は阻害しない。
//
// status が published でない問題は「まだ公開していない」ので blocker にしない。
// ただし放置すると公開時に初めて気づくことになるので warning として必ず出す。
// ============================================================================

/** 公開を止める帯（app_original / ai_generated の場合）。 */
const BLOCKING_BANDS: SimilarityBand[] = ["exact_duplicate", "block"];

/** 人のレビュー記録を要求する帯。 */
const REVIEW_BANDS: SimilarityBand[] = ["review_required"];

function describe(match: SimilarityMatch): string {
  const s = match.scores;
  return (
    `最類似: "${match.matchedQuestionId}"（${match.matchedOrigin}）` +
    ` / 代表スコア ${s.score.toFixed(3)}` +
    ` / prompt ${s.promptScore.toFixed(3)}` +
    ` / 全体 ${s.fullScore.toFixed(3)}` +
    ` / 正答本文 ${s.correctChoiceScore.toFixed(3)}`
  );
}

function toFindingSimilarity(match: SimilarityMatch): QualityFinding["similarity"] {
  return {
    matchedQuestionId: match.matchedQuestionId,
    matchedOrigin: match.matchedOrigin,
    band: match.band,
    promptScore: match.scores.promptScore,
    fullScore: match.scores.fullScore,
    correctChoiceScore: match.scores.correctChoiceScore,
    score: match.scores.score,
  };
}

/**
 * その問題が「人のレビュー記録なしには公開できない」類似度かどうか。
 * reviews.ts の checkReviewGate に渡す。
 */
export function needsSimilarityReview(q: QuestionRecord, result: SimilarityResult | undefined): boolean {
  if (!result) return false;
  if (q.origin === "official_past") return false;

  for (const match of [result.best, result.bestOfficial]) {
    if (!match) continue;
    if (q.origin === "modified_official" && match.isDerivedPair) continue;
    if (REVIEW_BANDS.includes(match.band) || BLOCKING_BANDS.includes(match.band)) return true;
  }
  return false;
}

/** 類似度の検出結果から公開可否の findings を作る。 */
export function checkSimilarityGate(
  q: QuestionRecord,
  result: SimilarityResult | undefined,
): QualityFinding[] {
  if (!result) return [];

  const findings: QualityFinding[] = [];
  const seen = new Set<string>();

  for (const match of [result.best, result.bestOfficial]) {
    if (!match) continue;
    // best と bestOfficial が同じ相手を指すことがある。同じ内容を2回出さない。
    if (seen.has(match.matchedQuestionId)) continue;
    seen.add(match.matchedQuestionId);

    findings.push(...gateOne(q, match));
  }

  return findings;
}

function gateOne(q: QuestionRecord, match: SimilarityMatch): QualityFinding[] {
  const similarity = toFindingSimilarity(match);
  const detail = describe(match);
  const published = q.status === "published";

  const finding = (
    severity: QualityFinding["severity"],
    rule: string,
    message: string,
  ): QualityFinding => ({ questionId: q.id, severity, rule, message, similarity });

  // --- 公式過去問どうし ---------------------------------------------------
  // 原文を直せない以上、公開を止めても何も解決しない。事実として記録する。
  if (q.origin === "official_past") {
    if (match.band === "exact_duplicate") {
      return [
        finding(
          "warning",
          "similarity-official-duplicate",
          `公式過去問どうしが正規化後に完全一致しています。収録の重複でないか確認してください。${detail}`,
        ),
      ];
    }
    if (BLOCKING_BANDS.includes(match.band) || REVIEW_BANDS.includes(match.band)) {
      return [
        finding(
          "warning",
          "similarity-official-notice",
          `公式過去問どうしが酷似しています（公開は阻害しません）。${detail}`,
        ),
      ];
    }
    return [];
  }

  // --- 改変問題と、その改変元 ---------------------------------------------
  if (q.origin === "modified_official" && match.isDerivedPair) {
    return [
      finding(
        "warning",
        "similarity-derived-expected",
        `改変元（official.derivedFromQuestionId）との類似です。改変問題として想定どおりですが、改変の度合いが十分か確認してください。${detail}`,
      ),
    ];
  }

  // --- 独自問題 / AI生成問題 / 改変元以外との比較 --------------------------
  if (match.band === "exact_duplicate") {
    return [
      finding(
        published ? "blocker" : "warning",
        "similarity-exact-duplicate",
        `正規化後の本文が別の問題と完全に一致します。${published ? "published にできません。" : "published に上げる前に作り直してください。"}${detail}`,
      ),
    ];
  }

  if (match.band === "block") {
    return [
      finding(
        published ? "blocker" : "warning",
        "similarity-block",
        `別の問題と酷似しています（block 帯）。${published ? "published にできません。" : "published に上げる前に作り直してください。"}${detail}`,
      ),
    ];
  }

  if (match.band === "review_required") {
    // ここでは「人が見る必要がある」ことだけを示す。
    // レビュー記録が無いことによる blocker は reviews.ts の checkReviewGate が出す。
    return [
      finding(
        "warning",
        "similarity-review-required",
        `別の問題と似ています（review_required 帯）。published にするには類似度を確認したレビュー記録が必要です。${detail}`,
      ),
    ];
  }

  return [
    finding("warning", "similarity-notice", `別の問題と一部似ています（notice 帯）。${detail}`),
  ];
}
