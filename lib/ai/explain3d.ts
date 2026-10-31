// /explain の LLM 呼び出し（サーバー専用）。モチット相談と同じく Gemini の REST を JSON モードで直接呼ぶ。
// - GEMINI_API_KEY 未設定・通信失敗・JSON でない応答はすべて例外にし、呼び出し側でキーワード照合へ戻す。
// - 非 production でキーが無いときだけ、画面確認用に「キーワードが合う既存の模型」か固定の場面を返す。

import { getGeminiModel } from "@/lib/ai/gradingCore";
import { matchExistingModel } from "@/lib/explain3d/catalog";
import { FIXTURE_WEB, pickFixture } from "./explain3dFixtures";

const TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 2_000;

export class Explain3dError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "request_failed" | "invalid_response",
  ) {
    super(message);
    this.name = "Explain3dError";
  }
}

/** EXPLAIN3D_AI_MODEL で上書き、無ければ AI 採点と同じ Gemini モデル。 */
export function getExplain3dModel(): string {
  return process.env.EXPLAIN3D_AI_MODEL?.trim() || getGeminiModel();
}

/** 開発用の固定の場面（キーが無いときに画面と再生部品を確かめる）。中身は explain3dFixtures.ts */
export const DEV_STUB_OUTPUT = FIXTURE_WEB;

export async function generateExplainPlan(input: {
  system: string;
  user: string;
  question: string;
}): Promise<{ output: unknown; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = getExplain3dModel();
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      const matched = matchExistingModel(input.question);
      return {
        output: matched ? { mode: "existing", topicId: matched.topicId, reason: "（開発用）キーワードで選んだ模型です" } : pickFixture(input.question),
        model: "dev-stub",
      };
    }
    throw new Explain3dError("GEMINI_API_KEY is not set", "not_configured");
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
        generationConfig: { temperature: 0.3, maxOutputTokens: MAX_OUTPUT_TOKENS, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new Explain3dError(`gemini request failed: ${String(e)}`, "request_failed");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Explain3dError(`gemini http ${res.status}: ${detail.slice(0, 300)}`, "request_failed");
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Explain3dError("gemini returned empty response", "invalid_response");
  // JSON モードでも前後に ``` が付くことがあるので、最初の { から最後の } までを読む
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  try {
    return { output: JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text), model };
  } catch {
    console.error("[explain3d] gemini JSON parse failed. raw:", text.slice(0, 500));
    throw new Explain3dError("failed to parse gemini json", "invalid_response");
  }
}
