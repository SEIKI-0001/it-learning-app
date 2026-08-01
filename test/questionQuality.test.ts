import { describe, expect, it } from "vitest";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getAllQuestions } from "@/lib/questionBank/loader";
import { computeContentHash } from "@/lib/questionBank/contentHash";
import { formatIssues, validateQuestions } from "@/lib/questionBank/validate";
import { checkSimilarityGate, needsSimilarityReview } from "@/lib/questionQuality/gate";
import { normalizeForSimilarity, normalizeQuestionText } from "@/lib/questionQuality/normalize";
import {
  buildQualityReport,
  buildBaseline,
  baselineKey,
  diffAgainstBaseline,
  renderQualityReportMarkdown,
} from "@/lib/questionQuality/report";
import { checkQuestionQuality } from "@/lib/questionQuality/rules";
import {
  REVIEWER_INDEPENDENCE,
  checkReviewGate,
  validateReviewRecord,
} from "@/lib/questionQuality/reviews";
import { loadReviewRecords } from "@/lib/questionQuality/reviewStore";
import {
  analyzeSimilarity,
  buildSimilarityProfile,
  classifyScore,
  diceCoefficient,
  scorePair,
  textSimilarity,
  toNgrams,
} from "@/lib/questionQuality/similarity";
import { SIMILARITY_THRESHOLDS } from "@/lib/questionQuality/thresholds";
import { toQuestionRecord } from "@/scripts/question-bank/candidate-record.mjs";
import type { QuestionRecord } from "@/types/questionBank";
import type { QualityBaseline, QuestionReviewRecord } from "@/types/questionQuality";

// ============================================================================
// 問題品質ゲート（npm run validate:questions）。
// ----------------------------------------------------------------------------
// 目的:
//   1. 公開してはいけない問題（酷似・選択肢不備・レビュー未実施）を止められること
//   2. 止めてはいけない問題（短文・定型句・改変問題）を誤って止めないこと
//   3. 既存246問に新しい blocker / warning を持ち込んでいないこと
// ============================================================================

const ALL = getAllQuestions();
const ROOT = process.cwd();

/** 長さ・語彙とも実際の問題らしいひな形（類似度の下限判定に引っかからない長さにする）。 */
const LONG_PROMPT =
  "ある企業が情報セキュリティ方針を定めるにあたり、経営層の承認を得たうえで全社員へ周知する手順を整備した。この取組みの目的として最も適切なものはどれか。";

function makeQuestion(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const base = {
    prompt: LONG_PROMPT,
    choices: [
      { key: "A" as const, text: "組織全体で情報セキュリティの判断基準をそろえること" },
      { key: "B" as const, text: "個々の担当者が独自の判断で運用できるようにすること" },
      { key: "C" as const, text: "外部委託先との契約を不要にすること" },
      { key: "D" as const, text: "監査の対象範囲を情報システム部門に限定すること" },
    ],
    correctChoice: "A" as const,
    explanation: "方針を経営層の承認のもとで全社に周知することで、判断基準が組織全体でそろいます。",
  };

  const merged = { ...base, ...overrides };
  const question: QuestionRecord = {
    id: "quality-sample-1",
    version: 1,
    origin: "app_original",
    status: "draft",
    primaryTopicId: "tech-security-management",
    questionPattern: "knowledge",
    prompt: merged.prompt,
    choices: merged.choices,
    correctChoice: merged.correctChoice,
    explanation: merged.explanation,
    estimatedDifficulty: 2,
    tags: [],
    contentHash: "",
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  };

  if (overrides.contentHash === undefined) {
    question.contentHash = computeContentHash(question);
  }
  return question;
}

function makeReview(overrides: Partial<QuestionReviewRecord> = {}): QuestionReviewRecord {
  return {
    questionId: "quality-sample-1",
    version: 1,
    contentReviewedBy: "reviewer-a",
    explanationReviewedBy: "reviewer-b",
    reviewedAt: "2026-08-01T00:00:00.000Z",
    decision: "approve",
    ...overrides,
  };
}

const rules = (findings: { rule: string }[]) => findings.map((f) => f.rule);

// ---------------------------------------------------------------------------
// 1. AI生成メタデータ
// ---------------------------------------------------------------------------

