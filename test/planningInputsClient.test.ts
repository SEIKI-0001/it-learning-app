import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysUntilExam } from "@/lib/aiPlanner";
import { mergeProgress } from "@/lib/mergeAppState";
import {
  daysUntilExamDate,
  havePlanningInputsChanged,
  planningInputsFromProfile,
  planningInputsFromRow,
} from "@/lib/planningInputs";
import { initializeAppState } from "@/lib/storage";
import {
  buildWeeklyPlan,
  generateLearningPlan,
  rebuildWeeklyPlanForPlanningChange,
  resolveWeeklyPlan,
} from "@/lib/studyPlanner";
import {
  invalidateProgressBootstrapCache,
  loadCachedProgressBootstrap,
  saveCachedProgressBootstrap,
  saveProfileToDb,
} from "@/lib/userSession";
import type { AppState, UserProfile, WeeklyPlan } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";

// 設定画面で試験日・学習可能時間を変えたとき、クライアント側で使う派生値
// （残り日数・学習ペース・直前期判定・今週のゴール/タスク）が新しい条件に揃い、
// 一次データを変えないこと、古い /progress 初期表示キャッシュを使わないことの回帰テスト。

// JST 12:00 / UTC 03:00。どちらのタイムゾーンで実行しても今日は 2026-09-26（土）。
const NOW = new Date("2026-09-26T03:00:00.000Z");
const THIS_WEEK = "2026-09-21";
const STALE_WEEKLY: WeeklyPlan = {
  weekStartDate: THIS_WEEK,
  topicIds: ["stale-topic"],
  reviewIds: ["stale-review"],
};

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    itExperience: "none",
    dailyMinutes: "20",
    examPlan: "decided",
    confidence: 2,
    examDate: "2026-09-26",
    planStartDate: "2026-09-01",
    weekdayMinutes: 20,
    holidayMinutes: 60,
    weakFields: ["technology"],
    studyStyle: "balanced",
    ...overrides,
  };
}

function stateWith(p: UserProfile): AppState {
  const base = initializeAppState(p);
  return {
    ...base,
    progress: {
      ...base.progress,
      completedTopics: ["tech-network"],
      topicMastery: { "tech-network": 40 },
      weeklyPlan: STALE_WEEKLY,
      checkpointProgress: {
        ...base.progress.checkpointProgress!,
        clearedCheckpointIds: ["cp0", "cp1"] as CheckpointId[],
        earnedBadges: [{ badgeId: "badge-cp1", earnedAt: "2026-09-10T01:00:00.000Z" }],
      },
    },
    answers: [{
      questionId: "q-1",
      selectedChoice: "A",
      isCorrect: true,
      answeredAt: "2026-09-20T01:00:00.000Z",
      tag: "network",
      topicId: "tech-network",
    }],
  };
}

/** 設定画面の保存処理と同じ手順: プロフィール差し替え → 週次計画の引き直し。 */
function applySettings(state: AppState, updated: UserProfile): AppState {
  const next = { ...state, profile: updated };
  return {
    ...next,
    progress: {
      ...next.progress,
      weeklyPlan: rebuildWeeklyPlanForPlanningChange(next, undefined, NOW),
    },
  };
}

