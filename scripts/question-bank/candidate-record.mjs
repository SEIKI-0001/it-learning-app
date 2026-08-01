// 候補JSON 1件を QuestionRecord に変換する。
//
// import-candidates.mjs から切り出してある。取り込みの肝は「候補が公開状態を
// 名乗れないこと」なので、ファイル入出力を伴わずにテストできる形にしておく。
//
// 方針:
//   - origin / status / version は候補JSONから受け取らず、ここで固定する。
//     AI が自分の生成物を published と名乗れる余地を残さない。
//   - 検証に失敗したら CandidateError を投げる。呼び出し側がまとめて報告する。

import { computeContentHash } from "@/lib/questionBank/contentHash";

/** 取り込み時に固定する値。候補JSONからは指定させない。 */
export const ORIGIN = "ai_generated";
export const STATUS = "draft";
export const VERSION = 1;

export const CHOICE_KEYS = ["A", "B", "C", "D"];
export const QUESTION_PATTERNS = [
  "knowledge",
  "application",
  "calculation",
  "diagram",
  "ordering",
];

/**
 * 候補JSONに書いてはいけない項目（取り込み側が決めるもの）。
 *
 * status がここに入っているのが要点。取り込みは必ず draft から始まり、
 * published へ上げるのは人がレビュー記録を積んでから行う Git 上の操作だけ。
 */
export const FORBIDDEN_FIELDS = [
  "origin",
  "status",
  "version",
  "contentHash",
  "reviewedAt",
  "reviewedBy",
  "official",
];

export class CandidateError extends Error {}

export function fail(fileName, questionId, message) {
  throw new CandidateError(`${fileName}${questionId ? ` / ${questionId}` : ""}: ${message}`);
}

function normalizeGeneration(generation, fileName, questionId) {
  if (!generation) {
    fail(fileName, questionId, "generation（provider / model / promptVersion / generatedAt）が必要です。");
  }
  for (const field of ["provider", "model", "promptVersion", "generatedAt"]) {
    if (typeof generation[field] !== "string" || generation[field].trim() === "") {
      fail(fileName, questionId, `generation.${field} が空です。`);
    }
  }
  if (Number.isNaN(Date.parse(generation.generatedAt))) {
    fail(fileName, questionId, `generation.generatedAt が日時として解釈できません: "${generation.generatedAt}"`);
  }

  return {
    provider: generation.provider.trim(),
    model: generation.model.trim(),
    promptVersion: generation.promptVersion.trim(),
    generatedAt: generation.generatedAt.trim(),
  };
}

/** 候補1件を QuestionRecord に変換する。 */
export function toQuestionRecord(candidate, fileGeneration, fileName) {
  const id = candidate.id;
  if (typeof id !== "string" || id.trim() === "") {
    fail(fileName, undefined, "id が空です。");
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (candidate[field] !== undefined) {
      fail(
        fileName,
        id,
        `"${field}" は取り込み側が決める項目なので候補JSONには書けません（origin は "${ORIGIN}"、status は "${STATUS}" に固定されます）。`,
      );
    }
  }

  if (typeof candidate.primaryTopicId !== "string" || candidate.primaryTopicId.trim() === "") {
    fail(fileName, id, "primaryTopicId が空です。");
  }
  if (!QUESTION_PATTERNS.includes(candidate.questionPattern)) {
    fail(
      fileName,
      id,
      `questionPattern は ${QUESTION_PATTERNS.join(" / ")} のみ許可されます: "${candidate.questionPattern}"`,
    );
  }
  if (typeof candidate.prompt !== "string" || candidate.prompt.trim() === "") {
    fail(fileName, id, "prompt が空です。");
  }
  if (!Array.isArray(candidate.choices) || candidate.choices.length !== 4) {
    fail(fileName, id, `choices は4件必要です（${candidate.choices?.length ?? 0} 件）。`);
  }

  const choices = CHOICE_KEYS.map((key) => {
    const found = candidate.choices.find((c) => c?.key === key);
    if (!found) fail(fileName, id, `選択肢 "${key}" がありません。`);
    if (typeof found.text !== "string" || found.text.trim() === "") {
      fail(fileName, id, `選択肢 "${key}" の本文が空です。`);
    }
    return { key, text: found.text };
  });

  if (!CHOICE_KEYS.includes(candidate.correctChoice)) {
    fail(fileName, id, `correctChoice は A〜D のみ許可されます: "${candidate.correctChoice}"`);
  }
  if (typeof candidate.explanation !== "string" || candidate.explanation.trim() === "") {
    // draft でも解説は必須にする。AI生成問題の解説は「後で書く」と必ず放置されるうえ、
    // 解説の良し悪しは生成物の品質そのものなので、レビュー対象から外せない。
    fail(fileName, id, "explanation が空です。AI生成問題は解説までそろえてから取り込んでください。");
  }
  if (![1, 2, 3].includes(candidate.estimatedDifficulty)) {
    fail(fileName, id, `estimatedDifficulty は 1〜3 のみ許可されます: ${candidate.estimatedDifficulty}`);
  }

  const generation = normalizeGeneration(candidate.generation ?? fileGeneration, fileName, id);
  const references = candidate.referenceQuestionIds ?? candidate.generation?.referenceQuestionIds;
  if (references !== undefined) {
    if (!Array.isArray(references) || references.some((r) => typeof r !== "string")) {
      fail(fileName, id, "referenceQuestionIds は文字列の配列である必要があります。");
    }
    if (references.length > 0) {
      // 並びを固定して差分を安定させる。参照の実在チェックは validateQuestions が行う。
      generation.referenceQuestionIds = [...new Set(references)].sort();
    }
  }

  const body = {
    prompt: candidate.prompt,
    choices,
    correctChoice: candidate.correctChoice,
    explanation: candidate.explanation,
  };

  const record = {
    id,
    version: VERSION,
    origin: ORIGIN,
    status: STATUS,
    primaryTopicId: candidate.primaryTopicId,
    questionPattern: candidate.questionPattern,
    ...body,
    estimatedDifficulty: candidate.estimatedDifficulty,
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    generation,
    contentHash: computeContentHash(body),
    reviewedAt: null,
    reviewedBy: null,
  };

  if (candidate.syllabusNode) record.syllabusNode = candidate.syllabusNode;
  if (candidate.choiceExplanations) record.choiceExplanations = candidate.choiceExplanations;

  return record;
}
