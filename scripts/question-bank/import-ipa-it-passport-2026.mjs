// 令和8年度 ITパスポート試験 公開問題（IPA 公式公開）を統一問題バンクへ取り込む生成スクリプト。
//
// 使い方:
//   npm run questions:import:ipa:2026
//
// 方針:
//   - 入力は Git 管理された1ファイルだけ:
//       data/question-bank/sources/official/ipa/it-passport-2026.source.json
//     公式PDFはリポジトリに含めない。原文の転記結果はこの source.json が正。
//   - 出力は決定的。同じ入力なら同じ JSON になる（実行時刻・乱数を混ぜない）。
//     再実行して git diff が出ないことを CI で確認する。
//   - 原文（prompt / choices / correctChoice）は official.original に必ず保存し，
//     表示用の prompt / choices / correctChoice にも同じ値を入れる。
//     今回は言い換え・要約をしないため両者は完全一致する（検証テストで強制）。
//   - 分類は3軸を別々に持つ（混ぜない）:
//       official.examField … 公式問題冊子上の出題区分。問番号から機械的に決める。
//       syllabusNode.field … 問題内容から見た IPA シラバス分類。primaryTopicId から引く。
//       primaryTopicId     … アプリ内の復習先トピック。source.json が持つ。
//     公式区分と内容分類はずれることがある（例: 問16 / 問52）。片方で他方を上書きしない。
//   - 解説は書かない（status: "content_verified" / explanation: ""）。
//     解説の妥当性は未監査なので explanation_verified には上げない。
//   - contentHash はアプリ側と同じ実装（lib/questionBank/contentHash.ts）を使う。
//
// Node の TypeScript 型ストリップで .ts を直接読む。
// 読み込む .ts は import type だけを使っているため、@/ エイリアスの解決は不要。

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { computeContentHash } from "../../lib/questionBank/contentHash.ts";
import { getOfficialExamField } from "../../lib/questionBank/officialExamField.ts";
import { ipaSyllabusItems } from "../../data/ipaSyllabus.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const IN_SOURCE = path.join(
  ROOT,
  "data/question-bank/sources/official/ipa/it-passport-2026.source.json",
);
const OUT_QUESTIONS = path.join(ROOT, "data/question-bank/official/ipa/it-passport-2026.json");
const OUT_MANIFEST = path.join(
  ROOT,
  "data/question-bank/manifests/official-ipa-it-passport-2026.json",
);
const FIGURE_DIR = path.join(ROOT, "public/question-bank/official/ipa/it-passport/2026");

const BANK_SOURCE = "official/ipa/it-passport-2026";
const GENERATED_FROM = "data/question-bank/sources/official/ipa/it-passport-2026.source.json";

/** 全問共通。原文出題なので改変なし・内容監査済み。解説は未作成。 */
const ORIGIN = "official_past";
const STATUS = "content_verified";
const VERSION = 1;

const CHOICE_KEYS = ["A", "B", "C", "D"];
/** 公式の選択肢記号 → 内部キー。 */
const KANA_TO_KEY = { ア: "A", イ: "B", ウ: "C", エ: "D" };

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

function questionId(number) {
  return `ipa-it-passport-2026-q${String(number).padStart(3, "0")}`;
}

function toQuestionRecord(src, exam, syllabusIndex) {
  const { number } = src;

  // --- 原文 -----------------------------------------------------------------
  // 選択肢は必ず A→D の順に並べる（source の記載順に依存させない）。
  const choices = CHOICE_KEYS.map((key) => ({ key, text: src.choices[key] }));

  // 正答は解答例PDFの記号から機械的に写す。問題内容からは推測しない。
  const correctChoice = KANA_TO_KEY[src.correctChoiceKana];
  if (!correctChoice) {
    throw new Error(`問${number}: 正解記号が不正です: "${src.correctChoiceKana}"`);
  }
  if (correctChoice !== src.correctChoice) {
    throw new Error(
      `問${number}: correctChoice が正解記号と矛盾します（${src.correctChoice} / ${src.correctChoiceKana}→${correctChoice}）`,
    );
  }

  const original = {
    prompt: src.prompt,
    choices,
    correctChoice,
  };

  // --- 図表 -----------------------------------------------------------------
  const figures = src.figures.map((f) => ({
    id: f.id,
    kind: f.kind,
    src: `${exam.figureBaseUrl}/${f.file}`,
    alt: f.alt,
  }));
  if (figures.length > 0) {
    // 原文がどの図表を参照しているかを原文側にも残す（順序は問題文の参照順）。
    original.figureIds = figures.map((f) => f.id);
  }

  // --- 本文（表示用） --------------------------------------------------------
  // 今回は正規化のみで言い換えをしないため、原文と同じ値を入れる。
  const body = {
    prompt: original.prompt,
    choices: original.choices,
    correctChoice: original.correctChoice,
    explanation: "", // 独自解説は今回作らない
  };

  const record = {
    id: questionId(number),
    version: VERSION,
    origin: ORIGIN,
    status: STATUS,
    primaryTopicId: src.primaryTopicId,
    questionPattern: src.questionPattern,
    prompt: body.prompt,
    choices: body.choices,
    correctChoice: body.correctChoice,
    explanation: body.explanation,
    estimatedDifficulty: src.estimatedDifficulty,
    tags: src.tags,
    official: {
      provider: exam.provider,
      examType: exam.examType,
      year: exam.year,
      questionNumber: number,
      sourceUrl: exam.sourceUrl,
      answerSourceUrl: exam.answerSourceUrl,
      attribution: exam.attributionTemplate.replace("{n}", String(number)),
      // 公式問題冊子上の出題区分。問番号の並びから機械的に決まるので source.json には持たせない。
      // 内容分類（syllabusNode.field）とは別物で、一致しない問がある。
      examField: getOfficialExamField(number),
      isModified: false,
      examSession: exam.examSession,
      original,
      retrievedAt: exam.retrievedAt,
    },
    contentHash: computeContentHash(body),
    reviewedAt: null, // 解説レビューは未実施
    reviewedBy: null,
  };

  if (figures.length > 0) record.figures = figures;

  // 内容分類。primaryTopicId（＝何を問うている問題か）から引く。
  // official.examField（公式冊子の出題区分）で上書きしないこと。両者はずれることがあり、
  // ずれ自体が「公式区分と内容が違う問」という情報なので潰してはいけない。
  const syllabusNode = syllabusIndex.get(src.primaryTopicId);
  if (syllabusNode) record.syllabusNode = syllabusNode;

  return record;
}

