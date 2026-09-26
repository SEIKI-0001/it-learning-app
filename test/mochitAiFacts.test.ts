import { describe, expect, it } from "vitest";
import {
  localDateKey,
  localDayStartMs,
  readinessFacts,
  recentPerformanceFacts,
  sanitizeQuestionContext,
  todaySummaryFacts,
  topicPerformanceFacts,
  type MochitAttempt,
  type TopicResolver,
} from "@/lib/mochitAi/facts";
import type { ExamReadinessResult } from "@/types/examReadiness";

const NOW = new Date("2026-09-26T12:00:00.000Z");
const resolve: TopicResolver = (id) =>
  ({
    "t-net": { title: "ネットワーク", fieldId: "technology" },
    "t-sec": { title: "セキュリティ", fieldId: "technology" },
    "s-law": { title: "法務", fieldId: "strategy" },
  })[id] ?? null;
const dayKey = (iso: string) => localDateKey(iso, -540);

function attempts(topicId: string, results: boolean[], at: string): MochitAttempt[] {
  return results.map((isCorrect) => ({ topicId, isCorrect, answeredAt: at }));
}

function readiness(overrides: Partial<ExamReadinessResult> = {}): ExamReadinessResult {
  return {
    score: 58,
    band: "approaching",
    confidence: {
      score: 40,
      level: "low",
      reasons: [{ code: "insufficient_field_evidence", fieldId: "management", actual: 3, required: 10 }],
    },
    fields: [
      { fieldId: "strategy", label: "ストラテジ", score: 70, evidenceSufficiency: 80, scoreGate: { evaluated: true, cap: null, reasonCode: null } },
      { fieldId: "management", label: "マネジメント", score: 40, evidenceSufficiency: 20, scoreGate: { evaluated: false, cap: null, reasonCode: "x" } },
    ],
    components: { firstPerformance: null, summativePerformance: null, topicMastery: null, retention: null, assessmentCoverage: 0 },
    calculation: { baseScore: null, weakTopicPenalty: 0, preGateScore: null, appliedCaps: [] },
    evidence: { uniqueQuestionCount: 10, weightedEvidenceUnits: 10, summativeSessionCount: 0, summativeSessionIds: [], evidenceRevision: 1 },
    weakTopics: [{ topicId: "t-net", label: "ネットワーク", importance: 3, reason: "low_mastery", penalty: 2, penaltyApplied: true }],
    primaryImprovement: { code: "improve_field", fieldId: "management" },
    modelVersion: "v1",
    examSchemeVersion: "v1",
    calculationReferenceTime: NOW.toISOString(),
    calculatedAt: NOW.toISOString(),
    validUntil: null,
    snapshotDate: "2026-09-26",
    ...overrides,
  };
}

describe("readinessFacts", () => {
  it("アプリの判定（段階・確からしさ）をそのまま言い換え、評価できない分野の点は渡さない", () => {
    const facts = readinessFacts(readiness())!;
    expect(facts.band).toBe("あと一歩");
    expect(facts.score).toBe(58);
    expect(facts.confidence).toBe("低");
    expect(facts.confidenceNotes[0]).toContain("マネジメント");
    expect(facts.fields).toEqual([
      { field: "ストラテジ", score: 70, judgeable: true },
      { field: "マネジメント", score: null, judgeable: false },
    ]);
    expect(facts.weakTopics).toEqual(["ネットワーク"]);
    expect(facts.nextImprovement).toBe("「マネジメント」の問題を優先しましょう");
  });

  it("実力データが無ければ null（推測させない）", () => {
    expect(readinessFacts(null)).toBeNull();
  });
});

describe("recentPerformanceFacts", () => {
  it("最低回答数を満たすトピックだけを不安定として挙げ、生の履歴は含めない", () => {
    const recent = "2026-09-25T03:00:00.000Z";
    const facts = recentPerformanceFacts(
      [
        ...attempts("t-net", [false, false, true], recent), // 33%・3問 → 不安定
        ...attempts("t-sec", [false, false], recent), // 2問 → 判断しない
        ...attempts("s-law", [true, true, true], recent),
      ],
      NOW,
      resolve,
      dayKey,
    );
    expect(facts.answered).toBe(8);
    expect(facts.unstableTopics).toEqual([{ topic: "ネットワーク", answered: 3, accuracy: 33 }]);
    expect(facts.activeDays).toBe(1);
    expect(JSON.stringify(facts)).not.toContain("answeredAt");
  });

  it("前半7日→後半7日で10pt以上伸びた分野だけを「伸びた」とする", () => {
    const early = "2026-09-15T03:00:00.000Z";
    const late = "2026-09-24T03:00:00.000Z";
    const facts = recentPerformanceFacts(
      [
        ...attempts("t-net", [true, false, false, false, true], early), // 40%
        ...attempts("t-net", [true, true, true, true, false], late), // 80%
        ...attempts("s-law", [true, false, true, false, true], early), // 60%
        ...attempts("s-law", [true, true], late), // 2問 → 比較しない
      ],
      NOW,
      resolve,
      dayKey,
    );
    expect(facts.improvedFields).toEqual([{ field: "テクノロジ", before: 40, after: 80 }]);
  });

  it("14日より前の回答は数えない", () => {
    const facts = recentPerformanceFacts(attempts("t-net", [true], "2026-09-01T00:00:00.000Z"), NOW, resolve, dayKey);
    expect(facts.answered).toBe(0);
    expect(facts.accuracy).toBeNull();
  });
});

