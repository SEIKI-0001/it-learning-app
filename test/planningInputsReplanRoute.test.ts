import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeExamReadinessResult } from "@/test/fixtures/examReadiness/result";

// 設定画面で試験日・学習可能時間（planning inputs）を変えたとき、
// /api/progress/save が学習計画の派生データ（統合進捗・立て直し案）を作り直し、
// 一次データ（学習実績・回答履歴・Exam Readiness 等）には触れないことの回帰テスト。

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getInternalUserId: vi.fn(),
  getRequestUserId: vi.fn(),
  getRequestUserIdFast: vi.fn(),
  getServiceSupabase: vi.fn(),
  getCurrentReadiness: vi.fn(),
  recalculateExamReadiness: vi.fn(),
}));

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
  getCurrentReadiness: mocks.getCurrentReadiness,
  recalculateExamReadiness: mocks.recalculateExamReadiness,
}));

import { POST as saveRoute } from "@/app/api/progress/save/route";
import { POST as bootstrapRoute } from "@/app/api/progress/bootstrap/route";
import { POST as generateRoute } from "@/app/api/plan-adjustment/generate/route";
import { progressToRow, profileToRow } from "@/lib/dbMappers";
import { initializeAppState } from "@/lib/storage";
import type { UserProfile } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";

// ---------------------------------------------------------------------------
// インメモリの Supabase もどき（このテストで使うクエリチェーンだけを実装）
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };

class FakeDb {
  tables: Record<string, Row[]> = {};
  writes: { table: string; op: string }[] = [];
  failUpdatesOn = new Set<string>();
  private seq = 0;

  from(table: string) {
    this.tables[table] ??= [];
    return new FakeQuery(this, table);
  }

