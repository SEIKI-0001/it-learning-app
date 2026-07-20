import { describe, expect, it } from "vitest";
import type { UserProgress } from "@/types";
import { getAllThemes, getLessonsForTheme } from "@/lib/learningCatalog";
import { getLessonMasterState, getThemeMasterState } from "@/lib/lessonState";

function emptyProgress(): UserProgress {
  return {
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    reviewQueue: [],
    currentDay: 1,
    completedDays: [],
  };
}

const NOW = new Date("2026-07-20T00:00:00Z");
const PAST = "2026-07-01T00:00:00Z";
const FUTURE = "2026-08-01T00:00:00Z";

describe("getLessonMasterState", () => {
  it("進捗が無ければ未着手", () => {
    expect(getLessonMasterState("lesson-1", undefined, NOW)).toBe("not_started");
  });

  it("習熟度0・未完了は未着手", () => {
    const progress = emptyProgress();
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("not_started");
  });

  it("未完了でも習熟度>0なら学習中", () => {
    const progress = emptyProgress();
    progress.topicMastery["lesson-1"] = 40;
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("in_progress");
  });

  it("完了かつ復習キューに項目なしなら完全習得", () => {
    const progress = emptyProgress();
    progress.completedTopics = ["lesson-1"];
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("fully_mastered");
  });

  it("mastery>=100だけでもcompletedTopics未登録なら完全習得扱い", () => {
    const progress = emptyProgress();
    progress.topicMastery["lesson-1"] = 100;
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("fully_mastered");
  });

  it("完了かつ復習期限が未来なら習得済み", () => {
    const progress = emptyProgress();
    progress.completedTopics = ["lesson-1"];
    progress.reviewQueue = [{ topicId: "lesson-1", dueAt: FUTURE, reason: "定着確認" }];
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("mastered");
  });

  it("完了かつ復習期限が過去なら復習待ち", () => {
    const progress = emptyProgress();
    progress.completedTopics = ["lesson-1"];
    progress.reviewQueue = [{ topicId: "lesson-1", dueAt: PAST, reason: "定着確認" }];
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("review_due");
  });

  it("未完了でも復習キューの期限が過去なら復習待ち（間違えて登録されたケース）", () => {
    const progress = emptyProgress();
    progress.topicMastery["lesson-1"] = 30;
    progress.reviewQueue = [{ topicId: "lesson-1", dueAt: PAST, reason: "間違えた問題" }];
    expect(getLessonMasterState("lesson-1", progress, NOW)).toBe("review_due");
  });
});

describe("getThemeMasterState", () => {
  const theme = getAllThemes()[0];
  const lessons = getLessonsForTheme(theme);
  const [firstId, secondId] = lessons.map((lesson) => lesson.id);

  it("空テーマは未着手", () => {
    const progress = emptyProgress();
    // 存在しないダミーテーマ（sections空）を組み立てて空を再現する
    const emptyTheme = { ...theme, sections: [] };
    expect(getThemeMasterState(emptyTheme, progress, NOW)).toBe("not_started");
  });

  it("全レッスン未着手ならテーマも未着手", () => {
    const progress = emptyProgress();
    expect(getThemeMasterState(theme, progress, NOW)).toBe("not_started");
  });

  it("一部だけ着手されていれば学習中", () => {
    const progress = emptyProgress();
    progress.topicMastery[firstId] = 20;
    expect(getThemeMasterState(theme, progress, NOW)).toBe("in_progress");
  });

  it("いずれかが復習待ちなら最優先でテーマも復習待ち", () => {
    const progress = emptyProgress();
    progress.completedTopics = [firstId];
    progress.reviewQueue = [{ topicId: firstId, dueAt: PAST, reason: "定着確認" }];
    // 他のレッスンは未着手のままでも復習待ちが最優先される
    expect(getThemeMasterState(theme, progress, NOW)).toBe("review_due");
  });

  it("完了レッスンが習得済み/完全習得のみ・未完了が残っていなければmastered以上を判定する", () => {
    const progress = emptyProgress();
    progress.completedTopics = [firstId, secondId];
    progress.reviewQueue = [{ topicId: firstId, dueAt: FUTURE, reason: "定着確認" }];
    // secondId は完全習得（復習キューなし）、firstId は習得済み（復習キュー未来）
    // ただし他のレッスンが未着手のままなので、all-mastered-or-above条件は満たさない → in_progress
    expect(getThemeMasterState(theme, progress, NOW)).toBe("in_progress");
  });

  it("テーマ内全レッスンが完全習得ならテーマも完全習得", () => {
    const progress = emptyProgress();
    progress.completedTopics = lessons.map((lesson) => lesson.id);
    expect(getThemeMasterState(theme, progress, NOW)).toBe("fully_mastered");
  });

  it("テーマ内全レッスンが習得済み以上（一部は復習キューが未来）ならmastered", () => {
    const progress = emptyProgress();
    progress.completedTopics = lessons.map((lesson) => lesson.id);
    progress.reviewQueue = [{ topicId: firstId, dueAt: FUTURE, reason: "定着確認" }];
    expect(getThemeMasterState(theme, progress, NOW)).toBe("mastered");
  });
});
