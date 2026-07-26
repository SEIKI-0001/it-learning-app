import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { examLevelQuestions } from "@/data/examLevelQuestions";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import { getAllTopics } from "@/lib/content";
import manifest from "@/data/question-bank/manifests/original-exam-level.json";
import ipa2026Manifest from "@/data/question-bank/manifests/official-ipa-it-passport-2026.json";
import ipa2026Source from "@/data/question-bank/sources/official/ipa/it-passport-2026.source.json";
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
import { getOfficialExamField } from "@/lib/questionBank/officialExamField";
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

/** 出所ごとの束。既存問題と新規収録分を混ぜて検証しないために分けておく。 */
const APP_ORIGINAL = getQuestionsByOrigin("app_original");
const OFFICIAL_PAST = getQuestionsByOrigin("official_past");

/** 令和8年度 ITパスポート 公開問題の収録内容。 */
const IPA_2026 = OFFICIAL_PAST.filter((q) => q.official?.year === 2026);
const IPA_2026_FIGURE_DIR = path.join(
  process.cwd(),
  "public/question-bank/official/ipa/it-passport/2026",
);
const IPA_2026_QS_PDF =
  "https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/pdf/questions/2026r08_ip_qs.pdf";
const IPA_2026_ANS_PDF =
  "https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/pdf/questions/2026r08_ip_ans.pdf";

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
    // 「サンプル解説」のような書きかけ表現は published の検証で弾かれる（意図した挙動）。
    // ここは型・制約の検証用のひな形なので、実際の解説らしい文章にしておく。
    explanation: "選択肢Aが正しいのは、条件を満たす唯一の組合せだからです。",
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
    expect(APP_ORIGINAL.length).toBe(manifest.questionCount);
    expect(APP_ORIGINAL.map((q) => q.id)).toEqual(manifest.questionIds);

    expect(IPA_2026.length).toBe(ipa2026Manifest.questionCount);
    expect(IPA_2026.map((q) => q.id)).toEqual(ipa2026Manifest.questionIds);
  });

  it("問題バンク全体の件数が既存146問＋公式100問になっている", () => {
    expect(APP_ORIGINAL.length).toBe(146);
    expect(OFFICIAL_PAST.length).toBe(100);
    expect(ALL.length).toBe(246);
  });
});

// ---------------------------------------------------------------------------
// 2. 移行の同一性（移行前後で出題内容が変わっていないこと）
// ---------------------------------------------------------------------------

