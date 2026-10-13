import { describe, expect, it } from "vitest";
import { monthlyUsage } from "@/lib/growth/xPosting/usage";
describe("bounded monthly API estimates", () => {
  it("counts AI reservations in creation month and X requests in their actual JST month", () => {
    const usage = monthlyUsage([
      { created_at: "2026-10-31T01:00:00Z", publish_attempt_at: "2026-10-31T16:00:00Z", destination_url: "https://example.test" },
      { created_at: "2026-10-01T01:00:00Z", publish_attempt_at: "2026-10-01T01:00:00Z", destination_url: null },
      { created_at: "2026-10-02T01:00:00Z", publish_attempt_at: null, destination_url: null },
    ]);
    expect(usage).toEqual({ "2026-10": { reservedAiCalls: 3, maxOutputTokens: 3600, xRequests: 1, xEstimatedUsd: 0.015 }, "2026-11": { reservedAiCalls: 0, maxOutputTokens: 0, xRequests: 1, xEstimatedUsd: 0.2 } });
  });
});
