import { createHash } from "node:crypto";

import type { QuestionRecord } from "@/types/questionBank";

// ============================================================================
// 問題本文のハッシュ（SHA-256）。
// ----------------------------------------------------------------------------
// 用途:
//   - 問題の内容が変わったのに version を上げ忘れる、という事故を検知する。
//   - 将来、公式過去問と酷似した AI 生成問題を洗い出すときの完全一致判定に使う。
//
// 形式: "sha256:" + 64文字の小文字hex
//
// 計算対象（ここが仕様。変更するときは全問題の再生成が必要）:
//   1. prompt
//   2. choices を key の昇順に並べた key と text
//   3. correctChoice
//   4. explanation
//
// 計算対象に含めないもの:
//   status / version / tags / estimatedDifficulty / official / reviewedAt /
//   reviewedBy / figures / choiceExplanations / syllabusNode
//   ---> メタ情報の更新だけでハッシュが動くと、本文変更の検知が鈍るため。
//
// 実装: Node.js 標準の node:crypto を使う（外部依存を増やさない）。
// このモジュールは Node ランタイム専用。ブラウザに送られるコードから import しないこと
// （node:crypto の代替である Web Crypto は非同期で、この同期APIを保てないため）。
// 現状の呼び出し元は移行スクリプトと検証テストのみ。
// ============================================================================

export const CONTENT_HASH_ALGORITHM = "sha256";
export const CONTENT_HASH_PREFIX = `${CONTENT_HASH_ALGORITHM}:`;

/** contentHash の形式（"sha256:" + 64文字の小文字hex）。 */
export const CONTENT_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

/**
 * 連結の境界を取り違えないための区切り。
 * US（Unit Separator, U+001F）。問題文には現れない前提。
 * ソース上に不可視文字を置かないため、コードポイントから組み立てる。
 */
const SEP = String.fromCharCode(0x1f);

/** ハッシュ計算の入力を組み立てる（この文字列の作り方が仕様そのもの）。 */
export function buildContentHashInput(
  question: Pick<QuestionRecord, "prompt" | "choices" | "correctChoice" | "explanation">,
): string {
  const choices = [...question.choices]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((c) => `${c.key}${SEP}${c.text}`)
    .join(SEP);

  return [question.prompt, choices, question.correctChoice, question.explanation].join(SEP);
}

/** 問題本文のハッシュを計算する（例: "sha256:9f86d081..."）。 */
export function computeContentHash(
  question: Pick<QuestionRecord, "prompt" | "choices" | "correctChoice" | "explanation">,
): string {
  const digest = createHash(CONTENT_HASH_ALGORITHM)
    .update(buildContentHashInput(question), "utf8")
    .digest("hex");

  return `${CONTENT_HASH_PREFIX}${digest}`;
}

/** 保存されている contentHash が本文と一致しているか。 */
export function isContentHashValid(question: QuestionRecord): boolean {
  return question.contentHash === computeContentHash(question);
}
