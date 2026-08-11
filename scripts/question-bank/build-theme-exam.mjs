// テーマ別 高難易度試験の問題を、圧縮ソースから問題バンクの形へ組み立てる。
//
//   入力: data/question-bank/original/theme-exam/<themeSlug>.json （1テーマ1ファイル）
//   出力: data/question-bank/original/theme-exam.json      （QuestionBankFile）
//         data/themeExams.ts                                （テーマ→問題IDの対応）
//         data/question-bank/manifests/original-theme-exam.json
//
// 使い方:
//   npm run questions:build:theme-exam
//   npm run questions:build:theme-exam -- --check   # 書き込まず、差分の有無だけを見る
//
// なぜ圧縮ソースを別に持つか:
//   contentHash・version・ID・シラバス分類は、本文が決まれば機械的に定まる。
//   これらを手で書くと必ずずれるので、人が書くのは本文だけにして、
//   残りはこのスクリプトが埋める。既存の取り込みスクリプトと同じ考え方。
//
// 版の扱い:
//   既に data/question-bank/original/theme-exam.json がある場合、
//   本文が変わっていない問題は version と reviewedAt / reviewedBy を維持し、
//   本文が変わった問題だけ version を上げる。
//   出題済みの問題の版が再ビルドのたびに動くと、回答履歴が意味なく分断されるため。

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { computeContentHash } = await import("../../lib/questionBank/contentHash.ts");
const { learningThemes } = await import("../../data/learningCatalog.ts");
const { ipaSyllabusItems } = await import("../../data/ipaSyllabus.ts");
/**
 * 学ぶ画面に載っているトピックID。
 *
 * 復習の導線が黙って切れるのを防ぐため、生成時に突き合わせる。
 * トピックの定義そのもの（data/topics）ではなく学習カタログを見るのは、
 * 「学ぶ画面から開けるトピックか」がここで確かめたいことだから。
 */
const TOPIC_IDS = new Set(
  learningThemes.flatMap((t) => t.sections.flatMap((s) => s.lessonIds)),
);

/**
 * トピックID → シラバス項目。
 *
 * syllabusNode はテーマ（章）ではなくトピックから引く。学ぶ画面の章立てと
 * IPA シラバスの分類は一致せず、たとえば IoT はテクノロジ章にあるが
 * シラバス上はストラテジ系の項目に属する。章から埋めると食い違いが出る。
 */
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

const SOURCE = "data/question-bank/original/theme-exam";
const OUTPUT = "data/question-bank/original/theme-exam.json";
const MANIFEST = "data/question-bank/manifests/original-theme-exam.json";
const THEME_EXAMS_TS = "data/themeExams.ts";

const CHOICE_KEYS = ["A", "B", "C", "D"];
const checkOnly = process.argv.includes("--check");

const abs = (rel) => path.join(ROOT, rel);
const readJson = (rel) => JSON.parse(readFileSync(abs(rel), "utf8"));

// ---------------------------------------------------------------------------
// 入力
// ---------------------------------------------------------------------------

// テーマの並びは data/learningCatalog.ts（章の順）に従う。
// ファイル名の辞書順に並べると章の順序と食い違い、一覧の並びが学習順から外れるため。
const available = new Set(
  readdirSync(abs(SOURCE))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, "")),
);

const themes = learningThemes
  .filter((t) => available.has(t.slug))
  .map((t) => {
    const file = readJson(`${SOURCE}/${t.slug}.json`);
    available.delete(t.slug);
    return { themeSlug: t.slug, field: t.field, ...file };
  });

if (available.size > 0) {
  console.error(
    `学ぶ画面のテーマに存在しないファイルがあります: ${[...available].join(", ")}`,
  );
  process.exit(1);
}
if (themes.length === 0) {
  console.error(`${SOURCE} に問題ファイルがありません。`);
  process.exit(1);
}

/** 既存の出力（あれば）。版とレビュー情報の引継ぎに使う。 */
const previous = existsSync(abs(OUTPUT))
  ? new Map(readJson(OUTPUT).questions.map((q) => [q.id, q]))
  : new Map();

