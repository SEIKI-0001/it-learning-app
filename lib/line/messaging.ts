// LINE Messaging API への送信（reply / push）。サーバー専用。
//
// Webhook の返信（reply）と、Cron からの学習リマインダー（push）で共有する。
// アクセストークンはこのモジュールの外へ出さない（クライアントへ露出させない）。

const LINE_API_BASE = "https://api.line.me/v2/bot/message";

export type LineSendResult = { ok: boolean; status: number; detail?: string };

async function postMessage(
  path: "reply" | "push",
  body: Record<string, unknown>,
  accessToken: string,
): Promise<LineSendResult> {
  try {
    const res = await fetch(`${LINE_API_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true, status: res.status };
    const detail = await res.text().catch(() => "");
    console.error(`LINE ${path} API error: ${res.status} ${detail}`);
    return { ok: false, status: res.status, detail: detail.slice(0, 512) };
  } catch (e) {
    // ネットワーク断など。呼び出し側が学習データへ副作用を出さずに済むよう例外にしない。
    console.error(`LINE ${path} API request failed`, e);
    return {
      ok: false,
      status: 0,
      detail: e instanceof Error ? e.message : "request failed",
    };
  }
}

/** Webhook の replyToken に対する返信。 */
export function sendLineReply(
  replyToken: string,
  text: string,
  accessToken: string,
): Promise<LineSendResult> {
  return postMessage(
    "reply",
    { replyToken, messages: [{ type: "text", text }] },
    accessToken,
  );
}

/** LINE userId 宛のプッシュ送信（Cron からのリマインダー）。 */
export function sendLinePush(
  lineUserId: string,
  text: string,
  accessToken: string,
): Promise<LineSendResult> {
  return postMessage(
    "push",
    { to: lineUserId, messages: [{ type: "text", text }] },
    accessToken,
  );
}
