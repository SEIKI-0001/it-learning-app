import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getRequestUserId: vi.fn() }));
vi.mock("@/lib/apiUser", () => ({ getRequestUserId: mocks.getRequestUserId }));
vi.mock("@/lib/auth/lineSession", () => ({ isAuthEnabled: () => true }));

import { POST } from "@/app/api/weekly-report/route";

const PAYLOAD = {
  isFirstWeek: false,
  lowData: false,
  totals: { answered: 12, correct: 9, accuracy: 75, daysStudied: 3, topicsTouched: 2 },
  lastWeek: null,
  dailyPattern: "水:4 木:0 金:0 土:4 日:4 月:0 火:0",
  checkpoint: { label: "CP1「基礎」", earnedRequired: 2, totalRequired: 5 },
  signals: [
    { id: "comeback", category: "growth", fact: "2日間空いたあと土曜日に再開", tentative: false, numbers: [2] },
  ],
  nextActions: [{ title: "ネットワーク", estimatedMinutes: 8, reason: "復習予定日です。" }],
};

function req(body: unknown) {
  return new Request("http://localhost/api/weekly-report", { method: "POST", body: JSON.stringify(body) });
}

function geminiReturns(obj: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })),
  );
}

describe("POST /api/weekly-report", () => {
  beforeEach(() => {
    mocks.getRequestUserId.mockResolvedValue("user-1");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("未ログインは 401（AI を呼ばない）", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(req({ payload: PAYLOAD }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("学習0の週は AI を呼ばない", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(req({ payload: { ...PAYLOAD, totals: { ...PAYLOAD.totals, answered: 0 } } }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("キー未設定は 503（クライアントはテンプレート表示）", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await POST(req({ payload: PAYLOAD }))).status).toBe(503);
  });

  it("AI の出力は検査を通った部分だけ返す", async () => {
    const fetchMock = geminiReturns({
      headline: "止まっても戻ってきた1週間でした。",
      summary: "正答率は90%でした。", // 90 は事実に無い → 捨てる
      growth: [{ signalId: "comeback", title: "2日空いても戻れました", body: "土曜日に再開しています。" }],
      mochit: "土曜日に戻ってきたの、見てたよ。",
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(req({ payload: PAYLOAD }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.narrative.headline).toBe("止まっても戻ってきた1週間でした。");
    expect(json.narrative.summary).toBeUndefined();
    expect(json.narrative.growth).toHaveLength(1);
    expect(json.narrative.mochit).toContain("土曜日");
    // AI に送る本文に userId を含めない
    const sent = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(sent).not.toContain("user-1");
  });

  it("AI が壊れた応答を返したら 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req({ payload: PAYLOAD }))).status).toBe(502);
  });
});