describe("AI生成問題のメタデータ", () => {
  const generation = {
    provider: "anthropic",
    model: "claude-opus-5",
    promptVersion: "ip-v1",
    generatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("ai_generated も監査の進行に合わせて status を上げられる", () => {
    // 来歴を残したまま公開できることが目的なので、status を draft に固定しない。
    // 固定すると「公開するには別の origin へ移す」しかなくなり、そのとき generation を捨てる。
    for (const status of ["draft", "content_verified", "explanation_verified"] as const) {
      const q = makeQuestion({ id: "ai-1", origin: "ai_generated", status, generation });
      expect(formatIssues(validateQuestions([q])), `status "${status}" が拒否されました`).toBe("");
    }
  });

  it("retired も許可される（出題停止は origin を問わない）", () => {
    const q = makeQuestion({ id: "ai-1", origin: "ai_generated", status: "retired", generation });
    expect(formatIssues(validateQuestions([q]))).toBe("");
  });

  it("published にしても generation は保持される", () => {
    // origin を app_original へ移して公開する運用を禁止しているので、
    // published の AI 生成問題が generation を持っていることが正常な状態。
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "published",
      generation,
      reviewedAt: "2026-08-01T09:00:00.000Z",
      reviewedBy: "kobayashi",
    });

    expect(formatIssues(validateQuestions([q]))).toBe("");
    expect(q.generation).toEqual(generation);
    expect(q.origin).toBe("ai_generated");
  });

  it("ai_generated には generation が必須", () => {
    const q = makeQuestion({ id: "ai-1", origin: "ai_generated", status: "draft" });
    expect(rules(validateQuestions([q]))).toContain("generation-required");
  });

  it("ai_generated 以外に generation は付けられない", () => {
    for (const origin of ["app_original", "official_past", "modified_official"] as const) {
      const q = makeQuestion({ id: "x-1", origin, generation });
      expect(rules(validateQuestions([q]))).toContain("generation-unexpected");
    }
  });

  it("generation の必須項目が空だと失敗する", () => {
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "draft",
      generation: { ...generation, model: "  " },
    });
    expect(rules(validateQuestions([q]))).toContain("generation-field-required");
  });

  it("referenceQuestionIds の参照切れを検出する", () => {
    const target = makeQuestion({ id: "app-1" });
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "draft",
      generation: { ...generation, referenceQuestionIds: ["app-1", "does-not-exist"] },
    });

    const issues = validateQuestions([target, q]);
    expect(rules(issues)).toContain("generation-reference-resolvable");
    expect(issues.find((i) => i.rule === "generation-reference-resolvable")?.message).toContain(
      "does-not-exist",
    );
    // 実在する方は報告されない。
    expect(issues.filter((i) => i.rule === "generation-reference-resolvable")).toHaveLength(1);
  });

  it("referenceQuestionIds に自分自身は入れられない", () => {
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "draft",
      generation: { ...generation, referenceQuestionIds: ["ai-1"] },
    });
    expect(rules(validateQuestions([q]))).toContain("generation-reference-self");
  });
});

// ---------------------------------------------------------------------------
// 2. 改変問題の出典
// ---------------------------------------------------------------------------

describe("modified_official の出典", () => {
  const officialSource = {
    provider: "ipa" as const,
    examType: "it_passport" as const,
    year: 2026,
    questionNumber: 1,
    examField: "strategy" as const,
    sourceUrl: "https://example.test/qs.pdf",
    answerSourceUrl: "https://example.test/ans.pdf",
    attribution: "IPA 独立行政法人情報処理推進機構",
    isModified: true,
  };

  it("derivedFromQuestionId が無いと失敗する", () => {
    const q = makeQuestion({ id: "mod-1", origin: "modified_official", official: officialSource });
    expect(rules(validateQuestions([q]))).toContain("modified-official-derived-from");
  });

  it("derivedFromQuestionId は official_past を指す必要がある", () => {
    const parent = makeQuestion({ id: "app-parent" });
    const q = makeQuestion({
      id: "mod-1",
      origin: "modified_official",
      official: { ...officialSource, derivedFromQuestionId: "app-parent" },
    });
    expect(rules(validateQuestions([parent, q]))).toContain("derived-from-official-past");
  });

  it("参照切れを検出する", () => {
    const q = makeQuestion({
      id: "mod-1",
      origin: "modified_official",
      official: { ...officialSource, derivedFromQuestionId: "missing" },
    });
    expect(rules(validateQuestions([q]))).toContain("derived-from-resolvable");
  });

  it("modified_official 以外には付けられない", () => {
    const q = makeQuestion({
      id: "off-1",
      origin: "official_past",
      official: { ...officialSource, isModified: false, derivedFromQuestionId: "x" },
    });
    expect(rules(validateQuestions([q]))).toContain("derived-from-unexpected");
  });
});

// ---------------------------------------------------------------------------
// 3. 正規化と類似度
// ---------------------------------------------------------------------------

