// Claude (Anthropic) による記述問題の採点（サーバー専用・Proユーザー向け「Pro採点」）。
// Anthropic 固有処理はこのファイルに閉じ込める。
// - ANTHROPIC_API_KEY はサーバー側でのみ使い、クライアントへ露出させない。
// - キー未設定時は GradingError(claude not configured) を投げ、呼び出し側で扱う。
// - 採点 JSON の形式は Gemini 版と完全に共通（gradingCore の normalizeResult を再利用）。

import Anthropic from "@anthropic-ai/sdk";
import type { GradeResult, WrittenQuestion } from "@/types/aiGrading";
import {
  GradingError,
  buildSystemPrompt,
  buildUserPrompt,
  extractJson,
  getClaudeModel,
  normalizeResult,
} from "@/lib/ai/gradingCore";

/** ANTHROPIC_API_KEY が設定されているか（Pro 採点が利用可能か）。 */
export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** キー未設定を表す GradingError（route 側で「設定不備」として扱える）。 */
export class ClaudeNotConfiguredError extends GradingError {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "ClaudeNotConfiguredError";
  }
}

/**
 * Claude Sonnet で記述回答を採点する。
 * Anthropic SDK 経由で Messages API を呼び、JSON のみを返させてサーバー側で正規化する。
 * 呼び出し側からは masked 済みの回答を受け取る前提。
 */
export async function gradeWithClaude(
  question: WrittenQuestion,
  maskedAnswer: string
): Promise<GradeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new ClaudeNotConfiguredError();
  }

  const client = new Anthropic({ apiKey });
  const model = getClaudeModel();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages: [
        { role: "user", content: buildUserPrompt(question, maskedAnswer) },
      ],
    });
  } catch (e) {
    throw new GradingError(`claude request failed: ${String(e)}`);
  }

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new GradingError("claude returned empty response");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(text)) as Record<string, unknown>;
  } catch (e) {
    // パース失敗の詳細はサーバーログに残し、ユーザーには簡潔なエラーだけ返す。
    console.error("[ai-grading] claude JSON parse failed:", e, "\nraw:", text);
    throw new GradingError("failed to parse claude json");
  }

  return normalizeResult(parsed, question);
}
