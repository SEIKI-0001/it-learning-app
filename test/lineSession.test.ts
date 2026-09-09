import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LINE_SESSION_MAX_AGE,
  signLineSession,
  verifyLineSessionDetails,
} from "@/lib/auth/lineSession";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("signed LINE session", () => {
  it("accepts an untampered token and rejects a changed signature", () => {
    vi.stubEnv("SESSION_SECRET", "pilot-session-secret-with-sufficient-entropy");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T00:00:00Z"));
    const token = signLineSession("pilot-user");
    expect(token).not.toBeNull();
    expect(verifyLineSessionDetails(token)?.userId).toBe("pilot-user");
    expect(verifyLineSessionDetails(`${token}x`)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.stubEnv("SESSION_SECRET", "pilot-session-secret-with-sufficient-entropy");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T00:00:00Z"));
    const token = signLineSession("pilot-user");
    vi.setSystemTime(new Date(Date.now() + (LINE_SESSION_MAX_AGE + 1) * 1000));
    expect(verifyLineSessionDetails(token)).toBeNull();
  });
});
