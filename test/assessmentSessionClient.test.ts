import { afterEach, describe, expect, it, vi } from "vitest";
import {
  abandonAssessmentSessionForCurrentSession,
  assessmentAnswerIdempotencyKey,
  completeAssessmentSessionForCurrentSession,
  startAssessmentSessionForCurrentSession,
} from "@/lib/userSession";

const SESSION_ID = "20000000-0000-4000-8000-000000000001";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assessment session client", () => {
  it("posts start without a caller-controlled user identity", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
    }));
    vi.stubGlobal("fetch", fetch);

    await expect(startAssessmentSessionForCurrentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt: "2026-08-23T01:00:00.000Z",
      questionCount: 100,
    })).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith("/api/assessment-sessions", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual(expect.objectContaining({ action: "start", sessionId: SESSION_ID }));
    expect(body).not.toHaveProperty("userId");
  });

  it("posts complete and abandon, returning false instead of interrupting delivery on failure", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetch);

    await expect(completeAssessmentSessionForCurrentSession({
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
      answers: [],
    })).resolves.toBe(true);
    await expect(abandonAssessmentSessionForCurrentSession({
      action: "abandon",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
    })).resolves.toBe(false);
  });

  it("builds a stable per-session, per-question answer key", () => {
    expect(assessmentAnswerIdempotencyKey(SESSION_ID, "question-1"))
      .toBe(`assessment:${SESSION_ID}:question-1`);
  });
});
