// Gemini による記述問題の採点（サーバー専用・無料ユーザー向け「通常採点」）。
// Gemini 固有処理（REST 呼び出し・API キー・ダミー採点）はこのファイルに閉じ込める。
// - GEMINI_API_KEY があるときだけ Gemini を呼ぶ。未設定なら開発確認用のダミー採点を返す。
// - API キーはサーバー側でのみ使い、クライアントへ露出させない（x-goog-api-key ヘッダー）。

import type { GradeResult, WrittenQuestion } from "@/types/aiGrading";
import {
  GradingError,
  buildSystemPrompt,
  buildUserPrompt,
  extractJson,
  getGeminiModel,
  gradeFromScore,
  normalizeResult,
} from "@/lib/ai/gradingCore";

/** Gemini API（REST）を呼び出して採点する。 */
async function callGemini(
  apiKey: string,
  model: string,
  question: WrittenQuestion,
  maskedAnswer: string
): Promise<GradeResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(question, maskedAnswer) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (e) {
    throw new GradingError(`gemini request failed: ${String(e)}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GradingError(`gemini http ${res.status}: ${detail.slice(0, 500)}`);
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GradingError("gemini returned empty response");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJson(text)) as Record<string, unknown>;
  } catch (e) {
    // パース失敗の詳細はサーバーログに残し、ユーザーには簡潔なエラーだけ返す。
    console.error("[ai-grading] gemini JSON parse failed:", e, "\nraw:", text);
    throw new GradingError("failed to parse gemini json");
  }

  return normalizeResult(parsed, question);
}

/** API キー未設定時の開発確認用ダミー採点（キーワード一致でそれっぽい点数を出す）。 */
function buildDummyResult(
  question: WrittenQuestion,
  maskedAnswer: string
): GradeResult {
  const hit = question.keywords.filter((kw) => maskedAnswer.includes(kw));
  const ratio = question.keywords.length
    ? hit.length / question.keywords.length
    : 0;
  // 文章量も少し加点（最大 +20）。最低でも 40 点は付けて画面確認しやすくする。
  const lengthBonus = Math.min(20, Math.floor(maskedAnswer.length / 15));
  const score = Math.min(
    100,
    Math.max(40, Math.round(ratio * 70) + 30) + lengthBonus - 10
  );

  const missing = question.keywords.filter((kw) => !maskedAnswer.includes(kw));

  return {
    score,
    grade: gradeFromScore(score),
    isCorrect: score >= 80,
    summary:
      "【ダミー採点】GEMINI_API_KEY が未設定のため、キーワード一致による簡易採点を表示しています。",
    goodPoints:
      hit.length > 0
        ? [`重要キーワード（${hit.join("、")}）に触れられています。`]
        : ["回答が入力されています。"],
    missingPoints:
      missing.length > 0
        ? [
            `次のキーワードにも触れられると、より良い説明になります: ${missing.join(
              "、"
            )}`,
          ]
        : ["大きな不足はありません（ダミー判定）。"],
    feedback:
      "これは開発確認用のダミー結果です。実際のAI採点を有効にするには GEMINI_API_KEY を設定してください。",
    modelAnswer: question.modelAnswer,
    nextReviewTheme: question.category,
  };
}

/**
 * Gemini で記述回答を採点する。
 * GEMINI_API_KEY があれば実際に Gemini を呼び、無ければダミー採点を返す（画面確認用）。
 * 呼び出し側からは masked 済みの回答を受け取る前提。
 */
export async function gradeWithGemini(
  question: WrittenQuestion,
  maskedAnswer: string
): Promise<GradeResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return buildDummyResult(question, maskedAnswer);
  }
  return callGemini(apiKey, getGeminiModel(), question, maskedAnswer);
}
