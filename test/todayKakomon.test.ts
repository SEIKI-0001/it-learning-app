import { describe, expect, it } from "vitest";
import type { UserAnswer, UserProgress } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { buildKakomonActivities, KAKOMON_MIXED_TARGET } from "@/lib/todayKakomon";
import { KAKOMON_FIELD_DRILL_TARGET } from "@/lib/studyPlanner";
import { parseOfficialQuestionId, summarizeOfficialHistory } from "@/lib/pastExam/officialHistory";
import { TODAY_ACTIVITY_PRIORITY } from "@/lib/learningLoop";

const topics = getAllTopics();
const now = new Date(2026, 8, 26, 12, 0, 0);
const yesterday = new Date(2026, 8, 25, 20, 0, 0).toISOString();
const todayMorning = new Date(2026, 8, 26, 8, 0, 0).toISOString();

function progress(cp: CheckpointId, completedRatio = 0): UserProgress {
  return {
    level: 1, exp: 0, streakCount: 0, weakTags: [],
    completedTopics: topics.slice(0, Math.round(topics.length * completedRatio)).map((t) => t.id),
    topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
    currentDay: 1, completedDays: [],
    checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: cp },
  };
}

function answer(id: string, isCorrect: boolean, answeredAt = yesterday): UserAnswer {
  return { questionId: id, isCorrect, answeredAt, tag: "t", topicId: "tech-network-address" };
}

/** 2026年度の問番号 from〜to（2026: ストラテジ1-34 / マネジメント35-54 / テクノロジ55-100）。 */
function answered(from: number, to: number, isCorrect = true, at = yesterday): UserAnswer[] {
  const list: UserAnswer[] = [];
  for (let n = from; n <= to; n += 1) {
    list.push(answer(`ipa-it-passport-2026-q${String(n).padStart(3, "0")}`, isCorrect, at));
  }
  return list;
}

function build(p: UserProgress, answers: UserAnswer[] = [], options: { days?: number | null; budget?: number } = {}) {
  return buildKakomonActivities({
    topics, progress: p, answers,
    daysRemaining: options.days === undefined ? 60 : options.days,
    budgetMinutes: options.budget ?? 30,
    now,
  });
}

describe("公式過去問の履歴", () => {
  it("ID から年度・問番号・公式区分を読む", () => {
    expect(parseOfficialQuestionId("ipa-it-passport-2026-q016")).toMatchObject({ year: 2026, questionNumber: 16, field: "strategy" });
    expect(parseOfficialQuestionId("ipa-it-passport-2022-q050")).toMatchObject({ field: "management" });
    expect(parseOfficialQuestionId("tech-network-address-ex1")).toBeNull();
  });

  it("最新の回答で誤答を判定し、今日の誤答は翌日以降に回す", () => {
    const history = summarizeOfficialHistory([
      answer("ipa-it-passport-2026-q001", false),
      answer("ipa-it-passport-2026-q001", true, todayMorning), // 取り返した
      answer("ipa-it-passport-2026-q002", false),
      answer("ipa-it-passport-2026-q060", false, todayMorning), // 今日の誤答
    ], now);
    expect(history.pendingWrongIds).toEqual(["ipa-it-passport-2026-q002"]);
    expect([...history.latestWrongIds].sort()).toEqual(["ipa-it-passport-2026-q002", "ipa-it-passport-2026-q060"]);
    expect(history.totalAnswered).toBe(3);
    expect(history.answeredToday).toBe(2);
  });
});

