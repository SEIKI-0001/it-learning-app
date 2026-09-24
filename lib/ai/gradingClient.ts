// /api/ai-grading を呼ぶクライアント側の窓口。
// /ai-grading と章末のAI理解チェックが同じ呼び方・同じ失敗の扱いを共有する。

import type { AiGradingMode, GradeResult } from "@/types/aiGrading";

export type AiGradingMeta = {
  plan: "free" | "pro";
  provider: "gemini" | "claude";
  model: string;
  fallback: boolean;
  usage: { used: number; limit: number; remaining: number };
};

/**
 * 失敗の種類。画面ごとに出し分けられるよう HTTP の意味だけを丸めて返す。
 *   login_required … 401（本番の未ログイン）
 *   rate_limited   … 429（1日の上限）
 *   invalid        … 400 / 404（短すぎる回答・存在しない問題）
 *   failed         … 502・通信断・不正な応答
 */
export type AiGradingFailure = "login_required" | "rate_limited" | "invalid" | "failed";

export type AiGradingResponse =
  | { ok: true; result: GradeResult; meta: AiGradingMeta }
  | { ok: false; reason: AiGradingFailure; error: string };

const DEFAULT_ERROR = "採点に失敗しました。時間をおいてもう一度試してください。";

function failureFor(status: number): AiGradingFailure {
  if (status === 401) return "login_required";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 404) return "invalid";
  return "failed";
}

export async function requestAiGrading(params: {
  questionId: string;
  userAnswer: string;
  userId: string | null;
  mode?: AiGradingMode;
}): Promise<AiGradingResponse> {
  try {
    const res = await fetch("/api/ai-grading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: params.questionId,
        userAnswer: params.userAnswer.trim(),
        userId: params.userId,
        ...(params.mode && params.mode !== "standard" ? { mode: params.mode } : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; result: GradeResult; meta: AiGradingMeta }
      | { ok: false; error?: string }
      | null;
    if (!res.ok || !data || data.ok === false) {
      return {
        ok: false,
        reason: res.ok ? "failed" : failureFor(res.status),
        error: (data && "error" in data && data.error) || DEFAULT_ERROR,
      };
    }
    return data;
  } catch {
    return { ok: false, reason: "failed", error: DEFAULT_ERROR };
  }
}
