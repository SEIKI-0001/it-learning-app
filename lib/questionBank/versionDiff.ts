import type { QuestionBankIssue } from "@/lib/questionBank/validate";

// ============================================================================
// 「前の版」と「いまの版」を突き合わせる検証。
// ----------------------------------------------------------------------------
// 1つのコミットの中身だけを見る validate.ts では、これは検出できない:
//
//   本文を書き換える → contentHash を再生成する → version は据え置く
//
// この状態は validate.ts をすべて通過する（contentHash は本文と一致しているため）。
// しかし回答履歴は questionId + question_version で集計されるので、
// 別内容の問題への回答が同じ版として混ざり、実測難易度も正答率も壊れる。
//
// そこで Git の比較元（main / マージベース）から前の版を読み、遷移そのものを検証する。
// ファイルの読み込みは呼び出し側（スクリプト）が行い、ここは純関数だけを持つ。
// ============================================================================

/** 比較に必要な分だけの問題スナップショット。 */
export type QuestionVersionSnapshot = {
  id: string;
  version: number;
  contentHash: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

/** 比較に必要な分だけのレビュー記録スナップショット。 */
export type ReviewVersionSnapshot = {
  questionId: string;
  version: number;
  reviewedAt: string;
};

export type QuestionBankRevision = {
  questions: Map<string, QuestionVersionSnapshot>;
  reviews: Map<string, ReviewVersionSnapshot>;
};

/**
 * 比較元から現在への遷移を検証する。
 *
 * 新しく増えた問題は対象外（前の版が無いので比較できない）。
 * 消えた問題は違反として報告する（問題IDは回答履歴のキーなので消してはいけない。
 * 出題を止めたいときは status を retired にする）。
 */
export function validateVersionTransitions(
  base: QuestionBankRevision,
  head: QuestionBankRevision,
): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (questionId: string, rule: string, message: string) =>
    issues.push({ questionId, rule, message });

  for (const [id, before] of base.questions) {
    const after = head.questions.get(id);

    if (!after) {
      add(
        id,
        "question-removed",
        `問題 "${id}" が削除されています。問題IDは回答履歴のキーなので消さないでください（出題を止めるなら status を "retired" にする）。`,
      );
      continue;
    }

    issues.push(...checkVersionTransition(before, after));
    issues.push(
      ...checkReviewFreshness(before, after, base.reviews.get(id), head.reviews.get(id)),
    );
  }

  return issues;
}

/** version そのものの遷移（据え置き・巻き戻し）。 */
function checkVersionTransition(
  before: QuestionVersionSnapshot,
  after: QuestionVersionSnapshot,
): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: after.id, rule, message });

  const contentChanged = before.contentHash !== after.contentHash;

  if (after.version < before.version) {
    add(
      "version-decreased",
      `version が ${before.version} から ${after.version} へ下がっています。version は増やすことしかできません。`,
    );
    return issues;
  }

  // 本題。本文を変えたなら必ず版を上げる。
  if (contentChanged && after.version === before.version) {
    add(
      "content-changed-without-version-bump",
      `本文が変わっている（contentHash: ${before.contentHash} → ${after.contentHash}）のに version が ${after.version} のままです。` +
        `別内容への回答が同じ questionId + version で集計されてしまいます。version を上げてください。`,
    );
  }

  // 版を上げたなら、その版をレビューした記録が問題側にも要る。
  // 「本文を直したが承認は前のまま」という状態を残さない。
  if (after.version > before.version) {
    if (!after.reviewedAt || after.reviewedAt === before.reviewedAt) {
      add(
        "version-bump-without-review-timestamp",
        `version を ${before.version} から ${after.version} へ上げていますが、reviewedAt が更新されていません（${formatValue(before.reviewedAt)} → ${formatValue(after.reviewedAt)}）。新しい版をレビューしてから上げてください。`,
      );
    }
    if (!after.reviewedBy || after.reviewedBy === before.reviewedBy) {
      add(
        "version-bump-without-reviewer",
        `version を ${before.version} から ${after.version} へ上げていますが、reviewedBy が更新されていません（${formatValue(before.reviewedBy)} → ${formatValue(after.reviewedBy)}）。`,
      );
    }
  }

  return issues;
}

/**
 * レビュー記録（data/question-bank/reviews/<id>.json）の鮮度。
 *
 * 見たいのは「本文を直したのに、前の版の承認をそのまま有効として扱っていないか」。
 * version の数字だけ書き換えて中身を据え置く、という抜け道も塞ぐ。
 */
function checkReviewFreshness(
  before: QuestionVersionSnapshot,
  after: QuestionVersionSnapshot,
  beforeReview: ReviewVersionSnapshot | undefined,
  afterReview: ReviewVersionSnapshot | undefined,
): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: after.id, rule, message });

  const contentChanged = before.contentHash !== after.contentHash;
  if (!contentChanged || !afterReview) return issues;

  // 承認記録は「どの版を見たか」で効力が決まる。版がずれた承認は使えない。
  if (afterReview.version !== after.version) {
    add(
      "review-record-version-mismatch",
      `本文を変更した問題のレビュー記録の version（${afterReview.version}）が、問題の version（${after.version}）と一致しません。新しい版をレビューして記録を更新してください。`,
    );
  }

  // version の数字だけ直して、承認日時（＝実際に見た記録）を据え置いていないか。
  if (beforeReview && afterReview.reviewedAt === beforeReview.reviewedAt) {
    add(
      "review-record-not-refreshed",
      `本文を変更したのに、レビュー記録の reviewedAt が "${afterReview.reviewedAt}" のまま据え置かれています。前の版の承認を新しい本文へ流用しないでください。`,
    );
  }

  return issues;
}

function formatValue(value: string | null): string {
  return value === null ? "null" : `"${value}"`;
}
