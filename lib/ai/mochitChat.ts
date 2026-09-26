// モチット AI 相談の LLM 呼び出し（サーバー専用）。
// 週間レポート（lib/ai/weeklyReportCoach.ts）と同じく Gemini の REST を直接呼ぶ。
// - 入力は Learning Context 層が作った事実と、丸めた会話だけ。
// - GEMINI_API_KEY 未設定・通信失敗・空応答はすべて例外にし、呼び出し側で定型文へ戻す。
// - 非 production でキーが無いときだけ、画面確認用の固定文を返す（AI 採点のダミー採点と同じ方針）。

import { getGeminiModel } from "@/lib/ai/gradingCore";

const TIMEOUT_MS = 15_000;
const MAX_OUTPUT_TOKENS = 700;

export class MochitChatError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "request_failed" | "invalid_response",
  ) {
    super(message);
    this.name = "MochitChatError";
  }
}

/** モチット AI の使用モデル。MOCHIT_AI_MODEL で上書き、無ければ AI 採点と同じ Gemini モデル。 */
export function getMochitModel(): string {
  return process.env.MOCHIT_AI_MODEL?.trim() || getGeminiModel();
}

export async function generateMochitReply(input: {
  system: string;
  user: string;
}): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = getMochitModel();
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      return {
        text: "（開発用の固定返答）GEMINI_API_KEY が未設定なので、AI の代わりにこの文を返しているよ。学習データの受け渡しは正常に動いているよ。",
        model: "dev-stub",
      };
    }
    throw new MochitChatError("GEMINI_API_KEY is not set", "not_configured");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text: input.user }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new MochitChatError(`gemini request failed: ${String(e)}`, "request_failed");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new MochitChatError(`gemini http ${res.status}: ${detail.slice(0, 300)}`, "request_failed");
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new MochitChatError("gemini returned empty response", "invalid_response");
  return { text, model };
}
