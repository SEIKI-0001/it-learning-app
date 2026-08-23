import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// /api/question-attempts/save の検証。
//
// 公式過去問（official_past）は、正誤・トピック・出所・版・年度・公式区分を
// すべてサーバ側で問題バンクから決める。クライアントの申告は使わない。
// 既存4種類（topic_quiz / exam_level / mini_exam / mock_exam）の保存は
// 従来どおりクライアントの正誤を使う（挙動を変えていないことも確かめる）。
// ============================================================================

const getRequestUserId = vi.hoisted(() => vi.fn());
const canRecordStudyForUser = vi.hoisted(() => vi.fn());
const getServiceSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apiUser", () => ({ getRequestUserId }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser,
  recordingLockedResponse: () =>
    new Response(JSON.stringify({ ok: false, code: "recording_locked" }), { status: 403 }),
}));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase }));

import { POST } from "@/app/api/question-attempts/save/route";
import { getQuestionById } from "@/lib/questionBank";

/** insert された行（呼び出しごとの配列）。 */
let inserted: Array<Array<Record<string, unknown>>> = [];
let assessmentSessions: Array<Record<string, unknown>> = [];

function assessmentQuery() {
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    },
    maybeSingle: () => Promise.resolve({
      data: assessmentSessions.find((row) =>
        filters.every(([column, value]) => row[column] === value)
      ) ?? null,
      error: null,
    }),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  inserted = [];
  assessmentSessions = [
    {
      session_id: "session-1",
      user_id: "user-1",
      source: "official_past",
      mode: "practice",
      status: "in_progress",
    },
    {
      session_id: "group-9",
      user_id: "user-1",
      source: "official_past",
      mode: "exam",
      status: "in_progress",
    },
    {
      session_id: "mock-session",
      user_id: "user-1",
      source: "mock",
      mode: "exam",
      status: "in_progress",
    },
  ];
  getRequestUserId.mockResolvedValue("user-1");
  canRecordStudyForUser.mockResolvedValue(true);
  getServiceSupabase.mockReturnValue({
    from: (table: string) => {
      if (table !== "assessment_sessions") throw new Error(`unexpected table ${table}`);
      return assessmentQuery();
    },
    rpc: (
      _name: string,
      params: { p_user_id: string; p_attempts: Array<Record<string, unknown>> },
    ) => {
      inserted.push(params.p_attempts.map((row) => ({
        ...row,
        user_id: params.p_user_id,
      })));
      return Promise.resolve({
        error: null,
        data: params.p_attempts.map((row) => ({
          question_id: row.question_id,
          state: "first",
          attempted_before: false,
          first_attempt_at: row.answered_at,
          attempt_count: 1,
          saved: true,
        })),
      });
    },
  });
});

type Attempt = Record<string, unknown>;

async function save(attempts: Attempt[]) {
  const response = await POST(
    new Request("http://localhost/api/question-attempts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-1", attempts }),
    }),
  );
  return { response, body: await response.json() };
}

/** 保存された行（1回目の insert ぶん）。 */
function rows(): Array<Record<string, unknown>> {
  return inserted[0] ?? [];
}

// 令和8年度 問1: 正答 A / トピック strat-intellectual-property / ストラテジ系。
const OFFICIAL_Q1 = "ipa-it-passport-2026-q001";
// 令和8年度 問3: 正答 C。
const OFFICIAL_Q3 = "ipa-it-passport-2026-q003";

function officialAttempt(overrides: Attempt = {}): Attempt {
  return {
    questionId: OFFICIAL_Q1,
    questionType: "official_past",
    topicId: "strat-intellectual-property",
    selectedAnswer: "A",
    isCorrect: true,
    attemptMode: "practice",
    attemptGroupId: "session-1",
    ...overrides,
  };
}

