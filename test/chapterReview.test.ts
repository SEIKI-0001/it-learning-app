import { describe, expect, it } from "vitest";
import { getWrittenQuestion, getWrittenQuestions, getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import { getLessonsForTheme, getThemeBySlug, learningThemes } from "@/lib/learningCatalog";
import {
  getThemeExamRecord,
  getUnderstandingCheckTopics,
  getUnderstandingFollowUps,
  pickUnderstandingCheck,
  recordThemeExamAttempt,
  recordUnderstandingSignal,
  understandingLevelFor,
} from "@/lib/chapterReview";
import { getAllThemeExams, recordThemeExamLearningResult } from "@/lib/themeExam";
import { LOW_MASTERY_THRESHOLD } from "@/lib/learningLoop";
import type { TopicMasteryStats, UserProgress } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { UnderstandingSignal } from "@/types/chapterReview";
import type { ThemeExamResult } from "@/types/themeExam";

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
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
    checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS },
    ...overrides,
  };
}

function examResult(overrides: Partial<ThemeExamResult> = {}): ThemeExamResult {
  return {
    sessionId: "s1",
    themeSlug: "network",
    total: 10,
    correct: 9,
    unanswered: 0,
    rate: 90,
    passed: true,
    questions: [],
    reviewTopics: [],
    ...overrides,
  };
}

function stats(topicId: string, masteryScore: number, extra: Partial<TopicMasteryStats> = {}): TopicMasteryStats {
  return {
    topicId,
    masteryScore,
    lastEvaluatedAt: "2026-09-01T00:00:00.000Z",
    correctCount: 0,
    incorrectCount: 0,
    reviewSuccessCount: 0,
    recentEvidence: [],
    ...extra,
  };
}

