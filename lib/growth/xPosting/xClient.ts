import { createHmac, randomBytes } from "node:crypto";
export type XCredentials = { consumerKey: string; consumerSecret: string; accessToken: string; accessSecret: string };
export type XResult = { state: "published"; id: string } | { state: "failed" | "uncertain"; error: string };
const ENDPOINT = "https://api.x.com/2/tweets";
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export function signOAuth(c: XCredentials, nonce = randomBytes(16).toString("hex"), timestamp = Math.floor(Date.now() / 1000), endpoint = ENDPOINT, method = "POST"): string {
  const params: Record<string, string> = { oauth_consumer_key: c.consumerKey, oauth_nonce: nonce, oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(timestamp), oauth_token: c.accessToken, oauth_version: "1.0" };
  const normalized = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encode(k)}=${encode(v)}`).join("&");
  params.oauth_signature = createHmac("sha1", `${encode(c.consumerSecret)}&${encode(c.accessSecret)}`).update(`${method}&${encode(endpoint)}&${encode(normalized)}`).digest("base64");
  return "OAuth " + Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${encode(k)}="${encode(v)}"`).join(", ");
}
export async function verifyXIdentity(account: string, creds: XCredentials, fetcher: typeof fetch = fetch): Promise<void> {
  const endpoint = "https://api.x.com/2/users/me";
  const res = await fetcher(endpoint, { headers: { Authorization: signOAuth(creds, undefined, undefined, endpoint, "GET") }, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!res.ok) throw new Error("x_identity_failed");
  const body = await res.json();
  if (body?.data?.id !== account) throw new Error("x_identity_mismatch");
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
