import type { ChoiceKey } from "@/types";
import type { QuestionRecord } from "@/types/questionBank";
import { CONTENT_HASH_PATTERN, computeContentHash } from "@/lib/questionBank/contentHash";

// ============================================================================
// 問題バンクの整合性検証。
// ----------------------------------------------------------------------------
// npm run validate:questions（test/questionBank.test.ts）から呼ばれる。
// 「壊れた問題データが本番に出る」のを CI で止めるのが目的なので、
// 例外ではなく違反の一覧を返し、まとめて直せるようにする。
// ============================================================================

export type QuestionBankIssue = {
  /** 対象の問題ID（全体に関わる違反は null）。 */
  questionId: string | null;
  rule: string;
  message: string;
};

const EXPECTED_CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

/** 問題1件を検証する。 */
export function validateQuestion(q: QuestionRecord): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: q.id, rule, message });

  // --- 選択肢 -------------------------------------------------------------
  if (q.choices.length !== 4) {
    add("choices-count", `選択肢は4件必要ですが ${q.choices.length} 件です。`);
  }

  const keys = q.choices.map((c) => c.key);
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) {
    add("choices-key-duplicate", `選択肢キーが重複しています: ${keys.join(", ")}`);
  }
  for (const key of uniqueKeys) {
    if (!EXPECTED_CHOICE_KEYS.includes(key)) {
      add("choices-key-range", `選択肢キーは A〜D のみ許可されます: "${key}"`);
    }
  }
  for (const choice of q.choices) {
    if (choice.text.trim() === "") {
      add("choices-empty-text", `選択肢 "${choice.key}" の本文が空です。`);
    }
  }

  // --- 正答 ---------------------------------------------------------------
  if (!keys.includes(q.correctChoice)) {
    add(
      "correct-choice-exists",
      `正答 "${q.correctChoice}" が選択肢（${keys.join(", ")}）に存在しません。`,
    );
  }

  // --- 本文 ---------------------------------------------------------------
  if (q.prompt.trim() === "") {
    add("prompt-empty", "問題文が空です。");
  }
  if (q.explanation.trim() === "") {
    add("explanation-empty", "解説が空です。");
  }
  if (q.version < 1 || !Number.isInteger(q.version)) {
    add("version-positive-integer", `version は1以上の整数である必要があります: ${q.version}`);
  }

  // --- 公式問題の出典 -----------------------------------------------------
  // official_past      … 出典必須 / isModified: false
  // modified_official  … 出典必須 / isModified: true（改変でも出典は必要。非公式扱いにしない）
  // app_original       … 出典を持たない
  // ai_generated       … 出典を持たない（参考にした公式問題IDはこのフィールドに入れない）
  const needsSource = q.origin === "official_past" || q.origin === "modified_official";
  if (needsSource && !q.official) {
    add("official-source-required", `origin "${q.origin}" には official（出典情報）が必要です。`);
  }
  if (!needsSource && q.official) {
    add(
      "official-source-unexpected",
      `origin "${q.origin}" に official（出典情報）を付けることはできません。`,
    );
  }

  if (q.official) {
    const s = q.official;
    if (s.sourceUrl.trim() === "") add("official-source-url", "sourceUrl が空です。");
    if (s.answerSourceUrl.trim() === "")
      add("official-answer-source-url", "answerSourceUrl が空です。");
    if (s.attribution.trim() === "") add("official-attribution", "attribution が空です。");
    if (!Number.isInteger(s.questionNumber) || s.questionNumber < 1) {
      add("official-question-number", `questionNumber が不正です: ${s.questionNumber}`);
    }

    if (q.origin === "official_past" && s.isModified) {
      add(
        "official-past-not-modified",
        'origin "official_past" は原文出題のため isModified: false である必要があります。',
      );
    }
    if (q.origin === "modified_official" && !s.isModified) {
      add(
        "modified-official-is-modified",
        'origin "modified_official" は isModified: true である必要があります。',
      );
    }
  }

  // --- contentHash / レビュー情報 -----------------------------------------
  // 形式を先に見る。旧形式（fnv1a64:…）が残っているとここで落ちる。
  if (!CONTENT_HASH_PATTERN.test(q.contentHash)) {
    add(
      "content-hash-format",
      `contentHash の形式が不正です（"sha256:" + 64文字の小文字hex が必要）: "${q.contentHash}"`,
    );
  }

  const expectedHash = computeContentHash(q);
  if (q.contentHash !== expectedHash) {
    add(
      "content-hash-match",
      `contentHash が本文と一致しません（保存値: ${q.contentHash} / 期待値: ${expectedHash}）。本文を変えたら version を上げて再生成してください。`,
    );
  }

  if (q.status === "published") {
    if (q.contentHash.trim() === "") {
      add("published-content-hash", "published の問題には contentHash が必要です。");
    }
    if (!q.reviewedAt) {
      add("published-reviewed-at", "published の問題には reviewedAt が必要です。");
    }
    if (!q.reviewedBy) {
      add("published-reviewed-by", "published の問題には reviewedBy が必要です。");
    }
  }

  return issues;
}

/** 問題集合全体を検証する（重複IDを含む）。 */
export function validateQuestions(questions: QuestionRecord[]): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];

  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      issues.push({
        questionId: q.id,
        rule: "id-unique",
        message: `問題IDが重複しています: "${q.id}"`,
      });
    }
    seen.add(q.id);
  }

  for (const q of questions) {
    issues.push(...validateQuestion(q));
  }

  return issues;
}

/**
 * 確認パックが参照する問題IDがすべて解決できるかを検証する。
 * 現行の解決処理は見つからないIDを黙って捨てるため、
 * 「出題数が知らないうちに減る」事故をここで止める。
 */
export function validatePackReferences(
  packs: { packId: string; examLevelQuestionIds: string[] }[],
  questions: QuestionRecord[],
): QuestionBankIssue[] {
  const ids = new Set(questions.map((q) => q.id));
  const issues: QuestionBankIssue[] = [];

  for (const pack of packs) {
    for (const questionId of pack.examLevelQuestionIds) {
      if (!ids.has(questionId)) {
        issues.push({
          questionId,
          rule: "pack-reference-resolvable",
          message: `確認パック "${pack.packId}" が存在しない問題ID "${questionId}" を参照しています。`,
        });
      }
    }
  }

  return issues;
}

/** 違反一覧を読みやすい1つの文字列にする（テスト失敗時の表示用）。 */
export function formatIssues(issues: QuestionBankIssue[]): string {
  return issues
    .map((i) => `- [${i.rule}] ${i.questionId ?? "(全体)"}: ${i.message}`)
    .join("\n");
}