function signal(overrides: Partial<UnderstandingSignal> = {}): UnderstandingSignal {
  return {
    topicId: "tech-network-address",
    questionId: "net-02",
    themeSlug: "network",
    level: "review",
    missingPoints: ["DNSへの問い合わせの説明が抜けています"],
    checkedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("AI理解チェックの設問カバレッジ", () => {
  it("総まとめ試験のある全章で、最低1問は出題できる", () => {
    const missing = getAllThemeExams()
      .map((exam) => exam.themeSlug)
      .filter((slug) => getUnderstandingCheckTopics(slug).length === 0);
    expect(missing).toEqual([]);
  });

  it("学ぶ画面の全章で、最低1問は出題できる", () => {
    const missing = learningThemes
      .filter((theme) => getUnderstandingCheckTopics(theme.slug).length === 0)
      .map((theme) => theme.slug);
    expect(missing).toEqual([]);
  });

  it("トピックに紐づけた設問IDはすべて実在し、どの設問もどこかのトピックから出題される", () => {
    const topicIds = learningThemes.flatMap((theme) => getLessonsForTheme(theme).map((t) => t.id));
    const mapped = new Set(topicIds.flatMap((id) => getWrittenQuestionsForTopic(id).map((q) => q.id)));
    const unmapped = getWrittenQuestions().filter((q) => !mapped.has(q.id)).map((q) => q.id);
    expect(unmapped).toEqual([]);
  });

  it("設問は採点に必要な材料（模範解答・3観点以上・キーワード）を持ち、IDは重複しない", () => {
    const questions = getWrittenQuestions();
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(q.question.length, q.id).toBeGreaterThan(20);
      expect(q.modelAnswer.length, q.id).toBeGreaterThan(80);
      expect(q.rubric.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.keywords.length, q.id).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("総まとめ試験の記録", () => {
  it("合格・最新・最高を記録する", () => {
    const next = recordThemeExamAttempt(progress(), examResult(), "2026-09-01T00:00:00.000Z");
    expect(getThemeExamRecord(next, "network")).toEqual({
      latestRate: 90,
      latestCorrect: 9,
      latestTotal: 10,
      bestRate: 90,
      passed: true,
      firstPassedAt: "2026-09-01T00:00:00.000Z",
      lastAttemptAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("再受験で不合格でも、合格済みと最高スコアは取り消さない", () => {
    const passed = recordThemeExamAttempt(progress(), examResult(), "2026-09-01T00:00:00.000Z");
    const failed = recordThemeExamAttempt(
      passed,
      examResult({ correct: 4, rate: 40, passed: false }),
      "2026-09-03T00:00:00.000Z",
    );
    expect(getThemeExamRecord(failed, "network")).toMatchObject({
      latestRate: 40,
      latestCorrect: 4,
      bestRate: 90,
      passed: true,
      firstPassedAt: "2026-09-01T00:00:00.000Z",
      lastAttemptAt: "2026-09-03T00:00:00.000Z",
    });
  });

  it("不合格のみなら合格済みにしない", () => {
    const next = recordThemeExamAttempt(
      progress(),
      examResult({ correct: 5, rate: 50, passed: false }),
      "2026-09-01T00:00:00.000Z",
    );
    const record = getThemeExamRecord(next, "network");
    expect(record?.passed).toBe(false);
    expect(record?.firstPassedAt).toBeUndefined();
  });

  it("同じ結果を二度適用しても変わらない（保存の再試行）", () => {
    const once = recordThemeExamAttempt(progress(), examResult(), "2026-09-01T00:00:00.000Z");
    const twice = recordThemeExamAttempt(once, examResult(), "2026-09-01T00:00:00.000Z");
    expect(twice).toEqual(once);
  });

  it("総まとめ試験の学習記録に、章の合格状態が含まれる", () => {
    const next = recordThemeExamLearningResult(
      { progress: progress(), answers: [] },
      examResult({
        questions: [{
          questionId: "q1",
          questionNumber: 1,
          selected: "A",
          correctChoice: "A",
          isCorrect: true,
          isUnanswered: false,
          topicId: "tech-network-address",
          topicTitle: "IPアドレスとDNS",
        }],
      }),
      "2026-09-01T00:00:00.000Z",
      {},
    );
    expect(getThemeExamRecord(next.progress, "network")?.passed).toBe(true);
    // 既存の学習ループへの反映はそのまま行われる。
    expect(next.progress.topicMasteryStats?.["tech-network-address"]).toBeDefined();
  });
});

describe("AI理解チェックの出題選び", () => {
  const themeSlug = "network";
  const topics = getUnderstandingCheckTopics(themeSlug).map((t) => t.id);

  it("前提: ネットワーク章には複数の出題候補トピックがある", () => {
    expect(topics.length).toBeGreaterThanOrEqual(3);
  });

  it("1. 総まとめ試験で誤答したトピックを最優先する", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [
        { topicId: "tech-http-https", isCorrect: true },
        { topicId: "tech-email-protocol", isCorrect: false },
      ],
      progress: progress({ topicMasteryStats: { "tech-http-https": stats("tech-http-https", 10) } }),
    });
    expect(pick).toMatchObject({ topicId: "tech-email-protocol", reason: "exam_miss" });
  });

  it("誤答が複数トピックにあれば、誤答数の多い方を選ぶ", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [
        { topicId: "tech-email-protocol", isCorrect: false },
        { topicId: "tech-http-https", isCorrect: false },
        { topicId: "tech-http-https", isCorrect: false },
      ],
    });
    expect(pick?.topicId).toBe("tech-http-https");
  });

  it("2. 誤答が無ければ Mastery が低いトピック", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [{ topicId: "tech-http-https", isCorrect: true }],
      progress: progress({
        topicMasteryStats: {
          "tech-email-protocol": stats("tech-email-protocol", LOW_MASTERY_THRESHOLD - 1),
          "tech-http-https": stats("tech-http-https", 90),
        },
      }),
    });
    expect(pick).toMatchObject({ topicId: "tech-email-protocol", reason: "low_mastery" });
  });

  it("未評価のトピックは Mastery が低いとはみなさない", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [{ topicId: "tech-http-https", isCorrect: true }],
      progress: progress({
        topicMasteryStats: { "tech-email-protocol": stats("tech-email-protocol", 0, { lastEvaluatedAt: "" }) },
      }),
    });
    expect(pick?.reason).toBe("explain_correct");
  });

  it("3. 四択で正解したトピックを、説明できるか確かめる", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [{ topicId: "tech-http-https", isCorrect: true }],
    });
    expect(pick).toMatchObject({ topicId: "tech-http-https", reason: "explain_correct" });
  });

  it("4. 手がかりが無ければ章を代表する重要トピック", () => {
    const pick = pickUnderstandingCheck({ themeSlug, examQuestions: [] });
    expect(pick?.reason).toBe("representative");
    expect(topics).toContain(pick?.topicId);
  });

  it("直近で「理解できている」だったトピックは後ろへ回す", () => {
    const solid = progress({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        chapterReview: {
          understandingSignals: {
            "tech-http-https": signal({ topicId: "tech-http-https", questionId: "net-04", level: "solid" }),
          },
        },
      },
    });
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [
        { topicId: "tech-http-https", isCorrect: true },
        { topicId: "tech-email-protocol", isCorrect: true },
      ],
      progress: solid,
    });
    expect(pick?.topicId).toBe("tech-email-protocol");
  });

  it("同じトピックに複数の設問があれば、前回と違う設問を出す", () => {
    const [first, second] = getWrittenQuestionsForTopic("tech-network-address");
    expect(second).toBeDefined();
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [{ topicId: "tech-network-address", isCorrect: false }],
      progress: progress({
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          chapterReview: { understandingSignals: { "tech-network-address": signal({ questionId: first.id }) } },
        },
      }),
    });
    expect(pick?.question.id).toBe(second.id);
  });

  it("章に無いトピックの誤答は無視して章内から選ぶ", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      examQuestions: [{ topicId: "tech-binary-data", isCorrect: false }],
    });
    expect(topics).toContain(pick?.topicId);
  });

  it("存在しない章では出題しない", () => {
    expect(getThemeBySlug("no-such-theme")).toBeUndefined();
    expect(pickUnderstandingCheck({ themeSlug: "no-such-theme", examQuestions: [] })).toBeNull();
  });
});

