import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, TodayActivity } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
  canRecordStudyForUser: vi.fn(),
}));
vi.mock("@/lib/apiUser", () => ({ getRequestUserId: mocks.getRequestUserId }));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase: mocks.getServiceSupabase }));
vi.mock("@/lib/billing/recordingGate", () => ({
  canRecordStudyForUser: mocks.canRecordStudyForUser,
  recordingLockedResponse: () => new Response("locked", { status: 403 }),
}));

import { POST } from "@/app/api/daily-tasks/activities/route";
import { parseActivityPayload, toActivityPayload } from "@/lib/todayActivitySpec";
import {
  activityFromSpec,
  buildTodayActivities,
  mergeActivityLogs,
  type RemoteActivityState,
} from "@/lib/todayActivities";
import { buildVocabActivity } from "@/lib/todayVocab";
import { getAllWords } from "@/lib/wordlist";
import type { WordProgressMap } from "@/lib/wordProgressModel";
import { buildKakomonActivities, kakomonActivityFromSpec } from "@/lib/todayKakomon";
import { activityRowInput } from "@/lib/todayActivitySync";
import { getAllTopics } from "@/lib/content";

const topics = getAllTopics();
const now = new Date(2026, 8, 26, 12, 0, 0);
const DATE = "2026-09-26";
const USER = "10000000-0000-0000-0000-000000000001";
const yesterday = new Date(2026, 8, 25, 20, 0, 0).toISOString();

function cp5State(): AppState {
  return {
    profile: { weekdayMinutes: 30 },
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: [], topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp5" },
    },
    answers: [
      { questionId: "ipa-it-passport-2026-q060", isCorrect: false, answeredAt: yesterday, tag: "t", topicId: "tech-network-address" },
    ],
  } as unknown as AppState;
}

function vocab(): TodayActivity {
  return buildVocabActivity({
    checkpointOrder: 2, wordProgress: {}, topicStages: {}, upcomingTopicIds: ["tech-raid"], now,
  })!;
}

function kakomon(): TodayActivity[] {
  const s = cp5State();
  return buildKakomonActivities({
    topics, progress: s.progress, answers: s.answers, daysRemaining: 60, budgetMinutes: 30, now,
  });
}

// ---------------------------------------------------------------------------
// daily_study_tasks の代わり（user/date/activity_key の一意性つき）
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function fakeSupabase() {
  const rows: Row[] = [];
  class Query {
    private filters: ((row: Row) => boolean)[] = [];
    private mode: "select" | "update" = "select";
    private patch: Row = {};
    private returning = false;
    select() {
      if (this.mode === "update") this.returning = true;
      return this;
    }
    update(patch: Row) {
      this.mode = "update";
      this.patch = patch;
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push((row) => row[column] === value);
      return this;
    }
    not(column: string) {
      this.filters.push((row) => row[column] !== null && row[column] !== undefined);
      return this;
    }
    upsert(input: Row[], options: { ignoreDuplicates?: boolean }) {
      for (const row of input) {
        const clash = rows.find((r) => r.user_id === row.user_id && r.date === row.date
          && r.activity_key === row.activity_key);
        if (clash && options.ignoreDuplicates) continue;
        if (clash) Object.assign(clash, row);
        else rows.push({ ...row });
      }
      return Promise.resolve({ error: null });
    }
    private run() {
      const matched = rows.filter((row) => this.filters.every((f) => f(row)));
      if (this.mode === "update") {
        for (const row of matched) Object.assign(row, this.patch);
        return { data: this.returning ? matched.map((r) => ({ activity_key: r.activity_key })) : null, error: null };
      }
      return { data: matched.map((r) => ({ ...r })), error: null };
    }
    maybeSingle() {
      const { data } = this.run();
      return Promise.resolve({ data: (data as Row[])[0] ?? null, error: null });
    }
    then(resolve: (value: unknown) => void) {
      resolve(this.run());
    }
  }
  return { rows, client: { from: () => new Query() } };
}

async function call(body: Record<string, unknown>) {
  const res = await POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ date: DATE, ...body }) }));
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // 記録期間外の応答はテキスト
  }
  return { status: res.status, json };
}

describe("activity の spec（activity_payload）", () => {
  it("生成したタスクは保存した spec から同じ内容に組み立て直せる", () => {
    for (const activity of [vocab(), ...kakomon()]) {
      const payload = JSON.parse(JSON.stringify(toActivityPayload(activity.spec)));
      const spec = parseActivityPayload(payload);
      expect(spec).toEqual(activity.spec);
      expect(activityFromSpec(spec!)).toEqual(activity);
    }
  });

  it("payload は復元に必要な最小限（表示文言を持たない）", () => {
    const payload = toActivityPayload(vocab().spec);
    expect(Object.keys(payload).sort()).toEqual(["kind", "topicId", "v", "variant", "wordIds"]);
  });

  it("不正な payload は受け付けない", () => {
    expect(parseActivityPayload({ v: 1, kind: "vocab", variant: "review", wordIds: [] })).toBeNull();
    expect(parseActivityPayload({ v: 2, kind: "past_exam_mock", year: 2026 })).toBeNull();
    expect(parseActivityPayload({ v: 1, kind: "past_exam_drill", stage: "field-drill", count: 12, reason: "standard" })).toBeNull();
    expect(parseActivityPayload({ v: 1, kind: "past_exam_retry", questionIds: ["<script>"], pendingTotal: 1 })).toBeNull();
    expect(parseActivityPayload({ v: 1, kind: "unknown" })).toBeNull();
  });
});

