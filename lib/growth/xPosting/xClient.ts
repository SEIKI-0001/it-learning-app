import { createHmac, randomBytes } from "node:crypto";
export type XCredentials = { consumerKey: string; consumerSecret: string; accessToken: string; accessSecret: string };
export type XResult = { state: "published"; id: string } | { state: "failed" | "uncertain"; error: string };
const ENDPOINT = "https://api.x.com/2/tweets";
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
/** RFC 5849 §3.4.1.3.2: sort by encoded name, then encoded value, in byte (not locale) order. */
const byteOrder = (a: [string, string], b: [string, string]) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
/**
 * OAuth 1.0a user-context header. Query parameters of `endpoint` (e.g. ids, tweet.fields on
 * GET /2/tweets) and form-encoded body parameters (`extraParams`) are part of the signature base;
 * a JSON body is not. Only oauth_* values go into the header.
 */
export function signOAuth(c: XCredentials, nonce = randomBytes(16).toString("hex"), timestamp = Math.floor(Date.now() / 1000), endpoint = ENDPOINT, method = "POST", extraParams: Record<string, string> = {}): string {
  const url = new URL(endpoint);
  const baseUrl = `${url.protocol}//${url.host.toLowerCase()}${url.pathname}`;
  const oauth: Record<string, string> = { oauth_consumer_key: c.consumerKey, oauth_nonce: nonce, oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(timestamp), oauth_token: c.accessToken, oauth_version: "1.0" };
  const all: [string, string][] = [...Object.entries(oauth), ...url.searchParams.entries(), ...Object.entries(extraParams)].map(([k, v]) => [encode(k), encode(v)]);
  const normalized = all.sort(byteOrder).map(([k, v]) => `${k}=${v}`).join("&");
  oauth.oauth_signature = createHmac("sha1", `${encode(c.consumerSecret)}&${encode(c.accessSecret)}`).update(`${method.toUpperCase()}&${encode(baseUrl)}&${encode(normalized)}`).digest("base64");
  return "OAuth " + Object.entries(oauth).map(([k, v]) => [encode(k), encode(v)] as [string, string]).sort(byteOrder).map(([k, v]) => `${k}="${v}"`).join(", ");
}
/** Read-only credential check; never creates a Post or accesses AI/DB. */
export async function readXIdentity(creds: XCredentials, fetcher: typeof fetch = fetch): Promise<{ id: string; username: string }> {
  const endpoint = "https://api.x.com/2/users/me";
  const res = await fetcher(endpoint, { method: "GET", headers: { Authorization: signOAuth(creds, undefined, undefined, endpoint, "GET") }, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!res.ok) throw new Error(`x_identity_http_${res.status}`);
  const body = await res.json();
  if (typeof body?.data?.id !== "string" || !/^\d{1,25}$/.test(body.data.id) || typeof body.data.username !== "string" || !/^[A-Za-z0-9_]{1,15}$/.test(body.data.username)) throw new Error("x_identity_invalid_response");
  return { id: body.data.id, username: body.data.username };
}
export async function verifyXIdentity(account: string, creds: XCredentials, fetcher: typeof fetch = fetch): Promise<void> {
  const identity = await readXIdentity(creds, fetcher);
  if (identity.id !== account) throw new Error("x_identity_mismatch");
}
/** One request only. Any ambiguous result must remain blocked for human reconciliation. */
export async function createXPost(text: string, creds: XCredentials, fetcher: typeof fetch = fetch): Promise<XResult> {
  try {
    const res = await fetcher(ENDPOINT, { method: "POST", redirect: "error", headers: { Authorization: signOAuth(creds), "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(20000) });
    if (res.status >= 400 && res.status < 500 && res.status !== 408) return { state: "failed", error: `x_http_${res.status}` };
    if (res.status !== 201) return { state: "uncertain", error: `x_http_${res.status}` };
    const body = await res.json();
    if (!body?.data || typeof body.data.id !== "string" || !/^\d{1,25}$/.test(body.data.id)) return { state: "uncertain", error: "x_invalid_response" };
    return { state: "published", id: body.data.id };
  } catch { return { state: "uncertain", error: "x_transport_unknown" }; }
}