describe("正規化", () => {
  it("全角・半角と大文字小文字を統一する", () => {
    expect(normalizeForSimilarity("ＴＣＰ／ＩＰ")).toBe(normalizeForSimilarity("tcp/ip"));
    expect(normalizeForSimilarity("ｾｷｭﾘﾃｨ")).toBe(normalizeForSimilarity("セキュリティ"));
  });

  it("空白・改行・句読点を落とす", () => {
    expect(normalizeForSimilarity("情報 セキュリティ、\n方針。")).toBe(
      normalizeForSimilarity("情報セキュリティ方針"),
    );
  });

  it("定型句を落とす", () => {
    const normalized = normalizeForSimilarity(
      "次の記述のうち、共通鍵暗号方式の特徴として最も適切なものはどれか。",
    );
    expect(normalized).not.toContain("次の記述");
    expect(normalized).not.toContain("最も適切");
    expect(normalized).toContain("共通鍵暗号方式の特徴");
  });

  it("定型句を共有するだけの別問題を似ていると判定しない", () => {
    // 全問に同じ言い回しが入るため、落とさないと「どの問題も似ている」になり閾値が意味を失う。
    const a = "次の記述のうち、共通鍵暗号方式の特徴として最も適切なものはどれか。";
    const b = "次の記述のうち、損益分岐点の求め方として最も適切なものはどれか。";
    const score = textSimilarity(normalizeForSimilarity(a), normalizeForSimilarity(b));
    expect(score).toBeLessThan(SIMILARITY_THRESHOLDS.notice);
  });

  it("数値の選択肢を潰さない（過去に別の選択肢を同一視した回帰の防止）", () => {
    // "5か月" と "2か月" が両方 "か月" になり、重複扱いされたことがある。
    expect(normalizeForSimilarity("5か月")).not.toBe(normalizeForSimilarity("2か月"));
    expect(normalizeForSimilarity("a, d")).not.toBe(normalizeForSimilarity("c, d"));
    expect(normalizeForSimilarity("30")).not.toBe(normalizeForSimilarity("90"));
    expect(normalizeForSimilarity("-15")).not.toBe(normalizeForSimilarity("15"));
    expect(normalizeForSimilarity("50%")).not.toBe(normalizeForSimilarity("50"));
  });

  it("かなの選択肢記号だけを落とす（語頭のかなは残す）", () => {
    expect(normalizeForSimilarity("ア．共通鍵暗号方式")).toBe(
      normalizeForSimilarity("共通鍵暗号方式"),
    );
    // "アクセス制御" の "ア" は記号ではない。
    expect(normalizeForSimilarity("アクセス制御")).toBe("アクセス制御");
  });

  it("選択肢の並べ替えだけでは問題全体のテキストが変わらない", () => {
    const choices = [
      { key: "A", text: "選択肢いち" },
      { key: "B", text: "選択肢にい" },
    ];
    const reordered = [choices[1], choices[0]];
    expect(normalizeQuestionText("問題文", choices)).toBe(normalizeQuestionText("問題文", reordered));
  });
});

describe("類似度スコア", () => {
  it("n-gram の Dice が定義どおり", () => {
    // "abcd" -> {ab, bc, cd} / "abce" -> {ab, bc, ce}: 共通2, 合計6 -> 2*2/6
    expect(diceCoefficient(toNgrams("abcd"), toNgrams("abce"))).toBeCloseTo(4 / 6, 10);
    expect(textSimilarity("完全に同じ文章です", "完全に同じ文章です")).toBe(1);
  });

  it("同じ文なら1、無関係な文なら低い", () => {
    const a = "共通鍵暗号方式では、送信者と受信者が同じ鍵を共有して暗号化と復号を行う。";
    const b = "損益分岐点売上高は、固定費を限界利益率で割ることで求められる。";
    expect(textSimilarity(normalizeForSimilarity(a), normalizeForSimilarity(a))).toBe(1);
    expect(textSimilarity(normalizeForSimilarity(a), normalizeForSimilarity(b))).toBeLessThan(0.3);
  });
});

describe("類似度の帯（閾値の境界）", () => {
  const profile = (id: string, prompt: string) =>
    buildSimilarityProfile(makeQuestion({ id, prompt }));

  /** 帯の判定だけを見たいので、スコアを直接与えて分類する。 */
  const bandOf = (score: number, promptLength = 60) => {
    const filler = "あ".repeat(promptLength);
    const a = profile("a", filler);
    const b = profile("b", filler);
    return classifyScore(
      {
        promptScore: score,
        fullScore: score,
        correctChoiceScore: score,
        score,
        fullJaccard: score,
        exact: false,
      },
      a,
      b,
    );
  };

  it("0.92 以上は block、直下は review_required", () => {
    expect(bandOf(SIMILARITY_THRESHOLDS.block)).toBe("block");
    expect(bandOf(0.95)).toBe("block");
    expect(bandOf(SIMILARITY_THRESHOLDS.block - 0.0001)).toBe("review_required");
  });

  it("0.80 以上は review_required、直下は notice", () => {
    expect(bandOf(SIMILARITY_THRESHOLDS.reviewRequired)).toBe("review_required");
    expect(bandOf(SIMILARITY_THRESHOLDS.reviewRequired - 0.0001)).toBe("notice");
  });

  it("0.70 以上は notice、直下は ok", () => {
    expect(bandOf(SIMILARITY_THRESHOLDS.notice)).toBe("notice");
    expect(bandOf(SIMILARITY_THRESHOLDS.notice - 0.0001)).toBe("ok");
  });

  it("正規化後の完全一致は exact_duplicate", () => {
    const a = profile("a", LONG_PROMPT);
    const b = profile("b", LONG_PROMPT);
    expect(classifyScore(scorePair(a, b), a, b)).toBe("exact_duplicate");
  });

  it("短文・定型句は block に上げず notice に丸める", () => {
    // 「aとbの組合せはどれか」のような短い問題文は、偶然スコアが跳ねる。
    const a = profile("a", "aとbの組合せ");
    const b = profile("b", "aとcの組合せ");
    const pair = scorePair(a, b);
    expect(pair.score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLDS.reviewRequired);
    expect(classifyScore(pair, a, b)).toBe("notice");
  });
});

// ---------------------------------------------------------------------------
// 4. 公開の阻止
// ---------------------------------------------------------------------------

