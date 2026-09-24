import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/gradingCore";

// 章末のAI理解チェック用の採点モード。
// 通常の /ai-grading の指示は変えず、理解チェックのときだけ厳しめの指示を足す。

const mocks = vi.hoisted(() => ({
  gradeWrittenAnswer: vi.fn(),
  getRequestUserId: vi.fn(),
}));

vi.mock("@/lib/ai/gradeWrittenAnswer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gradeWrittenAnswer")>();
  return { ...actual, gradeWrittenAnswer: mocks.gradeWrittenAnswer };
});
vi.mock("@/lib/ai/gradingRecords", () => ({ saveGradingRecord: vi.fn() }));
vi.mock("@/lib/apiUser", () => ({ getRequestUserId: mocks.getRequestUserId }));
vi.mock("@/lib/auth/lineSession", () => ({ isAuthEnabled: () => false }));
vi.mock("@/lib/billing/plan", () => ({
  getUserPlan: vi.fn(async () => "free"),
  countTodayUsage: vi.fn(async () => 0),
  logUsage: vi.fn(),
}));

const { POST } = await import("@/app/api/ai-grading/route");

function request(body: unknown): Request {
  return new Request("http://localhost/api/ai-grading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const answer = "DNSはドメイン名をIPアドレスに変換する仕組みで、ブラウザが問い合わせます。";

describe("buildSystemPrompt", () => {
  it("通常採点の指示は既存のまま", () => {
    expect(buildSystemPrompt()).toBe(buildSystemPrompt("standard"));
    expect(buildSystemPrompt()).not.toContain("理解チェック");
  });

  it("理解チェックでは、不足点を具体的に指摘させ、観点を満たさない回答を高得点にしない", () => {
    const prompt = buildSystemPrompt("understanding_check");
    expect(prompt.startsWith(buildSystemPrompt())).toBe(true);
    expect(prompt).toContain("理解チェック");
    expect(prompt).toContain("80点以上にしないでください");
    expect(prompt).toContain("missingPoints");
    expect(prompt).toContain("人格");
  });
});

describe("POST /api/ai-grading の mode", () => {
  beforeEach(() => {
    mocks.getRequestUserId.mockResolvedValue("user-1");
    mocks.gradeWrittenAnswer.mockResolvedValue({
      result: {
        score: 70, grade: "B", isCorrect: false, summary: "", goodPoints: [], missingPoints: [],
        feedback: "", modelAnswer: "", nextReviewTheme: "",
      },
      provider: "gemini",
      model: "m",
      fallback: false,
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("understanding_check を採点へ渡す", async () => {
    const res = await POST(request({ questionId: "net-01", userAnswer: answer, mode: "understanding_check" }));
    expect(res.status).toBe(200);
    expect(mocks.gradeWrittenAnswer.mock.calls[0][2]).toEqual({ provider: "gemini", mode: "understanding_check" });
  });

  it("mode 省略・未知の値は通常採点として扱う", async () => {
    await POST(request({ questionId: "net-01", userAnswer: answer }));
    await POST(request({ questionId: "net-01", userAnswer: answer, mode: "grant_full_marks" }));
    expect(mocks.gradeWrittenAnswer.mock.calls.map((call) => call[2].mode)).toEqual(["standard", "standard"]);
  });

  it("追加した章末用の設問も採点できる", async () => {
    const res = await POST(request({ questionId: "aud-01", userAnswer: answer, mode: "understanding_check" }));
    expect(res.status).toBe(200);
  });
});
