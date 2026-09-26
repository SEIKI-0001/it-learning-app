import { describe, expect, it } from "vitest";
import type { AppState, TodayActivity, UserAnswer } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics, getTopic } from "@/lib/content";
import {
  buildTodaysLearningQueue,
  getDueReviewTopics,
  PAST_EXAM_MISS_LABEL,
  TODAY_ACTIVITY_PRIORITY,
} from "@/lib/learningLoop";
import { generateTodayMenu } from "@/lib/aiPlanner";
import { buildTodayActivities } from "@/lib/todayActivities";
import { activityRouteTask, buildQuestRoute } from "@/lib/questRoute";
import { buildTodayPrimaryAction } from "@/lib/todayPrimary";
import { buildCheckpointGate } from "@/lib/checkpoints";
import { gradePastExam, recordPastExamLearningResult } from "@/lib/pastExam/scoring";
import { summarizeOfficialHistory } from "@/lib/pastExam/officialHistory";
import { getQuestionById } from "@/lib/questionBank";
import { toGradableQuestion } from "@/lib/pastExam/scoring";

const topics = getAllTopics();
const now = new Date(2026, 8, 26, 12, 0, 0);
const tomorrow = new Date(2026, 8, 27, 12, 0, 0);
const NETWORK = "tech-network-address";

function state(cp: CheckpointId, patch: Partial<AppState["progress"]> = {}, answers: UserAnswer[] = []): AppState {
  return {
    profile: { weekdayMinutes: 30 },
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: [], topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: cp },
      ...patch,
    },
    answers,
  } as unknown as AppState;
}

function activitiesFor(s: AppState, options: {
  at?: Date;
  stages?: Record<string, "terms_stabilizing">;
  upcoming?: string[];
  done?: TodayActivity[];
  wordProgress?: Parameters<typeof buildTodayActivities>[0]["wordProgress"];
} = {}) {
  const at = options.at ?? now;
  return buildTodayActivities({
    state: s,
    topics,
    now: at,
    budgetMinutes: 30,
    wordProgress: options.wordProgress ?? {},
    topicStages: options.stages ?? {},
    upcomingTopicIds: options.upcoming
      ?? buildTodaysLearningQueue({ state: s, progress: s.progress, topics, now: at })
        .flatMap((item) => (item.topicId ? [item.topicId] : [])).slice(0, 5),
    log: {
      offered: {},
      done: Object.fromEntries((options.done ?? []).map((a) => [a.id, a])),
    },
  });
}

function menuFor(s: AppState, activities: TodayActivity[], at = now) {
  return generateTodayMenu(s.profile, s.progress, topics, s.answers, at, 30, activities);
}

describe("Today の学習キューへの統合", () => {
  it("activities を渡さなければ、メニューは従来と完全に同じ", () => {
    const s = state("cp2");
    const before = generateTodayMenu(s.profile, s.progress, topics, s.answers, now, 30);
    expect(before.sequence).toBeUndefined();
    const withEmpty = menuFor(s, []);
    expect(withEmpty.items).toEqual(before.items);
    expect(withEmpty.totalMinutes).toBe(before.totalMinutes);
  });

  it("CP1 では単語・過去問タスクを出さない（現在の導線を維持）", () => {
    const s = state("cp1");
    expect(activitiesFor(s, { stages: { [NETWORK]: "terms_stabilizing" } }).active).toEqual([]);
  });

  it("CP2 の関連語は、そのトピックが今日のメニューに入ったときだけ、トピックの後に出す", () => {
    const s = state("cp2");
    const { active } = activitiesFor(s, { upcoming: [NETWORK] });
    expect(active[0]?.anchorTopicId).toBe(NETWORK);
    const menu = menuFor(s, active);
    const inMenu = menu.items.some((item) => item.topicId === NETWORK);
    const seq = menu.sequence!;
    const vocabIndex = seq.findIndex((e) => e.type === "activity");
    if (inMenu) {
      const topicIndex = seq.findIndex((e) => e.type === "topic" && e.item.topicId === NETWORK);
      expect(vocabIndex).toBeGreaterThan(topicIndex);
    } else {
      expect(vocabIndex).toBe(-1);
    }
  });

  it("CP5: 期限切れ復習 → 過去問誤答 → 公式過去問 → 弱点 → 単語 の順に並ぶ", () => {
    const [due, weak] = topics.filter((t) => t.field === "technology");
    const yesterday = new Date(2026, 8, 25, 19, 0, 0).toISOString();
    const s = state("cp5", {
      completedTopics: [due.id, weak.id],
      topicMastery: { [due.id]: 80, [weak.id]: 30 },
      topicMasteryStats: {
        [weak.id]: {
          topicId: weak.id, masteryScore: 30, lastEvaluatedAt: yesterday,
          correctCount: 0, incorrectCount: 2, reviewSuccessCount: 0, recentEvidence: [],
        },
      },
      reviewQueue: [{ topicId: due.id, dueAt: yesterday, reason: "期限" }],
    }, [
      { questionId: "ipa-it-passport-2026-q060", isCorrect: false, answeredAt: yesterday, tag: "x", topicId: due.id },
    ]);
    const { active } = activitiesFor(s, {
      wordProgress: {
        dns: {
          acronymId: "dns", status: "weak", correctCount: 0, wrongCount: 1, reviewCount: 1,
          lastReviewedAt: now.getTime() - 86_400_000, nextReviewAt: now.getTime() - 1, lastSelfRating: "forgot",
        },
      },
    });
    const queue = buildTodaysLearningQueue({ state: s, progress: s.progress, topics, now, activities: active });
    const order: string[] = queue.map((item) => item.activity?.kind ?? item.kind);
    const at = (kind: string) => order.indexOf(kind);
    expect(at("overdue_review")).toBe(0);
    expect(at("past_exam_retry")).toBe(1);
    expect(at("past_exam_drill")).toBeLessThan(at("low_mastery"));
    expect(at("past_exam_drill")).toBeLessThan(at("vocab"));
    // CP のバッジをその場でそろえるトピック（1500+）よりは下
    expect(TODAY_ACTIVITY_PRIORITY.pastExamDrill).toBeLessThan(1500);
    // 単語は弱点トピック（400〜）の後、CP 関連のない新規学習（300〜350）の前
    expect(TODAY_ACTIVITY_PRIORITY.wordsReviewLate).toBeLessThan(400);
    expect(TODAY_ACTIVITY_PRIORITY.wordsReviewLate).toBeGreaterThan(350);

    // 30分の予算に、過去問と単語が入る
    const menu = menuFor(s, active);
    const kinds = menu.sequence!.map((e) => (e.type === "activity" ? e.activity.kind : e.item.kind));
    expect(kinds).toContain("past_exam_retry");
    expect(kinds).toContain("past_exam_drill");
  });

  it("今日終えたタスクは出し直さず、ルートに「済み」で残す", () => {
    const s = state("cp5");
    const first = activitiesFor(s).active;
    const drill = first.find((a) => a.kind === "past_exam_drill")!;
    const after = activitiesFor(s, { done: [drill] });
    expect(after.active.some((a) => a.id === drill.id)).toBe(false);
    const nodes = buildQuestRoute(s, [], [drill.id], now, after.done);
    expect(nodes).toEqual([expect.objectContaining({ topicId: drill.id, state: "done", task: drill })]);
  });
});

