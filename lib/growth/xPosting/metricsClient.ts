import { signOAuth, type XCredentials } from "@/lib/growth/xPosting/xClient";

/**
 * READ-ONLY X post metrics (GET /2/tweets). No POST/DELETE, no DB, no retries.
 * Field sources (checked 2026-11-22 on docs.x.com, see docs/x-growth-engine/PROGRESS.md):
 *  - public_metrics: impression_count, like_count, reply_count, quote_count, bookmark_count and
 *    retweet_count (the get-posts-by-ids schema calls it repost_count; both are accepted).
 *  - non_public_metrics / organic_metrics: user context only, owned posts only, posts created
 *    within the last 30 days. Requested only when `ownedMetrics` is true.
 * Missing or malformed values stay null: an unknown metric is never reported as 0.
 */
export const METRICS_ENDPOINT = "https://api.x.com/2/tweets";
export const MAX_IDS_PER_REQUEST = 100;
/** Official pay-per-use "Posts: Read" price per resource; an estimate, not a billing record. */
export const ESTIMATED_USD_PER_POST_READ = 0.005;

export type CollectionStatus = "ok" | "unavailable" | "permission_error" | "rate_limited" | "failed";
export type PostMetrics = {
  xPostId: string;
  collectionStatus: CollectionStatus;
  errorCode: string | null;
  measuredAt: string;
  createdAt: string | null;
  ageHours: number | null;
  impressions: number | null;
  likes: number | null;
  reposts: number | null;
  replies: number | null;
  quotes: number | null;
  bookmarks: number | null;
  /** Owned-only extras (organic_metrics + non_public_metrics), validated numbers only. */
  organic: Record<string, number> | null;
  metricSource: "x_api_v2_get_tweets";
};
export type MetricsRequest = { ids: string[]; ownedMetrics?: boolean };
export type MetricsResult = { requestStatus: CollectionStatus; errorCode: string | null; rateLimitResetAt: string | null; posts: PostMetrics[] };
export type MetricsOptions = { fetcher?: typeof fetch; now?: () => Date; nonce?: string; timeoutMs?: number };

export function validateIds(ids: string[]): string[] {
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > MAX_IDS_PER_REQUEST || unique.some(id => typeof id !== "string" || !/^\d{1,19}$/.test(id))) throw new Error("x_metrics_invalid_ids");
  return unique;
}

export function buildMetricsUrl(ids: string[], ownedMetrics = false): string {
  const url = new URL(METRICS_ENDPOINT);
  url.searchParams.set("ids", validateIds(ids).join(","));
  url.searchParams.set("tweet.fields", ["created_at", "public_metrics", ...(ownedMetrics ? ["non_public_metrics", "organic_metrics"] : [])].join(","));
  return url.toString();
}

const count = (v: unknown): number | null => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
const record = (v: unknown): Record<string, unknown> | null => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;

function emptyMetrics(xPostId: string, measuredAt: string, collectionStatus: CollectionStatus, errorCode: string | null): PostMetrics {
  return { xPostId, collectionStatus, errorCode, measuredAt, createdAt: null, ageHours: null, impressions: null, likes: null, reposts: null, replies: null, quotes: null, bookmarks: null, organic: null, metricSource: "x_api_v2_get_tweets" };
}

/** Problem type URI → fixed tag. Provider messages are never copied. */
function classifyProblem(problem: Record<string, unknown>): { status: CollectionStatus; code: string } {
  const type = typeof problem.type === "string" ? problem.type : "";
  if (/not-authorized-for-resource/.test(type)) return { status: "permission_error", code: "x_metrics_not_authorized" };
  if (/resource-not-found/.test(type)) return { status: "unavailable", code: "x_metrics_not_found" };
  if (/resource-unavailable/.test(type)) return { status: "unavailable", code: "x_metrics_resource_unavailable" };
  return { status: "unavailable", code: "x_metrics_partial_error" };
}

