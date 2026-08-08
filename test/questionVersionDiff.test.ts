import { describe, expect, it } from "vitest";

import {
  validateVersionTransitions,
  type QuestionBankRevision,
  type QuestionVersionSnapshot,
  type ReviewVersionSnapshot,
} from "@/lib/questionBank/versionDiff";

// ============================================================================
// 本文変更と version の対応の検証（npm run validate:question-versions の中身）。
// ----------------------------------------------------------------------------
// 守りたいこと: 別内容の問題への回答が、同じ questionId + version で集計されないこと。
// ============================================================================

function question(
  overrides: Partial<QuestionVersionSnapshot> = {},
): QuestionVersionSnapshot {
  return {
    id: "q1",
    version: 1,
    contentHash: `sha256:${"a".repeat(64)}`,
    reviewedAt: "2026-07-01T00:00:00.000Z",
    reviewedBy: "reviewer-1",
    ...overrides,
  };
}

function review(overrides: Partial<ReviewVersionSnapshot> = {}): ReviewVersionSnapshot {
  return {
    questionId: "q1",
    version: 1,
    reviewedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function revision(
  questions: QuestionVersionSnapshot[],
  reviews: ReviewVersionSnapshot[] = [],
): QuestionBankRevision {
  return {
    questions: new Map(questions.map((q) => [q.id, q])),
    reviews: new Map(reviews.map((r) => [r.questionId, r])),
  };
}

const CHANGED_HASH = `sha256:${"b".repeat(64)}`;

function rulesOf(issues: { rule: string }[]): string[] {
  return issues.map((i) => i.rule);
}

describe("validateVersionTransitions", () => {
  it("何も変えていなければ違反なし", () => {
    const before = revision([question()]);
    const after = revision([question()]);
    expect(validateVersionTransitions(before, after)).toEqual([]);
  });

  it("contentHash が変わったのに version 据え置きなら失敗する", () => {
    const before = revision([question()]);
    const after = revision([question({ contentHash: CHANGED_HASH })]);

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("content-changed-without-version-bump");
    expect(issues[0].message).toContain("version を上げてください");
  });

  it("version を上げて新しいレビューを入れれば成功する", () => {
    const before = revision([question()], [review()]);
    const after = revision(
      [
        question({
          version: 2,
          contentHash: CHANGED_HASH,
          reviewedAt: "2026-08-01T00:00:00.000Z",
          reviewedBy: "reviewer-2",
        }),
      ],
      [review({ version: 2, reviewedAt: "2026-08-01T00:00:00.000Z" })],
    );

    expect(validateVersionTransitions(before, after)).toEqual([]);
  });

  it("version を上げても reviewedAt が据え置きなら失敗する", () => {
    const before = revision([question()]);
    const after = revision([question({ version: 2, contentHash: CHANGED_HASH })]);

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("version-bump-without-review-timestamp");
  });

  it("version を上げても reviewedBy が据え置きなら失敗する", () => {
    const before = revision([question()]);
    const after = revision([
      question({
        version: 2,
        contentHash: CHANGED_HASH,
        reviewedAt: "2026-08-01T00:00:00.000Z",
      }),
    ]);

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("version-bump-without-reviewer");
  });

  it("未レビュー（null のまま）で version を上げたら失敗する", () => {
    const before = revision([question({ reviewedAt: null, reviewedBy: null })]);
    const after = revision([
      question({ version: 2, contentHash: CHANGED_HASH, reviewedAt: null, reviewedBy: null }),
    ]);

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("version-bump-without-review-timestamp");
    expect(rulesOf(issues)).toContain("version-bump-without-reviewer");
  });

  it("version を下げたら失敗する", () => {
    const before = revision([question({ version: 3 })]);
    const after = revision([question({ version: 2 })]);

    expect(rulesOf(validateVersionTransitions(before, after))).toContain("version-decreased");
  });

  it("本文変更後にレビュー記録の version がずれていたら失敗する", () => {
    const before = revision([question()], [review()]);
    const after = revision(
      [
        question({
          version: 2,
          contentHash: CHANGED_HASH,
          reviewedAt: "2026-08-01T00:00:00.000Z",
          reviewedBy: "reviewer-2",
        }),
      ],
      // 版を上げ忘れたレビュー記録。古い承認で新しい本文を通そうとしている状態。
      [review({ version: 1, reviewedAt: "2026-08-01T00:00:00.000Z" })],
    );

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("review-record-version-mismatch");
  });

  it("本文変更後にレビュー記録の日時を据え置いたら失敗する", () => {
    const before = revision([question()], [review()]);
    const after = revision(
      [
        question({
          version: 2,
          contentHash: CHANGED_HASH,
          reviewedAt: "2026-08-01T00:00:00.000Z",
          reviewedBy: "reviewer-2",
        }),
      ],
      // version の数字だけ書き換え、実際に見た記録（reviewedAt）は前のまま。
      [review({ version: 2, reviewedAt: "2026-07-01T00:00:00.000Z" })],
    );

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("review-record-not-refreshed");
  });

  it("問題を削除したら失敗する", () => {
    const before = revision([question()]);
    const after = revision([]);

    const issues = validateVersionTransitions(before, after);
    expect(rulesOf(issues)).toContain("question-removed");
    expect(issues[0].message).toContain("retired");
  });

  it("新しく増えた問題は対象外", () => {
    const before = revision([question()]);
    const after = revision([question(), question({ id: "q2", version: 1 })]);

    expect(validateVersionTransitions(before, after)).toEqual([]);
  });

  it("本文を変えずにメタ情報だけ直すのは通る", () => {
    // status や tags は contentHash の対象外。版を上げる必要はない。
    const before = revision([question()]);
    const after = revision([question()]);

    expect(validateVersionTransitions(before, after)).toEqual([]);
  });
});