describe("公式過去問の正誤はサーバ側で計算する", () => {
  it("誤答を isCorrect: true と偽装されても、正誤はサーバ計算値になる", async () => {
    // 問1の正答は A。B を選んでいるので不正解。
    const { body } = await save([
      officialAttempt({ selectedAnswer: "B", isCorrect: true }),
    ]);

    expect(body.ok).toBe(true);
    expect(rows()).toHaveLength(1);
    expect(rows()[0].is_correct).toBe(false);
    expect(rows()[0].selected_answer).toBe("B");
  });

  it("正答を isCorrect: false と偽装されても、正誤はサーバ計算値になる", async () => {
    await save([officialAttempt({ selectedAnswer: "A", isCorrect: false })]);
    expect(rows()[0].is_correct).toBe(true);
  });

  it("問題ごとの正答で判定する（問3の正答は C）", async () => {
    await save([
      officialAttempt({ questionId: OFFICIAL_Q3, selectedAnswer: "C", isCorrect: false }),
      officialAttempt({ questionId: OFFICIAL_Q3, selectedAnswer: "A", isCorrect: true }),
    ]);
    expect(rows().map((r) => r.is_correct)).toEqual([true, false]);
  });

  it("未回答（null）は isCorrect: false として保存する", async () => {
    await save([officialAttempt({ selectedAnswer: null, isCorrect: true })]);
    expect(rows()[0].selected_answer).toBeNull();
    expect(rows()[0].is_correct).toBe(false);
  });

  it("トピックと付加情報は問題バンクの値を使う（クライアント値は使わない）", async () => {
    await save([
      officialAttempt({
        topicId: "tech-ai-ml",
        questionOrigin: "app_original",
        examYear: 1999,
        officialExamField: "technology",
        questionVersion: 99,
      }),
    ]);

    expect(rows()[0]).toMatchObject({
      topic_id: "strat-intellectual-property",
      question_origin: "official_past",
      question_version: 2,
      exam_year: 2026,
      official_exam_field: "strategy",
    });
  });

  it("演習の文脈（モード・グループID）はクライアント値を検証して使う", async () => {
    await save([officialAttempt({ attemptMode: "exam", attemptGroupId: "group-9" })]);
    expect(rows()[0].attempt_mode).toBe("exam");
    expect(rows()[0].attempt_group_id).toBe("group-9");
  });

  it("不正なモードは null にする（保存自体は拒否しない）", async () => {
    await save([officialAttempt({ attemptMode: "cheat", attemptGroupId: null })]);
    expect(rows()[0].attempt_mode).toBeNull();
  });
});

