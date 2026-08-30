import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// /api/question-attempts/save の重複保存と入力値の正規化。
// ----------------------------------------------------------------------------
// 見ているもの:
//   - 一意制約違反（＝同じ回答の再送）を成功として扱い、重複行を作らないこと
//   - 一部だけ重複していても、残りは保存されること
//   - 異常な timeSpentSeconds / answeredAt を保存しないこと
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
import { MAX_TIME_SPENT_SECONDS } from "@/lib/questionAttemptSanitize";

const OFFICIAL_Q1 = "ipa-it-passport-2026-q001";
const OFFICIAL_Q2 = "ipa-it-passport-2026-q002";

/** 実際に「テーブルへ入った」行。一意制約に弾かれた行はここに入らない。 */
let stored: Array<Record<string, unknown>> = [];
/** transaction RPC が呼ばれた回数（1 batch = 1 callを見る）。 */
let insertCalls = 0;

/** 一意キー。schema.sql の部分一意索引と同じ組み合わせ。 */
function uniqueKey(row: Record<string, unknown>): string {
  return [row.user_id, row.attempt_group_id, row.question_id, row.question_version].join(
    "",
  );
}

/** 一意制約つきのテーブルを模したスタブ。 */
function supabaseStub() {
  const from = () => {
    const filters = new Map<string, unknown>();
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.set(column, value);
        return query;
      },
      maybeSingle: () => Promise.resolve({
        data:
          filters.get("user_id") === "user-1"
          && (filters.get("session_id") === "group-1"
            || filters.get("session_id") === "group-2")
            ? {
                session_id: filters.get("session_id"),
                source: "official_past",
                mode: "exam",
                status: "in_progress",
              }
            : null,
        error: null,
      }),
    };
    return query;
  };
  return {
    from,
    rpc: (
      _name: string,
      params: { p_user_id: string; p_attempts: Array<Record<string, unknown>> },
    ) => {
      insertCalls += 1;
      const data = params.p_attempts.map((input) => {
        const row: Record<string, unknown> = {
          ...input,
          user_id: params.p_user_id,
          // The grouped assessment recorder deliberately preserves a missing
          // timestamp so a lost-response retry sends the identical batch. The
          // real SQL recorder fills it with statement_timestamp().
          answered_at: input.answered_at ?? new Date().toISOString(),
        };
        const attemptedBefore = stored.some(
          (existing) =>
            existing.user_id === row.user_id
            && existing.question_id === row.question_id,
        );
        const officialDuplicate = row.attempt_group_id != null
          && row.question_version != null
          && stored.some((existing) => uniqueKey(existing) === uniqueKey(row));

        if (!officialDuplicate) stored.push(row);
        return {
          question_id: row.question_id,
          state: attemptedBefore ? "seen" : "first",
          attempted_before: attemptedBefore,
          first_attempt_at: row.answered_at,
          attempt_count: stored.filter(
            (existing) =>
              existing.user_id === row.user_id
              && existing.question_id === row.question_id,
          ).length,
          saved: !officialDuplicate,
        };
      });
      return Promise.resolve({ error: null, data });
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  stored = [];
  insertCalls = 0;
  getRequestUserId.mockResolvedValue("user-1");
  canRecordStudyForUser.mockResolvedValue(true);
  getServiceSupabase.mockReturnValue(supabaseStub());
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

function officialAttempt(overrides: Attempt = {}): Attempt {
  return {
    questionId: OFFICIAL_Q1,
    questionType: "official_past",
    topicId: "strat-intellectual-property",
    selectedAnswer: "A",
    isCorrect: true,
    attemptMode: "exam",
    attemptGroupId: "group-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 重複保存
// ---------------------------------------------------------------------------

describe("公式過去問の重複保存", () => {
  it("同じ回答を二度送っても行は増えない", async () => {
    const first = await save([officialAttempt()]);
    expect(first.body.ok).toBe(true);
    expect(stored).toHaveLength(1);

    // 採点の再送 / API再送に相当する2回目。
    const second = await save([officialAttempt()]);

    expect(second.response.status).toBe(200);
    expect(second.body.ok).toBe(true);
    expect(stored).toHaveLength(1);
  });

  it("重複はseenとして成功を返す（クライアントに再送させない）", async () => {
    await save([officialAttempt()]);
    const { body } = await save([officialAttempt()]);

    expect(body.ok).toBe(true);
    expect(body.saved).toBe(0);
    expect(body.exposures).toEqual([
      expect.objectContaining({ questionId: OFFICIAL_Q1, state: "seen" }),
    ]);
  });

  it("一部だけ重複しているときは、残りを保存する", async () => {
    await save([officialAttempt({ questionId: OFFICIAL_Q1 })]);
    expect(stored).toHaveLength(1);

    // 1問目は重複、2問目は新規。まとめて insert すると全件落ちるので、
    // 落ちたあとに1件ずつ入れ直して2問目を拾えていること。
    const { body } = await save([
      officialAttempt({ questionId: OFFICIAL_Q1 }),
      officialAttempt({ questionId: OFFICIAL_Q2, selectedAnswer: "B" }),
    ]);

    expect(body.ok).toBe(true);
    expect(body.saved).toBe(1);
    expect(stored).toHaveLength(2);
    expect(stored.map((r) => r.question_id)).toEqual([OFFICIAL_Q1, OFFICIAL_Q2]);
  });

  it("演習が別なら（attempt_group_id が違えば）同じ問題でも保存する", async () => {
    await save([officialAttempt({ attemptGroupId: "group-1" })]);
    await save([officialAttempt({ attemptGroupId: "group-2" })]);

    // 解き直しは重複ではない。年度別演習を2回やれば2件残る。
    expect(stored).toHaveLength(2);
  });

  it("重複が無ければ、まとめて1回の insert で済む", async () => {
    await save([
      officialAttempt({ questionId: OFFICIAL_Q1 }),
      officialAttempt({ questionId: OFFICIAL_Q2 }),
    ]);

    expect(insertCalls).toBe(1);
    expect(stored).toHaveLength(2);
  });
});

describe("既存の保存経路", () => {
  it("確認問題は attempt_group_id を持たないので重複防止の対象外", async () => {
    const quiz = {
      questionId: "tech-security-cia-ex1",
      questionType: "topic_quiz",
      topicId: "tech-security-cia",
      isCorrect: true,
      selectedAnswer: "A",
    };

    // 同じ問題を何度も解き直せる、という既存挙動を変えない。
    await save([quiz]);
    await save([quiz]);

    expect(stored).toHaveLength(2);
    expect(stored[0].attempt_group_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 入力値の正規化
// ---------------------------------------------------------------------------

describe("timeSpentSeconds の検証", () => {
  const timeOf = () => stored[0].time_spent_seconds;

  it("通常の値は保存する", async () => {
    await save([officialAttempt({ timeSpentSeconds: 42 })]);
    expect(timeOf()).toBe(42);
  });

  it("負数は保存しない", async () => {
    await save([officialAttempt({ timeSpentSeconds: -5 })]);
    expect(timeOf()).toBeNull();
  });

  it("極端に大きい値は上限へ丸める", async () => {
    await save([officialAttempt({ timeSpentSeconds: 999_999_999 })]);
    expect(timeOf()).toBe(MAX_TIME_SPENT_SECONDS);
  });

  it("小数は整数へ丸める", async () => {
    await save([officialAttempt({ timeSpentSeconds: 12.7 })]);
    expect(timeOf()).toBe(13);
  });

  it("数値でない値は保存しない", async () => {
    await save([officialAttempt({ timeSpentSeconds: "42" })]);
    expect(timeOf()).toBeNull();
  });

  it("確認問題の経路でも同じ検証をかける", async () => {
    await save([
      {
        questionId: "tech-security-cia-ex1",
        questionType: "topic_quiz",
        topicId: "tech-security-cia",
        isCorrect: true,
        timeSpentSeconds: -1,
      },
    ]);
    expect(timeOf()).toBeNull();
  });
});

describe("answeredAt の検証", () => {
  const answeredAtOf = () => stored[0].answered_at;

  it("通常の日時は ISO8601 へ正規化して保存する", async () => {
    const at = new Date(Date.now() - 60_000).toISOString();
    await save([officialAttempt({ answeredAt: at })]);
    expect(answeredAtOf()).toBe(at);
  });

  it("日時として不正な値はサーバ時刻に落とす", async () => {
    await save([officialAttempt({ answeredAt: "not-a-date" })]);

    // null ではなく、questionAttemptToRow が入れるサーバ時刻になる。
    const saved = answeredAtOf() as string;
    expect(Number.isNaN(Date.parse(saved))).toBe(false);
    expect(Math.abs(Date.parse(saved) - Date.now())).toBeLessThan(10_000);
  });

  it("未来すぎる日時は保存しない", async () => {
    const farFuture = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await save([officialAttempt({ answeredAt: farFuture })]);

    const saved = answeredAtOf() as string;
    expect(Date.parse(saved)).toBeLessThan(Date.parse(farFuture));
  });
});
