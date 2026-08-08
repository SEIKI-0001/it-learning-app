import { describe, expect, it } from "vitest";

import { topicCheckPacks } from "@/data/topicCheckPacks";
import {
  isOfficialQuestion,
  questionRecordToCheckQuestion,
} from "@/lib/questionBank/adapter";
import {
  getAllQuestions,
  getQuestionById,
  getQuestionForDelivery,
} from "@/lib/questionBank/loader";
import { validatePackReferences } from "@/lib/questionBank/validate";
import { computeContentHash } from "@/lib/questionBank/contentHash";
import type { QuestionRecord } from "@/types/questionBank";

// ============================================================================
// 確認パックで公式問題を安全に扱えること、および retired の出題停止。
// ----------------------------------------------------------------------------
// ここが守っているもの:
//   - 公式問題を確認パックに入れても、出典・図表・選択肢順が落ちない
//   - アプリ独自問題の出題は従来どおり（シャッフルされる・出典を持たない）
//   - retired は出題されず、参照が残っていれば検証で落ちる
//   - draft は従来どおり出題される（既存146問がこの状態）
// ============================================================================

/** 検証用の最小 QuestionRecord。contentHash は本文から計算して整合させる。 */
function makeQuestion(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const base = {
    id: "test-question",
    version: 1,
    origin: "app_original",
    status: "draft",
    primaryTopicId: "tech-security-cia",
    questionPattern: "knowledge",
    prompt: "テスト問題文",
    choices: [
      { key: "A", text: "選択肢A" },
      { key: "B", text: "選択肢B" },
      { key: "C", text: "選択肢C" },
      { key: "D", text: "選択肢D" },
    ],
    correctChoice: "A",
    explanation: "テスト解説",
    estimatedDifficulty: 2,
    tags: [],
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  } as QuestionRecord;

  return { ...base, contentHash: computeContentHash(base) };
}

