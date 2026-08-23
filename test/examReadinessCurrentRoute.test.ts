import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateExamReadinessDraft,
  finalizeExamReadinessResult,
} from "@/lib/examReadiness/calculator";
import { makeEvidence } from "@/test/fixtures/examReadiness/v1-cases";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getInternalUserId: vi.fn(),
  getRequestUserId: vi.fn(),
  getRequestUserIdFast: vi.fn(),
  getServiceSupabase: vi.fn(),
  getCurrentReadiness: vi.fn(),
  loadAppStateForUser: vi.fn(),
  getLatestOrRefreshIntegratedStatus: vi.fn(),
  getLatestPlanAdjustmentProposal: vi.fn(),
  generatePlanAdjustmentForUser: vi.fn(),
  refreshIntegratedStatusForUser: vi.fn(),
}));

const TemporaryReadinessError = vi.hoisted(() => class extends Error {
  readonly code: string;
  readonly retryable = true;

  constructor(code: string) {
    super(code);
    this.name = "ExamReadinessServiceError";
    this.code = code;
  }
});

vi.mock("@/lib/auth/currentUser", () => ({
  getInternalUserId: mocks.getInternalUserId,
}));
vi.mock("@/lib/apiUser", () => ({
  getRequestUserId: mocks.getRequestUserId,
  getRequestUserIdFast: mocks.getRequestUserIdFast,
}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock("@/lib/examReadiness/service", () => ({
  ExamReadinessServiceError: TemporaryReadinessError,
  getCurrentReadiness: mocks.getCurrentReadiness,
}));
vi.mock("@/lib/serverAppState", () => ({
  loadAppStateForUser: mocks.loadAppStateForUser,
}));
vi.mock("@/lib/progressBootstrap", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/progressBootstrap")>(),
  getLatestOrRefreshIntegratedStatus: mocks.getLatestOrRefreshIntegratedStatus,
  getLatestPlanAdjustmentProposal: mocks.getLatestPlanAdjustmentProposal,
  generatePlanAdjustmentForUser: mocks.generatePlanAdjustmentForUser,
  refreshIntegratedStatusForUser: mocks.refreshIntegratedStatusForUser,
}));

import { GET } from "@/app/api/exam-readiness/current/route";
import { POST as progressBootstrap } from "@/app/api/progress/bootstrap/route";
import { POST as refreshIntegratedStatusRoute } from "@/app/api/integrated-status/refresh/route";
import {
  fetchCurrentExamReadiness,
  fetchProgressBootstrap,
  refreshIntegratedStatus,
} from "@/lib/userSession";

const USER_ID = "10000000-0000-0000-0000-000000000001";
const SUPABASE = { rpc: vi.fn() };
const READINESS = finalizeExamReadinessResult(
  calculateExamReadinessDraft({
    evidence: makeEvidence(),
    calculationReferenceTime: new Date("2026-08-22T00:00:00.000Z"),
  }),
  new Date("2026-08-22T00:00:01.000Z"),
);

