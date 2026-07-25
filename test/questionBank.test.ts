import { describe, expect, it } from "vitest";

import { examLevelQuestions } from "@/data/examLevelQuestions";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import manifest from "@/data/question-bank/manifests/original-exam-level.json";
import {
  getAllQuestions,
  getPublishedQuestions,
  getQuestionById,
  getQuestionsByOrigin,
  getQuestionsByTopic,
} from "@/lib/questionBank/loader";
import { questionRecordToCheckQuestion } from "@/lib/questionBank/adapter";
import { computeContentHash } from "@/lib/questionBank/contentHash";
import {
  formatIssues,
  validatePackReferences,
  validateQuestion,
  validateQuestions,
} from "@/lib/questionBank/validate";
import { resolvePackExamAsCheckQuestions, resolvePackExamQuestions } from "@/lib/checkPack";
import type { QuestionRecord } from "@/types/questionBank";

// ============================================================================
// 統一問題バンクの検証（npm run validate:questions）。
// ----------------------------------------------------------------------------
// 目的:
//   1. 問題データ自体が壊れていないこと
//   2. 既存の過去問レベル問題からの移行で、出題内容が1文字も変わっていないこと
//   3. 確認パックが移行後も同じ問題を同じ順で解決できること
// ============================================================================

const ALL = getAllQuestions();

/** テスト用の最小構成レコード（型制約の検証に使う。データには入れない）。 */
function makeQuestion(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const base = {
    prompt: "サンプル問題文",
    choices: [
      { key: "A", text: "選択肢A" },
      { key: "B", text: "選択肢B" },
      { key: "C", text: "選択肢C" },
      { key: "D", text: "選択肢D" },
    ],
    correctChoice: "A",
    explanation: "サンプル解説",
  } satisfies Pick<QuestionRecord, "prompt" | "choices" | "correctChoice" | "explanation">;

  const question: QuestionRecord = {
    id: "sample-q1",
    version: 1,
    origin: "app_original",
    status: "content_verified",
    primaryTopicId: "sample-topic",
    questionPattern: "knowledge",
    ...base,
    estimatedDifficulty: 2,
    tags: [],
    contentHash: computeContentHash(base),
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  };

  // 本文を差し替えた場合はハッシュを追随させる（ハッシュ違反を意図せず混ぜないため）。
  if (overrides.contentHash === undefined) {
    question.contentHash = computeContentHash(question);
  }
  return question;
}

// ---------------------------------------------------------------------------
// 1. 問題バンクの整合性
// ---------------------------------------------------------------------------

