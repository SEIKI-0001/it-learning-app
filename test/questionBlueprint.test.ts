import { describe, expect, it } from "vitest";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  blueprintToCandidateFields,
  buildBlueprintTemplate,
  selectReferenceQuestions,
  validateBlueprint,
  validateBlueprintAgainstCandidate,
  validateBlueprintReferences,
} from "@/lib/questionBank/blueprint";
import { getAllQuestions } from "@/lib/questionBank/loader";
import {
  MAX_REFERENCE_QUESTIONS,
  MIN_REFERENCE_QUESTIONS,
  type QuestionBlueprint,
} from "@/types/questionBlueprint";

// ============================================================================
// 設計図ベースの作問フローの検証。
// ----------------------------------------------------------------------------
// AI を呼ばずに動くこと（参照抽出・ひな形・検証・変換）が前提。
// ここのテストも当然 APIキー無しで通る。
// ============================================================================

const ALL = getAllQuestions();
const BLUEPRINT_DIR = path.join(process.cwd(), "data/question-bank/blueprints");
const PROMPT_DIR = path.join(process.cwd(), "data/question-bank/prompts");

function blueprint(overrides: Partial<QuestionBlueprint> = {}): QuestionBlueprint {
  return {
    id: "bp-1",
    primaryTopicId: "strat-intellectual-property",
    learningObjective: "著作権と特許権のどちらで守られるかを判断できる",
    questionPattern: "application",
    targetDifficulty: 2,
    requiredReasoningSteps: ["保護対象を見分ける", "対応する権利を選ぶ"],
    distractorStrategies: ["隣の権利にずらす", "登録要否を取り違える", "上位概念で答えさせる"],
    referenceQuestionIds: ["ipa-it-passport-2026-q001", "ipa-it-passport-2026-q005"],
    prohibitedCopyElements: ["参照問題の題材"],
    promptVersion: "ip-v1",
    ...overrides,
  };
}

function rulesOf(issues: { rule: string }[]): string[] {
  return issues.map((i) => i.rule);
}

// ---------------------------------------------------------------------------
// 1. 参照問題の抽出
// ---------------------------------------------------------------------------