describe("公式問題と酷似したAI/独自問題の公開阻止", () => {
  const officialSource = {
    provider: "ipa" as const,
    examType: "it_passport" as const,
    year: 2026,
    questionNumber: 1,
    examField: "strategy" as const,
    sourceUrl: "https://example.test/qs.pdf",
    answerSourceUrl: "https://example.test/ans.pdf",
    attribution: "IPA 独立行政法人情報処理推進機構",
    isModified: false,
  };

  const official = makeQuestion({
    id: "official-1",
    origin: "official_past",
    status: "published",
    official: officialSource,
    reviewedAt: "2026-07-01T00:00:00.000Z",
    reviewedBy: "reviewer-a",
  });

  it("公式と完全一致する独自問題は published にできない", () => {
    const copy = makeQuestion({ id: "app-copy", origin: "app_original", status: "published" });
    const results = analyzeSimilarity([official, copy]);

    const findings = checkSimilarityGate(copy, results.get("app-copy"));
    const blocker = findings.find((f) => f.severity === "blocker");
    expect(blocker?.rule).toBe("similarity-exact-duplicate");
    expect(blocker?.similarity?.matchedQuestionId).toBe("official-1");
    expect(blocker?.similarity?.band).toBe("exact_duplicate");
  });

  it("block 帯の独自問題は published にできない", () => {
    // 語尾だけを変えた問題（Dice で 0.92 以上になる）。
    const nearCopy = makeQuestion({
      id: "app-near",
      origin: "app_original",
      status: "published",
      prompt: `${LONG_PROMPT}なお、社内規程は別途定めるものとする。`,
    });
    const results = analyzeSimilarity([official, nearCopy]);
    const match = results.get("app-near")!.best!;
    expect(match.scores.score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLDS.block);

    const findings = checkSimilarityGate(nearCopy, results.get("app-near"));
    expect(findings.some((f) => f.severity === "blocker" && f.rule === "similarity-block")).toBe(true);
  });

  it("draft のうちは blocker にせず warning として報告する", () => {
    const copy = makeQuestion({ id: "app-copy", origin: "app_original", status: "draft" });
    const results = analyzeSimilarity([official, copy]);
    const findings = checkSimilarityGate(copy, results.get("app-copy"));

    expect(findings.every((f) => f.severity === "warning")).toBe(true);
    expect(rules(findings)).toContain("similarity-exact-duplicate");
  });

  it("公式問題どうしの酷似は公開を阻害しない", () => {
    const otherOfficial = makeQuestion({
      id: "official-2",
      origin: "official_past",
      status: "published",
      official: { ...officialSource, questionNumber: 2 },
      reviewedAt: "2026-07-01T00:00:00.000Z",
      reviewedBy: "reviewer-a",
    });

    const results = analyzeSimilarity([official, otherOfficial]);
    const findings = checkSimilarityGate(otherOfficial, results.get("official-2"));

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.severity === "warning")).toBe(true);
  });

  it("改変問題は改変元との類似では止まらない", () => {
    const modified = makeQuestion({
      id: "mod-1",
      origin: "modified_official",
      status: "published",
      prompt: `${LONG_PROMPT}なお、社内規程は別途定めるものとする。`,
      official: {
        ...officialSource,
        questionNumber: 2,
        isModified: true,
        derivedFromQuestionId: "official-1",
      },
      reviewedAt: "2026-07-01T00:00:00.000Z",
      reviewedBy: "reviewer-a",
    });

    const results = analyzeSimilarity([official, modified]);
    const findings = checkSimilarityGate(modified, results.get("mod-1"));

    expect(findings.every((f) => f.severity === "warning")).toBe(true);
    expect(rules(findings)).toContain("similarity-derived-expected");
    // 改変元との類似だけでは、類似度レビューは要求しない。
    expect(needsSimilarityReview(modified, results.get("mod-1"))).toBe(false);
  });

  it("改変元以外の問題と酷似していれば改変問題でも止める", () => {
    const otherOfficial = makeQuestion({
      id: "official-9",
      origin: "official_past",
      status: "published",
      official: { ...officialSource, questionNumber: 9 },
      reviewedAt: "2026-07-01T00:00:00.000Z",
      reviewedBy: "reviewer-a",
    });
    const derivedFrom = makeQuestion({
      id: "official-1",
      origin: "official_past",
      status: "published",
      prompt: "全く別の内容を問う問題文で、共有する語が少なくなるように書いてあります。損益分岐点の計算。",
      official: officialSource,
      reviewedAt: "2026-07-01T00:00:00.000Z",
      reviewedBy: "reviewer-a",
    });
    const modified = makeQuestion({
      id: "mod-1",
      origin: "modified_official",
      status: "published",
      official: {
        ...officialSource,
        questionNumber: 2,
        isModified: true,
        derivedFromQuestionId: "official-1",
      },
      reviewedAt: "2026-07-01T00:00:00.000Z",
      reviewedBy: "reviewer-a",
    });

    const results = analyzeSimilarity([derivedFrom, otherOfficial, modified]);
    const findings = checkSimilarityGate(modified, results.get("mod-1"));
    expect(findings.some((f) => f.severity === "blocker")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. 品質ゲート
// ---------------------------------------------------------------------------

describe("選択肢の検査", () => {
  it("選択肢本文の完全重複は blocker", () => {
    const q = makeQuestion({
      choices: [
        { key: "A", text: "共通鍵暗号方式を用いる" },
        { key: "B", text: "共通鍵暗号方式を、用いる。" }, // 表記ゆれだけの差
        { key: "C", text: "公開鍵暗号方式を用いる" },
        { key: "D", text: "ハッシュ関数を用いる" },
      ],
    });
    const findings = checkQuestionQuality(q);
    const dup = findings.find((f) => f.rule === "choice-text-duplicate");
    expect(dup?.severity).toBe("blocker");
  });

  it("ほぼ同義の選択肢は warning", () => {
    const q = makeQuestion({
      choices: [
        { key: "A", text: "利用者の識別と認証を行う仕組みを導入する" },
        { key: "B", text: "利用者の識別と認証を行う仕組みを整備する" },
        { key: "C", text: "通信経路を暗号化する" },
        { key: "D", text: "物理的な入退室管理を行う" },
      ],
    });
    const findings = checkQuestionQuality(q);
    const near = findings.find((f) => f.rule === "choice-near-duplicate");
    expect(near?.severity).toBe("warning");
  });

  it("順序問題の選択肢は近似判定の対象にしない", () => {
    const q = makeQuestion({
      questionPattern: "ordering",
      choices: [
        { key: "A", text: "計画 → 実行 → 評価 → 改善" },
        { key: "B", text: "実行 → 計画 → 評価 → 改善" },
        { key: "C", text: "評価 → 改善 → 計画 → 実行" },
        { key: "D", text: "改善 → 評価 → 実行 → 計画" },
      ],
    });
    expect(rules(checkQuestionQuality(q))).not.toContain("choice-near-duplicate");
  });

  it("断定語が1つの選択肢にだけ現れると warning", () => {
    const q = makeQuestion({
      choices: [
        { key: "A", text: "リスクの大きさに応じて対策を選ぶ" },
        { key: "B", text: "必ずすべてのリスクをゼロにする" },
        { key: "C", text: "受容できるリスクは残す" },
        { key: "D", text: "対策の費用対効果を検討する" },
      ],
    });
    expect(rules(checkQuestionQuality(q))).toContain("absolute-word-hint");
  });

  it("正答だけ極端に長いと warning", () => {
    const q = makeQuestion({
      choices: [
        {
          key: "A",
          text: "経営層の承認を得たうえで全社員へ周知し、定期的な見直しと教育を継続して実施する",
        },
        { key: "B", text: "担当者が決める" },
        { key: "C", text: "外部に任せる" },
        { key: "D", text: "特に定めない" },
      ],
    });
    expect(rules(checkQuestionQuality(q))).toContain("correct-choice-longest");
  });

  it("短い用語の並びは長さの警告を出さない（誤検出の抑制）", () => {
    const q = makeQuestion({
      choices: [
        { key: "A", text: "パブリシティ権" },
        { key: "B", text: "意匠権" },
        { key: "C", text: "商標権" },
        { key: "D", text: "著作権" },
      ],
    });
    expect(rules(checkQuestionQuality(q))).not.toContain("correct-choice-longest");
  });
});

describe("正答ヒント・解説の検査", () => {
  it("問題文が正答を明かしていると warning", () => {
    const q = makeQuestion({ prompt: `${LONG_PROMPT}なお、正解は選択肢の1つ目である。` });
    expect(rules(checkQuestionQuality(q))).toContain("prompt-reveals-answer");
  });

  it("問題文が正答本文をそのまま含むと warning", () => {
    const q = makeQuestion({
      prompt: "組織全体で情報セキュリティの判断基準をそろえることを目的とする取組みとして適切なものはどれか。",
    });
    expect(rules(checkQuestionQuality(q))).toContain("answer-text-in-prompt");
  });

  it("解説が別の選択肢を正解として説明していると blocker", () => {
    const q = makeQuestion({
      correctChoice: "A",
      explanation: "正解はイです。方針を全社に周知することで判断基準がそろいます。",
    });
    const finding = checkQuestionQuality(q).find(
      (f) => f.rule === "explanation-contradicts-answer",
    );
    expect(finding?.severity).toBe("blocker");
  });

  it("解説中の「正解はアクセス制御…」を選択肢アと読み違えない", () => {
    const q = makeQuestion({
      correctChoice: "A",
      explanation: "正解はアクセス制御の考え方そのものです。判断基準を組織でそろえます。",
    });
    expect(rules(checkQuestionQuality(q))).not.toContain("explanation-contradicts-answer");
  });

  it("正答の選択肢別解説が別の選択肢を正解と書いていると blocker", () => {
    const q = makeQuestion({
      correctChoice: "A",
      choiceExplanations: { A: "正解はウです。", B: "誤りです。" },
    });
    const finding = checkQuestionQuality(q).find((f) => f.rule === "choice-explanation-mismatch");
    expect(finding?.severity).toBe("blocker");
  });

  it("存在しない選択肢キーの解説は blocker", () => {
    const q = makeQuestion({
      choiceExplanations: { A: "正しい。", E: "存在しないキー" } as Record<string, string>,
    });
    const finding = checkQuestionQuality(q).find(
      (f) => f.rule === "choice-explanation-unknown-key",
    );
    expect(finding?.severity).toBe("blocker");
  });

  it("計算問題で単位が無いと warning", () => {
    const q = makeQuestion({
      questionPattern: "calculation",
      prompt: "ある処理の実行結果として得られる値はいくつか。条件は本文のとおりとする。数値だけを答える。",
      choices: [
        { key: "A", text: "12" },
        { key: "B", text: "24" },
        { key: "C", text: "36" },
        { key: "D", text: "48" },
      ],
    });
    expect(rules(checkQuestionQuality(q))).toContain("calculation-missing-unit");
  });

  it("否定を問う出題で否定が不明瞭だと warning", () => {
    const q = makeQuestion({
      prompt: "情報セキュリティ方針の運用について、適切でない対応を選び、その理由を踏まえて判断せよ。",
    });
    expect(rules(checkQuestionQuality(q))).toContain("negative-question-unclear");
  });

  it("「適切でないものはどれか」は明示されているので警告しない", () => {
    const q = makeQuestion({
      prompt: "情報セキュリティ方針の運用に関する記述のうち、適切でないものはどれか。全社への周知を前提とする。",
    });
    expect(rules(checkQuestionQuality(q))).not.toContain("negative-question-unclear");
  });
});

// ---------------------------------------------------------------------------
// 6. レビュー記録
// ---------------------------------------------------------------------------

describe("レビュー記録", () => {
  const generation = {
    provider: "anthropic",
    model: "claude-opus-5",
    promptVersion: "ip-v1",
    generatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("承認記録が無い modified_official は published にできない", () => {
    const q = makeQuestion({ id: "mod-1", origin: "modified_official", status: "published" });
    const findings = checkReviewGate(q, undefined, false);
    expect(findings.find((f) => f.rule === "review-record-required")?.severity).toBe("blocker");
  });

  it("decision が approve 以外なら published にできない", () => {
    const q = makeQuestion({ id: "mod-1", origin: "modified_official", status: "published" });
    for (const decision of ["revise", "reject"] as const) {
      const findings = checkReviewGate(q, makeReview({ questionId: "mod-1", decision }), false);
      expect(rules(findings)).toContain("review-not-approved");
    }
  });

  it("version がずれたレビュー記録は失効する", () => {
    const q = makeQuestion({
      id: "mod-1",
      version: 2,
      origin: "modified_official",
      status: "published",
    });
    const findings = checkReviewGate(q, makeReview({ questionId: "mod-1", version: 1 }), false);
    expect(rules(findings)).toContain("review-version-mismatch");
  });

  it("review_required 帯には similarityReviewedBy が必要", () => {
    const q = makeQuestion({ id: "app-1", origin: "app_original", status: "published" });

    const without = checkReviewGate(q, makeReview({ questionId: "app-1" }), true);
    expect(rules(without)).toContain("review-similarity-required");

    const withReviewer = checkReviewGate(
      q,
      makeReview({ questionId: "app-1", similarityReviewedBy: "reviewer-c" }),
      true,
    );
    expect(withReviewer).toHaveLength(0);
  });

  it("類似度が問題なければ app_original はレビュー記録なしで published にできる", () => {
    const q = makeQuestion({ id: "app-1", origin: "app_original", status: "published" });
    expect(checkReviewGate(q, undefined, false)).toHaveLength(0);
  });

  it("承認記録が無い ai_generated は published にできない", () => {
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "published",
      generation,
    });
    const findings = checkReviewGate(q, undefined, false);
    expect(findings.find((f) => f.rule === "review-record-required")?.severity).toBe("blocker");
  });

  it("ai_generated は類似度が ok 帯でも similarityReviewedBy が必要", () => {
    // AI は既存問題の言い回しをなぞるので、閾値の下でも人が類似度を見た記録を求める。
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "published",
      generation,
    });

    const without = checkReviewGate(q, makeReview({ questionId: "ai-1" }), false);
    expect(rules(without)).toContain("review-similarity-required");

    const withReviewer = checkReviewGate(
      q,
      makeReview({ questionId: "ai-1", similarityReviewedBy: "reviewer-c" }),
      false,
    );
    expect(withReviewer).toHaveLength(0);
  });

  it("version がずれたレビュー記録では ai_generated を published にできない", () => {
    const q = makeQuestion({
      id: "ai-1",
      version: 2,
      origin: "ai_generated",
      status: "published",
      generation,
    });
    const findings = checkReviewGate(
      q,
      makeReview({ questionId: "ai-1", version: 1, similarityReviewedBy: "reviewer-c" }),
      false,
    );
    expect(rules(findings)).toContain("review-version-mismatch");
  });

  it("approve でないレビュー記録では ai_generated を published にできない", () => {
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "published",
      generation,
    });
    for (const decision of ["revise", "reject"] as const) {
      const findings = checkReviewGate(
        q,
        makeReview({ questionId: "ai-1", decision, similarityReviewedBy: "reviewer-c" }),
        false,
      );
      expect(rules(findings)).toContain("review-not-approved");
    }
  });

  it("条件をすべて満たした ai_generated は published にできる", () => {
    const q = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "published",
      generation,
      reviewedAt: "2026-08-01T09:00:00.000Z",
      reviewedBy: "kobayashi",
    });
    const review = makeReview({
      questionId: "ai-1",
      similarityReviewedBy: "reviewer-c",
      authoredBy: "claude-opus-5",
    });

    const report = buildQualityReport({
      questions: [q],
      reviews: new Map([[q.id, review]]),
      reviewFileNames: new Map([[q.id, "ai-1.json"]]),
    });

    expect(
      report.findings
        .filter((f) => f.severity === "blocker")
        .map((f) => `- [${f.rule}] ${f.questionId}: ${f.message}`)
        .join("\n"),
    ).toBe("");
    // 公開できたうえで、来歴が残っていること自体がこの変更の目的。
    expect(report.summary.byOrigin.ai_generated).toBe(1);
    expect(report.summary.byStatus.published).toBe(1);
  });

  it("blocker が残っている ai_generated は published にできない", () => {
    // 既存問題と正規化後に完全一致する AI 生成問題。承認記録がそろっていても通さない。
    const original = makeQuestion({ id: "app-1", origin: "app_original", status: "published" });
    const copy = makeQuestion({
      id: "ai-1",
      origin: "ai_generated",
      status: "published",
      generation,
      reviewedAt: "2026-08-01T09:00:00.000Z",
      reviewedBy: "kobayashi",
    });

    const report = buildQualityReport({
      questions: [original, copy],
      reviews: new Map([
        ["ai-1", makeReview({ questionId: "ai-1", similarityReviewedBy: "reviewer-c" })],
      ]),
      reviewFileNames: new Map([["ai-1", "ai-1.json"]]),
    });

    const blockers = report.findings.filter((f) => f.severity === "blocker" && f.questionId === "ai-1");
    expect(rules(blockers)).toContain("similarity-exact-duplicate");
    expect(report.summary.blockerCount).toBeGreaterThan(0);
  });

  it("自己レビューの扱いは REVIEWER_INDEPENDENCE に集約されている", () => {
    // 将来 blocker へ厳格化するときに、書き換える場所が1つで済むようにしてある。
    const review = makeReview({
      authoredBy: "kobayashi",
      contentReviewedBy: "kobayashi",
      explanationReviewedBy: "kobayashi",
    });
    const self = validateReviewRecord(review, "quality-sample-1.json").find(
      (f) => f.rule === "review-self-review",
    );
    expect(self?.severity).toBe(REVIEWER_INDEPENDENCE.selfReviewSeverity);
    expect(REVIEWER_INDEPENDENCE.selfReviewSeverity).toBe("warning");
  });

  it("作成者とレビュー者が同じなら warning", () => {
    const review = makeReview({
      authoredBy: "kobayashi",
      contentReviewedBy: "kobayashi",
      explanationReviewedBy: "kobayashi",
    });
    const findings = validateReviewRecord(review, "quality-sample-1.json");
    const self = findings.find((f) => f.rule === "review-self-review");
    expect(self?.severity).toBe("warning");
  });

  it("別の人がレビューしていれば自己レビューの警告は出ない", () => {
    const review = makeReview({ authoredBy: "kobayashi", contentReviewedBy: "reviewer-a" });
    expect(rules(validateReviewRecord(review, "quality-sample-1.json"))).not.toContain(
      "review-self-review",
    );
  });

  it("ファイル名と questionId の不一致を検出する", () => {
    const findings = validateReviewRecord(makeReview(), "another-id.json");
    expect(rules(findings)).toContain("review-file-name");
  });

  it("decision の値を検査する", () => {
    const findings = validateReviewRecord(
      makeReview({ decision: "ok" as unknown as "approve" }),
      "quality-sample-1.json",
    );
    expect(rules(findings)).toContain("review-decision");
  });
});

