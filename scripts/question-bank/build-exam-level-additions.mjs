// 確認パックの過去問レベル問題のうち、移行後に足したもの（独自問題）を問題バンクの形へ組み立てる。
//
//   入力: data/question-bank/original/exam-level-additions/questions.json
//   出力: data/question-bank/original/exam-level-additions.json （QuestionBankFile）
//         data/question-bank/manifests/original-exam-level-additions.json
//
// 使い方:
//   npm run questions:build:exam-level-additions
//   npm run questions:build:exam-level-additions -- --check   # 書き込まず、差分の有無だけを見る
//
// なぜ別の束にするか:
//   original/exam-level.json は data/examLevelQuestions.ts からの移行結果で、
//   「移行前後で1問も増減していない」ことをテストで守っている。
//   後から作ったトピック（2026-07 以降に足したもの）の確認パックに独自問題を足すときは、
//   その束を動かさずにこちらへ書く。ID は既存と同じ `<topicId>-exN` の形にそろえる。
//
// contentHash・version・シラバス分類は、build-theme-exam.mjs と同じく本文から機械的に埋める。
// 本文が変わった問題だけ version を上げ、変わっていなければ版とレビュー記録を引き継ぐ。

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { computeContentHash } = await import("../../lib/questionBank/contentHash.ts");
const { learningThemes } = await import("../../data/learningCatalog.ts");
const { ipaSyllabusItems } = await import("../../data/ipaSyllabus.ts");

const SOURCE = "data/question-bank/original/exam-level-additions/questions.json";
const OUTPUT = "data/question-bank/original/exam-level-additions.json";
const MANIFEST = "data/question-bank/manifests/original-exam-level-additions.json";
const LEGACY = "data/question-bank/original/exam-level.json";

const CHOICE_KEYS = ["A", "B", "C", "D"];
const checkOnly = process.argv.includes("--check");

const abs = (rel) => path.join(ROOT, rel);
const readJson = (rel) => JSON.parse(readFileSync(abs(rel), "utf8"));

/** 学ぶ画面に載っているトピックID（復習の導線が切れないことを生成時に確かめる）。 */
const TOPIC_IDS = new Set(learningThemes.flatMap((t) => t.sections.flatMap((s) => s.lessonIds)));

const SYLLABUS_BY_TOPIC = new Map();
for (const item of ipaSyllabusItems) {
  for (const topicId of item.topicIds ?? []) {
    if (!SYLLABUS_BY_TOPIC.has(topicId)) SYLLABUS_BY_TOPIC.set(topicId, item);
  }
}

function syllabusNodeFor(topicId) {
  const item = SYLLABUS_BY_TOPIC.get(topicId);
  if (!item) return undefined;
  return {
    itemId: item.id,
    field: item.field,
    majorCategory: item.majorCategory,
    middleCategory: item.middleCategory,
  };
}

const legacyIds = new Set(readJson(LEGACY).questions.map((q) => q.id));
const previous = existsSync(abs(OUTPUT))
  ? new Map(readJson(OUTPUT).questions.map((q) => [q.id, q]))
  : new Map();

const errors = [];
const seen = new Set();
const questions = [];

for (const q of readJson(SOURCE).questions) {
  const where = q.id ?? "(id なし)";
  if (!q.id) errors.push("id の無い問題があります。");
  else if (seen.has(q.id)) errors.push(`${where}: id が重複しています。`);
  else if (legacyIds.has(q.id)) errors.push(`${where}: 移行済みの問題と同じ id です。`);
  seen.add(q.id);

  if (!q.topicId) errors.push(`${where}: topicId がありません。`);
  else if (!TOPIC_IDS.has(q.topicId)) errors.push(`${where}: 存在しないトピックID "${q.topicId}" です。`);
  else if (q.id && !new RegExp(`^${q.topicId}-ex\\d+$`).test(q.id)) {
    errors.push(`${where}: id は "${q.topicId}-exN" の形にしてください。`);
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    errors.push(`${where}: choices は4件の配列で書いてください。`);
    continue;
  }
  if (!q.prompt?.trim()) errors.push(`${where}: prompt が空です。`);
  if (!q.explanation?.trim()) errors.push(`${where}: explanation が空です。`);

  // 先頭が正答。表示側で並び替えるため、データ上の位置が A でも学習者には偏らない。
  const body = {
    prompt: q.prompt,
    choices: q.choices.map((text, i) => ({ key: CHOICE_KEYS[i], text })),
    correctChoice: "A",
    explanation: q.explanation,
  };
  const contentHash = computeContentHash(body);
  const before = previous.get(q.id);
  const unchanged = before !== undefined && before.contentHash === contentHash;

  questions.push({
    id: q.id,
    version: before === undefined ? 1 : unchanged ? before.version : before.version + 1,
    origin: "app_original",
    status: "draft",
    primaryTopicId: q.topicId,
    questionPattern: q.pattern ?? "application",
    ...body,
    estimatedDifficulty: q.difficulty ?? 3,
    tags: q.tags ?? [],
    contentHash,
    reviewedAt: unchanged ? (before.reviewedAt ?? null) : null,
    reviewedBy: unchanged ? (before.reviewedBy ?? null) : null,
    ...(syllabusNodeFor(q.topicId) ? { syllabusNode: syllabusNodeFor(q.topicId) } : {}),
    ...(q.choiceExplanations ? { choiceExplanations: q.choiceExplanations } : {}),
  });
}

if (errors.length > 0) {
  console.error("エラー:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const bankFile = { schemaVersion: 1, source: "original/exam-level-additions", questions };
const manifest = {
  file: OUTPUT,
  generatedFrom: SOURCE,
  questionCount: questions.length,
  questionIds: questions.map((q) => q.id),
};
const text = `${JSON.stringify(bankFile, null, 2)}\n`;

if (checkOnly) {
  const same = existsSync(abs(OUTPUT)) && readFileSync(abs(OUTPUT), "utf8") === text;
  console.log(
    same
      ? `${OUTPUT} は生成元と一致しています（${questions.length}問）。`
      : `${OUTPUT} が生成元と食い違っています。npm run questions:build:exam-level-additions を実行してください。`,
  );
  process.exit(same ? 0 : 1);
}

writeFileSync(abs(OUTPUT), text, "utf8");
writeFileSync(abs(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`過去問レベル問題（追加分）を生成しました: ${questions.length}問`);