describe("todaySummaryFacts", () => {
  it("今日の回答・ミッション・ルートをまとめ、以前不安定で今日正解したトピックを挙げる", () => {
    const dayStart = localDayStartMs("2026-09-26", -540)!; // JST 0:00 = 2026-09-25T15:00Z
    const facts = todaySummaryFacts({
      date: "2026-09-26",
      dayStartMs: dayStart,
      now: NOW,
      attempts: [
        ...attempts("t-net", [true, true], "2026-09-26T01:00:00.000Z"),
        ...attempts("t-sec", [true, false], "2026-09-26T02:00:00.000Z"),
        ...attempts("t-net", [false, false, true], "2026-09-20T02:00:00.000Z"),
      ],
      resolveTopic: resolve,
      missions: { date: "2026-09-26", claimed: false, quests: [{ id: "q1", goal: 3, progress: 5 }, { id: "q2", goal: 2, progress: 1 }] },
      missionLabel: (id) => (id === "q1" ? "3問正解" : null),
      today: {
        date: "2026-09-26",
        tasks: [
          { title: "ネットワーク", kind: "review", minutes: 10, state: "done" },
          { title: "用語", kind: "vocab", minutes: 5, state: "now" },
        ],
      },
    });
    expect(facts.questionsAnswered).toBe(4);
    expect(facts.accuracy).toBe(75);
    expect(facts.goodTopics).toEqual(["ネットワーク"]);
    expect(facts.reviewCandidates).toEqual(["セキュリティ"]);
    expect(facts.improvedTopics).toEqual(["ネットワーク"]);
    expect(facts.missions).toEqual([
      { label: "3問正解", progress: 3, goal: 3, done: true },
      { label: "q2", progress: 1, goal: 2, done: false },
    ]);
    expect(facts.missionsCompleted).toBe(1);
    expect(facts.tasksDone).toBe(1);
  });

  it("別の日の Today スナップショットは使わない", () => {
    const facts = todaySummaryFacts({
      date: "2026-09-26",
      dayStartMs: localDayStartMs("2026-09-26", -540)!,
      now: NOW,
      attempts: [],
      resolveTopic: resolve,
      missions: null,
      missionLabel: () => null,
      today: { date: "2026-09-25", tasks: [] },
    });
    expect(facts.tasks).toBeNull();
    expect(facts.missions).toBeNull();
    expect(facts.accuracy).toBeNull();
  });
});

describe("dates", () => {
  it("ローカル日付の 0:00 を UTC に直す（JST は前日 15:00Z）", () => {
    expect(new Date(localDayStartMs("2026-09-26", -540)!).toISOString()).toBe("2026-09-25T15:00:00.000Z");
    expect(localDayStartMs("bad", 0)).toBeNull();
    expect(localDateKey("2026-09-25T16:00:00.000Z", -540)).toBe("2026-09-26");
  });
});

describe("topicPerformanceFacts", () => {
  it("最低回答数に満たなければ enoughData=false", () => {
    expect(topicPerformanceFacts(attempts("t-net", [true, false], NOW.toISOString()), "t-net")).toEqual({
      answered: 2,
      accuracy: 50,
      enoughData: false,
    });
  });
});

describe("sanitizeQuestionContext", () => {
  const base = {
    questionId: "q1",
    prompt: "問題文",
    choices: [
      { label: "A", text: "一" },
      { label: "B", text: "二" },
    ],
    correctLabel: "A",
    selectedLabel: "B",
  };

  it("正解が選択肢に無い・選択肢が足りない問題は捨てる", () => {
    expect(sanitizeQuestionContext({ ...base, correctLabel: "Z" }, { text: 100, choice: 50 })).toBeNull();
    expect(sanitizeQuestionContext({ ...base, choices: [base.choices[0]] }, { text: 100, choice: 50 })).toBeNull();
    expect(sanitizeQuestionContext(null, { text: 100, choice: 50 })).toBeNull();
  });

  it("長すぎる文を丸め、存在しない選択は未回答にする", () => {
    const q = sanitizeQuestionContext(
      { ...base, prompt: "あ".repeat(500), selectedLabel: "X" },
      { text: 100, choice: 50 },
    )!;
    expect(q.prompt).toHaveLength(100);
    expect(q.selectedLabel).toBeNull();
  });
});