// ---------------------------------------------------------------------------
// 組み立て
// ---------------------------------------------------------------------------

const errors = [];
const questions = [];
const examsByTheme = [];

for (const theme of themes) {
  const { themeSlug, passRate } = theme;
  if (!themeSlug) {
    errors.push("themeSlug の無いテーマがあります。");
    continue;
  }

  const questionIds = [];

  theme.questions.forEach((q, index) => {
    const number = String(index + 1).padStart(2, "0");
    const id = `theme-exam-${themeSlug}-${number}`;
    const where = `${themeSlug} #${number}`;

    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      errors.push(`${where}: choices は4件の配列で書いてください。`);
      return;
    }
    // 存在しない topicId は、復習の導線が黙って切れることに直結するのでここで止める。
    // syllabusNode も引けなくなり、分野別の集計から漏れる。
    if (!q.topicId) errors.push(`${where}: topicId がありません。`);
    else if (!TOPIC_IDS.has(q.topicId)) {
      errors.push(`${where}: 存在しないトピックID "${q.topicId}" を指しています。`);
    }
    if (!q.prompt?.trim()) errors.push(`${where}: prompt が空です。`);
    if (!q.explanation?.trim()) errors.push(`${where}: explanation が空です。`);

    // 圧縮ソースは「先頭が正答」で書く。表示側でシャッフルするため、
    // データ上の正答位置が A に固定されていても学習者には偏らない。
    const body = {
      prompt: q.prompt,
      choices: q.choices.map((text, i) => ({ key: CHOICE_KEYS[i], text })),
      correctChoice: "A",
      explanation: q.explanation,
    };

    const contentHash = computeContentHash(body);
    const before = previous.get(id);
    const unchanged = before !== undefined && before.contentHash === contentHash;

    questions.push({
      id,
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

    questionIds.push(id);
  });

  examsByTheme.push({
    examId: `theme-exam-${themeSlug}`,
    themeSlug,
    questionIds,
    passRate: passRate ?? 60,
  });
}

if (errors.length > 0) {
  console.error("エラー:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 出力
// ---------------------------------------------------------------------------

const bankFile = {
  schemaVersion: 1,
  source: "original/theme-exam",
  questions,
};

const manifest = {
  file: OUTPUT,
  generatedFrom: SOURCE,
  questionCount: questions.length,
  questionIds: questions.map((q) => q.id),
};

const themeExamsTs = `import type { ThemeExam } from "@/types/themeExam";

// ============================================================================
// テーマ別 高難易度試験の構成（テーマ → 出題する問題ID）。
// ----------------------------------------------------------------------------
// このファイルは自動生成される。直接編集しないこと。
//   生成元: ${SOURCE}
//   生成:   npm run questions:build:theme-exam
//
// 問題の本文を直すときは生成元の圧縮ソースを編集し、上のコマンドで作り直す。
// ============================================================================

export const themeExams: ThemeExam[] = ${JSON.stringify(examsByTheme, null, 2)};
`;

if (checkOnly) {
  const same =
    existsSync(abs(OUTPUT)) &&
    readFileSync(abs(OUTPUT), "utf8") === `${JSON.stringify(bankFile, null, 2)}\n`;
  console.log(
    same
      ? `${OUTPUT} は生成元と一致しています（${questions.length}問）。`
      : `${OUTPUT} が生成元と食い違っています。npm run questions:build:theme-exam を実行してください。`,
  );
  process.exit(same ? 0 : 1);
}

writeFileSync(abs(OUTPUT), `${JSON.stringify(bankFile, null, 2)}\n`, "utf8");
writeFileSync(abs(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(abs(THEME_EXAMS_TS), themeExamsTs, "utf8");

const bumped = questions.filter((q) => q.version > 1).length;
console.log(`テーマ別試験を生成しました: ${examsByTheme.length}テーマ / ${questions.length}問`);
if (bumped > 0) console.log(`  うち改訂（version > 1）: ${bumped}問`);
for (const e of examsByTheme) {
  console.log(`  ${e.themeSlug}: ${e.questionIds.length}問`);
}
