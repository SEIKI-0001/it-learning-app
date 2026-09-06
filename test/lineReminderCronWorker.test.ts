import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "@/workers/line-reminder-cron/src/index";
import {
  REMINDER_PATH,
  triggerLineReminder,
  type Env,
  type FetchLike,
} from "@/workers/line-reminder-cron/src/trigger";

// GF-P0-006 スケジューラー Worker。
//
// この Worker は通知APIを叩くだけで、Supabase の鍵も LINE のトークンも持たない。
// 「持っていないので触れない」ことを、送信先が1本だけであることで確かめる。

const BASE_URL = "https://app.example.com";
const SECRET = "cron-secret";

function env(overrides: Partial<Env> = {}): Env {
  return { APP_BASE_URL: BASE_URL, CRON_SECRET: SECRET, ...overrides };
}

const controller = { scheduledTime: Date.parse("2026-09-06T11:00:00Z"), cron: "0 * * * *" };
const ctx = { waitUntil: () => {} };

let fetchMock: ReturnType<typeof vi.fn<FetchLike>>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn<FetchLike>().mockResolvedValue({ ok: true, status: 200 } as Response);
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("scheduled invocation", () => {
  it("通知APIを CRON_SECRET 付きで GET する", async () => {
    await worker.scheduled(controller, env(), ctx);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}${REMINDER_PATH}`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
    // Worker はボディを組み立てない（判定はアプリ側の単一の窓口が行う）。
    expect(init.body).toBeUndefined();
  });

  it("APP_BASE_URL の末尾スラッシュを二重にしない", async () => {
    await triggerLineReminder(env({ APP_BASE_URL: `${BASE_URL}/` }), fetchMock);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}${REMINDER_PATH}`);
  });

  it("Cron の UTC 起動時刻を通知判定へ持ち込まない", async () => {
    await worker.scheduled(controller, env(), ctx);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // 起動時刻・cron 式をクエリにもヘッダーにも載せない。
    expect(url).not.toContain("?");
    const serializedHeaders = JSON.stringify(init.headers);
    expect(serializedHeaders).not.toContain(controller.cron);
    expect(serializedHeaders).not.toContain(String(controller.scheduledTime));
    expect(url).not.toContain(String(controller.scheduledTime));
  });
});

describe("設定が欠けているとき", () => {
  it("APP_BASE_URL 未設定なら呼びに行かず、例外も投げない", async () => {
    const result = await triggerLineReminder(env({ APP_BASE_URL: undefined }), fetchMock);

    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("CRON_SECRET 未設定なら呼びに行かず、例外も投げない", async () => {
    const result = await triggerLineReminder(env({ CRON_SECRET: "" }), fetchMock);

    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("scheduled から呼んでも設定不足で落ちない", async () => {
    await expect(worker.scheduled(controller, {}, ctx)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("通知APIが失敗したとき", () => {
  it("エラー応答を記録するだけで、リクエストは1本のまま", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 } as Response);

    const result = await triggerLineReminder(env(), fetchMock);

    expect(result).toEqual({ ok: false, reason: "request_failed", status: 500 });
    // 再送も、別経路への書き込みも行わない。次の毎時起動へ任せる。
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ネットワーク失敗でも例外を投げない", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await triggerLineReminder(env(), fetchMock);

    expect(result).toEqual({ ok: false, reason: "request_failed" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("Worker から Supabase・LINE へ直接アクセスしない", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 } as Response);

    await worker.scheduled(controller, env(), ctx);

    // 送信先は通知APIの1本だけ。DB も LINE も Worker からは触れない。
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toEqual([`${BASE_URL}${REMINDER_PATH}`]);
    expect(urls.some((u) => u.includes("supabase"))).toBe(false);
    expect(urls.some((u) => u.includes("api.line.me"))).toBe(false);
  });
});