/** Pure parser for a GET /2/tweets 200 body; usable on offline fixtures. */
export function parseMetricsResponse(body: unknown, ids: string[], measuredAt: Date): PostMetrics[] {
  const requested = validateIds(ids);
  const at = measuredAt.toISOString();
  const root = record(body);
  if (!root) return requested.map(id => emptyMetrics(id, at, "failed", "x_metrics_invalid_response"));
  const byId = new Map<string, PostMetrics>();
  for (const raw of Array.isArray(root.data) ? root.data : []) {
    const post = record(raw);
    const id = typeof post?.id === "string" ? post.id : null;
    if (!post || !id || !requested.includes(id) || byId.has(id)) continue;
    const pub = record(post.public_metrics) ?? {};
    const created = typeof post.created_at === "string" && Number.isFinite(Date.parse(post.created_at)) ? new Date(post.created_at).toISOString() : null;
    const organic: Record<string, number> = {};
    for (const [prefix, group] of [["organic", post.organic_metrics], ["non_public", post.non_public_metrics]] as const) {
      for (const [key, value] of Object.entries(record(group) ?? {})) { const n = count(value); if (n !== null && /^[a-z0-9_]{1,40}$/.test(key)) organic[`${prefix}.${key}`] = n; }
    }
    const metrics: PostMetrics = {
      ...emptyMetrics(id, at, "ok", null),
      createdAt: created,
      ageHours: created ? Math.round((measuredAt.getTime() - Date.parse(created)) / 36e3) / 100 : null,
      impressions: count(pub.impression_count),
      likes: count(pub.like_count),
      reposts: count(pub.retweet_count) ?? count(pub.repost_count),
      replies: count(pub.reply_count),
      quotes: count(pub.quote_count),
      bookmarks: count(pub.bookmark_count),
      organic: Object.keys(organic).length ? organic : null,
    };
    // A returned post without a readable impression count is not "0 impressions".
    if (metrics.impressions === null) { metrics.collectionStatus = "unavailable"; metrics.errorCode = "x_metrics_impressions_missing"; }
    byId.set(id, metrics);
  }
  const problems = new Map<string, { status: CollectionStatus; code: string }>();
  for (const raw of Array.isArray(root.errors) ? root.errors : []) {
    const problem = record(raw);
    const id = typeof problem?.resource_id === "string" ? problem.resource_id : typeof problem?.value === "string" ? problem.value : null;
    if (problem && id && requested.includes(id) && !problems.has(id)) problems.set(id, classifyProblem(problem));
  }
  return requested.map(id => byId.get(id) ?? (problems.has(id) ? emptyMetrics(id, at, problems.get(id)!.status, problems.get(id)!.code) : emptyMetrics(id, at, "unavailable", "x_metrics_missing")));
}

/** One GET request, user-context OAuth 1.0a with the query string signed. Never throws for HTTP/transport errors. */
export async function fetchPostMetrics(request: MetricsRequest, creds: XCredentials, options: MetricsOptions = {}): Promise<MetricsResult> {
  const ids = validateIds(request.ids);
  const now = options.now ?? (() => new Date());
  const fetcher = options.fetcher ?? fetch;
  const url = buildMetricsUrl(ids, request.ownedMetrics === true);
  const whole = (requestStatus: CollectionStatus, errorCode: string, rateLimitResetAt: string | null = null): MetricsResult => {
    const at = now().toISOString();
    return { requestStatus, errorCode, rateLimitResetAt, posts: ids.map(id => emptyMetrics(id, at, requestStatus, errorCode)) };
  };
  let res: Response;
  try {
    res = await fetcher(url, { method: "GET", redirect: "error", headers: { Authorization: signOAuth(creds, options.nonce, undefined, url, "GET") }, signal: AbortSignal.timeout(options.timeoutMs ?? 15000) });
  } catch { return whole("failed", "x_metrics_transport_failed"); }
  if (res.status === 401 || res.status === 403) { await res.body?.cancel(); return whole("permission_error", `x_metrics_http_${res.status}`); }
  if (res.status === 429) {
    const reset = Number(res.headers.get("x-rate-limit-reset"));
    await res.body?.cancel();
    return whole("rate_limited", "x_metrics_http_429", Number.isSafeInteger(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : null);
  }
  if (res.status !== 200) { await res.body?.cancel(); return whole("failed", `x_metrics_http_${res.status >= 100 && res.status <= 599 ? res.status : "unknown"}`); }
  let body: unknown;
  try { body = await res.json(); } catch { return whole("failed", "x_metrics_invalid_response"); }
  const posts = parseMetricsResponse(body, ids, now());
  return { requestStatus: "ok", errorCode: null, rateLimitResetAt: null, posts };
}

export function estimateReadCostUsd(idCount: number): number { return Number((idCount * ESTIMATED_USD_PER_POST_READ).toFixed(3)); }