describe("POST /api/daily-tasks/activities（別端末相当）", () => {
  let db: ReturnType<typeof fakeSupabase>;
  beforeEach(() => {
    db = fakeSupabase();
    mocks.getRequestUserId.mockResolvedValue(USER);
    mocks.canRecordStudyForUser.mockResolvedValue(true);
    mocks.getServiceSupabase.mockReturnValue(db.client);
  });

  it("vocab と公式過去問の演習・解き直しを daily_study_tasks に保存する", async () => {
    const offered = [vocab(), ...kakomon()];
    const res = await call({ action: "offer", activities: offered.map(activityRowInput) });
    expect(res.status).toBe(200);
    expect(db.rows.map((r) => [r.activity_key, r.task_type, r.status, r.completion_source]).sort()).toEqual([
      ["act:past-exam", "past_exam_drill", "pending", "self_report"],
      ["act:past-exam-retry", "past_exam_retry", "pending", "self_report"],
      ["act:vocab", "vocab_quiz", "pending", "self_report"],
    ]);
    expect(db.rows.find((r) => r.activity_key === "act:vocab")?.topic_id).toBe("tech-raid");
  });

  it("以前 flashcard で保存した Today の単語タスクも、そのまま読めて完了できる（変換不要）", async () => {
    const v = vocab();
    db.rows.push({
      user_id: USER, date: DATE, task_type: "flashcard", topic_id: "tech-raid", title: "旧タスク",
      status: "pending", completion_source: "self_report",
      activity_key: "act:vocab", activity_payload: toActivityPayload(v.spec),
    });
    const listed = (await call({ action: "list" })).json.activities as RemoteActivityState[];
    expect(listed).toEqual([{ key: "act:vocab", payload: v.spec, done: false }]);
    // 復元したタスクは4択へ遷移する
    expect(activityFromSpec(listed[0].payload)!.href).toMatch(/^\/glossary\/quiz\?mode=task&/);

    await call({ action: "complete", key: "act:vocab", activity: activityRowInput(v) });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ task_type: "flashcard", status: "completed", completion_source: "app_actual" });
  });

  it("20語の単語タスクも、別端末で同じ word IDs・同じ4択リンクで復元できる", async () => {
    const words: WordProgressMap = {};
    for (const id of getAllWords().slice(0, 25).map((w) => w.id)) {
      words[id] = {
        acronymId: id, status: "weak", correctCount: 0, wrongCount: 1, reviewCount: 1,
        lastReviewedAt: now.getTime(), nextReviewAt: now.getTime() + 86_400_000, lastSelfRating: null,
      };
    }
    const first = buildVocabActivity({
      checkpointOrder: 4, wordProgress: words, topicStages: {}, upcomingTopicIds: [], now,
    })!;
    expect(first.spec.kind === "vocab" && first.spec.wordIds).toHaveLength(20);
    await call({ action: "offer", activities: [activityRowInput(first)] });

    // 別端末: 端末キャッシュは空・単語の進捗も違う（生成すれば別の語になる）が、保存済みの語で出す
    const remote = (await call({ action: "list" })).json.activities as RemoteActivityState[];
    const merged = mergeActivityLogs({ offered: {}, done: {} }, remote);
    const s = cp5State();
    const { active } = buildTodayActivities({
      state: { ...s, progress: { ...s.progress, checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp4" } } },
      topics, now, budgetMinutes: 30, wordProgress: {}, topicStages: {}, upcomingTopicIds: [], log: merged,
    });
    const restored = active.find((a) => a.id === "act:vocab")!;
    expect(restored.spec).toEqual(first.spec);
    expect(restored.href).toBe(first.href);
    expect(restored.estimatedMinutes).toBe(5);
  });

  it("完了で completed / app_actual になり、別端末の取得では完了済み（再表示しない）", async () => {
    const [drill] = kakomon().filter((a) => a.kind === "past_exam_drill");
    await call({ action: "offer", activities: [activityRowInput(drill)] });
    await call({ action: "complete", key: "act:past-exam", activity: activityRowInput(drill) });
    expect(db.rows[0]).toMatchObject({ status: "completed", completion_source: "app_actual" });

    const listed = await call({ action: "list" });
    const remote = listed.json.activities as RemoteActivityState[];
    expect(remote).toEqual([{ key: "act:past-exam", payload: drill.spec, done: true }]);

    // 別端末（端末キャッシュ空）で Today を組み立てても、完了済みの演習は出し直さない
    const merged = mergeActivityLogs({ offered: {}, done: {} }, remote);
    const s = cp5State();
    const { active, done } = buildTodayActivities({
      state: s, topics, now, budgetMinutes: 30, wordProgress: {}, topicStages: {}, upcomingTopicIds: [], log: merged,
    });
    expect(active.map((a) => a.id)).not.toContain("act:past-exam");
    expect(done.map((a) => a.id)).toEqual(["act:past-exam"]);
  });

  it("出したが未完了のタスクは、別端末でも同じ対象（単語・問題）で出る", async () => {
    const first = vocab(); // tech-raid の関連語
    await call({ action: "offer", activities: [activityRowInput(first)] });
    // 別端末では違う単語タスクを生成したが、先に保存された方が正になる
    const other = buildVocabActivity({
      checkpointOrder: 2, wordProgress: {}, topicStages: {}, upcomingTopicIds: ["tech-network-address"], now,
    })!;
    const res = await call({ action: "offer", activities: [activityRowInput(other)] });
    const remote = res.json.activities as RemoteActivityState[];
    expect(remote).toHaveLength(1);
    expect(remote[0].payload).toEqual(first.spec);

    const merged = mergeActivityLogs({ offered: { [other.id]: other }, done: {} }, remote);
    const { active } = buildTodayActivities({
      state: { ...cp5State(), progress: { ...cp5State().progress, checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp2" } } },
      topics, now, budgetMinutes: 30, wordProgress: {}, topicStages: {}, upcomingTopicIds: ["tech-network-address"], log: merged,
    });
    expect(active.find((a) => a.id === "act:vocab")?.spec).toEqual(first.spec);
  });

  it("部分演習の問題は最初に選んだ端末のものに固定される", async () => {
    const [drill] = kakomon().filter((a) => a.kind === "past_exam_drill");
    await call({ action: "offer", activities: [activityRowInput(drill)] });
    const a = await call({ action: "attach", key: "act:past-exam", questionIds: ["ipa-it-passport-2026-q001", "ipa-it-passport-2025-q002"] });
    const b = await call({ action: "attach", key: "act:past-exam", questionIds: ["ipa-it-passport-2024-q003"] });
    expect(a.json.questionIds).toEqual(["ipa-it-passport-2026-q001", "ipa-it-passport-2025-q002"]);
    expect(b.json.questionIds).toEqual(a.json.questionIds);
    const remote = (await call({ action: "list" })).json.activities as RemoteActivityState[];
    const restored = kakomonActivityFromSpec(remote[0].payload as Parameters<typeof kakomonActivityFromSpec>[0]);
    expect(restored.href).toContain("ids=ipa-it-passport-2026-q001%2Cipa-it-passport-2025-q002");
  });

  it("出した時点の保存に失敗していても、完了時に中身ごと完了で入る", async () => {
    const v = vocab();
    await call({ action: "complete", key: "act:vocab", activity: activityRowInput(v) });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ activity_key: "act:vocab", status: "completed", completion_source: "app_actual" });
  });

  it("入力検証: 不正な key・payload・日付は 400、未ログインは 401、記録期間外の書き込みは 403", async () => {
    const v = activityRowInput(vocab());
    expect((await call({ action: "offer", activities: [{ ...v, key: "act:other" }] })).status).toBe(400);
    expect((await call({ action: "offer", activities: [{ ...v, key: "act:past-exam" }] })).status).toBe(400);
    expect((await call({ action: "offer", activities: [{ ...v, payload: { v: 1, kind: "vocab" } }] })).status).toBe(400);
    expect((await call({ action: "list", date: "2026/09/26" })).status).toBe(400);
    mocks.getRequestUserId.mockResolvedValueOnce(null);
    expect((await call({ action: "list" })).status).toBe(401);
    mocks.canRecordStudyForUser.mockResolvedValueOnce(false);
    expect((await call({ action: "offer", activities: [v] })).status).toBe(403);
    expect(db.rows).toHaveLength(0);
  });
});

describe("サーバが使えないとき", () => {
  it("取得できなければ端末のキャッシュだけで Today を組み立てる（止まらない）", () => {
    const v = vocab();
    const local = { offered: { [v.id]: v }, done: {} };
    const merged = mergeActivityLogs(local, null);
    expect(merged.offered).toEqual(local.offered);
    expect(merged.unsyncedDone).toEqual([]);
  });

  it("端末でだけ完了していた分は完了扱いのまま、サーバへ再送する対象になる", () => {
    const v = vocab();
    const merged = mergeActivityLogs(
      { offered: { [v.id]: v }, done: { [v.id]: v } },
      [{ key: v.id, payload: v.spec, done: false }],
    );
    expect(Object.keys(merged.done)).toEqual([v.id]);
    expect(merged.unsyncedDone).toEqual([v]);
  });
});
