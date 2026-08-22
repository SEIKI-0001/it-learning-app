import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssessmentSessionClientError,
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
  it("returns a validated in-progress lifecycle without sending caller identity", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      session: { sessionId: SESSION_ID, status: "in_progress" },
    }), {
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
    })).resolves.toEqual({ sessionId: SESSION_ID, status: "in_progress" });

    expect(fetch).toHaveBeenCalledWith("/api/assessment-sessions", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual(expect.objectContaining({ action: "start", sessionId: SESSION_ID }));
    expect(body).not.toHaveProperty("userId");
  });

  it("validates completed and abandoned terminal lifecycle responses", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        session: { sessionId: SESSION_ID, status: "completed" },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        session: { sessionId: SESSION_ID, status: "abandoned" },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(completeAssessmentSessionForCurrentSession({
      action: "complete",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
      answers: [],
    })).resolves.toEqual({ sessionId: SESSION_ID, status: "completed" });
    await expect(abandonAssessmentSessionForCurrentSession({
      action: "abandon",
      sessionId: SESSION_ID,
      completedAt: "2026-08-23T02:00:00.000Z",
    })).resolves.toEqual({ sessionId: SESSION_ID, status: "abandoned" });
  });

  it.each([
    ["HTTP failure", () => new Response(JSON.stringify({ ok: false }), { status: 409 }), "http"],
    ["malformed JSON", () => new Response("not-json", { status: 200 }), "malformed_response"],
    ["missing lifecycle", () => new Response(JSON.stringify({ ok: true }), { status: 200 }), "malformed_response"],
    ["wrong session", () => new Response(JSON.stringify({
      ok: true,
      session: { sessionId: "20000000-0000-4000-8000-000000000099", status: "in_progress" },
    }), { status: 200 }), "malformed_response"],
    ["terminal start", () => new Response(JSON.stringify({
      ok: true,
      session: { sessionId: SESSION_ID, status: "completed" },
    }), { status: 200 }), "unexpected_status"],
  ])("rejects %s instead of treating it as persisted", async (_name, response, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));

    await expect(startAssessmentSessionForCurrentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt: "2026-08-23T01:00:00.000Z",
      questionCount: 100,
    })).rejects.toMatchObject({ code });
  });

  it("throws a typed network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const promise = startAssessmentSessionForCurrentSession({
      action: "start",
      sessionId: SESSION_ID,
      source: "mock",
      mode: "exam",
      startedAt: "2026-08-23T01:00:00.000Z",
      questionCount: 100,
    });
    await expect(promise).rejects.toBeInstanceOf(AssessmentSessionClientError);
    await expect(promise).rejects.toMatchObject({ code: "network" });
  });

  it("builds a stable per-session, per-question answer key", () => {
    expect(assessmentAnswerIdempotencyKey(SESSION_ID, "question-1"))
      .toBe(`assessment:${SESSION_ID}:question-1`);
  });
});
