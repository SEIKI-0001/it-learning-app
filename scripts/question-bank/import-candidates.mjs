// AI生成問題の候補 JSON を統一問題バンクへ取り込む。
//
// 使い方:
//   npm run questions:import:candidates
//   npm run questions:import:candidates -- --dry-run
//
// 入力: data/question-bank/candidates/ai-generated/*.json（*.candidate.json は見本として除外）
// 出力: data/question-bank/ai-generated/candidates.json
//       data/question-bank/manifests/ai-generated-candidates.json
//
// 方針:
//   - 生成そのものはここでは行わない。外部AI SDK・APIキー・ネットワークアクセスを使わない。
//     手元で作った構造化JSONを取り込むだけにすることで、
//     「本番実行中にAIが問題を作る」経路を作らずに済ませる。
//   - 取り込んだ問題は必ず origin "ai_generated" / status "draft"。
//     候補JSON側が status を指定してきても無視する（AIに公開状態を決めさせない）。
//   - 出力は決定的。同じ入力なら同じJSONになる（実行時刻・乱数を混ぜない）。
//     並び順は問題IDの昇順に固定する。
//   - 取り込んだ結果が validate を通らない場合は書き込まずに落とす。
//     壊れた問題をバンクに入れてから直す、という順序にしない。
//   - 出力先に問題が1件も無い場合はファイルを作らない（空ファイルを Git に残さない）。

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { computeContentHash } = await import("../../lib/questionBank/contentHash.ts");
const { formatIssues, validateQuestions } = await import("../../lib/questionBank/validate.ts");
const { getAllQuestions } = await import("../../lib/questionBank/loader.ts");

const IN_DIR = path.join(ROOT, "data/question-bank/candidates/ai-generated");
const OUT_DIR = path.join(ROOT, "data/question-bank/ai-generated");
const OUT_QUESTIONS = path.join(OUT_DIR, "candidates.json");
const OUT_MANIFEST = path.join(ROOT, "data/question-bank/manifests/ai-generated-candidates.json");

const BANK_SOURCE = "ai-generated/candidates";
const GENERATED_FROM = "data/question-bank/candidates/ai-generated/*.json";

/** 取り込み時に固定する値。候補JSONからは指定させない。 */
const ORIGIN = "ai_generated";
const STATUS = "draft";
const VERSION = 1;

const CHOICE_KEYS = ["A", "B", "C", "D"];
const QUESTION_PATTERNS = ["knowledge", "application", "calculation", "diagram", "ordering"];

/** 候補JSONに書いてはいけない項目（取り込み側が決めるもの）。 */
const FORBIDDEN_FIELDS = ["origin", "status", "version", "contentHash", "reviewedAt", "reviewedBy", "official"];

class CandidateError extends Error {}

function fail(fileName, questionId, message) {
  throw new CandidateError(`${fileName}${questionId ? ` / ${questionId}` : ""}: ${message}`);
}

function readCandidateFiles() {
  if (!existsSync(IN_DIR)) return [];
  return readdirSync(IN_DIR)
    .filter((name) => name.endsWith(".json") && !name.endsWith(".candidate.json"))
    .sort()
    .map((name) => ({ name, body: JSON.parse(readFileSync(path.join(IN_DIR, name), "utf8")) }));
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

  const out = {
    provider: generation.provider.trim(),
    model: generation.model.trim(),
    promptVersion: generation.promptVersion.trim(),
    generatedAt: generation.generatedAt.trim(),
  };
  return out;
}

/** 候補1件を QuestionRecord に変換する。 */
function toQuestionRecord(candidate, fileGeneration, fileName) {
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

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = readCandidateFiles();

  const questions = [];
  const seen = new Map(); // id -> ファイル名
  for (const { name, body } of files) {
    if (body?.schemaVersion !== 1) {
      fail(name, undefined, `schemaVersion は 1 のみ対応しています: ${body?.schemaVersion}`);
    }
    if (!Array.isArray(body.questions)) {
      fail(name, undefined, "questions が配列ではありません。");
    }

    for (const candidate of body.questions) {
      const record = toQuestionRecord(candidate, body.generation, name);
      const duplicatedIn = seen.get(record.id);
      if (duplicatedIn) {
        fail(name, record.id, `問題IDが ${duplicatedIn} と重複しています。`);
      }
      seen.set(record.id, name);
      questions.push(record);
    }
  }

  // 並びをIDの昇順に固定する（ファイルを増やしても既存の行が動かないように）。
  questions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // 既存バンクと合わせて検証する。参照切れ（referenceQuestionIds）や
  // ID重複は、候補だけを見ても分からない。
  // getAllQuestions() は取り込み前の状態を読むので、既に取り込み済みの候補は除いて突き合わせる。
  const existing = getAllQuestions().filter((q) => q.origin !== ORIGIN);
  const issues = validateQuestions([...existing, ...questions]).filter(
    (issue) => issue.questionId === null || seen.has(issue.questionId),
  );
  if (issues.length > 0) {
    console.error("取り込みを中止しました。候補が検証を通りません:\n");
    console.error(formatIssues(issues));
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(`検証のみ実行しました（--dry-run）。取り込み可能: ${questions.length} 問`);
    return;
  }

  const manifest = {
    file: "data/question-bank/ai-generated/candidates.json",
    generatedFrom: GENERATED_FROM,
    questionCount: questions.length,
    questionIds: questions.map((q) => q.id),
  };

  if (questions.length === 0) {
    // 候補が無いのに空ファイルを置くと、data/question-bank/index.ts が読む対象が
    // 増えたままになる。0件のときは何も置かない。
    for (const target of [OUT_QUESTIONS, OUT_MANIFEST]) {
      if (existsSync(target)) rmSync(target);
    }
    console.log("取り込む候補がありませんでした（0問）。");
    console.log(`  入力: ${path.relative(ROOT, IN_DIR)}`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT_QUESTIONS,
    `${JSON.stringify({ schemaVersion: 1, source: BANK_SOURCE, questions }, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`取り込みました: ${questions.length} 問（origin: ${ORIGIN} / status: ${STATUS}）`);
  console.log(`  入力ファイル: ${files.length} 件`);
  console.log(`  出力: ${path.relative(ROOT, OUT_QUESTIONS)}`);
  console.log(`  出力: ${path.relative(ROOT, OUT_MANIFEST)}`);
  console.log("");
  console.log("次にやること:");
  console.log("  1. data/question-bank/index.ts に candidates.json を追加する（初回のみ）");
  console.log("  2. npm run questions:quality-report で品質ゲートに通す");
  console.log("  3. data/question-bank/reviews/<question-id>.json にレビュー記録を作る");
}

try {
  main();
} catch (error) {
  if (error instanceof CandidateError) {
    console.error(`候補の取り込みに失敗しました:\n  ${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