/** 生成前に、入力そのものが壊れていないかを確認する。 */
function assertSourceIsSane(source) {
  const { questions } = source;

  if (questions.length !== 100) {
    throw new Error(`公開問題は100問のはずですが ${questions.length} 問です。`);
  }

  const numbers = questions.map((q) => q.number);
  for (let i = 0; i < 100; i += 1) {
    if (numbers[i] !== i + 1) {
      throw new Error(`問番号が1〜100の連番になっていません（${i + 1}番目が ${numbers[i]}）。`);
    }
  }

  const figureFiles = new Set();
  for (const q of questions) {
    for (const key of CHOICE_KEYS) {
      if (typeof q.choices[key] !== "string" || q.choices[key].trim() === "") {
        throw new Error(`問${q.number}: 選択肢 ${key} が空です。`);
      }
    }
    if (typeof q.prompt !== "string" || q.prompt.trim() === "") {
      throw new Error(`問${q.number}: 問題文が空です。`);
    }
    for (const f of q.figures) {
      if (!f.alt || f.alt.trim() === "") throw new Error(`問${q.number}: 図表 ${f.id} の alt が空です。`);
      const abs = path.join(FIGURE_DIR, f.file);
      if (!existsSync(abs)) throw new Error(`問${q.number}: 図表ファイルがありません: ${f.file}`);
      if (figureFiles.has(f.file)) throw new Error(`図表ファイルが重複しています: ${f.file}`);
      figureFiles.add(f.file);
      // 問題文の参照順と配列順が一致していること（promptAnchor は転記時に記録した参照語）。
      if (f.promptAnchor && !q.prompt.includes(f.promptAnchor)) {
        throw new Error(`問${q.number}: 図表 ${f.id} の参照語 "${f.promptAnchor}" が問題文にありません。`);
      }
    }
  }

  // 孤立画像（どの問題からも参照されていないファイル）がないこと。
  const onDisk = readdirSync(FIGURE_DIR).filter((f) => f.endsWith(".png"));
  const orphans = onDisk.filter((f) => !figureFiles.has(f));
  if (orphans.length > 0) {
    throw new Error(`参照されていない図表ファイルがあります: ${orphans.join(", ")}`);
  }
}

function main() {
  const source = JSON.parse(readFileSync(IN_SOURCE, "utf8"));
  assertSourceIsSane(source);

  const syllabusIndex = buildSyllabusIndex();
  const questions = source.questions.map((q) => toQuestionRecord(q, source.exam, syllabusIndex));

  const ids = questions.map((q) => q.id);
  const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicated.length > 0) {
    throw new Error(`問題IDが重複しています: ${[...new Set(duplicated)].join(", ")}`);
  }

  const file = {
    schemaVersion: 1,
    source: BANK_SOURCE,
    questions,
  };

  // generatedAt のような実行時刻は入れない。再実行で無意味な差分が出るのを避け、
  // 「入力が同じなら出力も同じ」を保つ（生成日時は git 履歴で追える）。
  const manifest = {
    file: "data/question-bank/official/ipa/it-passport-2026.json",
    generatedFrom: GENERATED_FROM,
    questionCount: questions.length,
    questionIds: ids,
  };

  writeFileSync(OUT_QUESTIONS, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const withFigures = questions.filter((q) => q.figures);
  const figureCount = withFigures.reduce((sum, q) => sum + q.figures.length, 0);
  const withSyllabus = questions.filter((q) => q.syllabusNode).length;
  const countBy = (field) => questions.filter((q) => q.official.examField === field).length;

  console.log(`取り込みました: ${questions.length} 問`);
  console.log(`  出典: ${source.exam.examName}`);
  console.log(`  図表: ${withFigures.length} 問 / ${figureCount} 点`);
  console.log(`  シラバス紐づけあり: ${withSyllabus} 問`);
  console.log(
    `  公式出題区分: ストラテジ ${countBy("strategy")} / マネジメント ${countBy("management")} / テクノロジ ${countBy("technology")} 問`,
  );
  console.log(`  出力: ${path.relative(ROOT, OUT_QUESTIONS)}`);
  console.log(`  出力: ${path.relative(ROOT, OUT_MANIFEST)}`);
}

main();
