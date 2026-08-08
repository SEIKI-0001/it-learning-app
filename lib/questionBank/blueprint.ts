import type { QuestionBankIssue } from "@/lib/questionBank/validate";
import {
  MAX_REFERENCE_QUESTIONS,
  MAX_TARGET_DIFFICULTY,
  MIN_REFERENCE_QUESTIONS,
  MIN_TARGET_DIFFICULTY,
  type QuestionBlueprint,
} from "@/types/questionBlueprint";
import type { QuestionPattern, QuestionRecord } from "@/types/questionBank";

// ============================================================================
// 作問の設計図（QuestionBlueprint）の組み立てと検証。
// ----------------------------------------------------------------------------
// 責務を分けてある。呼び出し側（scripts/question-bank/blueprint.mjs）は
// 必要なものだけを順に使う:
//
//   1. selectReferenceQuestions       … 参照用の公式問題を2〜5問選ぶ
//   2. buildBlueprintTemplate         … 設計図のひな形を作る
//   3. validateBlueprint              … 設計図そのものの形を検証する
//   4. validateBlueprintReferences    … 参照問題が実在するか検証する
//   5. validateBlueprintAgainstCandidate … 完成問題が設計図どおりか検証する
//   6. blueprintToCandidateFields     … 既存の候補JSON形式へ変換する
//
// ここは純関数だけを持つ。ファイル入出力・AI呼び出しは一切しない
// （AI の API キーが無い環境でも 1・2・3・4・5 が動く必要がある）。
// ============================================================================

const QUESTION_PATTERNS: QuestionPattern[] = [
  "knowledge",
  "application",
  "calculation",
  "diagram",
  "ordering",
];

/**
 * 段階的な推論を求める出題形式。
 * 用語を1つ知っていれば解ける問題にしないため、2段以上の推論を要求する。
 */
const MULTI_STEP_PATTERNS: QuestionPattern[] = [
  "application",
  "calculation",
  "diagram",
  "ordering",
];

// ---------------------------------------------------------------------------
// 1. 参照用の公式問題を選ぶ
// ---------------------------------------------------------------------------

export type ReferenceCriteria = {
  primaryTopicId?: string;
  /** シラバス分類（syllabusNode.itemId）。 */
  syllabusNode?: string;
  questionPattern?: QuestionPattern;
  targetDifficulty?: number;
  /** 何問選ぶか（既定は上限まで）。 */
  limit?: number;
};

/**
 * レベル感の参照にする公式問題を選ぶ。
 *
 * 選ぶ対象は公式の原文出題（official_past）で公開済みのものだけ。
 * 改変問題・AI生成問題を参照にすると、コピーの連鎖が起きて元のレベル感から離れていく。
 *
 * 条件に合うものを優先し、足りなければ条件を緩めて数を満たす。
 * 2問未満しか選べない場合は空を返す（1問だけを見て作ると引き写しになりやすいため、
 * 「参照が足りない」ことを呼び出し側に判断させる）。
 */
export function selectReferenceQuestions(
  questions: QuestionRecord[],
  criteria: ReferenceCriteria,
): QuestionRecord[] {
  const limit = clamp(
    criteria.limit ?? MAX_REFERENCE_QUESTIONS,
    MIN_REFERENCE_QUESTIONS,
    MAX_REFERENCE_QUESTIONS,
  );

  const pool = questions.filter(
    (q) => q.origin === "official_past" && q.status === "published",
  );

  // 一致した条件の数で並べる。同点なら問題IDの昇順（実行するたびに変わらないように）。
  const scored = pool
    .map((q) => ({ q, score: matchScore(q, criteria) }))
    .sort((a, b) => b.score - a.score || a.q.id.localeCompare(b.q.id));

  const picked = scored.slice(0, limit).map((s) => s.q);
  return picked.length >= MIN_REFERENCE_QUESTIONS ? picked : [];
}