// ---------------------------------------------------------------------------
// 7. レポートとベースライン
// ---------------------------------------------------------------------------

describe("品質レポート", () => {
  it("ベースラインとの差分で新規 warning だけを取り出す", () => {
    const report = buildQualityReport({
      questions: [
        makeQuestion({
          id: "app-1",
          choices: [
            { key: "A", text: "リスクの大きさに応じて対策を選ぶ" },
            { key: "B", text: "必ずすべてのリスクをゼロにする" },
            { key: "C", text: "受容できるリスクは残す" },
            { key: "D", text: "対策の費用対効果を検討する" },
          ],
        }),
      ],
      reviews: new Map(),
    });

    expect(report.summary.blockerCount).toBe(0);
    const warning = report.findings.find((f) => f.rule === "absolute-word-hint");
    expect(warning).toBeDefined();

    const empty: QualityBaseline = { schemaVersion: 1, note: "", knownWarnings: [] };
    expect(diffAgainstBaseline(report, empty).newWarnings).toHaveLength(report.summary.warningCount);

    const full = buildBaseline(report, "test");
    expect(diffAgainstBaseline(report, full).newWarnings).toHaveLength(0);
    expect(full.knownWarnings).toContain(baselineKey(warning!));
  });

  it("同じ入力なら同じレポートになる", () => {
    const questions = ALL.slice(0, 40);
    const first = buildQualityReport({ questions, reviews: new Map() });
    const second = buildQualityReport({ questions, reviews: new Map() });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("Markdown を生成できる", () => {
    const report = buildQualityReport({ questions: ALL.slice(0, 10), reviews: new Map() });
    const markdown = renderQualityReportMarkdown(report, { newWarnings: [], resolvedWarnings: [] });
    expect(markdown).toContain("# 問題品質レポート");
    expect(markdown).toContain("## blocker");
  });
});

// ---------------------------------------------------------------------------
// 8. 既存問題への影響
// ---------------------------------------------------------------------------

describe("既存の問題バンク", () => {
  const reviews = loadReviewRecords(ROOT);
  const report = buildQualityReport({
    questions: ALL,
    reviews: reviews.byQuestionId,
    reviewFileNames: reviews.fileNames,
  });

  it("既存246問に blocker が無い", () => {
    const blockers = report.findings.filter((f) => f.severity === "blocker");
    expect(
      blockers.map((f) => `- [${f.rule}] ${f.questionId}: ${f.message}`).join("\n"),
    ).toBe("");
  });

  it("既存の検証（validateQuestions）も通り続ける", () => {
    expect(formatIssues(validateQuestions(ALL))).toBe("");
  });

  it("既知 warning のベースライン外に新しい warning が出ていない", () => {
    const baselinePath = path.join(ROOT, "data/question-bank/quality-baseline.json");
    expect(existsSync(baselinePath)).toBe(true);

    const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as QualityBaseline;
    const diff = diffAgainstBaseline(report, baseline);

    expect(
      diff.newWarnings.map((f) => `- [${f.rule}] ${f.questionId}: ${f.message}`).join("\n"),
    ).toBe("");
  });

  it("レビュー記録はすべて実在する問題を指している", () => {
    expect(reviews.parseErrors).toEqual([]);
    for (const [questionId, review] of reviews.byQuestionId) {
      expect(
        ALL.some((q) => q.id === review.questionId),
        `レビュー記録 ${questionId} が存在しない問題を指しています`,
      ).toBe(true);
    }
  });

  it("問題バンクに重複・酷似した問題が無い", () => {
    const results = analyzeSimilarity(ALL);
    const serious: string[] = [];
    for (const [questionId, result] of results) {
      for (const match of [result.best, result.bestOfficial]) {
        if (!match) continue;
        if (match.band === "exact_duplicate" || match.band === "block") {
          serious.push(`${questionId} <-> ${match.matchedQuestionId} (${match.scores.score.toFixed(3)})`);
        }
      }
    }
    expect(serious.join("\n")).toBe("");
  });

  it("AI生成問題は status を問わず generation を保持している", () => {
    // 公開のために origin を app_original へ移す運用を禁止しているので、
    // published の AI 生成問題も来歴を持ったままバンクに残る。
    for (const q of ALL.filter((x) => x.origin === "ai_generated")) {
      expect(q.generation, `${q.id} に generation がありません`).toBeDefined();
    }
  });

  it("published の AI生成問題には承認記録がそろっている", () => {
    for (const q of ALL.filter((x) => x.origin === "ai_generated" && x.status === "published")) {
      const review = reviews.byQuestionId.get(q.id);
      expect(review, `${q.id} のレビュー記録がありません`).toBeDefined();
      expect(review?.decision, `${q.id} が approve されていません`).toBe("approve");
      expect(review?.version, `${q.id} のレビュー記録が失効しています`).toBe(q.version);
      expect(review?.similarityReviewedBy, `${q.id} の similarityReviewedBy が空です`).toBeTruthy();
      expect(q.reviewedAt, `${q.id} の reviewedAt が空です`).toBeTruthy();
      expect(q.reviewedBy, `${q.id} の reviewedBy が空です`).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// 9. 候補の取り込み（AI に公開状態を決めさせない）
// ---------------------------------------------------------------------------

describe("AI候補の取り込み", () => {
  const generation = {
    provider: "anthropic",
    model: "claude-opus-5",
    promptVersion: "ip-v1",
    generatedAt: "2026-08-01T00:00:00.000Z",
  };

  function makeCandidate(overrides: Record<string, unknown> = {}) {
    return {
      id: "ai-cand-1",
      primaryTopicId: "tech-security-management",
      questionPattern: "knowledge",
      prompt: LONG_PROMPT,
      choices: [
        { key: "A", text: "組織全体で情報セキュリティの判断基準をそろえること" },
        { key: "B", text: "個々の担当者が独自の判断で運用できるようにすること" },
        { key: "C", text: "外部委託先との契約を不要にすること" },
        { key: "D", text: "監査の対象範囲を情報システム部門に限定すること" },
      ],
      correctChoice: "A",
      explanation: "方針を経営層の承認のもとで全社に周知することで、判断基準が組織全体でそろいます。",
      estimatedDifficulty: 2,
      ...overrides,
    };
  }

  it("取り込んだ候補は必ず ai_generated / draft / version 1 になる", () => {
    const record = toQuestionRecord(makeCandidate(), generation, "candidates.json");

    expect(record.origin).toBe("ai_generated");
    expect(record.status).toBe("draft");
    expect(record.version).toBe(1);
    expect(record.reviewedAt).toBeNull();
    expect(record.reviewedBy).toBeNull();
    expect(record.generation).toMatchObject(generation);
    // 取り込んだ時点でデータとしては正しい（公開だけがまだ、という状態）。
    expect(formatIssues(validateQuestions([record as QuestionRecord]))).toBe("");
  });

  it("候補JSONが status: published を指定すると取り込みごと拒否される", () => {
    expect(() =>
      toQuestionRecord(makeCandidate({ status: "published" }), generation, "candidates.json"),
    ).toThrow(/"status" は取り込み側が決める項目/);
  });

  it("候補JSONは origin / version / レビュー情報も指定できない", () => {
    for (const field of ["origin", "version", "contentHash", "reviewedAt", "reviewedBy", "official"]) {
      expect(
        () => toQuestionRecord(makeCandidate({ [field]: "x" }), generation, "candidates.json"),
        `${field} が拒否されていません`,
      ).toThrow(new RegExp(`"${field}" は取り込み側が決める項目`));
    }
  });
});
