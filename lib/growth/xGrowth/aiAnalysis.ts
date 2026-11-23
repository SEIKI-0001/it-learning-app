import type { WeeklyReport } from "@/lib/growth/xGrowth/weeklyReport";

/**
 * Optional AI interpretation of an already-computed weekly report. The AI writes prose only:
 * every number in its text must already appear in the computed report, and it may not claim a
 * winner/significance unless the rules classified a validated lead. Otherwise the text is dropped.
 */
export type Complete = (system: string, user: string) => Promise<string>;
export type AiResult = { text: string | null; rejected: string | null };

const BANNED_UNLESS_VALIDATED = /(勝者|勝ち|確定|有意|証明|間違いなく|必ず)/u;

export function allowedNumbers(report: unknown): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) { out.add(String(v)); out.add(String(Math.round(v))); if (Math.abs(v) <= 1) out.add(String(Math.round(v * 1000) / 10)); }
    else if (typeof v === "string") for (const m of v.match(/\d+(?:\.\d+)?/g) ?? []) out.add(m);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(report);
  for (let i = 0; i <= 10; i++) out.add(String(i)); // list numbering, "3つ" etc.
  return out;
}

export function guardAiText(text: string, report: WeeklyReport): AiResult {
  const t = text.trim();
  if (!t || t.length > 2000) return { text: null, rejected: "ai_text_empty_or_too_long" };
  const allowed = allowedNumbers(report.data);
  const unknown = (t.match(/\d+(?:\.\d+)?/g) ?? []).filter(n => !allowed.has(n) && !allowed.has(String(Number(n))));
  if (unknown.length) return { text: null, rejected: "ai_text_has_unverified_numbers" };
  const validated = report.data.experiments.some(e => e.status === "validated_lead");
  if (!validated && BANNED_UNLESS_VALIDATED.test(t)) return { text: null, rejected: "ai_text_overclaims" };
  return { text: t, rejected: null };
}

export async function interpret(report: WeeklyReport, complete: Complete): Promise<AiResult> {
  const system = "あなたはSNS運用データの分析補助です。与えられたJSONの計算結果だけを根拠に、日本語で300字以内の解釈を書きます。新しい数値を作らない。JSONにない数値を書かない。結果が探索的・判定保留なら、そのとおり慎重に書く。勝者・有意・確定などの断定はしない。推測は「〜の可能性」と明記する。";
  try {
    const text = await complete(system, JSON.stringify({ experiments: report.data.experiments.map(e => ({ status: e.status, action: e.action, reasons: e.reasons, effect: e.effect, arms: e.arms.map(a => ({ variantId: a.variantId, contentStyle: a.contentStyle, valid: a.valid, median: a.impressions72h.median, missingRate: a.missingRate })) })), reliability: report.data.reliability, hypotheses: report.data.hypotheses.map(h => h.statement) }));
    return guardAiText(text, report);
  } catch { return { text: null, rejected: "ai_request_failed" }; }
}

/** Anthropic-backed completion. Only constructed when X_GROWTH_AI_ANALYSIS=true. */
export async function anthropicComplete(model: string, apiKey: string | undefined): Promise<Complete> {
  if (!apiKey?.trim()) throw new Error("anthropic_not_configured");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 45000 });
  return async (system, user) => {
    const r = await client.messages.create({ model, max_tokens: 700, system, messages: [{ role: "user", content: user }] });
    return r.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("").trim();
  };
}