describe("GET /api/exam-readiness/current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInternalUserId.mockResolvedValue(USER_ID);
    mocks.getServiceSupabase.mockReturnValue(SUPABASE);
    mocks.getCurrentReadiness.mockResolvedValue(READINESS);
  });

  it("derives identity from the session and returns the complete result without caching", async () => {
    const response = await GET();

    expect(mocks.getInternalUserId).toHaveBeenCalledOnce();
    expect(mocks.getCurrentReadiness).toHaveBeenCalledWith({
      supabase: SUPABASE,
      userId: USER_ID,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true, readiness: READINESS });
  });

  it("returns 401 when the request has no authenticated session", async () => {
    mocks.getInternalUserId.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
  });

  it("returns 503 when the service-role database client is unavailable", async () => {
    mocks.getServiceSupabase.mockReturnValue(null);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(mocks.getCurrentReadiness).not.toHaveBeenCalled();
  });

  it("returns a successful null readiness when no current result exists", async () => {
    mocks.getCurrentReadiness.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, readiness: null });
  });

  it("maps typed retryable instability to 503", async () => {
    mocks.getCurrentReadiness.mockRejectedValue(
      new TemporaryReadinessError("recalculation_unstable"),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "readiness_temporarily_unavailable",
    });
  });

  it("returns a generic server error without exposing details", async () => {
    mocks.getCurrentReadiness.mockRejectedValue(new Error("database secret"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: "readiness_unavailable",
    });
    expect(JSON.stringify(body)).not.toContain("database secret");
    error.mockRestore();
  });

  it("returns no-store JSON 500 when session authentication rejects", async () => {
    mocks.getInternalUserId.mockRejectedValue(new Error("auth unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "readiness_unavailable",
    });
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("returns no-store JSON 500 when service client initialization rejects", async () => {
    mocks.getServiceSupabase.mockImplementation(() => {
      throw new Error("client initialization failed");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "readiness_unavailable",
    });
    expect(mocks.getCurrentReadiness).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("readiness bootstrap clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the complete current result with GET and does not send a caller identity", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      readiness: READINESS,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(fetchCurrentExamReadiness()).resolves.toEqual(READINESS);
    expect(fetch).toHaveBeenCalledWith("/api/exam-readiness/current", {
      method: "GET",
      cache: "no-store",
    });
    vi.unstubAllGlobals();
  });

  it("includes current Exam Readiness in the progress bootstrap response", async () => {
    mocks.getRequestUserIdFast.mockResolvedValue(USER_ID);
    mocks.getServiceSupabase.mockReturnValue(SUPABASE);
    mocks.loadAppStateForUser.mockResolvedValue(null);
    mocks.getLatestOrRefreshIntegratedStatus.mockResolvedValue({
      status: null,
      row: null,
      saved: true,
    });
    mocks.getLatestPlanAdjustmentProposal.mockResolvedValue(null);
    mocks.getCurrentReadiness.mockResolvedValue(READINESS);

    const response = await progressBootstrap(new Request(
      "https://example.test/api/progress/bootstrap",
      { method: "POST", body: "{}" },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      examReadiness: READINESS,
    });
    expect(mocks.getCurrentReadiness).toHaveBeenCalledWith({
      supabase: SUPABASE,
      userId: USER_ID,
      now: expect.any(Date),
    });
  });

  it("keeps other progress bootstrap state when readiness is temporarily unavailable", async () => {
    const integratedStatus = { overallStatus: "on_track" };
    mocks.getRequestUserIdFast.mockResolvedValue(USER_ID);
    mocks.getServiceSupabase.mockReturnValue(SUPABASE);
    mocks.loadAppStateForUser.mockResolvedValue({ day: 4 });
    mocks.getLatestOrRefreshIntegratedStatus.mockResolvedValue({
      status: integratedStatus,
      row: { id: "status-row" },
      saved: true,
    });
    mocks.getLatestPlanAdjustmentProposal.mockResolvedValue({ proposalId: "proposal-1" });
    mocks.getCurrentReadiness.mockRejectedValue(
      new TemporaryReadinessError("recalculation_busy"),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await progressBootstrap(new Request(
      "https://example.test/api/progress/bootstrap",
      { method: "POST", body: "{}" },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      appState: { day: 4 },
      integratedStatus,
      examReadiness: null,
      planAdjustmentProposal: { proposalId: "proposal-1" },
    });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("preserves the complete result in the client progress bootstrap contract", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      userId: USER_ID,
      appState: null,
      integratedStatus: null,
      examReadiness: READINESS,
      planAdjustmentProposal: null,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(fetchProgressBootstrap()).resolves.toMatchObject({
      userId: USER_ID,
      examReadiness: READINESS,
    });
    vi.unstubAllGlobals();
  });

  it("shares one current result with Today's schedule refresh and returns it to the client", async () => {
    const integratedStatus = { overallStatus: "on_track" };
    mocks.getRequestUserId.mockResolvedValue(USER_ID);
    mocks.getServiceSupabase.mockReturnValue(SUPABASE);
    mocks.getCurrentReadiness.mockResolvedValue(READINESS);
    mocks.refreshIntegratedStatusForUser.mockImplementation(
      async (_supabase, _userId, options) => {
        expect(await options.examReadiness).toEqual(READINESS);
        return { status: integratedStatus, row: null, saved: true };
      },
    );

    const response = await refreshIntegratedStatusRoute(new Request(
      "https://example.test/api/integrated-status/refresh",
      { method: "POST", body: "{}" },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: integratedStatus,
      examReadiness: READINESS,
    });
    expect(mocks.getCurrentReadiness).toHaveBeenCalledOnce();
    expect(mocks.refreshIntegratedStatusForUser).toHaveBeenCalledWith(
      SUPABASE,
      USER_ID,
      expect.objectContaining({
        now: expect.any(Date),
        examReadiness: expect.any(Promise),
      }),
    );
  });

  it("keeps the complete result in the schedule-refresh client contract", async () => {
    const integratedStatus = { overallStatus: "on_track" };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      status: integratedStatus,
      examReadiness: READINESS,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(refreshIntegratedStatus(USER_ID)).resolves.toEqual({
      status: integratedStatus,
      examReadiness: READINESS,
    });
    vi.unstubAllGlobals();
  });
});
