import { describe, expect, it, vi } from "vitest";
import { resolveSlot, themeForSlot, buildPostUrl, contentKeys, similar, validateGenerated, compose, type Source } from "@/lib/growth/xPosting/core";
import { createXPost, signOAuth, verifyXIdentity, readXIdentity } from "@/lib/growth/xPosting/xClient";

const source: Source = { id: "term-test", theme: "terms", text: "DNSはドメイン名とIPアドレスを対応付ける仕組みです。", evidence: "data/wordlist/itpassAcronyms.json", path: "/words", rights: "app_original" };
const url = buildPostUrl("/words", "x-123", "https://example.test");
const generated = () => ({ text: compose("知っていますか？", source, url), theme: "terms", contentId: source.id, destinationUrl: url, evidence: [source.evidence], quality: { passed: true, reasons: [] } });

describe("X content policy", () => {
  it("selects all seven weekday themes", () => {
    expect(Array.from({ length: 7 }, (_, i) => themeForSlot(`2026-10-${12+i}T07:00:00+09:00`))).toEqual(["question", "terms", "trick", "study", "challenge", "knowhow", "service"]);
  });
  it("uses the scheduled event slot when delayed across JST midnight", () => {
    expect(resolveSlot(new Date("2026-10-13T16:00:00Z"), ["07:00"], "0 22 * * *")).toBe("2026-10-12T22:00:00.000Z");
    expect(resolveSlot(new Date("2026-10-13T21:00:00Z"), ["07:00", "19:00"])).toBe("2026-10-13T10:00:00.000Z");
    expect(() => resolveSlot(new Date(), ["25:00"])).toThrow();
  });
  it("carries both utm_content and the existing first-touch ref", () => {
    const u = new URL(url);
    expect(Object.fromEntries(u.searchParams)).toEqual({ utm_source: "x", utm_medium: "social", utm_campaign: "organic_x", utm_content: "x-123", ref: "x-123" });
    expect(() => buildPostUrl("https://evil.test", "x-123", "https://example.test")).toThrow();
  });
  it("validates grounded JSON independently of the AI quality flag", () => {
    expect(validateGenerated(generated(), [source], [], "terms", url).contentId).toBe(source.id);
    for (const change of [{ text: "合格率100%！" }, { evidence: ["invented"] }, { contentId: "unknown" }, { theme: "service" }, { destinationUrl: "https://evil.test" }, { quality: { passed: false, reasons: [] } }]) {
      expect(() => validateGenerated({ ...generated(), ...change }, [source], [], "terms", url)).toThrow();
    }
    expect(() => validateGenerated(null, [source], [], "terms", url)).toThrow();
  });
  it("rejects Japanese exceeding weighted 280 even below 250 code points", () => {
    const long = { ...source, text: "日".repeat(141) };
    expect(() => validateGenerated({ ...generated(), text: compose("知っていますか？", long, null), destinationUrl: null }, [long], [], "terms", url)).toThrow(/length/);
  });
  it("ignores links and tags for similarity and rejects a repeated factual block", () => {
    expect(similar(contentKeys("DNSは名前を変換する。 https://a.test #ITパスポート"), contentKeys("DNSは名前を変換する。 https://b.test #学習"))).toBe(true);
    expect(() => validateGenerated(generated(), [source], [generated().text], "terms", url)).toThrow(/duplicate/);
  });
});

const creds = { consumerKey: "key", consumerSecret: "secret", accessToken: "token", accessSecret: "secret2" };
describe("direct X transport", () => {
  it("signs user-context OAuth, never app-only bearer", () => {
    const h = signOAuth(creds, "nonce", 1);
    expect(h).toContain('oauth_token="token"');
    expect(h).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(h).not.toContain("secret2");
  });
  it("returns the created ID", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "123", username: "itpassportsup" } }), { status: 201 }));
    expect(await createXPost("test", creds, fetcher)).toEqual({ state: "published", id: "123" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 429, 400])("records HTTP %s without retry", async status => {
    const fetcher = vi.fn().mockResolvedValue(new Response("private details", { status }));
    expect(await createXPost("test", creds, fetcher)).toEqual({ state: "failed", error: `x_http_${status}` });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("treats timeout, 5xx and malformed success as uncertain", async () => {
    for (const fetcher of [vi.fn().mockRejectedValue(new Error("secret")), vi.fn().mockResolvedValue(new Response("oops", { status: 503 })), vi.fn().mockResolvedValue(new Response("{}", { status: 201 }))]) {
      expect((await createXPost("test", creds, fetcher)).state).toBe("uncertain");
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
});

it("grounds the CTA to the selected content's own path", () => {
  const second = { ...source, id: "other", path: "/guide" };
  const ownUrl = buildPostUrl("/guide", "x-123", "https://example.test");
  const g = { ...generated(), contentId: "other", destinationUrl: ownUrl, text: compose("知っていますか？", second, ownUrl) };
  expect(validateGenerated(g, [source, second], [], "terms", url).destinationUrl).toBe(ownUrl);
  expect(() => validateGenerated({ ...g, destinationUrl: url, text: compose("知っていますか？", second, url) }, [source, second], [], "terms", url)).toThrow();
});

it("aborts a hanging X request after the timeout without resending", async () => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  const timer = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => timeout(1));
  try {
    const fetcher = vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")))));
    const pending = createXPost("test", creds, fetcher as typeof fetch);
    expect(timer).toHaveBeenCalledWith(20000);
    expect(await pending).toEqual({ state: "uncertain", error: "x_transport_unknown" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally { timer.mockRestore(); }
});

 it("verifies the user-context identity before posting", async () => {
   const wrong = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "999", username: "wronguser" } })));
   await expect(verifyXIdentity("123", creds, wrong)).rejects.toThrow("x_identity_mismatch");
   const right = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "123", username: "itpassportsup" } })));
   await expect(verifyXIdentity("123", creds, right)).resolves.toBeUndefined();
 });

describe("X credential preflight", () => {
  it("returns only the authenticated public ID and username using GET", async () => {
    const fetcher: typeof fetch = async (url, init) => {
      expect(url).toBe("https://api.x.com/2/users/me");
      expect(init?.method ?? "GET").toBe("GET");
      expect(init?.body).toBeUndefined();
      expect(init?.redirect).toBe("error");
      return new Response(JSON.stringify({ data: { id: "868384833575067648", username: "itpassportsup", name: "Public display name" } }));
    };
    expect(await readXIdentity(creds, fetcher)).toEqual({ id: "868384833575067648", username: "itpassportsup" });
  });
  it.each([{ id: "", username: "itpassportsup" }, { id: "123", username: "invalid user" }, { id: 123, username: "itpassportsup" }, {}])("rejects malformed identity %j", async data => {
    await expect(readXIdentity(creds, async () => new Response(JSON.stringify({ data })))).rejects.toThrow("x_identity_invalid_response");
  });
  it("reports a safe HTTP status without exposing response details", async () => {
    await expect(readXIdentity(creds, async () => new Response("private details", { status: 401 }))).rejects.toThrow("x_identity_http_401");
  });
});
