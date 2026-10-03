import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/currentUser", () => ({
  getInternalUserId: async () => null,
  getInternalUserIdFast: async () => null,
}));

import { getRequestUserId, getRequestUserIdFast } from "@/lib/apiUser";

const BODY = { userId: "10000000-0000-0000-0000-000000000001" };

describe("body.userId fallback", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ALLOW_BODY_USER_ID を明示しない限り、非production でも本文の userId を信用しない", async () => {
    vi.stubEnv("ALLOW_BODY_USER_ID", "");

    await expect(getRequestUserId(BODY)).resolves.toBeNull();
    await expect(getRequestUserIdFast(BODY)).resolves.toBeNull();
  });

  it("ローカル開発で ALLOW_BODY_USER_ID=true のときだけ採用する", async () => {
    vi.stubEnv("ALLOW_BODY_USER_ID", "true");

    await expect(getRequestUserId(BODY)).resolves.toBe(BODY.userId);
  });

  it("production では ALLOW_BODY_USER_ID=true でも採用しない", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_BODY_USER_ID", "true");

    await expect(getRequestUserId(BODY)).resolves.toBeNull();
  });
});
