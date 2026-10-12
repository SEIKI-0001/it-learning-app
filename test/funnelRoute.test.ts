import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));

import { POST } from "@/app/api/funnel/route";
import { parseFunnelInput, splitReferrer } from "@/lib/growth/funnel";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

function post(body: unknown, ua: string | null = UA) {
  return new Request("https://example.test/api/funnel", {
    method: "POST",
    headers: ua ? { "user-agent": ua } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("parseFunnelInput", () => {
  it("click には遷移先が必須で、置き場所は小文字の識別子だけ通す", () => {
    expect(parseFunnelInput({ event: "click", path: "/kakomon/2025/3" })).toBeNull();
    expect(
      parseFunnelInput({
        event: "click",
        path: "/kakomon/2025/3",
        targetPath: "/kaisetsu/tech-iot",
        placement: "kakomon_answer_kaisetsu",
        refPath: "/guide",
      }),
    ).toEqual({
      event: "click",
      path: "/kakomon/2025/3",
      targetPath: "/kaisetsu/tech-iot",
      placement: "kakomon_answer_kaisetsu",
      refPath: null,
      referrerHost: null,
      visitorId: null,
    });
    expect(
      parseFunnelInput({ event: "click", path: "/a", targetPath: "/b", placement: "<script>" })
        ?.placement,
    ).toBeNull();
  });

  it("未知のイベントや不正なパスは捨てる", () => {
    expect(parseFunnelInput({ event: "purchase", path: "/lp" })).toBeNull();
    expect(parseFunnelInput({ event: "view", path: "https://evil.test/" })).toBeNull();
    expect(parseFunnelInput(null)).toBeNull();
  });
});

describe("splitReferrer", () => {
  it("自サイトはパスだけ、外部はホスト名だけ残す", () => {
    expect(splitReferrer("https://example.test/kakomon/2025/3?x=1", "example.test")).toEqual({
      refPath: "/kakomon/2025/3",
      referrerHost: null,
    });
    expect(splitReferrer("https://www.google.com/search?q=it", "example.test")).toEqual({
      refPath: null,
      referrerHost: "www.google.com",
    });
    expect(splitReferrer("", "example.test")).toEqual({ refPath: null, referrerHost: null });
  });
});

describe("POST /api/funnel", () => {
  beforeEach(() => {
    mocks.insert.mockReset().mockResolvedValue({ error: null });
    mocks.getServiceSupabase.mockReset().mockReturnValue({
      from: () => ({ insert: mocks.insert }),
    });
  });

  it("正しいイベントを 1 行保存して 204 を返す", async () => {
    const res = await POST(
      post({ event: "view", path: "/kakomon/2025/3", referrerHost: "www.google.com", visitorId: "abcdef0123456789" }),
    );
    expect(res.status).toBe(204);
    expect(mocks.insert).toHaveBeenCalledWith({
      event: "view",
      path: "/kakomon/2025/3",
      target_path: null,
      placement: null,
      ref_path: null,
      referrer_host: "www.google.com",
      visitor_id: "abcdef0123456789",
    });
  });

  it("クローラー・壊れた本文・不正な値は保存しない（それでも 204）", async () => {
    for (const req of [
      post({ event: "view", path: "/kakomon" }, "Googlebot/2.1"),
      post({ event: "view", path: "/kakomon" }, null),
      post("{not json"),
      post({ event: "view", path: "kakomon" }),
    ]) {
      expect((await POST(req)).status).toBe(204);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