describe("planning inputs の判定", () => {
  it("試験日・平日/休日の学習可能時間の変更だけを planning inputs の変更とみなす", () => {
    const before = planningInputsFromProfile(profile());
    expect(havePlanningInputsChanged(before, planningInputsFromProfile(profile({ examDate: "2026-10-02" })))).toBe(true);
    expect(havePlanningInputsChanged(before, planningInputsFromProfile(profile({ examDate: undefined })))).toBe(true);
    expect(havePlanningInputsChanged(before, planningInputsFromProfile(profile({ weekdayMinutes: 60 })))).toBe(true);
    expect(havePlanningInputsChanged(before, planningInputsFromProfile(profile({ holidayMinutes: 120 })))).toBe(true);

    expect(havePlanningInputsChanged(before, planningInputsFromProfile(profile({
      weakFields: ["strategy"],
      studyStyle: "rush",
      confidence: 5,
      planStartDate: "2026-09-10",
    })))).toBe(false);
  });

  it("DB 行とクライアントのプロフィールを同じ基準で比較する", () => {
    const row = { exam_date: "2026-09-26", weekday_minutes: 20, holiday_minutes: 60 };
    expect(havePlanningInputsChanged(planningInputsFromRow(row), planningInputsFromProfile(profile()))).toBe(false);
    expect(havePlanningInputsChanged(null, planningInputsFromProfile(profile()))).toBe(true);
    expect(havePlanningInputsChanged(
      planningInputsFromRow({ exam_date: null, weekday_minutes: null, holiday_minutes: null }),
      planningInputsFromProfile(profile({ examDate: "", weekdayMinutes: undefined, holidayMinutes: undefined })),
    )).toBe(false);
  });

  it("残り日数はサーバー（統合進捗・立て直し案）と画面（aiPlanner）で同じ計算", () => {
    expect(daysUntilExamDate("2026-09-26", NOW)).toBe(0);
    expect(daysUntilExamDate("2026-10-02", NOW)).toBe(6);
    expect(daysUntilExam(profile({ examDate: "2026-10-02" }), NOW)).toBe(6);
    expect(daysUntilExamDate(null, NOW)).toBeNull();
    expect(daysUntilExamDate("not-a-date", NOW)).toBeNull();
  });
});

describe("設定変更後のクライアント側の学習計画", () => {
  it("ケース1: 試験日 9/26→10/2 で残り日数・直前期判定・今週のゴール/タスクが新条件になる", () => {
    const before = stateWith(profile());
    const beforePlan = generateLearningPlan(before, undefined, NOW);
    expect(beforePlan.daysUntilExam).toBe(0);
    expect(beforePlan.currentPhase).toBe("phase6");

    const after = applySettings(before, profile({ examDate: "2026-10-02" }));
    const afterPlan = generateLearningPlan(after, undefined, NOW);

    expect(afterPlan.daysUntilExam).toBe(6);
    expect(afterPlan.currentPhase).not.toBe("phase6");
    expect(afterPlan.weeklyGoal.headline).not.toBe(beforePlan.weeklyGoal.headline);
    // 同じ週でも旧条件の週次計画は残さない。
    expect(after.progress.weeklyPlan).toMatchObject({ weekStartDate: THIS_WEEK });
    expect(after.progress.weeklyPlan?.revisedAt).toBe(NOW.toISOString());
    expect(afterPlan.weeklyItems.map((i) => i.topicId)).not.toContain("stale-topic");
    expect(afterPlan.weeklyItems.map((i) => i.topicId)).not.toContain("stale-review");
    expect(after.progress.weeklyPlan).toEqual({
      ...buildWeeklyPlan(after, undefined, NOW),
      revisedAt: NOW.toISOString(),
    });
  });

  it("通常の学習中は同じ週の週次計画を入れ替えない（設定変更時だけの例外）", () => {
    const state = stateWith(profile({ examDate: "2026-10-02" }));
    expect(resolveWeeklyPlan(state, undefined, NOW)).toBe(STALE_WEEKLY);
  });

  it("試験日が遠のくと今週の対象テーマ数も新条件から計算し直す", () => {
    const near = applySettings(stateWith(profile()), profile({ examDate: "2026-10-02" }));
    const far = applySettings(stateWith(profile()), profile({ examDate: "2027-09-26" }));
    expect(far.progress.weeklyPlan!.topicIds.length)
      .toBeLessThan(near.progress.weeklyPlan!.topicIds.length);
  });

  it("ケース3: 平日20分→60分で学習ペース（目安時間・学習可能総時間）が新条件になる", () => {
    const before = stateWith(profile({ examDate: "2026-10-02" }));
    const beforePlan = generateLearningPlan(before, undefined, NOW);

    const after = applySettings(before, profile({
      examDate: "2026-10-02",
      weekdayMinutes: 60,
      dailyMinutes: "60",
    }));
    const afterPlan = generateLearningPlan(after, undefined, NOW);

    expect(beforePlan.dailyMinutesTarget).toBe(20);
    expect(afterPlan.dailyMinutesTarget).toBe(60);
    expect(afterPlan.totalAvailableMinutes!).toBeGreaterThan(beforePlan.totalAvailableMinutes!);
    expect(after.progress.weeklyPlan?.revisedAt).toBe(NOW.toISOString());
    expect(after.progress.weeklyPlan?.topicIds).not.toContain("stale-topic");
  });

  it("ケース5: 週次計画以外の進捗（完了・習熟度・Checkpoint・バッジ）と回答履歴は変えない", () => {
    const before = stateWith(profile());
    const after = applySettings(before, profile({ examDate: "2026-10-02" }));

    expect(after.progress).toEqual({ ...before.progress, weeklyPlan: after.progress.weeklyPlan });
    expect(after.answers).toBe(before.answers);
  });

  it("端末間マージで、設定変更で引き直した計画が同じ週の旧計画と混ざらない", () => {
    const before = stateWith(profile());
    const after = applySettings(before, profile({ examDate: "2026-10-02" }));

    expect(mergeProgress(before.progress, after.progress).weeklyPlan).toEqual(after.progress.weeklyPlan);
    expect(mergeProgress(after.progress, before.progress).weeklyPlan).toEqual(after.progress.weeklyPlan);

    // 引き直しでない同週の計画同士は従来どおり和集合。
    const other: WeeklyPlan = { weekStartDate: THIS_WEEK, topicIds: ["other"], reviewIds: [] };
    expect(mergeProgress(before.progress, { ...before.progress, weeklyPlan: other }).weeklyPlan)
      .toEqual({ weekStartDate: THIS_WEEK, topicIds: ["stale-topic", "other"], reviewIds: ["stale-review"] });
  });
});

