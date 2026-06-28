// 記述問題の AI 採点オーケストレーション（サーバー専用）。
// provider を切り替えて採点する。プロバイダ固有処理は lib/ai/providers/* に閉じ込め、
// UI / API Route にはここで束ねた窓口だけを見せる（Gemini/Claude を直書きしない）。
//
// - free ユーザー: Gemini（通常採点）
// - pro ユーザー : Claude Sonnet（Pro採点）
// - Claude が失敗 / キー未設定なら Gemini へ自動フォールバックし fallback=true を返す。

import type { GradeResult, WrittenQuestion } from "@/types/aiGrading";
import {
  GradingError,
  getClaudeModel,
  getGeminiModel,
  maskPersonalInfo,
  type GradeProviderId,
} from "@/lib/ai/gradingCore";
import { gradeWithGemini } from "@/lib/ai/providers/geminiProvider";
import { gradeWithClaude } from "@/lib/ai/providers/claudeProvider";

// 既存 import 互換のため再エクスポート。
export { GradingError, maskPersonalInfo };
export type { GradeProviderId };

/** 採点結果と、実際に使われたプロバイダ・モデルなどのメタ情報。 */
export type GradeOutcome = {
  result: GradeResult;
  /** 実際に採点したプロバイダ（フォールバック後の値）。 */
  provider: GradeProviderId;
  /** 実際に採点したモデル名。 */
  model: string;
  /** Claude を要求したが Gemini にフォールバックした場合 true。 */
  fallback: boolean;
};

/** プロバイダ名から使用モデル名を返す（ログ用途など）。 */
export function getModelForProvider(provider: GradeProviderId): string {
  return provider === "claude" ? getClaudeModel() : getGeminiModel();
}

function geminiOutcome(result: GradeResult, fallback: boolean): GradeOutcome {
  return { result, provider: "gemini", model: getGeminiModel(), fallback };
}

/**
 * 記述回答を採点して GradeOutcome を返す。
 * provider="claude" のときは Claude で採点し、失敗時は Gemini にフォールバックする。
 * 失敗（フォールバックも不可）の場合は GradingError を投げる。
 */
export async function gradeWrittenAnswer(
  question: WrittenQuestion,
  userAnswer: string,
  options?: { provider?: GradeProviderId }
): Promise<GradeOutcome> {
  const maskedAnswer = maskPersonalInfo(userAnswer);
  const provider = options?.provider ?? "gemini";

  if (provider !== "claude") {
    const result = await gradeWithGemini(question, maskedAnswer);
    return geminiOutcome(result, false);
  }

  // Pro 採点（Claude）。失敗時は Gemini にフォールバックして体験を止めない。
  try {
    const result = await gradeWithClaude(question, maskedAnswer);
    return { result, provider: "claude", model: getClaudeModel(), fallback: false };
  } catch (e) {
    if (e instanceof GradingError) {
      console.error("[ai-grading] claude failed, falling back to gemini:", e.message);
    } else {
      console.error("[ai-grading] claude unexpected error, falling back to gemini:", e);
    }
    const result = await gradeWithGemini(question, maskedAnswer);
    return geminiOutcome(result, true);
  }
}