describe("selectReferenceQuestions", () => {
  it("公式の公開済み問題だけを選ぶ", () => {
    const picked = selectReferenceQuestions(ALL, {
      primaryTopicId: "strat-intellectual-property",
    });

    expect(picked.length).toBeGreaterThanOrEqual(MIN_REFERENCE_QUESTIONS);
    for (const q of picked) {
      expect(q.origin).toBe("official_past");
      expect(q.status).toBe("published");
    }
  });

  it("2〜5問の範囲に収める", () => {
    const picked = selectReferenceQuestions(ALL, { primaryTopicId: "tech-ai-ml" });
    expect(picked.length).toBeLessThanOrEqual(MAX_REFERENCE_QUESTIONS);

    const limited = selectReferenceQuestions(ALL, {
      primaryTopicId: "tech-ai-ml",
      limit: 3,
    });
    expect(limited).toHaveLength(3);

    // 上限・下限を超える limit は範囲へ丸める。
    expect(
      selectReferenceQuestions(ALL, { primaryTopicId: "tech-ai-ml", limit: 99 }).length,
    ).toBeLessThanOrEqual(MAX_REFERENCE_QUESTIONS);
  });

  it("条件に合う問題を優先する", () => {
    const picked = selectReferenceQuestions(ALL, {
      primaryTopicId: "strat-intellectual-property",
      limit: 3,
    });
    // 同トピックの問題が先頭に来る。
    expect(picked[0].primaryTopicId).toBe("strat-intellectual-property");
  });

  it("実行するたびに同じ結果になる", () => {
    const criteria = { primaryTopicId: "strat-intellectual-property", limit: 3 };
    expect(selectReferenceQuestions(ALL, criteria).map((q) => q.id)).toEqual(
      selectReferenceQuestions(ALL, criteria).map((q) => q.id),
    );
  });

  it("2問未満しか選べないときは空を返す", () => {
    // 1問だけを見て作ると引き写しになりやすいので、呼び出し側に判断させる。
    expect(selectReferenceQuestions([ALL[0]], {})).toEqual([]);
    expect(selectReferenceQuestions([], {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. ひな形
// ---------------------------------------------------------------------------

describe("buildBlueprintTemplate", () => {
  it("人が埋める欄は空のまま返す", () => {
    const references = selectReferenceQuestions(ALL, {
      primaryTopicId: "strat-intellectual-property",
      limit: 2,
    });
    const template = buildBlueprintTemplate({
      id: "bp-new",
      primaryTopicId: "strat-intellectual-property",
      questionPattern: "application",
      targetDifficulty: 2,
      promptVersion: "ip-v1",
      references,
    });

    expect(template.learningObjective).toBe("");
    expect(template.requiredReasoningSteps).toEqual([]);
    expect(template.distractorStrategies).toEqual([]);
    expect(template.prohibitedCopyElements).toEqual([]);
    expect(template.referenceQuestionIds).toEqual(references.map((q) => q.id));

    // 空のひな形はそのままでは検証を通らない（埋めないと先へ進めない）。
    expect(validateBlueprint(template).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. 設計図そのものの検証
// ---------------------------------------------------------------------------

describe("validateBlueprint", () => {
  it("埋まっている設計図は通る", () => {
    expect(validateBlueprint(blueprint())).toEqual([]);
  });

  it("learningObjective が空なら失敗する", () => {
    expect(rulesOf(validateBlueprint(blueprint({ learningObjective: "" })))).toContain(
      "blueprint-learning-objective",
    );
  });

  it("推論の段が空なら失敗する", () => {
    expect(
      rulesOf(validateBlueprint(blueprint({ requiredReasoningSteps: [] }))),
    ).toContain("blueprint-reasoning-steps");
  });

  it("応用問題で推論が1段だけなら失敗する", () => {
    // 1段で解ける応用問題は、実質は用語の暗記問題になっている。
    const issues = validateBlueprint(
      blueprint({ questionPattern: "application", requiredReasoningSteps: ["1段だけ"] }),
    );
    expect(rulesOf(issues)).toContain("blueprint-reasoning-steps-count");
  });

  it("知識問題なら推論1段でも通る", () => {
    expect(
      validateBlueprint(
        blueprint({ questionPattern: "knowledge", requiredReasoningSteps: ["用語を知っている"] }),
      ),
    ).toEqual([]);
  });

  it("誤答の作り方が3つ未満なら失敗する", () => {
    const issues = validateBlueprint(blueprint({ distractorStrategies: ["1つだけ"] }));
    expect(rulesOf(issues)).toContain("blueprint-distractor-count");
  });

  it("参照問題の数が範囲外なら失敗する", () => {
    expect(
      rulesOf(validateBlueprint(blueprint({ referenceQuestionIds: ["only-one"] }))),
    ).toContain("blueprint-reference-count");

    const tooMany = Array.from({ length: 6 }, (_, i) => `q${i}`);
    expect(
      rulesOf(validateBlueprint(blueprint({ referenceQuestionIds: tooMany }))),
    ).toContain("blueprint-reference-count");
  });

  it("参照問題の重複を検出する", () => {
    const issues = validateBlueprint(
      blueprint({ referenceQuestionIds: ["same", "same"] }),
    );
    expect(rulesOf(issues)).toContain("blueprint-reference-duplicate");
  });

  it("難易度が範囲外なら失敗する", () => {
    expect(rulesOf(validateBlueprint(blueprint({ targetDifficulty: 0 })))).toContain(
      "blueprint-target-difficulty",
    );
    expect(rulesOf(validateBlueprint(blueprint({ targetDifficulty: 4 })))).toContain(
      "blueprint-target-difficulty",
    );
  });
});

// ---------------------------------------------------------------------------
// 4. 参照問題の実在検証
// ---------------------------------------------------------------------------

describe("validateBlueprintReferences", () => {
  it("実在する公式問題を参照していれば通る", () => {
    expect(validateBlueprintReferences(blueprint(), ALL)).toEqual([]);
  });

  it("参照切れを検出する", () => {
    const issues = validateBlueprintReferences(
      blueprint({ referenceQuestionIds: ["ipa-it-passport-2026-q001", "no-such-question"] }),
      ALL,
    );

    expect(rulesOf(issues)).toContain("blueprint-reference-resolvable");
    expect(issues[0].message).toContain("no-such-question");
  });

  it("公式でない問題を参照したら失敗する", () => {
    // アプリ独自問題を参照にすると、コピーの連鎖で元のレベル感から離れていく。
    const appOriginal = ALL.find((q) => q.origin === "app_original")!;
    const issues = validateBlueprintReferences(
      blueprint({
        referenceQuestionIds: ["ipa-it-passport-2026-q001", appOriginal.id],
      }),
      ALL,
    );

    expect(rulesOf(issues)).toContain("blueprint-reference-official");
  });
});

// ---------------------------------------------------------------------------
// 5. 完成問題との整合
// ---------------------------------------------------------------------------

describe("validateBlueprintAgainstCandidate", () => {
  const candidate = {
    id: "bp-1",
    primaryTopicId: "strat-intellectual-property",
    questionPattern: "application",
    estimatedDifficulty: 2,
    referenceQuestionIds: ["ipa-it-passport-2026-q001"],
    generation: { promptVersion: "ip-v1" },
  };

  it("設計図どおりの候補は通る", () => {
    expect(validateBlueprintAgainstCandidate(blueprint(), candidate)).toEqual([]);
  });

  it("トピックのずれを検出する", () => {
    const issues = validateBlueprintAgainstCandidate(blueprint(), {
      ...candidate,
      primaryTopicId: "tech-ai-ml",
    });
    expect(rulesOf(issues)).toContain("blueprint-candidate-topic");
  });

  it("出題形式のずれを検出する", () => {
    const issues = validateBlueprintAgainstCandidate(blueprint(), {
      ...candidate,
      questionPattern: "knowledge",
    });
    expect(rulesOf(issues)).toContain("blueprint-candidate-pattern");
  });

  it("難易度のずれを検出する", () => {
    const issues = validateBlueprintAgainstCandidate(blueprint(), {
      ...candidate,
      estimatedDifficulty: 3,
    });
    expect(rulesOf(issues)).toContain("blueprint-candidate-difficulty");
  });

  it("promptVersion のずれを検出する", () => {
    const issues = validateBlueprintAgainstCandidate(blueprint(), {
      ...candidate,
      generation: { promptVersion: "ip-v2" },
    });
    expect(rulesOf(issues)).toContain("blueprint-candidate-prompt-version");
  });

  it("設計図に無い参照問題を検出する", () => {
    const issues = validateBlueprintAgainstCandidate(blueprint(), {
      ...candidate,
      referenceQuestionIds: ["ipa-it-passport-2026-q099"],
    });
    expect(rulesOf(issues)).toContain("blueprint-candidate-reference");
  });
});

// ---------------------------------------------------------------------------
// 6. 候補形式への変換
// ---------------------------------------------------------------------------

describe("blueprintToCandidateFields", () => {
  it("設計図で決まる値だけを移す", () => {
    const fields = blueprintToCandidateFields(blueprint());

    expect(fields).toEqual({
      id: "bp-1",
      primaryTopicId: "strat-intellectual-property",
      questionPattern: "application",
      estimatedDifficulty: 2,
      referenceQuestionIds: ["ipa-it-passport-2026-q001", "ipa-it-passport-2026-q005"],
    });
  });

  it("取り込み側が固定する項目を含めない", () => {
    // origin / status / version / contentHash を設計図から書けてしまうと、
    // 「設計図が公開状態を決められる」形になる。
    const fields = blueprintToCandidateFields(blueprint()) as Record<string, unknown>;
    for (const field of ["origin", "status", "version", "contentHash", "reviewedAt"]) {
      expect(fields[field]).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// リポジトリ上の設計図とプロンプト
// ---------------------------------------------------------------------------

describe("リポジトリ上の設計図", () => {
  const blueprintFiles = existsSync(BLUEPRINT_DIR)
    ? readdirSync(BLUEPRINT_DIR).filter((n) => n.endsWith(".json"))
    : [];

  it("すべての設計図が検証を通る", () => {
    for (const fileName of blueprintFiles) {
      const bp = JSON.parse(
        readFileSync(path.join(BLUEPRINT_DIR, fileName), "utf8"),
      ) as QuestionBlueprint;

      const issues = [
        ...validateBlueprint(bp),
        ...validateBlueprintReferences(bp, ALL),
      ];
      expect(issues, `${fileName}:\n${issues.map((i) => i.message).join("\n")}`).toEqual(
        [],
      );
    }
  });

  it("ファイル名と id が一致する", () => {
    for (const fileName of blueprintFiles) {
      const bp = JSON.parse(readFileSync(path.join(BLUEPRINT_DIR, fileName), "utf8"));
      expect(`${bp.id}.json`).toBe(fileName);
    }
  });

  it("promptVersion に対応するテンプレートが Git 上にある", () => {
    for (const fileName of blueprintFiles) {
      const bp = JSON.parse(readFileSync(path.join(BLUEPRINT_DIR, fileName), "utf8"));
      expect(
        existsSync(path.join(PROMPT_DIR, `${bp.promptVersion}.md`)),
        `${fileName} の promptVersion "${bp.promptVersion}"`,
      ).toBe(true);
    }
  });
});
