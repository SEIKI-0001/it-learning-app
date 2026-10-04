import { describe, expect, it } from "vitest";
import type { AppState, UserProgress } from "@/types";
import type { Topic } from "@/types/content";
import { INITIAL_CHECKPOINT_PROGRESS, type CheckpointId, type CheckpointProgress } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import {
  applyBadgeProgress,
  bookPacedExamPoolSize,
  buildCheckpointGate,
  measureCheckpoint,
} from "@/lib/checkpoints";
import { generateFinalExam } from "@/lib/finalExam";
import { badgeConditionLabel, getBadge, getRequiredBadgeGaps } from "@/lib/badges";
import { isBookPaced, withStudyMode } from "@/lib/studyModeState";
import { mergeProgress } from "@/lib/mergeAppState";

// 参考書順（Book mode）の CP1〜3 は「本で学んだ範囲」の確認。
// 分野が偏っても進める・学んだ範囲から出題する・一度開いた最終問題は閉じない・バッジは剥奪しない。
// アプリ順の挙動が従来と同一であることは、別途の差分検証と既存テストで確かめている。

const NOW = new Date("2026-10-04T09:00:00+09:00");
const topics = getAllTopics();
const strategy = topics.filter((t) => t.field === "strategy");

function state(
  completed: Topic[],
  cp: Partial<CheckpointProgress> = {},
  mastery: Record<string, number> = {},
): AppState {
  const progress: UserProgress = {
    currentDay: 1,
    completedDays: [],
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: completed.map((t) => t.id),
    topicMastery: mastery,
    reviewQueue: [],
    checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1", ...cp },
  };
  return { progress, answers: [] };
}

const book = (s: AppState) => withStudyMode(s, "book");
const earned = (s: AppState) => (s.progress.checkpointProgress?.earnedBadges ?? []).map((b) => b.badgeId);

describe("CP1 in book mode", () => {
  const onlyStrategy = state(strategy.slice(0, 3));

  it("opens with three topics from a single field (app order still needs all three fields)", () => {
    const app = applyBadgeProgress(onlyStrategy, undefined, NOW).state;
    expect(earned(app)).toEqual(["b-cp1-touch-strat"]);
    expect(buildCheckpointGate(app, "cp1").finalExamUnlocked).toBe(false);

    const b = applyBadgeProgress(book(onlyStrategy), undefined, NOW).state;
    expect(earned(b).sort()).toEqual(["b-cp1-touch-mgmt", "b-cp1-touch-strat", "b-cp1-touch-tech"]);
    expect(measureCheckpoint(b, "cp1").missingFields).toEqual([]);
    expect(buildCheckpointGate(b, "cp1").finalExamUnlocked).toBe(true);
  });

  it("builds the final exam from what was learned, even outside the CP1 categories", () => {
    const b = applyBadgeProgress(book(onlyStrategy), undefined, NOW).state;
    const exam = generateFinalExam(b, "cp1", { attemptId: "t" });
    expect(exam.questions).toHaveLength(6);
    expect(exam.topicIds.every((id) => strategy.some((t) => t.id === id))).toBe(true);
  });

  it("draws from topics outside the fixed CP1 categories in book mode", () => {
    // CP1 の固定範囲（情報の表現・コンピュータ構成要素・開発プロセス・企業活動）の外だけを学んだ場合
    const outside = topics.filter((t) => !["基礎理論（情報の表現）", "コンピュータ構成要素", "開発プロセス", "企業活動"].includes(t.category)).slice(0, 3);
    const appState = state(outside);
    expect(() => generateFinalExam(appState, "cp1", { attemptId: "o" })).toThrow();
    const exam = generateFinalExam(book(appState), "cp1", { attemptId: "o" });
    expect(exam.questions).toHaveLength(6);
  });

  it("stays locked while the learned range has too few questions", () => {
    const one = book(
      state(strategy.slice(0, 1), {
        earnedBadges: ["b-cp1-touch-tech", "b-cp1-touch-mgmt", "b-cp1-touch-strat"].map((badgeId) => ({
          badgeId,
          earnedAt: NOW.toISOString(),
          fromDrop: false,
        })),
      }),
    );
    expect(bookPacedExamPoolSize(one)).toBeLessThan(6);
    expect(buildCheckpointGate(one, "cp1").finalExamUnlocked).toBe(false);
  });

  it("never closes an exam that was opened in book mode, and keeps the badges after switching back", () => {
    const b = applyBadgeProgress(book(onlyStrategy), undefined, NOW).state;
    expect(b.progress.checkpointProgress?.bookUnlockedFinalExamIds).toEqual(["cp1"]);
    const back = withStudyMode(b, "app");
    expect(isBookPaced(back)).toBe(false);
    expect(earned(back)).toEqual(earned(b));
    expect(buildCheckpointGate(back, "cp1").finalExamUnlocked).toBe(true);
    // ラッチ中は出題範囲も学んだ範囲のまま（問題が組めずに止まらない）
    expect(generateFinalExam(back, "cp1", { attemptId: "x" }).questions).toHaveLength(6);
    // もう一度 book に戻しても変わらない
    expect(buildCheckpointGate(withStudyMode(back, "book"), "cp1").finalExamUnlocked).toBe(true);
  });
});