/** 条件にいくつ当てはまるか。多いほど参照としてふさわしい。 */
function matchScore(q: QuestionRecord, criteria: ReferenceCriteria): number {
  let score = 0;
  if (criteria.primaryTopicId && q.primaryTopicId === criteria.primaryTopicId) score += 4;
  if (criteria.syllabusNode && q.syllabusNode?.itemId === criteria.syllabusNode) score += 3;
  if (criteria.questionPattern && q.questionPattern === criteria.questionPattern) score += 2;
  if (criteria.targetDifficulty && q.estimatedDifficulty === criteria.targetDifficulty) {
    score += 1;
  }
  return score;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// 2. 設計図のひな形
// ---------------------------------------------------------------------------

/**
 * 設計図のひな形を作る。人が埋める欄は空のまま返す
 * （それらしい文言で埋めると、埋めた気になって中身のない設計図が残るため）。
 */
export function buildBlueprintTemplate(params: {
  id: string;
  primaryTopicId: string;
  questionPattern: QuestionPattern;
  targetDifficulty: number;
  promptVersion: string;
  syllabusNode?: string;
  references: QuestionRecord[];
}): QuestionBlueprint {
  return {
    id: params.id,
    primaryTopicId: params.primaryTopicId,
    syllabusNode: params.syllabusNode,
    learningObjective: "",
    questionPattern: params.questionPattern,
    targetDifficulty: params.targetDifficulty,
    requiredReasoningSteps: [],
    distractorStrategies: [],
    referenceQuestionIds: params.references.map((q) => q.id),
    prohibitedCopyElements: [],
    promptVersion: params.promptVersion,
  };
}

// ---------------------------------------------------------------------------
// 3. 設計図そのものの検証
// ---------------------------------------------------------------------------

/** 設計図の形を検証する（参照先の実在は validateBlueprintReferences が見る）。 */
export function validateBlueprint(bp: QuestionBlueprint): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: bp.id ?? null, rule, message });

  if (!bp.id?.trim()) add("blueprint-id", "id が空です。");
  if (!bp.primaryTopicId?.trim()) add("blueprint-topic", "primaryTopicId が空です。");
  if (!bp.promptVersion?.trim()) add("blueprint-prompt-version", "promptVersion が空です。");

  // 空のひな形をそのまま通さない。ここが埋まっていない設計図は、
  // 「何を測る問題か」を決めないまま作問へ進んでいることを意味する。
  if (!bp.learningObjective?.trim()) {
    add("blueprint-learning-objective", "learningObjective が空です。何が分かれば正解できるかを書いてください。");
  }

  if (!QUESTION_PATTERNS.includes(bp.questionPattern)) {
    add(
      "blueprint-question-pattern",
      `questionPattern は ${QUESTION_PATTERNS.join(" / ")} のみ許可されます: "${bp.questionPattern}"`,
    );
  }

  if (
    !Number.isInteger(bp.targetDifficulty) ||
    bp.targetDifficulty < MIN_TARGET_DIFFICULTY ||
    bp.targetDifficulty > MAX_TARGET_DIFFICULTY
  ) {
    add(
      "blueprint-target-difficulty",
      `targetDifficulty は ${MIN_TARGET_DIFFICULTY}〜${MAX_TARGET_DIFFICULTY} の整数である必要があります: ${bp.targetDifficulty}`,
    );
  }

  if (!nonEmptyStrings(bp.requiredReasoningSteps)) {
    add("blueprint-reasoning-steps", "requiredReasoningSteps が空です。正解までに踏む段を書いてください。");
  } else if (
    MULTI_STEP_PATTERNS.includes(bp.questionPattern) &&
    bp.requiredReasoningSteps.length < 2
  ) {
    // 1段で解ける「応用問題」は、実質は用語の暗記問題になっている。
    add(
      "blueprint-reasoning-steps-count",
      `questionPattern "${bp.questionPattern}" では requiredReasoningSteps が2段以上必要です（現在 ${bp.requiredReasoningSteps.length} 段）。`,
    );
  }

  if (!nonEmptyStrings(bp.distractorStrategies)) {
    add("blueprint-distractor-strategies", "distractorStrategies が空です。誤答をどう成立させるかを書いてください。");
  } else if (bp.distractorStrategies.length < 3) {
    // 4択なので誤答は3つ。それぞれの成立理由が要る。
    add(
      "blueprint-distractor-count",
      `distractorStrategies は誤答3つぶん必要です（現在 ${bp.distractorStrategies.length} 件）。`,
    );
  }

  if (!nonEmptyStrings(bp.prohibitedCopyElements)) {
    add(
      "blueprint-prohibited-copy",
      "prohibitedCopyElements が空です。参照問題から持ち込まない要素を明示してください。",
    );
  }

  const refs = bp.referenceQuestionIds ?? [];
  if (refs.length < MIN_REFERENCE_QUESTIONS || refs.length > MAX_REFERENCE_QUESTIONS) {
    add(
      "blueprint-reference-count",
      `referenceQuestionIds は ${MIN_REFERENCE_QUESTIONS}〜${MAX_REFERENCE_QUESTIONS} 件必要です（現在 ${refs.length} 件）。`,
    );
  }
  if (new Set(refs).size !== refs.length) {
    add("blueprint-reference-duplicate", `referenceQuestionIds が重複しています: ${refs.join(", ")}`);
  }

  return issues;
}

function nonEmptyStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === "string" && v.trim() !== "")
  );
}

// ---------------------------------------------------------------------------
// 4. 参照問題の実在検証
// ---------------------------------------------------------------------------

/**
 * 参照問題が実在し、参照してよい種類かを検証する。
 *
 * 参照切れを放置すると「何を見て作ったか」を後から追えなくなり、
 * 類似度検査の結果を読むときの基準も失われる。
 */
