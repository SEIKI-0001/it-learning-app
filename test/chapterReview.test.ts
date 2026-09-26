import { describe, expect, it } from "vitest";
import { getWrittenQuestion, getWrittenQuestions, getWrittenQuestionsForTopic } from "@/data/writtenQuestions";
import { getLessonsForTheme, getThemeBySlug, learningThemes } from "@/lib/learningCatalog";
import { CHAPTER_UNDERSTANDING_CHECKS } from "@/data/chapterUnderstandingChecks";
import {
  getThemeExamRecord,
  getUnderstandingCheckCandidates,
  getUnderstandingFollowUps,
  pickUnderstandingCheck,
  recordThemeExamAttempt,
  recordUnderstandingCheck,
  recordUnderstandingSignal,
  understandingLevelFor,
} from "@/lib/chapterReview";
import { getAllThemeExams, recordThemeExamLearningResult } from "@/lib/themeExam";
import { LOW_MASTERY_THRESHOLD } from "@/lib/learningLoop";
import type { TopicMasteryStats, UserProgress } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { UnderstandingLevel, UnderstandingSignal } from "@/types/chapterReview";
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
  it("学ぶ画面の全章・総まとめ試験のある全章で、専用候補から2問以上出題できる", () => {
    const slugs = new Set([
      ...learningThemes.map((theme) => theme.slug),
      ...getAllThemeExams().map((exam) => exam.themeSlug),
    ]);
    const short = [...slugs].filter((slug) => getUnderstandingCheckCandidates(slug).length < 2);
    expect(short).toEqual([]);
  });

  it("各章の候補は2〜4問で、定義した問題・トピックがすべて解決できる", () => {
    for (const [slug, entries] of Object.entries(CHAPTER_UNDERSTANDING_CHECKS)) {
      expect(getThemeBySlug(slug), slug).toBeDefined();
      expect(entries.length, slug).toBeGreaterThanOrEqual(2);
      expect(entries.length, slug).toBeLessThanOrEqual(4);
      expect(getUnderstandingCheckCandidates(slug)).toHaveLength(entries.length);
    }
  });

  it("候補のトピックはその章のもので、問題はそのトピックに紐づく記述問題（本文を二重定義しない）", () => {
    for (const [slug, entries] of Object.entries(CHAPTER_UNDERSTANDING_CHECKS)) {
      const theme = getThemeBySlug(slug)!;
      const topicIds = new Set(getLessonsForTheme(theme).map((t) => t.id));
      for (const entry of entries) {
        expect(topicIds.has(entry.topicId), `${slug}/${entry.questionId}`).toBe(true);
        expect(
          getWrittenQuestionsForTopic(entry.topicId).map((q) => q.id),
          `${slug}/${entry.questionId}`,
        ).toContain(entry.questionId);
        expect(entry.focus.length, entry.questionId).toBeGreaterThan(5);
      }
    }
  });

  it("同じ問題を複数の章に置かない（出題履歴を章ごとに数えるため）", () => {
    const ids = Object.values(CHAPTER_UNDERSTANDING_CHECKS).flat().map((e) => e.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("トピックに紐づけた設問IDはすべて実在し、どの設問もどこかのトピックから出題される", () => {
    const topicIds = learningThemes.flatMap((theme) => getLessonsForTheme(theme).map((t) => t.id));
    const mapped = new Set(topicIds.flatMap((id) => getWrittenQuestionsForTopic(id).map((q) => q.id)));
    const unmapped = getWrittenQuestions().filter((q) => !mapped.has(q.id)).map((q) => q.id);
    expect(unmapped).toEqual([]);
  });

  it("設問は採点に必要な材料（題名・模範解答・3観点以上・キーワード）を持ち、IDは重複しない", () => {
    const questions = getWrittenQuestions();
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(q.title.length, q.id).toBeGreaterThan(3);
      expect(q.title.length, q.id).toBeLessThanOrEqual(30);
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
  const candidateIds = CHAPTER_UNDERSTANDING_CHECKS[themeSlug].map((e) => e.questionId);

  function withChecks(
    checks: { questionId: string; level: UnderstandingLevel; checkedAt: string }[],
    extra: Partial<UserProgress> = {},
  ): UserProgress {
    const entries = CHAPTER_UNDERSTANDING_CHECKS[themeSlug];
    return progress({
      ...extra,
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        chapterReview: {
          understandingChecks: Object.fromEntries(
            checks.map((c) => [
              c.questionId,
              { ...c, themeSlug, topicId: entries.find((e) => e.questionId === c.questionId)!.topicId },
            ]),
          ),
        },
      },
    });
  }

  it("前提: ネットワーク章には複数の専用候補がある", () => {
    expect(candidateIds.length).toBeGreaterThanOrEqual(3);
  });

  it("章の専用候補からのみ出題する（TOPIC_WRITTEN_QUESTION_IDS だけにある問題は出さない）", () => {
    // net-03（DHCP）・net-06（OSI）はネットワーク章のトピックに紐づくが、章末の候補ではない。
    const seen = new Set<string>();
    let state = progress();
    for (let i = 0; i < 12; i += 1) {
      const pick = pickUnderstandingCheck({ themeSlug, progress: state })!;
      seen.add(pick.question.id);
      state = recordUnderstandingCheck(state, {
        questionId: pick.question.id,
        themeSlug,
        topicId: pick.topicId,
        level: i % 3 === 0 ? "review" : "solid",
        checkedAt: new Date(Date.UTC(2026, 8, 1, i)).toISOString(),
      });
    }
    expect([...seen].every((id) => candidateIds.includes(id))).toBe(true);
    expect(seen.has("net-03")).toBe(false);
    expect(seen.has("net-06")).toBe(false);
  });

  it("誤答トピックや低Masteryを自動で優先しない（試験の正誤・Masteryに依存しない）", () => {
    const plain = pickUnderstandingCheck({ themeSlug, progress: progress() });
    const lowMastery = pickUnderstandingCheck({
      themeSlug,
      progress: progress({
        topicMasteryStats: { "tech-email-protocol": stats("tech-email-protocol", LOW_MASTERY_THRESHOLD - 30) },
        topicMastery: { "tech-email-protocol": 5 },
      }),
    });
    expect(plain?.question.id).toBe(candidateIds[0]);
    expect(lowMastery?.question.id).toBe(plain?.question.id);
  });

  it("未実施の問題を優先する（定義順）", () => {
    const pick = pickUnderstandingCheck({
      themeSlug,
      progress: withChecks([{ questionId: candidateIds[0], level: "review", checkedAt: "2026-09-01T00:00:00.000Z" }]),
    });
    expect(pick).toMatchObject({ question: { id: candidateIds[1] }, reason: "first_time" });
  });

  it("以前の記録（understandingSignals の questionId）も実施済みとして数える", () => {
    const legacy = progress({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        chapterReview: {
          understandingSignals: {
            "tech-network-address": signal({ questionId: candidateIds[0], topicId: "tech-network-address" }),
          },
        },
      },
    });
    expect(pickUnderstandingCheck({ themeSlug, progress: legacy })?.question.id).toBe(candidateIds[1]);
  });

  it("一巡後は「ここを確認しよう」→「あと一歩」の順に、直近の問題を避けて出す", () => {
    const [a, b, c, d] = candidateIds;
    const pick = pickUnderstandingCheck({
      themeSlug,
      progress: withChecks([
        { questionId: a, level: "almost", checkedAt: "2026-09-01T00:00:00.000Z" },
        { questionId: b, level: "solid", checkedAt: "2026-09-02T00:00:00.000Z" },
        { questionId: c, level: "review", checkedAt: "2026-09-03T00:00:00.000Z" },
        { questionId: d, level: "solid", checkedAt: "2026-09-04T00:00:00.000Z" },
      ]),
    });
    expect(pick).toMatchObject({ question: { id: c }, reason: "revisit" });
  });

  it("直近と同じ問題は、未解決でも続けて出さない", () => {
    const [a, b, c, d] = candidateIds;
    const pick = pickUnderstandingCheck({
      themeSlug,
      progress: withChecks([
        { questionId: a, level: "solid", checkedAt: "2026-09-01T00:00:00.000Z" },
        { questionId: b, level: "almost", checkedAt: "2026-09-02T00:00:00.000Z" },
        { questionId: c, level: "solid", checkedAt: "2026-09-03T00:00:00.000Z" },
        { questionId: d, level: "review", checkedAt: "2026-09-04T00:00:00.000Z" },
      ]),
    });
    expect(pick).toMatchObject({ question: { id: b }, reason: "revisit" });
  });

  it("すべて「理解できている」なら、確かめてから最も時間が経った問題（直近は除く）", () => {
    const [a, b, c, d] = candidateIds;
    const pick = pickUnderstandingCheck({
      themeSlug,
      progress: withChecks([
        { questionId: a, level: "solid", checkedAt: "2026-09-05T00:00:00.000Z" },
        { questionId: b, level: "solid", checkedAt: "2026-09-02T00:00:00.000Z" },
        { questionId: c, level: "solid", checkedAt: "2026-09-03T00:00:00.000Z" },
        { questionId: d, level: "solid", checkedAt: "2026-09-04T00:00:00.000Z" },
      ]),
    });
    expect(pick).toMatchObject({ question: { id: b }, reason: "refresh" });
  });

  it("出題理由として、確かめる概念（focus）とトピックを返す", () => {
    const pick = pickUnderstandingCheck({ themeSlug, progress: progress() })!;
    const entry = CHAPTER_UNDERSTANDING_CHECKS[themeSlug][0];
    expect(pick.focus).toBe(entry.focus);
    expect(pick.topicId).toBe(entry.topicId);
    expect(pick.topicTitle.length).toBeGreaterThan(0);
  });

  it("存在しない章では出題しない", () => {
    expect(getThemeBySlug("no-such-theme")).toBeUndefined();
    expect(pickUnderstandingCheck({ themeSlug: "no-such-theme" })).toBeNull();
  });
});

describe("AI理解チェックの出題履歴", () => {
  const record = {
    questionId: "net-04",
    themeSlug: "network",
    topicId: "tech-http-https",
    level: "almost" as const,
    checkedAt: "2026-09-10T00:00:00.000Z",
  };

  it("問題ごとに最新の1件を持ち、古い記録で上書きしない", () => {
    const once = recordUnderstandingCheck(progress(), record);
    const older = recordUnderstandingCheck(once, { ...record, level: "solid", checkedAt: "2026-09-01T00:00:00.000Z" });
    expect(older.checkpointProgress?.chapterReview?.understandingChecks?.["net-04"]?.level).toBe("almost");
  });

  it("合否・Mastery・復習キュー・補助シグナルには触れない", () => {
    const before = recordThemeExamAttempt(
      progress({
        topicMastery: { "tech-http-https": 70 },
        topicMasteryStats: { "tech-http-https": stats("tech-http-https", 70) },
        reviewQueue: [],
      }),
      examResult(),
      "2026-09-01T00:00:00.000Z",
    );
    const after = recordUnderstandingCheck(before, { ...record, level: "review" });
    expect(after.topicMastery).toEqual(before.topicMastery);
    expect(after.topicMasteryStats).toEqual(before.topicMasteryStats);
    expect(after.reviewQueue).toEqual(before.reviewQueue);
    expect(getThemeExamRecord(after, "network")).toEqual(getThemeExamRecord(before, "network"));
    expect(after.checkpointProgress?.chapterReview?.understandingSignals).toEqual(
      before.checkpointProgress?.chapterReview?.understandingSignals,
    );
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