describe("saveProfileToDb / progress bootstrap キャッシュ", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
        removeItem: (key: string) => void storage.delete(key),
      },
    });
    saveCachedProgressBootstrap(null, {
      integratedStatus: null,
      examReadiness: null,
      planAdjustmentProposal: {
        proposalId: "proposal-stale",
        statusDate: "2026-09-26",
        triggerType: "near_exam",
        severity: "severe",
        headline: "旧: 直前期の立て直し",
        reasonSummary: "試験まであと0日です",
        options: [],
        status: "proposed",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubSaveResponse(status: number, body: unknown) {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("planning inputs の再計算まで成功したら古い bootstrap キャッシュを破棄する", async () => {
    const fetch = stubSaveResponse(200, { ok: true, readinessUpdated: false, planningInputsChanged: true });

    const result = await saveProfileToDb("user-1", profile({ examDate: "2026-10-02" }), { replan: true });

    expect(result).toEqual({ ok: true, planningInputsChanged: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ replan: true });
    expect(loadCachedProgressBootstrap()).toBeNull();
  });

  it("planning inputs 以外の保存ではキャッシュを残す", async () => {
    stubSaveResponse(200, { ok: true, readinessUpdated: false, planningInputsChanged: false });

    const result = await saveProfileToDb("user-1", profile({ weakFields: ["strategy"] }));

    expect(result).toEqual({ ok: true, planningInputsChanged: false });
    expect(loadCachedProgressBootstrap()?.planAdjustmentProposal?.proposalId).toBe("proposal-stale");
  });

  it("保存・再計算に失敗したら ok:false を返す（保存できたように見せない）", async () => {
    stubSaveResponse(500, { ok: false, error: "replan failed", profileSaved: true });

    const result = await saveProfileToDb("user-1", profile({ examDate: "2026-10-02" }), { replan: true });

    expect(result).toEqual({ ok: false, planningInputsChanged: false });
  });

  it("通信エラーでも ok:false を返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(saveProfileToDb("user-1", profile())).resolves.toEqual({
      ok: false,
      planningInputsChanged: false,
    });
  });

  it("invalidateProgressBootstrapCache は /progress 初期表示キャッシュだけを消す", () => {
    storage.set("fequest:appstate", "{}");
    invalidateProgressBootstrapCache();
    expect(loadCachedProgressBootstrap()).toBeNull();
    expect(storage.get("fequest:appstate")).toBe("{}");
  });
});
