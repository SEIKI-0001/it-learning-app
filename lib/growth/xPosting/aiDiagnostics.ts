import Anthropic from "@anthropic-ai/sdk";
/** Only fixed tags leave this boundary; never log SDK errors or provider messages. */
export function safeAiError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 400 && /credit balance.*too low/i.test(error.message)) return "anthropic_credit_balance_low";
    if (typeof error.status === "number" && error.status >= 400 && error.status <= 599) return `anthropic_http_${error.status}`;
  }
  return "anthropic_request_failed";
}
/** No text generation, DB access, X access, retries, or quota reservation. */
export async function checkPostingAi(model: string, fetcher: typeof fetch = fetch): Promise<{ state: "verified"; model: string; inputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("anthropic_not_configured");
  const client = new Anthropic({ apiKey, fetch: fetcher, maxRetries: 0, timeout: 15000 });
  try {
    const info = await client.models.retrieve(model);
    const count = await client.messages.countTokens({ model, messages: [{ role: "user", content: "ITパスポート" }] });
    if (typeof info.id !== "string" || !/^claude-[a-zA-Z0-9.-]+$/.test(info.id) || !Number.isInteger(count.input_tokens) || count.input_tokens < 1) throw new Error("invalid_provider_response");
    return { state: "verified", model: info.id, inputTokens: count.input_tokens };
  } catch (error) { throw new Error(safeAiError(error)); }
}
