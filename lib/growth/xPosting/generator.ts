import Anthropic from "@anthropic-ai/sdk";
import { safeAiError } from "@/lib/growth/xPosting/aiDiagnostics";
import { getClaudeModel } from "@/lib/ai/gradingCore";
import { approvedCandidates, buildPostUrl, type Source, type Theme } from "@/lib/growth/xPosting/core";
export function postingModel(): string { return process.env.X_POST_AI_MODEL?.trim() || getClaudeModel(); }
export async function generatePost(sources: Source[], history: string[], theme: Theme, url: string, slot: string): Promise<unknown> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("anthropic_not_configured");
  const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 45000 });
  const base = new URL(url);
  const sourceUrl = (s: Source) => buildPostUrl(s.path, base.searchParams.get("utm_content") ?? "", base.origin);
  const response = await client.messages.create({
    model: postingModel(), max_tokens: 1200,
    system: "ITパスポート受験予定者に役立つ日本語のX投稿を作成します。架空の実績、合格率、未確認の最新情報、個人情報、煽りは禁止。approvedPostsから未使用の本文を一つ選び、そのままtextに使用してください。根拠はevidenceをそのまま一つ。本文の事実や問題の正答・解説を改変しないでください。JSONのみ出力: {text,theme,contentId,destinationUrl,evidence:[string],quality:{passed:boolean,reasons:[string]}}。根拠不足ならquality.passed=false。サービスの価値は学習教材・公式過去問・無料教材体験です。リンクなしを優先しても構いません。",
    messages: [{ role: "user", content: JSON.stringify({ theme, scheduledAt: slot, history: history.slice(0, 40), approvedPosts: approvedCandidates(sources, history, sourceUrl) }) }],
  }).catch(error => { throw new Error(safeAiError(error)); });
  if (response.stop_reason !== "end_turn") throw new Error("incomplete_ai_output");
  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  return parseAiJson(text);
}
/** Accepts one JSON object, optionally inside a single code fence. Content is still fully validated later. */
export function parseAiJson(text: string): unknown {
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(text.trim());
  try { return JSON.parse(fenced ? fenced[1] : text); } catch { throw new Error("ai_output_not_json"); }
}