describe("Today の公式過去問タスク", () => {
  it("通常ユーザーは CP5 で公式過去問（分野別）が出る", () => {
    const tasks = build(progress("cp5"));
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      kind: "past_exam_drill",
      primaryEligible: true,
      priority: TODAY_ACTIVITY_PRIORITY.pastExamDrill,
      reason: "公式過去問で、本番で解ける力をつけます",
    });
    // 回答数が同じなら正答率→区分の並びで決まる。タイトルは機能名ではなく行動で書く。
    expect(tasks[0].title).toMatch(/^(テクノロジ|マネジメント|ストラテジ)系の公式問題を\d+問解く$/);
    expect(tasks[0].href).toMatch(/^\/past-exams\/drill\?stage=field-drill&/);
  });

  it("条件を満たすユーザーは CP4 でも前倒しで解禁される", () => {
    const tasks = build(progress("cp4", 0.3), [], { days: 10 });
    expect(tasks[0]?.reason).toBe("試験日が近いので、公式過去問を前倒しで始めます");
  });

  it("条件未達のユーザーには過去問を出さない", () => {
    expect(build(progress("cp4", 0.2), [], { days: 60 })).toEqual([]);
    expect(build(progress("cp2", 0.9), [], { days: 5 })).toEqual([]);
    // 自由演習で間違えた問題があっても、解禁前は解き直しを強制しない。
    expect(build(progress("cp3", 0.1), answered(1, 3, false))).toEqual([]);
  });

  it("回答数の少ない分野から分野別演習を進める", () => {
    const tasks = build(progress("cp5"), [...answered(1, 20), ...answered(55, 75)]);
    expect(tasks[0].title).toContain("マネジメント");
    expect(tasks[0].href).toContain("field=management");
  });

  it("3分野を一通り解いたら3分野混合、十分解いたらランダム演習へ進む", () => {
    const drilled = [
      ...answered(1, KAKOMON_FIELD_DRILL_TARGET),
      ...answered(35, 35 + KAKOMON_FIELD_DRILL_TARGET - 1),
      ...answered(55, 55 + KAKOMON_FIELD_DRILL_TARGET - 1),
    ];
    const mixed = build(progress("cp5"), drilled);
    expect(mixed[0].title).toMatch(/^3分野の公式問題を\d+問解く$/);
    expect(mixed[0].href).toContain("stage=mixed");

    const many = answered(1, KAKOMON_MIXED_TARGET);
    const random = build(progress("cp5"), many);
    expect(random[0].title).toMatch(/^公式問題をランダムに\d+問解く$/);
    expect(random[0].href).toContain("stage=random");
  });

  it("前日までの誤答があれば、解き直しを最優先で出す（期限切れ復習の次）", () => {
    const tasks = build(progress("cp5"), answered(55, 58, false));
    expect(tasks[0]).toMatchObject({
      kind: "past_exam_retry",
      title: "前回の過去問の誤答を解き直す",
      countLabel: "4問",
      priority: TODAY_ACTIVITY_PRIORITY.pastExamRetry,
    });
    expect(tasks[0].href).toContain("stage=retry-wrong");
    expect(tasks[0].href).toContain("ipa-it-passport-2026-q055");
    expect(TODAY_ACTIVITY_PRIORITY.pastExamRetry).toBeLessThan(6000); // overdue_review
  });

  it("今日間違えたばかりの問題は、その日のうちには解き直しに出さない", () => {
    const tasks = build(progress("cp5"), answered(55, 58, false, todayMorning));
    expect(tasks.some((task) => task.kind === "past_exam_retry")).toBe(false);
  });

  it("CP6 で時間がある日は年度別100問（既存の年度別演習）を出す", () => {
    const tasks = build(progress("cp6"), answered(1, 100).slice(0, 0), { budget: 120 });
    expect(tasks[0]).toMatchObject({ kind: "past_exam_mock", countLabel: "100問", estimatedMinutes: 120 });
    expect(tasks[0].href).toMatch(/^\/past-exams\/20\d\d$/);
    // 時間が少ない日は部分演習にとどめる
    expect(build(progress("cp6"), [], { budget: 30 })[0].kind).toBe("past_exam_drill");
  });

  it("問題数は時間予算に合わせる（分野別は10〜15問）", () => {
    expect(build(progress("cp5"), [], { budget: 15 })[0].countLabel).toBe("10問");
    expect(build(progress("cp5"), [], { budget: 60 })[0].countLabel).toBe("15問");
  });
});
