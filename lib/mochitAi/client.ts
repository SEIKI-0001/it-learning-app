// /api/mochit/* を呼ぶクライアント側の窓口。
// 失敗は種類だけに丸めて返し、画面は定型文＋再試行を出す（学習は止めない）。

import { getUserId, todayLocalDate } from "@/lib/userSession";
import type {
  MochitAnalyticsEvent,
  MochitChatFailure,
  MochitChatRequest,
  MochitChatResponse,
  MochitPageKind,
} from "./types";

const DEFAULT_ERROR = "モチットが今うまく答えられないみたい。学習はそのまま続けられるよ。";

function failureFor(status: number): MochitChatFailure {
  if (status === 401) return "login_required";
  if (status === 429) return "rate_limited";
  if (status === 400) return "invalid";
  return "failed";
}

export async function requestMochitChat(
  params: Omit<MochitChatRequest, "localDate" | "timezoneOffsetMinutes" | "userId">,
): Promise<MochitChatResponse> {
  try {
    const res = await fetch("/api/mochit/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        localDate: todayLocalDate(),
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        userId: getUserId(),
      } satisfies MochitChatRequest),
    });
    const data = (await res.json().catch(() => null)) as MochitChatResponse | { ok: false; error?: string } | null;
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

/** 計測イベントを送る（投げっぱなし・失敗しても何もしない）。 */
export function trackMochitEvent(
  event: MochitAnalyticsEvent,
  props: { page?: MochitPageKind; source?: string; intent?: string } = {},
): void {
  try {
    void fetch("/api/mochit/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...props, userId: getUserId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 計測で体験を止めない
  }
}
