import { describe, expect, it } from "vitest";
import { shouldRetryWebhookEvent } from "@/lib/billing/webhookState";

describe("Stripe webhook retry policy", () => {
  const now = new Date("2026-07-10T00:10:00.000Z");

  it("retries failed events but never retries succeeded events", () => {
    expect(shouldRetryWebhookEvent("failed", now.toISOString(), now)).toBe(true);
    expect(shouldRetryWebhookEvent("succeeded", now.toISOString(), now)).toBe(false);
  });

  it("only retries processing events once their processing lease is stale", () => {
    expect(shouldRetryWebhookEvent("processing", "2026-07-10T00:08:00.000Z", now)).toBe(false);
    expect(shouldRetryWebhookEvent("processing", "2026-07-10T00:04:59.000Z", now)).toBe(true);
  });
});