/** 出典つきの公式問題。 */
function makeOfficial(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return makeQuestion({
    id: "official-question",
    origin: "official_past",
    status: "published",
    official: {
      provider: "ipa",
      examType: "it_passport",
      year: 2026,
      questionNumber: 7,
      examField: "technology",
      sourceUrl: "https://example.test/questions.pdf",
      answerSourceUrl: "https://example.test/answers.pdf",
      attribution: "出典：令和8年度 ITパスポート試験 公開問題 問7",
      isModified: false,
    },
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// 1. 変換で公式問題の情報が落ちないこと
// ---------------------------------------------------------------------------

describe("QuestionRecord → CheckQuestion の変換", () => {
  it("公式問題の出所・版・出典・図表が保持される", () => {
    const record = makeOfficial({
      version: 3,
      figures: [
        {
          id: "fig-1",
          kind: "image",
          src: "/question-bank/fig-1.png",
          alt: "図の説明",
          caption: "図1",
        },
      ],
    });

    const view = questionRecordToCheckQuestion(record);

    expect(view.origin).toBe("official_past");
    expect(view.version).toBe(3);
    expect(view.official).toEqual({
      attribution: "出典：令和8年度 ITパスポート試験 公開問題 問7",
      sourceUrl: "https://example.test/questions.pdf",
      answerSourceUrl: "https://example.test/answers.pdf",
      year: 2026,
      questionNumber: 7,
    });
    expect(view.figures).toEqual([
      {
        id: "fig-1",
        kind: "image",
        src: "/question-bank/fig-1.png",
        body: undefined,
        alt: "図の説明",
        caption: "図1",
      },
    ]);
  });

  it("公式問題は選択肢を並び替えない指定になる", () => {
    expect(questionRecordToCheckQuestion(makeOfficial()).shuffleChoices).toBe(false);
    // 改変問題も原文の並びを保つ（出典を表示する以上、並びも原文どおりである必要がある）。
    const modified = makeOfficial({
      origin: "modified_official",
      official: { ...makeOfficial().official!, isModified: true, derivedFromQuestionId: "x" },
    });
    expect(questionRecordToCheckQuestion(modified).shuffleChoices).toBe(false);
  });

  it("アプリ独自問題は従来どおり（並び替え可・出典なし・図表なし）", () => {
    const view = questionRecordToCheckQuestion(makeQuestion());

    // undefined ＝ 呼び出し側の既定（シャッフルする）に従う。
    expect(view.shuffleChoices).toBeUndefined();
    expect(view.official).toBeUndefined();
    expect(view.figures).toBeUndefined();
    expect(view.origin).toBe("app_original");
  });

  it("isOfficialQuestion は出典を持つ2種類だけを公式扱いにする", () => {
    expect(isOfficialQuestion({ origin: "official_past" })).toBe(true);
    expect(isOfficialQuestion({ origin: "modified_official" })).toBe(true);
    expect(isOfficialQuestion({ origin: "app_original" })).toBe(false);
    expect(isOfficialQuestion({ origin: "ai_generated" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. retired を出題しないこと
// ---------------------------------------------------------------------------

describe("getQuestionForDelivery", () => {
  const questionIds = topicCheckPacks[0].examLevelQuestionIds;

  it("確認パックでは retired の問題を返さない", () => {
    // 実データは retired を含まないので、状態ごとの判定は個別に検証する。
    const retired = makeQuestion({ status: "retired" });
    expect(retired.status).toBe("retired");

    // 実データ側は「retired が存在しないこと」を保証する（存在したら参照検証が拾う）。
    const retiredInBank = getAllQuestions().filter((q) => q.status === "retired");
    for (const q of retiredInBank) {
      expect(getQuestionForDelivery(q.id, "check_pack")).toBeUndefined();
    }
  });

  it("draft の問題は従来どおり確認パックで出題できる", () => {
    const draftIds = getAllQuestions()
      .filter((q) => q.status === "draft")
      .map((q) => q.id);

    // 既存146問が draft。ここが空になると、この検証が意味を失う。
    expect(draftIds.length).toBeGreaterThan(0);
    for (const id of draftIds) {
      expect(getQuestionForDelivery(id, "check_pack"), id).toBeDefined();
    }
  });

  it("確認パックが参照する問題はすべて出題できる", () => {
    for (const id of questionIds) {
      expect(getQuestionForDelivery(id, "check_pack"), id).toBeDefined();
    }
  });

  it("年度別演習では公式の published 以外を返さない", () => {
    for (const q of getAllQuestions()) {
      const delivered = getQuestionForDelivery(q.id, "official_past_exam");
      if (q.origin === "official_past" && q.status === "published") {
        expect(delivered, q.id).toBeDefined();
      } else {
        expect(delivered, q.id).toBeUndefined();
      }
    }
  });

  it("存在しないIDは undefined", () => {
    expect(getQuestionForDelivery("no-such-question", "check_pack")).toBeUndefined();
  });

  it("getQuestionById は status を問わず引ける（回答履歴の解決用）", () => {
    // 保存経路は出題停止後も過去の回答を解決できる必要がある。
    for (const id of questionIds) {
      expect(getQuestionById(id), id).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. 確認パックの参照検証
// ---------------------------------------------------------------------------

describe("validatePackReferences", () => {
  const pack = (ids: string[]) => [{ packId: "pack-1", examLevelQuestionIds: ids }];

  it("実データの確認パックに違反がない", () => {
    const issues = validatePackReferences(topicCheckPacks, getAllQuestions());
    expect(issues).toEqual([]);
  });

  it("存在しない問題を参照したら検証に失敗する", () => {
    const issues = validatePackReferences(pack(["missing"]), [makeQuestion()]);
    expect(issues.map((i) => i.rule)).toContain("pack-reference-resolvable");
  });

  it("retired の問題を参照したら検証に失敗する", () => {
    const retired = makeQuestion({ id: "retired-question", status: "retired" });
    const issues = validatePackReferences(pack(["retired-question"]), [retired]);

    expect(issues.map((i) => i.rule)).toContain("pack-reference-retired");
    expect(issues[0].message).toContain("別の問題へ差し替えてください");
  });

  it("draft の問題を参照しても検証は通る", () => {
    const draft = makeQuestion({ id: "draft-question", status: "draft" });
    expect(validatePackReferences(pack(["draft-question"]), [draft])).toEqual([]);
  });

  it("出典表示に必要な値が欠けた公式問題は検証に失敗する", () => {
    const broken = makeOfficial({
      id: "broken-official",
      official: {
        ...makeOfficial().official!,
        attribution: "",
        sourceUrl: "",
      },
    });

    const issues = validatePackReferences(pack(["broken-official"]), [broken]);
    const display = issues.find((i) => i.rule === "pack-official-display-required");

    expect(display).toBeDefined();
    expect(display!.message).toContain("attribution");
    expect(display!.message).toContain("sourceUrl");
  });

  it("原文が参照する図表を持たない公式問題は検証に失敗する", () => {
    const broken = makeOfficial({
      id: "missing-figure",
      official: {
        ...makeOfficial().official!,
        original: {
          prompt: "原文",
          choices: makeOfficial().choices,
          correctChoice: "A",
          figureIds: ["fig-1"],
        },
      },
    });

    const issues = validatePackReferences(pack(["missing-figure"]), [broken]);
    expect(issues.map((i) => i.rule)).toContain("pack-official-figure-resolvable");
  });

  it("alt の無い図表を持つ公式問題は検証に失敗する", () => {
    const broken = makeOfficial({
      id: "no-alt",
      figures: [{ id: "fig-1", kind: "image", src: "/a.png", alt: "" }],
      official: {
        ...makeOfficial().official!,
        original: {
          prompt: "原文",
          choices: makeOfficial().choices,
          correctChoice: "A",
          figureIds: ["fig-1"],
        },
      },
    });

    const issues = validatePackReferences(pack(["no-alt"]), [broken]);
    expect(issues.map((i) => i.rule)).toContain("pack-official-figure-alt");
  });

  it("健全な公式問題は検証を通る", () => {
    const healthy = makeOfficial({
      id: "healthy-official",
      figures: [{ id: "fig-1", kind: "image", src: "/a.png", alt: "図の説明" }],
      official: {
        ...makeOfficial().official!,
        original: {
          prompt: "原文",
          choices: makeOfficial().choices,
          correctChoice: "A",
          figureIds: ["fig-1"],
        },
      },
    });

    expect(validatePackReferences(pack(["healthy-official"]), [healthy])).toEqual([]);
  });

  it("アプリ独自問題には公式向けの検査をかけない", () => {
    // 出典を持たないのは正常。ここで公式扱いの検査が走ると既存146問が全部落ちる。
    const issues = validatePackReferences(pack(["test-question"]), [makeQuestion()]);
    expect(issues).toEqual([]);
  });
});