describe("既存問題の移行", () => {
  it("問題数が移行前後で一致する", () => {
    // 公式過去問を足しても、アプリ独自問題の側は1問も増減しない。
    expect(APP_ORIGINAL.length).toBe(examLevelQuestions.length);
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
    expect(APP_ORIGINAL.length).toBe(examLevelQuestions.length);
    expect(APP_ORIGINAL.every((q) => q.version === 1)).toBe(true);
  });

  it("移行しただけの問題は draft（内容の監査はまだ行っていない）", () => {
    // 移行で確認したのは「内容が完全一致すること」だけ。品質は未監査なので draft。
    expect(APP_ORIGINAL.every((q) => q.status === "draft")).toBe(true);
  });

  it("draft でも確認パックからは従来どおり出題できる", () => {
    // status は出題可否のスイッチではない。ID指定の解決は status で絞らない。
    const draft = APP_ORIGINAL[0];
    expect(draft.status).toBe("draft");
    expect(getQuestionById(draft.id)).toBeDefined();

    // 一方 getPublishedQuestions() は published だけを返すので、ここには出てこない。
    // PR2-B 以降は令和8年度の公式過去問100問が published なので、
    // 「移行しただけの既存問題が1問も含まれないこと」で確認する。
    const published = getPublishedQuestions();
    expect(published.some((q) => q.origin === "app_original")).toBe(false);
    expect(published.every((q) => q.origin === "official_past")).toBe(true);
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
    // 公式過去問も同じトピックに載るため、app_original に絞って突き合わせる。
    const legacyByTopic = new Map<string, number>();
    for (const q of examLevelQuestions) {
      legacyByTopic.set(q.topicId, (legacyByTopic.get(q.topicId) ?? 0) + 1);
    }
    for (const [topicId, count] of legacyByTopic) {
      const migrated = getQuestionsByTopic(topicId).filter((q) => q.origin === "app_original");
      expect(migrated.length, `トピック "${topicId}"`).toBe(count);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. 確認パックの互換性
// ---------------------------------------------------------------------------

describe("確認パックの互換性", () => {
  it("パック数と参照問題数が変わっていない", () => {
    // 公式過去問を足しても確認パック側は一切触っていないことを、件数でも押さえる。
    expect(topicCheckPacks).toHaveLength(67);
    expect(topicCheckPacks.reduce((sum, p) => sum + p.examLevelQuestionIds.length, 0)).toBe(146);
  });

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
    examField: "technology",
    isModified: false,
  } as const;

  it("改変版の公式問題はまだ1件も収録していない", () => {
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

  // --- 公式出題区分（official.examField） ---------------------------------

  it("公式問題に examField が無いと検出される", () => {
    for (const origin of ["official_past", "modified_official"] as const) {
      const withoutExamField = { ...officialSource, isModified: origin === "modified_official" };
      delete (withoutExamField as Partial<typeof withoutExamField>).examField;

      const q = makeQuestion({ origin, official: withoutExamField as QuestionRecord["official"] });
      expect(validateQuestion(q).map((i) => i.rule), origin).toContain(
        "official-exam-field-required",
      );
    }
  });

  it("許可されていない examField は検出される", () => {
    const q = makeQuestion({
      origin: "official_past",
      official: { ...officialSource, examField: "テクノロジ" as never },
    });
    expect(validateQuestion(q).map((i) => i.rule)).toContain("official-exam-field-value");
  });

  it("令和8年度の問番号と examField がずれていると検出される", () => {
    // 問16 は公式冊子ではストラテジ区分。内容分類（technology）を入れると落ちる。
    const q = makeQuestion({
      origin: "official_past",
      official: { ...officialSource, year: 2026, questionNumber: 16, examField: "technology" },
    });
    expect(validateQuestion(q).map((i) => i.rule)).toContain(
      "official-exam-field-question-number",
    );
  });

  it("令和8年度の問番号と examField が一致していれば違反ゼロ", () => {
    const cases = [
      { questionNumber: 1, examField: "strategy" },
      { questionNumber: 34, examField: "strategy" },
      { questionNumber: 35, examField: "management" },
      { questionNumber: 54, examField: "management" },
      { questionNumber: 55, examField: "technology" },
      { questionNumber: 100, examField: "technology" },
    ] as const;

    for (const { questionNumber, examField } of cases) {
      const q = makeQuestion({
        origin: "official_past",
        official: { ...officialSource, year: 2026, questionNumber, examField },
      });
      expect(formatIssues(validateQuestion(q)), `問${questionNumber}`).toBe("");
    }
  });

  it("getOfficialExamField は範囲外の問番号で例外を投げる", () => {
    for (const bad of [0, -1, 101, 1.5, Number.NaN]) {
      expect(() => getOfficialExamField(bad), String(bad)).toThrow(/公式出題区分を判定できない/);
    }
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

// ---------------------------------------------------------------------------
// 6. 令和8年度 ITパスポート試験 公開問題（IPA 公式）の収録内容
// ---------------------------------------------------------------------------

describe("令和8年度 ITパスポート 公開問題", () => {
  it("100問あり、IDと問番号が1〜100で連続している", () => {
    expect(IPA_2026).toHaveLength(100);

    const expectedIds = Array.from(
      { length: 100 },
      (_, i) => `ipa-it-passport-2026-q${String(i + 1).padStart(3, "0")}`,
    );
    expect(IPA_2026.map((q) => q.id)).toEqual(expectedIds);
    expect(IPA_2026.map((q) => q.official?.questionNumber)).toEqual(
      Array.from({ length: 100 }, (_, i) => i + 1),
    );
  });

  it("origin / status / version が指定どおり", () => {
    // PR2-B で独自解説を入れ、二段階監査を通したので version 2 / published。
    // 解説そのものの検証は test/pastExamQuestions.test.ts 側で行う。
    for (const q of IPA_2026) {
      expect(q.origin, q.id).toBe("official_past");
      expect(q.status, q.id).toBe("published");
      expect(q.version, q.id).toBe(2);
    }
  });

  it("公式出典が全問にあり、isModified が false", () => {
    for (const q of IPA_2026) {
      const s = q.official;
      expect(s, q.id).toBeDefined();
      if (!s) continue;

      expect(s.provider, q.id).toBe("ipa");
      expect(s.examType, q.id).toBe("it_passport");
      expect(s.year, q.id).toBe(2026);
      expect(s.examSession, q.id).toBe("R8");
      expect(s.isModified, q.id).toBe(false);
      expect(s.sourceUrl, q.id).toBe(IPA_2026_QS_PDF);
      expect(s.answerSourceUrl, q.id).toBe(IPA_2026_ANS_PDF);
    }
  });

  it("attribution に年度・試験名・問番号が入っている", () => {
    for (const q of IPA_2026) {
      const attribution = q.official?.attribution ?? "";
      expect(attribution, q.id).toContain("令和8年度");
      expect(attribution, q.id).toContain("ITパスポート試験");
      expect(attribution, q.id).toContain(`問${q.official?.questionNumber}`);
    }
    expect(IPA_2026[0].official?.attribution).toBe(
      "出典：令和8年度 ITパスポート試験 公開問題 問1",
    );
  });

  it("retrievedAt が全問同じ固定値（再生成で動かない）", () => {
    const values = new Set(IPA_2026.map((q) => q.official?.retrievedAt));
    expect(values).toEqual(new Set([ipa2026Source.exam.retrievedAt]));
    expect(ipa2026Source.exam.retrievedAt).toBe("2026-07-26");
  });

  it("問題文があり、選択肢は A〜D の4件で正答も A〜D", () => {
    for (const q of IPA_2026) {
      expect(q.prompt.trim(), q.id).not.toBe("");
      expect(q.choices, q.id).toHaveLength(4);
      expect(q.choices.map((c) => c.key), q.id).toEqual(["A", "B", "C", "D"]);
      for (const c of q.choices) expect(c.text.trim(), `${q.id} / ${c.key}`).not.toBe("");
      expect(["A", "B", "C", "D"], q.id).toContain(q.correctChoice);
    }
  });

  it("official.original が全問にあり、表示用データと完全に一致する", () => {
    // 今回は言い換え・要約をしていないので、原文と表示用は1文字も違わないはず。
    for (const q of IPA_2026) {
      const original = q.official?.original;
      expect(original, q.id).toBeDefined();
      if (!original) continue;

      expect(original.prompt, q.id).toBe(q.prompt);
      expect(original.choices, q.id).toEqual(q.choices);
      expect(original.correctChoice, q.id).toBe(q.correctChoice);
    }
  });

  it("正答が解答例PDFの転記（source.json の記号）と一致する", () => {
    const kanaToKey: Record<string, string> = { ア: "A", イ: "B", ウ: "C", エ: "D" };
    for (const src of ipa2026Source.questions) {
      const q = getQuestionById(
        `ipa-it-passport-2026-q${String(src.number).padStart(3, "0")}`,
      );
      expect(q, `問${src.number}`).toBeDefined();
      expect(q?.correctChoice, `問${src.number}`).toBe(kanaToKey[src.correctChoiceKana]);
    }
  });

  it("published なので独自解説とレビュー情報がそろっている", () => {
    // PR2-A では解説が空・未レビューだった。PR2-B で全問に独自解説を入れて
    // 二段階監査を通したので、published に必要な情報がそろっている必要がある。
    for (const q of IPA_2026) {
      expect(q.explanation.trim(), q.id).not.toBe("");
      expect(q.reviewedAt, q.id).not.toBeNull();
      expect(q.reviewedBy, q.id).not.toBeNull();
    }
    expect(formatIssues(validateQuestions(IPA_2026))).toBe("");
  });

  it("contentHash が SHA-256 の再計算結果と一致する", () => {
    for (const q of IPA_2026) {
      expect(q.contentHash, q.id).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(q.contentHash, q.id).toBe(computeContentHash(q));
    }
  });

  it("全問の primaryTopicId がアプリの正規トピックに実在する", () => {
    // 有効集合はアプリのトピック一覧（data/topics）。既存問題が使っているIDだけに
    // 絞ると、まだ問題が無いトピックを指せなくなるうえ、検査もそのぶん緩くなる。
    const validTopicIds = new Set(getAllTopics().map((topic) => topic.id));
    expect(validTopicIds.size).toBeGreaterThan(0);

    for (const q of IPA_2026) {
      // 完全一致で存在確認する。「空でなければ通る」ような緩い条件にしないこと。
      expect(validTopicIds.has(q.primaryTopicId), `${q.id} / ${q.primaryTopicId}`).toBe(true);
    }
  });

  it("全問に内容ベースの syllabusNode がある", () => {
    for (const q of IPA_2026) {
      expect(q.syllabusNode?.itemId, q.id).toMatch(/^ipa-\d+$/);
      expect(q.syllabusNode?.field, q.id).toBeTruthy();
    }
  });

  // -------------------------------------------------------------------------
  // 公式出題区分（official.examField）— 内容分類とは別軸であることを固定する
  // -------------------------------------------------------------------------

  it("全問に公式出題区分（official.examField）がある", () => {
    for (const q of IPA_2026) {
      expect(q.official?.examField, q.id).toBeDefined();
      expect(["strategy", "management", "technology"], q.id).toContain(q.official?.examField);
    }
  });

  it("公式出題区分の件数が冊子どおり（ストラテジ34・マネジメント20・テクノロジ46）", () => {
    const countBy = (field: string) =>
      IPA_2026.filter((q) => q.official?.examField === field).length;

    expect(countBy("strategy")).toBe(34);
    expect(countBy("management")).toBe(20);
    expect(countBy("technology")).toBe(46);
    expect(countBy("strategy") + countBy("management") + countBy("technology")).toBe(100);
  });

  it("公式出題区分が問番号の範囲と一致する", () => {
    for (const q of IPA_2026) {
      const number = q.official?.questionNumber;
      expect(number, q.id).toBeDefined();
      expect(q.official?.examField, `${q.id} / 問${number}`).toBe(
        getOfficialExamField(number as number),
      );
    }
  });

  it("公式出題区分と内容分類は別物として保持されている", () => {
    // 公式冊子の区分で内容分類を上書きしていないことを、実データのズレで固定する。
    // 問16: 公式はストラテジ区分だが、問うている内容はテクノロジ。
    // 問52: 公式はマネジメント区分だが、問うている内容はストラテジ。
    const byNumber = new Map(IPA_2026.map((q) => [q.official?.questionNumber, q]));

    const q16 = byNumber.get(16);
    expect(q16?.official?.examField).toBe("strategy");
    expect(q16?.syllabusNode?.field).toBe("technology");

    const q52 = byNumber.get(52);
    expect(q52?.official?.examField).toBe("management");
    expect(q52?.syllabusNode?.field).toBe("strategy");
  });

  it("公式出題区分と内容分類が一致しない問が実際に存在する", () => {
    // 「examField を syllabusNode.field からコピーする」実装に戻ったら落ちる。
    const mismatched = IPA_2026.filter(
      (q) => q.syllabusNode?.field && q.official?.examField !== q.syllabusNode.field,
    );
    expect(mismatched.length).toBeGreaterThan(0);
  });

  it("公式出題区分は contentHash に影響しない", () => {
    // examField は出典側のメタ情報。本文が同じならハッシュは動かない。
    for (const q of IPA_2026.slice(0, 5)) {
      const flipped: QuestionRecord = {
        ...q,
        official: q.official && { ...q.official, examField: "management" },
      };
      expect(computeContentHash(flipped), q.id).toBe(q.contentHash);
    }
  });

  it("学習画面からはまだ出題されない（確認パックが1問も参照していない）", () => {
    const packIds = new Set(topicCheckPacks.flatMap((p) => p.examLevelQuestionIds));
    for (const q of IPA_2026) {
      expect(packIds.has(q.id), `${q.id} が確認パックから参照されている`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. 図表アセットの整合性
// ---------------------------------------------------------------------------

describe("令和8年度 公開問題の図表", () => {
  const withFigures = IPA_2026.filter((q) => (q.figures?.length ?? 0) > 0);

  it("図表をもつ問題があり、参照先ファイルがすべて存在する", () => {
    expect(withFigures.length).toBeGreaterThan(0);

    for (const q of withFigures) {
      for (const figure of q.figures ?? []) {
        expect(figure.kind, `${q.id} / ${figure.id}`).toBe("image");
        expect(figure.src, `${q.id} / ${figure.id}`).toBeDefined();

        const src = figure.src ?? "";
        expect(src, `${q.id} / ${figure.id}`).toMatch(
          /^\/question-bank\/official\/ipa\/it-passport\/2026\/q\d{3}-figure-\d+\.png$/,
        );

        const abs = path.join(process.cwd(), "public", src);
        expect(() => readFileSync(abs), `${figure.id} のファイルが無い: ${src}`).not.toThrow();
        expect(readFileSync(abs).length, figure.id).toBeGreaterThan(0);
      }
    }
  });

  it("図表IDから問番号と図表番号が読み取れる", () => {
    for (const q of withFigures) {
      const number = q.official?.questionNumber;
      (q.figures ?? []).forEach((figure, index) => {
        expect(figure.id, q.id).toBe(
          `q${String(number).padStart(3, "0")}-figure-${index + 1}`,
        );
      });
    }
  });

  it("alt が全図表で空でない", () => {
    for (const q of withFigures) {
      for (const figure of q.figures ?? []) {
        expect(figure.alt.trim(), `${q.id} / ${figure.id}`).not.toBe("");
      }
    }
  });

  it("原文が参照する図表IDと figures が順序まで一致する", () => {
    for (const q of withFigures) {
      expect(q.official?.original?.figureIds, q.id).toEqual((q.figures ?? []).map((f) => f.id));
    }
    // 図表を持たない問題は figureIds を持たない。
    for (const q of IPA_2026.filter((x) => !x.figures)) {
      expect(q.official?.original?.figureIds, q.id).toBeUndefined();
    }
  });

  it("問題文の参照順と figures の並び順が一致する", () => {
    // source.json の promptAnchor（転記時に記録した「問題文中でその図表を指す語」）が
    // 問題文に現れる順番と、figures の並びが揃っていること。
    for (const src of ipa2026Source.questions) {
      if (src.figures.length < 2) continue;

      const positions = src.figures.map((f) => {
        expect(f.promptAnchor, `問${src.number} / ${f.id}`).toBeTruthy();
        const at = src.prompt.indexOf(f.promptAnchor as string);
        expect(at, `問${src.number}: 参照語 "${f.promptAnchor}" が問題文にない`).toBeGreaterThan(-1);
        return at;
      });

      const sorted = [...positions].sort((a, b) => a - b);
      expect(positions, `問${src.number} の図表順`).toEqual(sorted);
    }
  });

  it("孤立した図表ファイルが1件もない", () => {
    const referenced = new Set(
      IPA_2026.flatMap((q) => q.figures ?? []).map((f) => path.basename(f.src ?? "")),
    );
    const onDisk = readdirSync(IPA_2026_FIGURE_DIR).filter((f) => f.endsWith(".png"));

    expect(onDisk.length).toBeGreaterThan(0);
    expect([...onDisk].sort()).toEqual([...referenced].sort());
  });
});

// ---------------------------------------------------------------------------
// 8. status ごとの解説の要否
// ---------------------------------------------------------------------------

describe("解説の要否は status で決まる", () => {
  it("draft / content_verified は空の解説を許可する", () => {
    for (const status of ["draft", "content_verified"] as const) {
      const q = makeQuestion({ status, explanation: "" });
      expect(formatIssues(validateQuestion(q)), status).toBe("");
    }
  });

  it("explanation_verified / published は空の解説を許可しない", () => {
    for (const status of ["explanation_verified", "published"] as const) {
      const q = makeQuestion({
        status,
        explanation: "",
        reviewedAt: "2026-07-26T00:00:00.000Z",
        reviewedBy: "reviewer-1",
      });
      expect(validateQuestion(q).map((i) => i.rule), status).toContain("explanation-empty");
    }
  });

  it("published は解説があってもレビュー情報と contentHash が要る", () => {
    const rules = validateQuestion(
      makeQuestion({ status: "published", explanation: "解説あり" }),
    ).map((i) => i.rule);
    expect(rules).toContain("published-reviewed-at");
    expect(rules).toContain("published-reviewed-by");
  });
});

// ---------------------------------------------------------------------------
// 9. 図表の検証ルールが違反を捕まえられるか
// ---------------------------------------------------------------------------

describe("図表の検証ルール", () => {
  const officialSource = {
    provider: "ipa",
    examType: "it_passport",
    year: 2026,
    questionNumber: 1,
    sourceUrl: IPA_2026_QS_PDF,
    answerSourceUrl: IPA_2026_ANS_PDF,
    attribution: "出典：令和8年度 ITパスポート試験 公開問題 問1",
    examField: "strategy", // 令和8年度 問1 の公式出題区分
    isModified: false,
  } as const;

  function withFigures(figures: QuestionRecord["figures"], figureIds?: string[]) {
    const base = makeQuestion({ status: "content_verified", explanation: "" });
    return makeQuestion({
      status: "content_verified",
      explanation: "",
      origin: "official_past",
      figures,
      official: {
        ...officialSource,
        original: {
          prompt: base.prompt,
          choices: base.choices,
          correctChoice: base.correctChoice,
          ...(figureIds ? { figureIds } : {}),
        },
      },
    });
  }

  const figure = { id: "q001-figure-1", kind: "image", src: "/a.png", alt: "説明" } as const;

  it("alt が空だと検出される", () => {
    const q = withFigures([{ ...figure, alt: "  " }], [figure.id]);
    expect(validateQuestion(q).map((i) => i.rule)).toContain("figure-alt-empty");
  });

  it("kind: image で src が無いと検出される", () => {
    const q = withFigures([{ id: figure.id, kind: "image", alt: "説明" }], [figure.id]);
    expect(validateQuestion(q).map((i) => i.rule)).toContain("figure-src-required");
  });

  it("図表IDの重複が検出される", () => {
    const q = withFigures([figure, { ...figure }], [figure.id, figure.id]);
    expect(validateQuestion(q).map((i) => i.rule)).toContain("figure-id-unique");
  });

  it("原文の参照IDと figures の並びがずれると検出される", () => {
    const second = { ...figure, id: "q001-figure-2" };
    const q = withFigures([figure, second], [second.id, figure.id]);
    expect(validateQuestion(q).map((i) => i.rule)).toContain("figure-reference-match");
  });

  it("図表があるのに原文が参照IDを持たないと検出される", () => {
    const q = withFigures([figure]);
    expect(validateQuestion(q).map((i) => i.rule)).toContain("figure-reference-required");
  });
});
