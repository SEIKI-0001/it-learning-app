import { describe, expect, it } from "vitest";

describe("Exam Readiness repository import boundary", () => {
  it("rejects importing the service-role repository outside a React server environment", async () => {
    await expect(import("@/lib/examReadiness/repository"))
      .rejects.toThrow(/Client Component.*Server Component/i);
  });
});