describe("AI理解チェックの結果の扱い", () => {
  it("点数を3段階へ丸める（80以上=理解できている / 60以上=あと一歩 / それ未満=ここを確認しよう）", () => {
    expect(understandingLevelFor({ score: 100 })).toBe("solid");
    expect(understandingLevelFor({ score: 80 })).toBe("solid");
    expect(understandingLevelFor({ score: 79 })).toBe("almost");
    expect(understandingLevelFor({ score: 60 })).toBe("almost");
    expect(understandingLevelFor({ score: 59 })).toBe("review");
  });

  it("補助シグナルだけを記録し、Mastery・復習キュー・合否には触れない", () => {
    const before = recordThemeExamAttempt(
      progress({
        topicMastery: { "tech-network-address": 70 },
        topicMasteryStats: { "tech-network-address": stats("tech-network-address", 70) },
        reviewQueue: [],
      }),
      examResult(),
      "2026-09-01T00:00:00.000Z",
    );
    const after = recordUnderstandingSignal(before, {
      ...signal(),
      missingPoints: ["a", " ", "b", "c", "d"],
    });

    expect(after.topicMastery).toEqual(before.topicMastery);
    expect(after.topicMasteryStats).toEqual(before.topicMasteryStats);
    expect(after.reviewQueue).toEqual(before.reviewQueue);
    expect(after.weakTags).toEqual(before.weakTags);
    expect(getThemeExamRecord(after, "network")).toEqual(getThemeExamRecord(before, "network"));
    expect(after.checkpointProgress?.chapterReview?.understandingSignals?.["tech-network-address"]?.missingPoints)
      .toEqual(["a", "b", "c"]);
  });

  it("古い確認結果で新しい結果を上書きしない", () => {
    const newer = recordUnderstandingSignal(progress(), signal({ level: "solid", checkedAt: "2026-09-10T00:00:00.000Z" }));
    const stale = recordUnderstandingSignal(newer, signal({ level: "review", checkedAt: "2026-09-01T00:00:00.000Z" }));
    expect(stale).toBe(newer);
  });

  it("要確認Topicは「理解できている」以外で、その後の四択でも誤答したものを先に並べる", () => {
    const withSignals = progress({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        chapterReview: {
          understandingSignals: {
            a: signal({ topicId: "a", level: "almost" }),
            b: signal({ topicId: "b", level: "review", checkedAt: "2026-09-11T00:00:00.000Z" }),
            c: signal({ topicId: "c", level: "solid" }),
          },
        },
      },
      topicMasteryStats: {
        a: stats("a", 50, {
          recentEvidence: [{
            questionId: "q",
            kind: "review",
            isCorrect: false,
            answeredAt: "2026-09-12T00:00:00.000Z",
            isFirstSeen: false,
          }],
        }),
      },
    });

    const followUps = getUnderstandingFollowUps(withSignals);
    expect(followUps.map((f) => [f.topicId, f.corroborated])).toEqual([["a", true], ["b", false]]);
    expect(getUnderstandingFollowUps(withSignals, { topicIds: ["b"] }).map((f) => f.topicId)).toEqual(["b"]);
  });

  it("AI理解チェックより前の誤答は裏づけに数えない", () => {
    const withSignal = progress({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        chapterReview: { understandingSignals: { a: signal({ topicId: "a" }) } },
      },
      topicMasteryStats: {
        a: stats("a", 50, {
          recentEvidence: [{
            questionId: "q",
            kind: "summary_exam",
            isCorrect: false,
            answeredAt: "2026-09-09T00:00:00.000Z",
            isFirstSeen: true,
          }],
        }),
      },
    });
    expect(getUnderstandingFollowUps(withSignal)[0]?.corroborated).toBe(false);
  });

  it("net-02 などの既存設問も引き続き引ける", () => {
    expect(getWrittenQuestion("net-02")?.id).toBe("net-02");
  });
});
