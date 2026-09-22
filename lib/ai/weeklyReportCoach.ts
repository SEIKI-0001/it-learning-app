// 週間レポートの AI 文章生成（サーバー専用）。
// AI 採点（lib/ai/gradeWrittenAnswer.ts）とは責務を分け、Gemini の REST 呼び出しだけを共有する。
// - 入力は lib/weeklyReportNarrative.ts で検査済みの payload（計算済みの事実のみ・個人情報なし）。
// - 出力は validateAiNarrative を通った部分だけを返す。数値の捏造・禁止表現は捨てる。
// - GEMINI_API_KEY 未設定・通信失敗・JSON 不正はすべて例外にし、呼び出し側でテンプレートへ戻す。

import { extractJson, getGeminiModel } from "@/lib/ai/gradingCore";
import {
  buildWeeklyReportSystemPrompt,
  buildWeeklyReportUserPrompt,
  validateAiNarrative,
  type AiNarrativePart,
  type WeeklyAiPayload,
} from "@/lib/weeklyReportNarrative";

const TIMEOUT_MS = 15_000;

export class WeeklyReportAiError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "request_failed" | "invalid_response",
  ) {
    super(message);
    this.name = "WeeklyReportAiError";
  }
}

export function isWeeklyReportAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateWeeklyNarrative(
  payload: WeeklyAiPayload,
): Promise<{ part: AiNarrativePart; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new WeeklyReportAiError("GEMINI_API_KEY is not set", "not_configured");

  const model = getGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildWeeklyReportSystemPrompt() }] },
        contents: [{ role: "user", parts: [{ text: buildWeeklyReportUserPrompt(payload) }] }],
        generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new WeeklyReportAiError(`gemini request failed: ${String(e)}`, "request_failed");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new WeeklyReportAiError(`gemini http ${res.status}: ${detail.slice(0, 300)}`, "request_failed");
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new WeeklyReportAiError("gemini returned empty response", "invalid_response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new WeeklyReportAiError("failed to parse gemini json", "invalid_response");
  }
  return { part: validateAiNarrative(parsed, payload), model };
}