describe("Today Primary との関係", () => {
  const gateFor = (s: AppState) => buildCheckpointGate(s, "cp3");

  it("通常の単語タスクは Primary（現在地）にしない", () => {
    const s = state("cp3");
    const vocab: TodayActivity = {
      id: "act:vocab", kind: "vocab", title: "今日の単語復習", detail: "DNS", countLabel: "期限が来た1語",
      estimatedMinutes: 2, priority: 250, reason: "期限", href: "/glossary/study?mode=task&ids=dns",
      ctaLabel: "用語を確認する", primaryEligible: false,
    };
    const topic = getTopic(NETWORK)!;
    const nodes = buildQuestRoute(s, [
      activityRouteTask(vocab),
      { topicId: topic.id, title: topic.title, estimatedMinutes: 5, activity: "learn" },
    ], null, now);
    expect(nodes.find((n) => n.state === "current")?.topicId).toBe(topic.id);
    const primary = buildTodayPrimaryAction({ state: s, nodes, gate: gateFor(s), queue: [], reviewItems: [] });
    expect(primary?.kind).not.toBe("vocab");

    // ほかにやることが無ければ、単語タスクが現在地になる
    const only = buildQuestRoute(s, [activityRouteTask(vocab)], null, now);
    expect(only[0].state).toBe("current");
  });

  it("terms_stabilizing の関連語は「○○の関連用語を固める」として Primary になれる", () => {
    const s = state("cp3");
    const { active } = activitiesFor(s, { stages: { [NETWORK]: "terms_stabilizing" }, upcoming: [] });
    const vocab = active.find((a) => a.kind === "vocab")!;
    expect(vocab.primaryEligible).toBe(true);
    const nodes = buildQuestRoute(s, [activityRouteTask(vocab)], null, now);
    const primary = buildTodayPrimaryAction({ state: s, nodes, gate: gateFor(s), queue: [], reviewItems: [] });
    expect(primary).toMatchObject({
      kind: "vocab",
      title: `${getTopic(NETWORK)!.title}の関連用語を固める`,
      href: vocab.href,
    });
  });
});

describe("過去問誤答 → Review Queue → 後日の Today", () => {
  it("公式過去問で間違えたトピックは翌日の復習になり、問題自体も解き直しに出る", () => {
    const question = getQuestionById("ipa-it-passport-2026-q060")!;
    const gradable = { ...toGradableQuestion(question), questionNumber: 1 };
    const wrongChoice = (["A", "B", "C", "D"] as const).find((k) => k !== question.correctChoice)!;
    const answeredAt = now.toISOString();
    const answers = { 1: { selected: wrongChoice, answeredAt, timeSpentSeconds: 30 } };
    const graded = gradePastExam({ sessionId: "s1", year: 0, mode: "practice", questions: [gradable], answers });
    const before = state("cp5");
    const after = recordPastExamLearningResult(before, graded, answers, {}, now);

    // 復習キュー: 翌日期限・公式過去問の誤答として
    const review = after.progress.reviewQueue.find((r) => r.topicId === question.primaryTopicId)!;
    expect(review.reason).toBe(PAST_EXAM_MISS_LABEL);
    expect(review.reasonCode).toBe("summary_exam_miss");
    expect(getDueReviewTopics(after.progress.reviewQueue, now)).toHaveLength(0);
    expect(getDueReviewTopics(after.progress.reviewQueue, new Date(tomorrow.getTime() + 3_600_000)))
      .toHaveLength(1);

    // 翌日の Today: 期限切れ復習として先頭に、誤答問題の解き直しも出る
    const nextDay = new Date(tomorrow.getTime() + 3_600_000);
    const queue = buildTodaysLearningQueue({ state: after, progress: after.progress, topics, now: nextDay });
    expect(queue[0]).toMatchObject({ topicId: question.primaryTopicId, kind: "overdue_review" });
    expect(summarizeOfficialHistory(after.answers, nextDay).pendingWrongIds).toEqual([question.id]);
    const { active } = activitiesFor(after, { at: nextDay });
    expect(active.find((a) => a.kind === "past_exam_retry")?.href).toContain(question.id);
  });
});
