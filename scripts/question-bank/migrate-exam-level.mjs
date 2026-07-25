// 既存の過去問レベル問題（data/examLevelQuestions.ts）を
// 統一問題バンク（data/question-bank/original/exam-level.json）へ移行する生成スクリプト。
//
// 使い方:
//   node scripts/question-bank/migrate-exam-level.mjs
//
// 方針:
//   - 手作業の転記をしない。既存データを読んで機械的に変換する。
//   - 既存IDを維持する（question_attempts の履歴と紐づくため変更禁止）。
//   - 問題文・選択肢・正答・解説・difficulty・examTags をそのまま引き継ぐ。
//   - contentHash はアプリ側と同じ実装（lib/questionBank/contentHash.ts）を使う。
//   - 生成結果は決定的（同じ入力なら同じ出力）。差分レビューできるようにする。
//
// Node の TypeScript 型ストリップで .ts を直接読む。
// 読み込む .ts は import type だけを使っているため、@/ エイリアスの解決は不要。

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { examLevelQuestions } from "../../data/examLevelQuestions.ts";
import { ipaSyllabusItems } from "../../data/ipaSyllabus.ts";
import { computeContentHash } from "../../lib/questionBank/contentHash.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_QUESTIONS = path.join(ROOT, "data/question-bank/original/exam-level.json");
const OUT_MANIFEST = path.join(ROOT, "data/question-bank/manifests/original-exam-level.json");

const SOURCE = "original/exam-level";
const GENERATED_FROM = "data/examLevelQuestions.ts";

// 移行時の初期 status は "draft"。
//
// 今回の移行で確認したのは「移行前後で内容が完全一致すること」だけであり、
// 問題内容の正確性・本試験水準としての品質は監査していない。
// そもそも今回の基盤作りの動機が既存問題の品質不足なので、ここで content_verified に
// してしまうと、今後“本当に監査した問題”と区別がつかなくなる。
//
// 注意: draft でも既存の確認パックからは従来どおり出題される。
//       パックは問題IDを明示的に参照しており、解決は status で絞っていないため。
//       詳細は data/question-bank/README.md を参照。
const INITIAL_STATUS = "draft";

// 既存問題は「場面判断・比較・適用を問う」方針で作られている（examLevelQuestions.ts 冒頭の方針）。
const INITIAL_QUESTION_PATTERN = "application";

/** topicId -> IPA シラバス上の位置。分野別集計・年度別演習の下地にする。 */
function buildSyllabusIndex() {
  const index = new Map();
  for (const item of ipaSyllabusItems) {
    for (const topicId of item.topicIds) {
      if (index.has(topicId)) continue; // 先勝ち（1トピックが複数項目に出る場合がある）
      index.set(topicId, {
        itemId: item.id,
        field: item.field,
        majorCategory: item.majorCategory,
        middleCategory: item.middleCategory,
      });
    }
  }
  return index;
}

function toQuestionRecord(source, syllabusIndex) {
  const body = {
    prompt: source.prompt,
    choices: source.choices,
    correctChoice: source.correctChoice,
    explanation: source.explanation,
  };

  const record = {
    id: source.id,
    version: 1,
    origin: "app_original",
    status: INITIAL_STATUS,
    primaryTopicId: source.topicId,
    questionPattern: INITIAL_QUESTION_PATTERN,
    prompt: source.prompt,
    choices: source.choices.map((c) => ({ key: c.key, text: c.text })),
    correctChoice: source.correctChoice,
    explanation: source.explanation,
    estimatedDifficulty: source.difficulty,
    tags: source.examTags ?? [],
    contentHash: computeContentHash(body),
    reviewedAt: null,
    reviewedBy: null,
  };

  const syllabusNode = syllabusIndex.get(source.topicId);
  if (syllabusNode) record.syllabusNode = syllabusNode;

  return record;
}

function main() {
  const syllabusIndex = buildSyllabusIndex();
  const questions = examLevelQuestions.map((q) => toQuestionRecord(q, syllabusIndex));

  const ids = questions.map((q) => q.id);
  const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicated.length > 0) {
    throw new Error(`移行元に重複IDがあります: ${[...new Set(duplicated)].join(", ")}`);
  }

  const file = {
    schemaVersion: 1,
    source: SOURCE,
    questions,
  };

  // generatedAt のような実行時刻は入れない。再実行で無意味な差分が出るのを避け、
  // 「入力が同じなら出力も同じ」を保つ（生成日時は git 履歴で追える）。
  const manifest = {
    file: "data/question-bank/original/exam-level.json",
    generatedFrom: GENERATED_FROM,
    questionCount: questions.length,
    questionIds: ids,
  };

  writeFileSync(OUT_QUESTIONS, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const withSyllabus = questions.filter((q) => q.syllabusNode).length;
  console.log(`移行しました: ${questions.length} 問`);
  console.log(`  シラバス紐づけあり: ${withSyllabus} 問`);
  console.log(`  出力: ${path.relative(ROOT, OUT_QUESTIONS)}`);
  console.log(`  出力: ${path.relative(ROOT, OUT_MANIFEST)}`);
}

main();
