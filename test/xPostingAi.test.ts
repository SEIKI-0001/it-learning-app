import Anthropic from "@anthropic-ai/sdk";
import { afterEach, expect, it, vi } from "vitest";
import { generatePost } from "@/lib/growth/xPosting/generator";
import { checkPostingAi, safeAiError } from "@/lib/growth/xPosting/aiDiagnostics";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("checks the configured model and token counting without generating text", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("X_POST_AI_MODEL", "claude-sonnet-5-5");
  const paths: string[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    paths.push(path);
    if (path === "/v1/models/claude-sonnet-5-5") return Response.json({ id: "claude-sonnet-5-5", type: "model", display_name: "Claude Sonnet 5.5", created_at: "2026-09-21T00:00:00Z" });
    if (path === "/v1/messages/count_tokens") {
      expect(options?.method).toBe("POST");
      return Response.json({ input_tokens: 12 });
    }
    throw new Error("unexpected_generation_request");
  };
  expect(await checkPostingAi("claude-sonnet-5-5", fetcher)).toEqual({ state: "verified", model: "claude-sonnet-5-5", inputTokens: 12 });
  expect(paths).toEqual(["/v1/models/claude-sonnet-5-5", "/v1/messages/count_tokens"]);
});
it("stops on invalid credentials without retries or revealing response details", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  let calls = 0;
  await expect(checkPostingAi("claude-sonnet-5-5", async () => { calls++; return Response.json({ type: "error", error: { type: "authentication_error", message: "private-api-key" } }, { status: 401 }); })).rejects.toThrow("anthropic_http_401");
  expect(calls).toBe(1);
});
it("classifies low credit without returning the raw provider response", () => {
  const error = Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. private-details" } }, undefined, new Headers());
  expect(safeAiError(error)).toBe("anthropic_credit_balance_low");
  expect(safeAiError(new Error("private-api-key"))).toBe("anthropic_request_failed");
});

it("keeps the provider credit error safe at the real generation boundary", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  let calls = 0;
  vi.stubGlobal("fetch", async () => { calls++; return Response.json({ type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. private-details" } }, { status: 400 }); });
  await expect(generatePost([], [], "terms", "https://example.test/?utm_content=x-test", "2026-10-20T22:00:00Z")).rejects.toThrow("anthropic_credit_balance_low");
  expect(calls).toBe(1);
});