  nextId(): string {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, "0")}`;
  }

  nextCreatedAt(): string {
    this.seq += 1;
    return new Date(Date.now() + this.seq).toISOString();
  }

  snapshot(table: string): Row[] {
    return structuredClone(this.tables[table] ?? []);
  }
}

class FakeQuery implements PromiseLike<Result> {
  private filters: ((row: Row) => boolean)[] = [];
  private op: "select" | "update" | "upsert" | "insert" = "select";
  private payload: Row = {};
  private conflictKeys: string[] = [];
  private orderBy: { key: string; ascending: boolean } | null = null;
  private limitN: number | null = null;

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  gte(key: string, value: unknown) {
    this.filters.push((row) => String(row[key]) >= String(value));
    return this;
  }
  order(key: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { key, ascending: options.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row, options: { onConflict?: string } = {}) {
    this.op = "upsert";
    this.payload = payload;
    this.conflictKeys = (options.onConflict ?? "id").split(",");
    return this;
  }
  insert(payload: Row) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  async maybeSingle(): Promise<Result> {
    const { data, error } = this.execute();
    return { data: (data as Row[])[0] ?? null, error };
  }
  async single(): Promise<Result> {
    const { data, error } = this.execute();
    const row = (data as Row[])[0] ?? null;
    return row ? { data: row, error } : { data: null, error: error ?? { message: "no rows" } };
  }
  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matches(): Row[] {
    return this.db.tables[this.table].filter((row) => this.filters.every((f) => f(row)));
  }

  private newRow(): Row {
    const idKey = this.table === "plan_adjustment_proposals" ? "proposal_id" : "id";
    return {
      [idKey]: this.db.nextId(),
      created_at: this.db.nextCreatedAt(),
      ...this.payload,
    };
  }

  private execute(): Result {
    const rows = this.db.tables[this.table];
    if (this.op !== "select") this.db.writes.push({ table: this.table, op: this.op });

    if (this.op === "update") {
      if (this.db.failUpdatesOn.has(this.table)) {
        return { data: [], error: { message: "update failed" } };
      }
      const hit = this.matches();
      for (const row of hit) Object.assign(row, this.payload);
      return { data: structuredClone(hit), error: null };
    }
    if (this.op === "upsert") {
      const existing = rows.find((row) =>
        this.conflictKeys.every((key) => row[key] === this.payload[key]),
      );
      if (existing) {
        Object.assign(existing, this.payload);
        return { data: [structuredClone(existing)], error: null };
      }
      const row = this.newRow();
      rows.push(row);
      return { data: [structuredClone(row)], error: null };
    }
    if (this.op === "insert") {
      const row = this.newRow();
      rows.push(row);
      return { data: [structuredClone(row)], error: null };
    }

    let hit = this.matches();
    if (this.orderBy) {
      const { key, ascending } = this.orderBy;
      hit = [...hit].sort((a, b) => {
        const cmp = String(a[key]).localeCompare(String(b[key]));
        return ascending ? cmp : -cmp;
      });
    }
    if (this.limitN !== null) hit = hit.slice(0, this.limitN);
    return { data: structuredClone(hit), error: null };
  }
}

// ---------------------------------------------------------------------------
// 初期状態: 今日 2026-09-26、試験日 2026-09-26（残り0日）
// ---------------------------------------------------------------------------

const USER_ID = "10000000-0000-0000-0000-000000000001";
const TODAY = "2026-09-26";
const STALE_MESSAGE = "STALE: 試験日変更前に計算した統合進捗";
const STALE_REASON = "試験まであと0日です";

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    itExperience: "none",
    dailyMinutes: "20",
    examPlan: "decided",
    confidence: 2,
    examDate: TODAY,
    planStartDate: "2026-09-01",
    weekdayMinutes: 20,
    holidayMinutes: 60,
    weakFields: ["technology"],
    studyStyle: "balanced",
    ...overrides,
  };
}

function seed(db: FakeDb) {
  const base = initializeAppState(profile());
  const progress = {
    ...base.progress,
    completedTopics: ["tech-network"],
    topicMastery: { "tech-network": 40 },
    weeklyPlan: { weekStartDate: "2026-09-21", topicIds: ["stale-topic"], reviewIds: [] },
    checkpointProgress: {
      ...base.progress.checkpointProgress!,
      clearedCheckpointIds: ["cp0", "cp1"] as CheckpointId[],
      earnedBadges: [{ badgeId: "badge-cp1", earnedAt: "2026-09-10T01:00:00.000Z" }],
    },
  };
  db.tables.user_profiles = [profileToRow(USER_ID, profile())];
  db.tables.user_progress = [{ ...progressToRow(USER_ID, progress) }];
  db.tables.user_answers = [{
    user_id: USER_ID,
    question_id: "q-1",
    selected_choice: "A",
    is_correct: true,
    answered_at: "2026-09-20T01:00:00.000Z",
    tag: "network",
    topic_id: "tech-network",
  }];
  db.tables.topic_progress = [{ user_id: USER_ID, topic_id: "tech-network", stage: "weak" }];
  db.tables.question_attempts = [{
    user_id: USER_ID,
    question_type: "exam_level",
    is_correct: false,
    answered_at: "2026-09-25T01:00:00.000Z",
  }];
  db.tables.user_word_progress = [];
  db.tables.daily_progress_reports = [];
  db.tables.user_reference_books = [];
  db.tables.exam_readiness_current = [{ user_id: USER_ID, score: 40, band: "needs_work" }];
  db.tables.integrated_learning_status = [{
    id: "status-stale",
    user_id: USER_ID,
    status_date: TODAY,
    overall_status: "consultation_needed",
    readiness_score: 40,
    input_progress_rate: 0,
    basic_understanding_rate: 0,
    flashcard_mastery_rate: 0,
    exam_ready_rate: 0,
    field_balance_score: 0,
    weak_topic_count: 1,
    exam_ready_topic_count: 0,
    basic_understood_topic_count: 0,
    review_needed_topic_count: 0,
    weak_topics: [],
    main_risks: [],
    recommended_focus: { textbook: 10, review: 40, examPractice: 50 },
    generated_message: STALE_MESSAGE,
    created_at: "2026-09-26T00:00:00.000Z",
  }];
  db.tables.plan_adjustment_proposals = [
    {
      proposal_id: "proposal-accepted-old",
      user_id: USER_ID,
      status_date: "2026-09-25",
      source_status_id: null,
      trigger_type: "near_exam",
      severity: "severe",
      headline: "旧: 直前期の立て直し",
      reason_summary: "試験まであと1日です",
      options: [],
      selected_option_id: "weak_focus",
      status: "accepted",
      accepted_at: "2026-09-25T02:00:00.000Z",
      created_at: "2026-09-25T01:00:00.000Z",
    },
    {
      proposal_id: "proposal-stale",
      user_id: USER_ID,
      status_date: TODAY,
      source_status_id: "status-stale",
      trigger_type: "near_exam",
      severity: "severe",
      headline: "旧: 直前期の立て直し",
      reason_summary: STALE_REASON,
      options: [],
      selected_option_id: null,
      status: "proposed",
      accepted_at: null,
      created_at: "2026-09-26T00:30:00.000Z",
    },
  ];
}

function post(route: (request: Request) => Promise<Response>, body: unknown) {
  return route(new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

function statusRowsFor(db: FakeDb, date: string) {
  return db.tables.integrated_learning_status.filter((r) => r.status_date === date);
}

function activeProposals(db: FakeDb) {
  return db.tables.plan_adjustment_proposals.filter(
    (r) => r.status === "proposed" || r.status === "accepted",
  );
}

let db: FakeDb;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // JST 12:00 / UTC 03:00。どちらのタイムゾーンで実行しても今日は 2026-09-26。
  vi.setSystemTime(new Date("2026-09-26T03:00:00.000Z"));
  db = new FakeDb();
  seed(db);
  mocks.getInternalUserId.mockResolvedValue(USER_ID);
  mocks.getRequestUserId.mockResolvedValue(USER_ID);
  mocks.getRequestUserIdFast.mockResolvedValue(USER_ID);
  mocks.getServiceSupabase.mockReturnValue(db);
  mocks.getCurrentReadiness.mockResolvedValue(
    makeExamReadinessResult({ score: 40, band: "needs_work" }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("planning inputs change on /api/progress/save", () => {
  it("ケース1: 試験日 9/26→10/2 で統合進捗・立て直し案が新しい試験日（あと6日）に揃う", async () => {
    const response = await post(saveRoute, { profile: profile({ examDate: "2026-10-02" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      readinessUpdated: false,
      planningInputsChanged: true,
    });

    // 当日分の統合進捗は作り直され（重複行は作らない）、旧スナップショットは残らない。
    const statusRows = statusRowsFor(db, TODAY);
    expect(statusRows).toHaveLength(1);
    expect(statusRows[0].generated_message).not.toBe(STALE_MESSAGE);

    // 旧条件の提案は削除せず expired。accepted の選択履歴は保持する。
    const old = db.tables.plan_adjustment_proposals.filter((r) =>
      ["proposal-stale", "proposal-accepted-old"].includes(String(r.proposal_id)),
    );
    expect(old).toHaveLength(2);
    expect(old.every((r) => r.status === "expired")).toBe(true);
    const accepted = old.find((r) => r.proposal_id === "proposal-accepted-old")!;
    expect(accepted.selected_option_id).toBe("weak_focus");
    expect(accepted.accepted_at).toBe("2026-09-25T02:00:00.000Z");

    // 新しい条件で提案を作り直す。「あと0日」は残らない。
    const active = activeProposals(db);
    expect(active).toHaveLength(1);
    expect(active[0].reason_summary).toContain("試験まであと6日です");
    expect(String(active[0].reason_summary)).not.toContain("あと0日");
    expect(active[0].source_status_id).toBe(statusRows[0].id);

    // /progress の bootstrap と /plan の generate も新しい提案を返す（古い案に負けない）。
    const bootstrap = await (await post(bootstrapRoute, {})).json();
    expect(bootstrap.planAdjustmentProposal.proposalId).toBe(active[0].proposal_id);
    expect(bootstrap.planAdjustmentProposal.reasonSummary).not.toContain("あと0日");
    expect(bootstrap.integratedStatus.generatedMessage).not.toBe(STALE_MESSAGE);
    expect(bootstrap.appState.profile.examDate).toBe("2026-10-02");

    const generated = await (await post(generateRoute, {})).json();
    expect(generated.proposal.proposalId).toBe(active[0].proposal_id);
    expect(activeProposals(db)).toHaveLength(1);
  });

  it("ケース2: 当日の統合進捗が既にあっても、変更後の試験日で当日分を再計算する", async () => {
    // 残り0日（直前期・本番対応ほぼ0）→ consultation_needed のスナップショットがある。
    expect(statusRowsFor(db, TODAY)[0].overall_status).toBe("consultation_needed");

    const response = await post(saveRoute, { profile: profile({ examDate: "2026-12-26" }) });
    expect(response.status).toBe(200);

    // 試験まで91日 → 直前期ではなくなり、翌日を待たずに判定が変わる。
    const [row] = statusRowsFor(db, TODAY);
    expect(row.overall_status).not.toBe("consultation_needed");
    expect(row.recommended_focus).not.toEqual({ textbook: 10, review: 40, examPractice: 50 });

    // bootstrap の「当日分があれば再利用」経路でも、再計算後の当日分が返る。
    const bootstrap = await (await post(bootstrapRoute, {})).json();
    expect(bootstrap.integratedStatus.overallStatus).toBe(row.overall_status);
    expect(bootstrap.planAdjustmentProposal?.reasonSummary ?? "").not.toContain("試験まであと");
  });

  it("ケース3: 試験日は同じで平日20分→60分に変えても再計算・提案の引き直しを行う", async () => {
    db.tables.user_profiles = [profileToRow(USER_ID, profile({ examDate: "2026-10-02" }))];

    const response = await post(saveRoute, {
      profile: profile({ examDate: "2026-10-02", weekdayMinutes: 60, dailyMinutes: "60" }),
    });

    expect(await response.json()).toMatchObject({ ok: true, planningInputsChanged: true });
    expect(statusRowsFor(db, TODAY)[0].generated_message).not.toBe(STALE_MESSAGE);
    expect(db.tables.plan_adjustment_proposals.find((r) => r.proposal_id === "proposal-stale")!.status)
      .toBe("expired");
    const active = activeProposals(db);
    expect(active).toHaveLength(1);
    expect(active[0].reason_summary).toContain("試験まであと6日です");
    expect(db.tables.user_profiles[0].weekday_minutes).toBe(60);
  });

  it("ケース4: 苦手分野だけの変更では提案を expire せず、統合進捗も再生成しない", async () => {
    const beforeStatus = db.snapshot("integrated_learning_status");
    const beforeProposals = db.snapshot("plan_adjustment_proposals");

    const response = await post(saveRoute, { profile: profile({ weakFields: ["strategy"] }) });

    await expect(response.json()).resolves.toEqual({
      ok: true,
      readinessUpdated: false,
      planningInputsChanged: false,
    });
    expect(db.tables.user_profiles[0].weak_fields).toEqual(["strategy"]);
    expect(db.tables.integrated_learning_status).toEqual(beforeStatus);
    expect(db.tables.plan_adjustment_proposals).toEqual(beforeProposals);
    expect(mocks.getCurrentReadiness).not.toHaveBeenCalled();
    expect(db.writes).toEqual([{ table: "user_profiles", op: "upsert" }]);
  });

  it("ケース5: 試験日を変えても回答履歴・topic progress・Exam Readiness・Checkpoint・バッジは変えない", async () => {
    const primaryTables = [
      "user_progress",
      "user_answers",
      "topic_progress",
      "question_attempts",
      "user_word_progress",
      "daily_progress_reports",
      "exam_readiness_current",
    ];
    const before = Object.fromEntries(primaryTables.map((t) => [t, db.snapshot(t)]));

    await post(saveRoute, { profile: profile({ examDate: "2026-10-02" }) });

    for (const table of primaryTables) {
      expect(db.tables[table], table).toEqual(before[table]);
    }
    const progressRow = db.tables.user_progress[0] as {
      checkpoint_progress: { clearedCheckpointIds: string[]; earnedBadges: { badgeId: string }[] };
    };
    expect(progressRow.checkpoint_progress.clearedCheckpointIds).toEqual(["cp0", "cp1"]);
    expect(progressRow.checkpoint_progress.earnedBadges.map((b) => b.badgeId)).toEqual(["badge-cp1"]);
    // 書き込みは派生データとプロフィールだけ。Exam Readiness の再計算もしない。
    const writtenTables = new Set(db.writes.map((w) => w.table));
    expect([...writtenTables].sort()).toEqual([
      "integrated_learning_status",
      "plan_adjustment_proposals",
      "user_profiles",
    ]);
    expect(mocks.recalculateExamReadiness).not.toHaveBeenCalled();
  });

  it("再計算に失敗したら ok:false を返し、保存できたように見せない", async () => {
    db.failUpdatesOn.add("plan_adjustment_proposals");

    const response = await post(saveRoute, { profile: profile({ examDate: "2026-10-02" }) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "replan failed" });
  });

  it("前回プロフィールだけ保存できて再計算に失敗した場合、replan 指定の再試行で再計算する", async () => {
    // DB 上は既に新しい試験日（サーバー側の比較では差分なし）。
    db.tables.user_profiles = [profileToRow(USER_ID, profile({ examDate: "2026-10-02" }))];

    const response = await post(saveRoute, {
      profile: profile({ examDate: "2026-10-02" }),
      replan: true,
    });

    expect(await response.json()).toMatchObject({ ok: true, planningInputsChanged: true });
    expect(activeProposals(db)[0].reason_summary).toContain("試験まであと6日です");
  });
});