describe("公式過去問として受け付けない attempt", () => {
  it("問題バンクに無いIDを拒否する", async () => {
    const { response, body } = await save([
      officialAttempt({ questionId: "ipa-it-passport-2026-q999" }),
    ]);

    expect(response.status).toBe(400);
    expect(body.error).toBe("no valid attempts");
    expect(inserted).toHaveLength(0);
  });

  it("空文字の問題IDを拒否する", async () => {
    const { response } = await save([officialAttempt({ questionId: "" })]);
    expect(response.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("app_original の問題を official_past として送ると拒否する", async () => {
    // tech-security-cia-ex1 は問題バンクに実在するが origin は app_original。
    const { response, body } = await save([
      officialAttempt({ questionId: "tech-security-cia-ex1" }),
    ]);

    expect(response.status).toBe(400);
    expect(body.error).toBe("no valid attempts");
    expect(inserted).toHaveLength(0);
  });

  it("A〜D 以外の selectedAnswer を拒否する", async () => {
    for (const selectedAnswer of ["E", "a", "", "AB", 1, true, {}]) {
      inserted = [];
      const { response } = await save([officialAttempt({ selectedAnswer })]);
      expect(response.status, `selectedAnswer: ${JSON.stringify(selectedAnswer)}`).toBe(
        400,
      );
      expect(inserted).toHaveLength(0);
    }
  });

  it("不正な attempt だけを捨て、正しい attempt は保存する", async () => {
    const { body } = await save([
      officialAttempt({ questionId: "does-not-exist" }),
      officialAttempt({ selectedAnswer: "E" }),
      officialAttempt({ questionId: OFFICIAL_Q3, selectedAnswer: "C" }),
    ]);

    expect(body.ok).toBe(true);
    expect(body.saved).toBe(1);
    expect(rows()).toHaveLength(1);
    expect(rows()[0].question_id).toBe(OFFICIAL_Q3);
    expect(rows()[0].is_correct).toBe(true);
  });
});

describe("既存4種類の保存は変わらない", () => {
  const LEGACY_TYPES = ["topic_quiz", "exam_level", "mini_exam", "mock_exam"] as const;

  it("問題バンクに無い問題でも、クライアントの正誤とトピックで保存する", async () => {
    for (const questionType of LEGACY_TYPES) {
      inserted = [];
      const { body } = await save([
        {
          questionId: "check-1",
          questionType,
          topicId: "tech-security-cia",
          selectedAnswer: "B",
          isCorrect: true,
          answeredAt: "2026-07-28T10:00:00.000Z",
          timeSpentSeconds: 12,
        },
      ]);

      expect(body.ok).toBe(true);
      expect(rows()[0]).toMatchObject({
        user_id: "user-1",
        question_id: "check-1",
        question_type: questionType,
        topic_id: "tech-security-cia",
        selected_answer: "B",
        // 公式過去問ではないので、クライアントの申告をそのまま保存する。
        is_correct: true,
        answered_at: "2026-07-28T10:00:00.000Z",
        time_spent_seconds: 12,
        question_origin: null,
        question_version: null,
        exam_year: null,
        official_exam_field: null,
        attempt_mode: null,
        attempt_group_id: null,
      });
    }
  });

  it("問題バンクにある問題では出所・版とトピックを補う", async () => {
    await save([
      {
        questionId: "tech-security-cia-ex1",
        questionType: "exam_level",
        topicId: "topic-from-client",
        selectedAnswer: "A",
        isCorrect: true,
      },
    ]);

    // 版は問題バンクから引く。問題を改訂すると version が上がるため、
    // ここで数値を固定すると改訂のたびにこのテストが落ちる。
    // 見たいのは「クライアントの申告ではなく問題バンクの値で補われること」。
    expect(rows()[0]).toMatchObject({
      topic_id: "tech-security-cia",
      question_origin: "app_original",
      question_version: getQuestionById("tech-security-cia-ex1")?.version,
      exam_year: null,
      official_exam_field: null,
    });
  });

  it("進行中の同一ユーザー・同一source評価セッションならグループIDを保存する", async () => {
    const { response } = await save([
      {
        questionId: "check-1",
        questionType: "mock_exam",
        topicId: "tech-security-cia",
        selectedAnswer: "B",
        isCorrect: false,
        attemptMode: "exam",
        attemptGroupId: "mock-session",
      },
    ]);

    expect(response.status).toBe(200);
    expect(rows()[0].attempt_mode).toBeNull();
    expect(rows()[0].attempt_group_id).toBe("mock-session");
  });

  it.each([
    ["別ユーザー", { user_id: "user-2", source: "mock", status: "in_progress" }],
    ["異なるsource", { user_id: "user-1", source: "summary", status: "in_progress" }],
    ["完了済み", { user_id: "user-1", source: "mock", status: "completed" }],
    ["放棄済み", { user_id: "user-1", source: "mock", status: "abandoned" }],
  ])("%sの評価セッションへattemptを関連付けない", async (_label, overrides) => {
    assessmentSessions.push({
      session_id: "untrusted-session",
      mode: "exam",
      ...overrides,
    });

    const { response, body } = await save([{
      questionId: "check-1",
      questionType: "mock_exam",
      topicId: "tech-security-cia",
      selectedAnswer: "B",
      isCorrect: false,
      attemptGroupId: "untrusted-session",
    }]);

    expect(response.status).toBe(400);
    expect(body.error).toBe("no valid attempts");
    expect(inserted).toHaveLength(0);
  });

  it("topicId と isCorrect は従来どおり必須", async () => {
    const base = {
      questionId: "check-1",
      questionType: "topic_quiz",
      topicId: "tech-security-cia",
      isCorrect: false,
    };

    for (const attempt of [
      { ...base, topicId: undefined },
      { ...base, topicId: "" },
      { ...base, isCorrect: undefined },
      { ...base, isCorrect: "false" },
      { ...base, questionType: "unknown_type" },
    ]) {
      inserted = [];
      const { response } = await save([attempt]);
      expect(response.status).toBe(400);
      expect(inserted).toHaveLength(0);
    }
  });
});

describe("保存の前提条件", () => {
  it("未認証は 401", async () => {
    getRequestUserId.mockResolvedValue(null);
    const { response } = await save([officialAttempt()]);
    expect(response.status).toBe(401);
  });

  it("記録期間が終わっていれば 403", async () => {
    canRecordStudyForUser.mockResolvedValue(false);
    const { response } = await save([officialAttempt()]);
    expect(response.status).toBe(403);
  });

  it("Supabase 未設定は 503", async () => {
    getServiceSupabase.mockReturnValue(null);
    const { response } = await save([officialAttempt()]);
    expect(response.status).toBe(503);
  });
});
