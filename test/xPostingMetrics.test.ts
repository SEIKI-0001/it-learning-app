import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { signOAuth } from "@/lib/growth/xPosting/xClient";
import { buildMetricsUrl, estimateReadCostUsd, fetchPostMetrics, parseMetricsResponse, validateIds } from "@/lib/growth/xPosting/metricsClient";

const creds = { consumerKey: "ck", consumerSecret: "cs", accessToken: "at", accessSecret: "as" };
const fixture = JSON.parse(readFileSync("test/fixtures/xMetrics/get-tweets-mixed.json", "utf8"));
const ids: string[] = fixture.requestedIds;
const at = new Date("2026-11-22T22:00:00Z");
const ok = (body: unknown, init: ResponseInit = { status: 200 }) => vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), init));
const header = (h: string) => Object.fromEntries([...h.slice(6).matchAll(/([^=, ]+)="([^"]*)"/g)].map(m => [m[1], decodeURIComponent(m[2])]));

describe("OAuth 1.0a signing", () => {
  it("matches X's published signature example (query + form parameters are signed)", () => {
    // https://docs.x.com/resources/fundamentals/authentication/oauth-1-0a/creating-a-signature
    const h = signOAuth(
      { consumerKey: "xvz1evFS4wEEPTGEFPHBog", consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw", accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb", accessSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE" },
      "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", 1318622958, "https://api.twitter.com/1.1/statuses/update.json?include_entities=true", "POST",
      { status: "Hello Ladies + Gentlemen, a signed OAuth request!" },
    );
    expect(header(h).oauth_signature).toBe("hCtSmYh+iHYCEqBWrE7C7hYmtUk=");
  });
  it("signs GET query parameters and keeps them out of the header", () => {
    const url = buildMetricsUrl(["1", "2"]);
    const a = header(signOAuth(creds, "n", 1, url, "GET"));
    const b = header(signOAuth(creds, "n", 1, buildMetricsUrl(["1", "3"]), "GET"));
    const bare = header(signOAuth(creds, "n", 1, "https://api.x.com/2/tweets", "GET"));
    expect(a.oauth_signature).not.toBe(b.oauth_signature);
    expect(a.oauth_signature).not.toBe(bare.oauth_signature);
    expect(Object.keys(a).every(k => k.startsWith("oauth_"))).toBe(true);
    const params = "ids=1%2C2&oauth_consumer_key=ck&oauth_nonce=n&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1&oauth_token=at&oauth_version=1.0&tweet.fields=author_id%2Ccreated_at%2Cpublic_metrics";
    const expected = createHmac("sha1", "cs&as").update(`GET&${encodeURIComponent("https://api.x.com/2/tweets")}&${encodeURIComponent(params)}`).digest("base64");
    expect(a.oauth_signature).toBe(expected);
  });
  it("sorts parameters in byte order, not locale order", () => {
    // localeCompare puts "a" before "Z"; RFC 5849 requires "Z" (0x5A) before "a" (0x61).
    const h = header(signOAuth(creds, "n", 1, "https://api.x.com/2/x?a=1&Z=2", "GET"));
    const params = "Z=2&a=1&oauth_consumer_key=ck&oauth_nonce=n&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1&oauth_token=at&oauth_version=1.0";
    expect(h.oauth_signature).toBe(createHmac("sha1", "cs&as").update(`GET&${encodeURIComponent("https://api.x.com/2/x")}&${encodeURIComponent(params)}`).digest("base64"));
  });
});

describe("metrics parsing (offline fixture)", () => {
  const posts = parseMetricsResponse(fixture.response, ids, at);
  const by = (id: string) => posts.find(p => p.xPostId === id)!;
  it("reads public and owned metrics and the measured age", () => {
    expect(by(ids[0])).toMatchObject({ collectionStatus: "ok", impressions: 312, likes: 4, reposts: 1, replies: 0, quotes: 0, bookmarks: 2, ageHours: 72, measuredAt: at.toISOString(), metricSource: "x_api_v2_get_tweets" });
    expect(by(ids[0]).organic).toMatchObject({ "organic.impression_count": 312, "non_public.user_profile_clicks": 3 });
  });
  it("keeps a real zero as 0 and accepts repost_count", () => {
    expect(by(ids[1])).toMatchObject({ collectionStatus: "ok", impressions: 0, reposts: 0, organic: null });
  });
  it("never turns missing or malformed values into 0", () => {
    expect(by(ids[2])).toMatchObject({ collectionStatus: "unavailable", errorCode: "x_metrics_impressions_missing", impressions: null, likes: null, bookmarks: null, reposts: 2 });
  });
  it("classifies per-post problems without copying provider text", () => {
    expect(by(ids[3])).toMatchObject({ collectionStatus: "unavailable", errorCode: "x_metrics_not_found", impressions: null });
    expect(by(ids[4])).toMatchObject({ collectionStatus: "permission_error", errorCode: "x_metrics_not_authorized" });
    expect(JSON.stringify(posts)).not.toContain("synthetic");
  });
  it("marks ids absent from both data and errors as missing; ignores unrequested ids", () => {
    const r = parseMetricsResponse({ data: [{ id: "999", public_metrics: { impression_count: 5 } }] }, ["1"], at);
    expect(r).toEqual([expect.objectContaining({ xPostId: "1", collectionStatus: "unavailable", errorCode: "x_metrics_missing", impressions: null })]);
    expect(parseMetricsResponse("garbage", ["1"], at)[0]).toMatchObject({ collectionStatus: "failed", errorCode: "x_metrics_invalid_response" });
  });
  it("refuses to measure a post by another author when the expected author is given", () => {
    const body = { data: [{ id: "1", author_id: "999", public_metrics: { impression_count: 5 } }, { id: "2", author_id: "123", public_metrics: { impression_count: 7 } }] };
    const r = parseMetricsResponse(body, ["1", "2"], at, "123");
    expect(r[0]).toMatchObject({ collectionStatus: "permission_error", errorCode: "x_metrics_not_own_post", impressions: null });
    expect(r[1]).toMatchObject({ collectionStatus: "ok", impressions: 7 });
  });
  it("validates ids: 1..100 numeric, deduplicated", () => {
    expect(validateIds(["1", "1", "2"])).toEqual(["1", "2"]);
    for (const bad of [[], ["abc"], ["1".repeat(20)], Array.from({ length: 101 }, (_, i) => String(i + 1))]) expect(() => validateIds(bad)).toThrow("x_metrics_invalid_ids");
    expect(estimateReadCostUsd(100)).toBe(0.5);
  });
});

describe("read-only metrics transport", () => {
  it("issues exactly one signed GET with no body", async () => {
    const fetcher = ok(fixture.response);
    const result = await fetchPostMetrics({ ids }, creds, { fetcher, now: () => at });
    expect(result.requestStatus).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    const u = new URL(String(url));
    expect(u.origin + u.pathname).toBe("https://api.x.com/2/tweets");
    expect(u.searchParams.get("ids")).toBe(ids.join(","));
    expect(u.searchParams.get("tweet.fields")).toBe("author_id,created_at,public_metrics");
    expect(init?.method).toBe("GET"); expect(init?.body).toBeUndefined(); expect(init?.redirect).toBe("error");
    expect(String((init?.headers as Record<string, string>).Authorization)).toMatch(/^OAuth .*oauth_signature="/);
  });
  it("requests owned-only metric groups only when asked", async () => {
    const fetcher = ok({ data: [] });
    await fetchPostMetrics({ ids: ["1"], ownedMetrics: true }, creds, { fetcher });
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get("tweet.fields")).toBe("author_id,created_at,public_metrics,non_public_metrics,organic_metrics");
  });
  it.each([[401, "permission_error"], [403, "permission_error"], [500, "failed"], [503, "failed"]] as const)("HTTP %s → %s for every id, no retry, no provider text", async (status, expected) => {
    const fetcher = ok({ detail: "secret provider message" }, { status });
    const r = await fetchPostMetrics({ ids: ["1", "2"] }, creds, { fetcher });
    expect(r.requestStatus).toBe(expected); expect(r.errorCode).toBe(`x_metrics_http_${status}`);
    expect(r.posts.every(p => p.collectionStatus === expected && p.impressions === null)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(r)).not.toContain("secret");
  });
  it("records rate limiting with the reset time", async () => {
    const fetcher = ok({}, { status: 429, headers: { "x-rate-limit-reset": "1795000000" } });
    const r = await fetchPostMetrics({ ids: ["1"] }, creds, { fetcher });
    expect(r).toMatchObject({ requestStatus: "rate_limited", errorCode: "x_metrics_http_429", rateLimitResetAt: new Date(1795000000 * 1000).toISOString() });
  });
  it("transport failure and malformed JSON become failed, never throw", async () => {
    const thrown = await fetchPostMetrics({ ids: ["1"] }, creds, { fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error("token=secret")) });
    expect(thrown).toMatchObject({ requestStatus: "failed", errorCode: "x_metrics_transport_failed" });
    const bad = await fetchPostMetrics({ ids: ["1"] }, creds, { fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response("not json", { status: 200 })) });
    expect(bad).toMatchObject({ requestStatus: "failed", errorCode: "x_metrics_invalid_response" });
  });
  it("rejects invalid ids before any network request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(fetchPostMetrics({ ids: ["1;DROP"] }, creds, { fetcher })).rejects.toThrow("x_metrics_invalid_ids");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