describe("CP2 / CP3 in book mode", () => {
  it("uses the total count (13 completed) for the CP2 field badges", () => {
    const twelve = book(state(strategy.slice(0, 12), { currentCheckpointId: "cp2" }));
    expect(getRequiredBadgeGaps("b-cp2-basics-tech", twelve, undefined, NOW)).toEqual([
      [{ metric: "completedTotal", target: 13, current: 12, direction: "increase", field: undefined }],
    ]);
    const thirteen = book(state(strategy.slice(0, 13), { currentCheckpointId: "cp2" }));
    const after = applyBadgeProgress(thirteen, undefined, NOW).state;
    expect(earned(after)).toEqual(expect.arrayContaining(["b-cp2-basics-tech", "b-cp2-basics-mgmt", "b-cp2-basics-strat"]));
    expect(earned(after)).not.toContain("b-cp2-topics-15");
  });

  it("uses the total quiz-cleared count (17) for the CP3 field badges", () => {
    const learned = strategy.slice(0, 17);
    const mastery = Object.fromEntries(learned.map((t) => [t.id, 80]));
    const s = book(state(learned, { currentCheckpointId: "cp3" }, mastery));
    const after = applyBadgeProgress(s, undefined, NOW).state;
    expect(earned(after)).toEqual(expect.arrayContaining(["b-cp3-quiz-tech", "b-cp3-quiz-mgmt", "b-cp3-quiz-strat"]));
    expect(measureCheckpoint(after, "cp3").missingFields).toEqual([]);
  });

  it("keeps CP5 field coverage even in book mode", () => {
    const s = book(state(strategy.slice(0, 5), { currentCheckpointId: "cp5" }));
    expect(measureCheckpoint(s, "cp5").missingFields.sort()).toEqual(["management", "technology"]);
  });
});

describe("mode plumbing", () => {
  it("writes and clears the mode without touching anything else", () => {
    const base = state([]);
    expect(withStudyMode(base, "app")).toBe(base);
    const b = withStudyMode(base, "book");
    expect(b.progress.checkpointProgress?.studyMode).toBe("book");
    expect(withStudyMode(b, "book")).toBe(b);
    const back = withStudyMode(b, "app");
    expect(back.progress.checkpointProgress).toEqual(base.progress.checkpointProgress);
    const noCp: AppState = { ...base, progress: { ...base.progress, checkpointProgress: undefined } };
    expect(withStudyMode(noCp, "app")).toBe(noCp);
    expect(withStudyMode(noCp, "book").progress.checkpointProgress?.currentCheckpointId).toBe("cp0");
  });

  it("shows book-mode condition labels only in book mode", () => {
    const def = getBadge("b-cp1-touch-tech")!;
    expect(badgeConditionLabel(def, state([]))).toBe(def.conditionLabel);
    expect(badgeConditionLabel(def, book(state([])))).toContain("参考書の順");
    const final = getBadge("b-cp1-final")!;
    expect(badgeConditionLabel(final, book(state([])))).toBe(final.conditionLabel);
  });

  it("merges the latch as a union across devices", () => {
    const a = book(state([], { bookUnlockedFinalExamIds: ["cp1"] as CheckpointId[] }));
    const b = state([], { bookUnlockedFinalExamIds: ["cp2"] as CheckpointId[] });
    const merged = mergeProgress(a.progress, b.progress).checkpointProgress!;
    expect(merged.bookUnlockedFinalExamIds?.sort()).toEqual(["cp1", "cp2"]);
    expect(merged.studyMode).toBe("book");
    const plain = mergeProgress(state([]).progress, state([]).progress).checkpointProgress!;
    expect("studyMode" in plain).toBe(false);
    expect("bookUnlockedFinalExamIds" in plain).toBe(false);
  });
});