describe("問題バンクの整合性", () => {
  it("全問題が検証ルールを満たす", () => {
    const issues = validateQuestions(ALL);
    expect(formatIssues(issues)).toBe("");
  });

  it("問題IDが重複していない", () => {
    const ids = ALL.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("確認パックが存在しない問題IDを参照していない", () => {
    const issues = validatePackReferences(topicCheckPacks, ALL);
    expect(formatIssues(issues)).toBe("");
  });

  it("マニフェストの件数・IDが実データと一致する", () => {
    expect(ALL.length).toBe(manifest.questionCount);
    expect(ALL.map((q) => q.id)).toEqual(manifest.questionIds);
  });
});

// ---------------------------------------------------------------------------
// 2. 移行の同一性（移行前後で出題内容が変わっていないこと）
// ---------------------------------------------------------------------------

describe("既存問題の移行", () => {
  it("問題数が移行前後で一致する", () => {
    expect(ALL.length).toBe(examLevelQuestions.length);
  });

  it("既存のIDがすべて解決でき、内容が1件も変わっていない", () => {
    for (const legacy of examLevelQuestions) {
      const migrated = getQuestionById(legacy.id);
      expect(migrated, `問題ID "${legacy.id}" が問題バンクで解決できない`).toBeDefined();
      if (!migrated) continue;

      expect(migrated.prompt).toBe(legacy.prompt);
      expect(migrated.choices).toEqual(legacy.choices);
      expect(migrated.correctChoice).toBe(legacy.correctChoice);
      expect(migrated.explanation).toBe(legacy.explanation);
      expect(migrated.estimatedDifficulty).toBe(legacy.difficulty);
      expect(migrated.tags).toEqual(legacy.examTags ?? []);
      expect(migrated.primaryTopicId).toBe(legacy.topicId);
    }
  });

  it("移行した問題はすべて app_original / version 1", () => {
    expect(getQuestionsByOrigin("app_original").length).toBe(ALL.length);
    expect(ALL.every((q) => q.version === 1)).toBe(true);
  });

  it("移行しただけの問題は draft（内容の監査はまだ行っていない）", () => {
    // 移行で確認したのは「内容が完全一致すること」だけ。品質は未監査なので draft。
    expect(ALL.every((q) => q.status === "draft")).toBe(true);
  });

  it("draft でも確認パックからは従来どおり出題できる", () => {
    // status は出題可否のスイッチではない。ID指定の解決は status で絞らない。
    const draftId = ALL[0].id;
    expect(ALL[0].status).toBe("draft");
    expect(getQuestionById(draftId)).toBeDefined();

    // 一方 getPublishedQuestions() は published だけを返すので、ここには出てこない。
    expect(getPublishedQuestions()).toEqual([]);
  });

  it("contentHash が SHA-256 形式で、本文から再計算できる", () => {
    for (const q of ALL) {
      expect(q.contentHash, `問題ID "${q.id}" の contentHash 形式が不正`).toMatch(
        /^sha256:[0-9a-f]{64}$/,
      );
      expect(q.contentHash, `問題ID "${q.id}" の contentHash が不一致`).toBe(
        computeContentHash(q),
      );
    }
  });

  it("旧 FNV 形式の contentHash が1件も残っていない", () => {
    expect(ALL.filter((q) => q.contentHash.startsWith("fnv"))).toEqual([]);
  });

  it("トピック索引が移行前のトピック分布と一致する", () => {
    const legacyByTopic = new Map<string, number>();
    for (const q of examLevelQuestions) {
      legacyByTopic.set(q.topicId, (legacyByTopic.get(q.topicId) ?? 0) + 1);
    }
    for (const [topicId, count] of legacyByTopic) {
      expect(getQuestionsByTopic(topicId).length, `トピック "${topicId}"`).toBe(count);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. 確認パックの互換性
// ---------------------------------------------------------------------------

describe("確認パックの互換性", () => {
  it("すべてのパックが参照する問題IDを解決できる", () => {
    for (const pack of topicCheckPacks) {
      const resolved = resolvePackExamQuestions(pack);
      expect(resolved.length, `パック "${pack.packId}"`).toBe(pack.examLevelQuestionIds.length);
      expect(resolved.map((q) => q.id)).toEqual(pack.examLevelQuestionIds);
    }
  });

  it("出題順・問題数・正答が移行前の解決結果と一致する", () => {
    const legacyById = new Map(examLevelQuestions.map((q) => [q.id, q]));

    for (const pack of topicCheckPacks) {
      // 移行前の解決処理（ID順に引き、見つからないものは除外）を再現して突き合わせる。
      const expected = pack.examLevelQuestionIds
        .map((id) => legacyById.get(id))
        .filter((q) => q !== undefined);
      const actual = resolvePackExamQuestions(pack);

      expect(actual.map((q) => q.id)).toEqual(expected.map((q) => q.id));
      expect(actual.map((q) => q.correctChoice)).toEqual(expected.map((q) => q.correctChoice));
      expect(actual.map((q) => q.prompt)).toEqual(expected.map((q) => q.prompt));
      expect(actual.map((q) => q.explanation)).toEqual(expected.map((q) => q.explanation));
    }
  });

  it("TopicQuiz へ渡す形（CheckQuestion）が互換である", () => {
    const pack = topicCheckPacks[0];
    const questions = resolvePackExamAsCheckQuestions(pack);

    expect(questions.length).toBe(pack.examLevelQuestionIds.length);
    for (const q of questions) {
      expect(typeof q.id).toBe("string");
      expect(typeof q.prompt).toBe("string");
      expect(q.choices).toHaveLength(4);
      expect(q.choices.map((c) => c.key)).toEqual(["A", "B", "C", "D"]);
      expect(q.choices.some((c) => c.key === q.correctChoice)).toBe(true);
      expect(typeof q.explanation).toBe("string");
      expect([1, 2, 3]).toContain(q.difficulty);
    }
  });

  it("CheckQuestion への変換で id と正答が保たれる", () => {
    for (const record of ALL) {
      const converted = questionRecordToCheckQuestion(record);
      // id は question_attempts のキー。変換で絶対に変えてはいけない。
      expect(converted.id).toBe(record.id);
      expect(converted.correctChoice).toBe(record.correctChoice);
      expect(converted.difficulty).toBe(record.estimatedDifficulty);
    }
  });

  it("存在しない問題IDを参照したパックを検出できる", () => {
    const issues = validatePackReferences(
      [{ packId: "pack-broken", examLevelQuestionIds: ["does-not-exist-ex1"] }],
      ALL,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("pack-reference-resolvable");
    expect(issues[0].questionId).toBe("does-not-exist-ex1");
  });
});

// ---------------------------------------------------------------------------
// 4. 検証ルールが実際に違反を捕まえられるか
// ---------------------------------------------------------------------------

describe("検証ルール", () => {
  it("正常なレコードは違反ゼロ", () => {
    expect(validateQuestion(makeQuestion())).toEqual([]);
  });

  it("選択肢が4件でないと検出される", () => {
    const q = makeQuestion({
      choices: [
        { key: "A", text: "選択肢A" },
        { key: "B", text: "選択肢B" },
      ],
    });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("choices-count");
  });

  it("選択肢キーの重複が検出される", () => {
    const q = makeQuestion({
      choices: [
        { key: "A", text: "選択肢A" },
        { key: "A", text: "選択肢A2" },
        { key: "C", text: "選択肢C" },
        { key: "D", text: "選択肢D" },
      ],
    });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("choices-key-duplicate");
  });

  it("正答が選択肢に存在しないと検出される", () => {
    const q = makeQuestion({ correctChoice: "D", choices: [
      { key: "A", text: "選択肢A" },
      { key: "B", text: "選択肢B" },
      { key: "C", text: "選択肢C" },
      { key: "A", text: "重複" },
    ] });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("correct-choice-exists");
  });

  it("contentHash が本文と食い違うと検出される", () => {
    const q = makeQuestion({ contentHash: `sha256:${"0".repeat(64)}` });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("content-hash-match");
  });

  it("旧 FNV 形式の contentHash は形式違反として検出される", () => {
    const q = makeQuestion({ contentHash: "fnv1a64:b48f592249da0178" });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("content-hash-format");
  });

  it("大文字hex や桁数違いの contentHash は形式違反として検出される", () => {
    for (const bad of [`sha256:${"A".repeat(64)}`, `sha256:${"a".repeat(63)}`, "abc"]) {
      expect(
        validateQuestion(makeQuestion({ contentHash: bad })).map((i) => i.rule),
        `contentHash: "${bad}"`,
      ).toContain("content-hash-format");
    }
  });

  it("published なのにレビュー情報が無いと検出される", () => {
    const rules = validateQuestion(makeQuestion({ status: "published" })).map((i) => i.rule);
    expect(rules).toContain("published-reviewed-at");
    expect(rules).toContain("published-reviewed-by");
  });

  it("published でレビュー情報が揃っていれば違反ゼロ", () => {
    const q = makeQuestion({
      status: "published",
      reviewedAt: "2026-07-25T00:00:00.000Z",
      reviewedBy: "reviewer-1",
    });
    expect(validateQuestion(q)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. 公式問題用の型・検証制約（データはまだ入れていないが、器が機能すること）
// ---------------------------------------------------------------------------

describe("公式問題の制約", () => {
  const officialSource = {
    provider: "ipa",
    examType: "it_passport",
    year: 2023,
    questionNumber: 12,
    sourceUrl: "https://www.ipa.go.jp/shiken/mondai-kaiotu/example.html",
    answerSourceUrl: "https://www.ipa.go.jp/shiken/mondai-kaiotu/example-answer.html",
    attribution: "IPA 独立行政法人情報処理推進機構",
    isModified: false,
  } as const;

  it("今回の PR では公式過去問をまだ1件も収録していない", () => {
    expect(getQuestionsByOrigin("official_past")).toEqual([]);
    expect(getQuestionsByOrigin("modified_official")).toEqual([]);
  });

  // origin ごとの「正しい形」。ここが仕様表そのもの。
  const validCombinations = [
    {
      origin: "official_past",
      official: { ...officialSource, isModified: false },
      note: "出典必須 / isModified: false",
    },
    {
      origin: "modified_official",
      official: { ...officialSource, isModified: true },
      note: "出典必須 / isModified: true（改変でも出典は必要）",
    },
    { origin: "app_original", official: undefined, note: "出典を持たない" },
    { origin: "ai_generated", official: undefined, note: "出典を持たない" },
  ] as const;

  for (const { origin, official, note } of validCombinations) {
    it(`${origin} は「${note}」なら違反ゼロ`, () => {
      const q = makeQuestion(official ? { origin, official: { ...official } } : { origin });
      expect(formatIssues(validateQuestion(q))).toBe("");
    });
  }

  it("official_past に出典が無いと検出される", () => {
    const q = makeQuestion({ origin: "official_past" });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("official-source-required");
  });

  it("modified_official に出典が無いと検出される", () => {
    // 改変版を「非公式」扱いにして出典を落とす、という誤りを防ぐ。
    const q = makeQuestion({ origin: "modified_official" });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("official-source-required");
  });

  it("official_past で isModified: true は検出される", () => {
    const q = makeQuestion({
      origin: "official_past",
      official: { ...officialSource, isModified: true },
    });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("official-past-not-modified");
  });

  it("modified_official で isModified: false は検出される", () => {
    const q = makeQuestion({
      origin: "modified_official",
      official: { ...officialSource, isModified: false },
    });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("modified-official-is-modified");
  });

  it("app_original / ai_generated に出典を付けると検出される", () => {
    for (const origin of ["app_original", "ai_generated"] as const) {
      const q = makeQuestion({ origin, official: { ...officialSource } });
      expect(validateQuestion(q).map((i) => i.rule), origin).toContain(
        "official-source-unexpected",
      );
    }
  });

  it("原文（official.original）は表示用テキストと別に保持できる", () => {
    const q = makeQuestion({
      origin: "modified_official",
      prompt: "表示用に正規化した問題文",
      official: {
        ...officialSource,
        isModified: true,
        original: {
          prompt: "公式公開時点の原文",
          choices: [
            { key: "A", text: "原文A" },
            { key: "B", text: "原文B" },
            { key: "C", text: "原文C" },
            { key: "D", text: "原文D" },
          ],
          correctChoice: "A",
        },
      },
    });

    expect(validateQuestion(q)).toEqual([]);
    // 正規化した表示用テキストが原文を上書きしていないこと。
    expect(q.official?.original?.prompt).toBe("公式公開時点の原文");
    expect(q.prompt).not.toBe(q.official?.original?.prompt);
  });
});
