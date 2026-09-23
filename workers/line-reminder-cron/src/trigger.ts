// GF-P0-006 スケジューラーの中身。
//
// エントリ（index.ts）と分けてある理由: workerd は Worker のエントリモジュールに
// ハンドラー以外の名前付きエクスポートがあると起動を拒否する
// （"Incorrect type for map entry ...: the provided value is not of type
// 'function or ExportedHandler'"）。定数やテスト用の関数はこちら側に置く。

/** Cloudflare の型に依存しないための最小の構造型（@cloudflare/workers-types 不要）。 */
export type ScheduledController = {
  scheduledTime: number;
  cron: string;
};

export type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export type Env = {
  /** 本番アプリの基点 URL。Cloudflare の公開ドメインを指定する。 */
  APP_BASE_URL?: string;
  /** it-learning-app 側と同じ値。wrangler secret で設定し、設定ファイルへ平文で置かない。 */
  CRON_SECRET?: string;
};

export const REMINDER_PATH = "/api/cron/line-reminder";

export type TriggerResult =
  | { ok: true; status: number }
  | { ok: false; reason: "not_configured" | "request_failed"; status?: number };

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * 通知APIを1回叩く。設定が欠けていれば呼びに行かず、例外も投げずに終わる。
 *
 * 投げない理由: Cron の失敗はリトライされず、投げても届く通知が増えない。
 * 代わりに理由をログへ残し、次の毎時起動に任せる（冪等キーがあるので二重送信にならない）。
 */
export async function triggerLineReminder(
  env: Env,
  fetchImpl: FetchLike = fetch,
): Promise<TriggerResult> {
  const baseUrl = (env.APP_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const secret = (env.CRON_SECRET ?? "").trim();

  if (!baseUrl || !secret) {
    console.error(
      "line-reminder-cron: not configured " +
        `(APP_BASE_URL=${baseUrl ? "set" : "missing"}, ` +
        `CRON_SECRET=${secret ? "set" : "missing"})`,
    );
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetchImpl(`${baseUrl}${REMINDER_PATH}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      console.error(`line-reminder-cron: endpoint returned ${res.status}`);
      return { ok: false, reason: "request_failed", status: res.status };
    }
    // 成功時も1行だけ残す（GF-P0-006 の Measurement）。無言だと
    // 「正常に動いて対象0件」と「そもそも動いていない」を tail から区別できず、
    // 実際に CRON_SECRET が空のまま3日間気づけなかった。
    // 本文は通知APIの実行結果（scanned / sent / failed / skipped）で、個人情報を含まない。
    const summary = await res.text().catch(() => "");
    console.log(`line-reminder-cron: ok ${summary.slice(0, 300)}`.trim());
    return { ok: true, status: res.status };
  } catch (e) {
    console.error("line-reminder-cron: request failed", e);
    return { ok: false, reason: "request_failed" };
  }
}