export function validateBlueprintReferences(
  bp: QuestionBlueprint,
  questions: QuestionRecord[],
): QuestionBankIssue[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: bp.id ?? null, rule, message });

  for (const ref of bp.referenceQuestionIds ?? []) {
    const found = byId.get(ref);
    if (!found) {
      add(
        "blueprint-reference-resolvable",
        `referenceQuestionIds が存在しない問題ID "${ref}" を参照しています。`,
      );
      continue;
    }
    if (found.origin !== "official_past") {
      // 改変問題・AI生成問題を参照にすると、コピーの連鎖でレベル感が元から離れていく。
      add(
        "blueprint-reference-official",
        `referenceQuestionIds は origin "official_past" の問題を指す必要があります（"${ref}" は "${found.origin}"）。`,
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 5. 完成問題との整合
// ---------------------------------------------------------------------------

/** 検証に必要な分だけの候補（候補JSONの1件）。 */
export type BlueprintCandidate = {
  id: string;
  primaryTopicId?: string;
  questionPattern?: string;
  estimatedDifficulty?: number;
  choices?: unknown[];
  referenceQuestionIds?: string[];
  generation?: { promptVersion?: string; referenceQuestionIds?: string[] };
};

/**
 * 完成した候補が設計図どおりかを検証する。
 *
 * 設計図と食い違う問題をそのまま取り込むと、設計図が「書いただけのもの」になる。
 * 狙いを変えたのなら設計図のほうを直す、という順序を守らせる。
 */
export function validateBlueprintAgainstCandidate(
  bp: QuestionBlueprint,
  candidate: BlueprintCandidate,
): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: candidate.id ?? bp.id ?? null, rule, message });

  if (candidate.primaryTopicId !== bp.primaryTopicId) {
    add(
      "blueprint-candidate-topic",
      `primaryTopicId が設計図（${bp.primaryTopicId}）と一致しません: "${candidate.primaryTopicId}"`,
    );
  }
  if (candidate.questionPattern !== bp.questionPattern) {
    add(
      "blueprint-candidate-pattern",
      `questionPattern が設計図（${bp.questionPattern}）と一致しません: "${candidate.questionPattern}"`,
    );
  }
  if (candidate.estimatedDifficulty !== bp.targetDifficulty) {
    add(
      "blueprint-candidate-difficulty",
      `estimatedDifficulty が設計図の targetDifficulty（${bp.targetDifficulty}）と一致しません: ${candidate.estimatedDifficulty}`,
    );
  }

  const promptVersion = candidate.generation?.promptVersion;
  if (promptVersion !== undefined && promptVersion !== bp.promptVersion) {
    add(
      "blueprint-candidate-prompt-version",
      `generation.promptVersion が設計図（${bp.promptVersion}）と一致しません: "${promptVersion}"`,
    );
  }

  // 参照問題は設計図がすべてを含んでいること。
  // 設計図に無い問題を見て作っていたなら、設計図が実態を表していない。
  const candidateRefs =
    candidate.referenceQuestionIds ?? candidate.generation?.referenceQuestionIds ?? [];
  const blueprintRefs = new Set(bp.referenceQuestionIds ?? []);
  for (const ref of candidateRefs) {
    if (!blueprintRefs.has(ref)) {
      add(
        "blueprint-candidate-reference",
        `候補が設計図に無い参照問題 "${ref}" を挙げています。設計図側にも記載してください。`,
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 6. 候補JSON形式への変換
// ---------------------------------------------------------------------------

/**
 * 設計図から、既存の候補JSON形式で決まる欄を埋める。
 *
 * 本文（prompt / choices / correctChoice / explanation）は設計図には無いので、
 * 呼び出し側が作問結果を渡す。ここが担うのは「設計図で決まっている値を、
 * 取り込み形式の正しい場所へ移すこと」だけ。
 *
 * origin / status / version / contentHash は含めない。
 * それらは取り込み側（candidate-record.mjs）が固定する項目で、
 * ここで書くと「設計図が公開状態を決められる」形になってしまう。
 */
export function blueprintToCandidateFields(bp: QuestionBlueprint): {
  id: string;
  primaryTopicId: string;
  questionPattern: QuestionPattern;
  estimatedDifficulty: number;
  referenceQuestionIds: string[];
  syllabusNode?: { itemId: string };
} {
  return {
    id: bp.id,
    primaryTopicId: bp.primaryTopicId,
    questionPattern: bp.questionPattern,
    estimatedDifficulty: bp.targetDifficulty,
    referenceQuestionIds: [...(bp.referenceQuestionIds ?? [])].sort(),
    ...(bp.syllabusNode ? { syllabusNode: { itemId: bp.syllabusNode } } : {}),
  };
}
