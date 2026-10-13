import { createHash } from "node:crypto";
import twitterText from "twitter-text";

export const THEMES = ["service", "question", "terms", "trick", "study", "challenge", "knowhow"] as const;
export type Theme = (typeof THEMES)[number];
export type Source = { id: string; theme: Theme; text: string; evidence: string; path: string; rights: "app_original" | "ipa_attributed" };
export type Generated = { text: string; theme: Theme; contentId: string; destinationUrl: string | null; evidence: string[]; quality: { passed: boolean; reasons: string[] } };
export const HOOKS = ["知っていますか？", "今日の学習メモ。", "学習の合間に確認。", "一つずつ確かめよう。"];
export function themeForSlot(slot: string): Theme {
  const d = new Date(slot);
  if (!Number.isFinite(d.getTime())) throw new Error("invalid_slot");
  return THEMES[new Date(d.getTime() + 9 * 3600000).getUTCDay()];
}
export function parseTimes(times: string[]): string[] {
  if (!times.length || times.length > 4 || new Set(times).size !== times.length || times.some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) throw new Error("invalid_schedule");
  return [...times].sort();
}
/** For a scheduled event use its cron's UTC time, even if delivered after JST midnight. */
export function resolveSlot(now: Date, times: string[], eventSchedule?: string): string {
  parseTimes(times);
  let candidates: number[];
  if (eventSchedule) {
    const match = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(eventSchedule);
    if (!match || +match[1] > 59 || +match[2] > 23) throw new Error("invalid_cron");
    const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), +match[2], +match[1]);
    candidates = [t > now.getTime() ? t - 86400000 : t];
    const jstTime = new Date(candidates[0] + 9 * 3600000).toISOString().slice(11, 16);
    if (!times.includes(jstTime)) throw new Error("cron_config_mismatch");
  } else {
    const day = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
    candidates = times.map(t => Date.parse(`${day}T${t}:00+09:00`)).map(t => t > now.getTime() ? t - 86400000 : t);
  }
  return new Date(Math.max(...candidates)).toISOString();
}
export function buildPostUrl(path: string, id: string, origin: string): string {
  const base = new URL(origin);
  const url = new URL(path, base);
  if (base.protocol !== "https:" || base.username || base.password || !path.startsWith("/") || path.startsWith("//") || url.origin !== base.origin || !/^x-[a-z0-9-]{1,60}$/.test(id)) throw new Error("invalid_destination");
  for (const [key, value] of Object.entries({ utm_source: "x", utm_medium: "social", utm_campaign: "organic_x", utm_content: id, ref: id })) url.searchParams.set(key, value);
  return url.toString();
}
export function compose(hook: string, source: Source, url: string | null): string {
  return `${hook}\n${source.text}${url ? `\n${url}` : ""}\n#ITパスポート`;
}
export function contentKeys(text: string): string[] {
  const normalized = text.normalize("NFKC").toLowerCase().replace(/https?:\/\/\S+|#[^\s]+/gu, "").replace(/[^\p{L}\p{N}]/gu, "");
  const chars = Array.from(normalized);
  return [...new Set(chars.slice(0, -1).map((c, i) => c + chars[i + 1]))].sort();
}
export function similar(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  const other = new Set(b);
  return 2 * a.filter(k => other.has(k)).length / (a.length + b.length) >= 0.72;
}
export function textHash(text: string): string { return createHash("sha256").update(contentKeys(text).join("\n")).digest("hex"); }
export function validLength(text: string): boolean { return twitterText.parseTweet(text).valid; }
function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("invalid_schema");
  return raw as Record<string, unknown>;
}
export function validateGenerated(raw: unknown, sources: Source[], history: string[], theme: Theme, url: string): Generated {
  const r = object(raw), q = object(r.quality);
  if (typeof r.text !== "string" || r.text.length > 2000 || r.theme !== theme || typeof r.contentId !== "string" || (r.destinationUrl !== null && typeof r.destinationUrl !== "string") || !Array.isArray(r.evidence) || !r.evidence.every(x => typeof x === "string") || q.passed !== true || !Array.isArray(q.reasons) || !q.reasons.every(x => typeof x === "string" && x.length <= 200)) throw new Error("invalid_schema");
  const source = sources.find(s => s.id === r.contentId && s.theme === theme);
  const base = new URL(url);
  const expectedUrl = source ? buildPostUrl(source.path, base.searchParams.get("utm_content") ?? "", base.origin) : null;
  if (!source || (r.destinationUrl !== null && r.destinationUrl !== expectedUrl) || r.evidence.length !== 1 || r.evidence[0] !== source.evidence || !HOOKS.some(h => compose(h, source, r.destinationUrl as string | null) === r.text)) throw new Error("unsupported_content");
  if (!validLength(r.text)) throw new Error("invalid_length");
  if (history.some(text => similar(contentKeys(text), contentKeys(r.text as string)))) throw new Error("duplicate_content");
  return { text: r.text, theme, contentId: source.id, destinationUrl: r.destinationUrl as string | null, evidence: [source.evidence], quality: { passed: true, reasons: q.reasons as string[] } };
}
