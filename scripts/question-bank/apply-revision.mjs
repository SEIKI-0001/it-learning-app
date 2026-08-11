// 既存問題の本文を差し替え、版とレビュー記録をまとめて更新する。
//
// 使い方:
//   node scripts/question-bank/apply-revision.mjs <patch.json>
//   npm run questions:apply-revision -- data/question-bank/revisions/batch-01.json
//   （--dry-run で書き込まずに差分だけ出す）
//
// なぜスクリプトにするか:
//   問題本文を直す作業には、本文と一緒に必ず動かさなければならない値が3つある。
//     1. contentHash … 本文と一致していないと validate:questions が落ちる
//     2. version     … 上げ忘れると別内容の回答が同じ版に混ざる（validate:question-versions）
//     3. reviews/<id>.json … version が食い違うとレビュー記録が失効扱いになる
//   手で3つを揃えるのは事故が起きるので、本文だけ書けば残りが揃うようにする。
//
// パッチの形式（questions の各要素は差分。省略した項目は現状を保つ）:
//   {
//     "reviewedBy": "claude-code:exam-level-quality",
//     "reviewedAt": "2026-08-09T00:00:00.000Z",
//     "authoredBy": "claude-code:exam-level-quality",
//     "decision": "approve",
//     "notes": "誤答を同カテゴリの実在する用語に差し替えた。",
//     "questions": [
//       {
//         "id": "tech-security-cia-ex1",
//         "prompt": "…",                       // 任意
//         "choices": ["正答の本文", "誤答1", "誤答2", "誤答3"],  // 任意。correctChoice の指定が無ければ先頭が正答
//         "correctChoice": "A",                 // 任意
//         "explanation": "…",                   // 任意
//         "choiceExplanations": { "A": "…" },   // 任意
//         "estimatedDifficulty": 3,             // 任意
//         "tags": ["…"],                        // 任意
//         "notes": "この問題固有のレビューメモ"   // 任意（パッチ全体の notes を上書き）
//       }
//     ]
//   }

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { computeContentHash } = await import("../../lib/questionBank/contentHash.ts");

/** 本文を持つ問題ファイル。パッチ対象の問題はこのいずれかに居る。 */
const QUESTION_FILES = [
  "data/question-bank/original/exam-level.json",
  "data/question-bank/original/theme-exam.json",
  "data/question-bank/official/ipa/it-passport-2026.json",
];

const REVIEW_DIR = "data/question-bank/reviews";
const CHOICE_KEYS = ["A", "B", "C", "D"];

// ---------------------------------------------------------------------------
// 入力
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const patchPath = args.find((a) => !a.startsWith("--"));

if (!patchPath) {
  console.error("パッチファイルを指定してください: node scripts/question-bank/apply-revision.mjs <patch.json>");
  process.exit(1);
}

function readJson(relOrAbs) {
  const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
  return { abs, data: JSON.parse(readFileSync(abs, "utf8")) };
}

const patch = readJson(patchPath).data;

if (!Array.isArray(patch.questions) || patch.questions.length === 0) {
  console.error("パッチに questions がありません。");
  process.exit(1);
}
if (!patch.reviewedBy || !patch.reviewedAt) {
  console.error("パッチには reviewedBy と reviewedAt が必要です。");
  process.exit(1);
}
if (Number.isNaN(Date.parse(patch.reviewedAt))) {
  console.error(`reviewedAt が日時として解釈できません: ${patch.reviewedAt}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 問題ファイルを読み、ID から所在を引けるようにする
// ---------------------------------------------------------------------------

const files = [];
const locate = new Map(); // id -> { file, question }

for (const rel of QUESTION_FILES) {
  let loaded;
  try {
    loaded = readJson(rel);
  } catch {
    continue; // まだ存在しないファイルは対象外（theme-exam.json は後から増える）
  }
  const file = { rel, abs: loaded.abs, data: loaded.data, dirty: false };
  files.push(file);
  for (const q of file.data.questions ?? []) {
    locate.set(q.id, { file, question: q });
  }
}

// ---------------------------------------------------------------------------
// 適用
// ---------------------------------------------------------------------------

/** choices の指定（文字列配列 or {key,text} 配列）を QuestionRecord の形にする。 */
function normalizeChoices(spec, id) {
  if (!Array.isArray(spec) || spec.length !== 4) {
    throw new Error(`${id}: choices は4件の配列で指定してください。`);
  }
  if (typeof spec[0] === "string") {
    return spec.map((text, i) => ({ key: CHOICE_KEYS[i], text }));
  }
  return spec.map((c) => ({ key: c.key, text: c.text }));
}

const applied = [];
const skipped = [];
const errors = [];

for (const entry of patch.questions) {
  const found = locate.get(entry.id);
  if (!found) {
    errors.push(`${entry.id}: 問題バンクに存在しません。`);
    continue;
  }
  const { file, question } = found;
  const before = {
    prompt: question.prompt,
    choices: question.choices,
    correctChoice: question.correctChoice,
    explanation: question.explanation,
  };

  const next = { ...question };
  if (entry.prompt !== undefined) next.prompt = entry.prompt;
  if (entry.choices !== undefined) {
    try {
      next.choices = normalizeChoices(entry.choices, entry.id);
    } catch (e) {
      errors.push(e.message);
      continue;
    }
  }
  if (entry.correctChoice !== undefined) next.correctChoice = entry.correctChoice;
  if (entry.explanation !== undefined) next.explanation = entry.explanation;
  if (entry.choiceExplanations !== undefined) next.choiceExplanations = entry.choiceExplanations;
  if (entry.estimatedDifficulty !== undefined) next.estimatedDifficulty = entry.estimatedDifficulty;
  if (entry.tags !== undefined) next.tags = entry.tags;
  if (entry.questionPattern !== undefined) next.questionPattern = entry.questionPattern;

  if (!next.choices.some((c) => c.key === next.correctChoice)) {
    errors.push(`${entry.id}: 正答 "${next.correctChoice}" が選択肢に存在しません。`);
    continue;
  }

  const nextHash = computeContentHash(next);
  const contentChanged = nextHash !== computeContentHash(before);

  // 本文が変わっていないなら版は上げない。メタだけの更新で版が動くと、
  // 回答履歴が意味なく分断される。
  if (!contentChanged) {
    Object.assign(question, next);
    file.dirty = true;
    skipped.push(entry.id);
    continue;
  }

  next.version = (question.version ?? 1) + 1;
  next.contentHash = nextHash;
  next.reviewedAt = patch.reviewedAt;
  next.reviewedBy = patch.reviewedBy;

  Object.assign(question, next);
  file.dirty = true;
  applied.push({ id: entry.id, version: next.version, notes: entry.notes ?? patch.notes ?? "" });
}

if (errors.length > 0) {
  console.error("エラー:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 書き込み
// ---------------------------------------------------------------------------

function writeJson(abs, data) {
  writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

if (!dryRun) {
  for (const file of files) {
    if (file.dirty) writeJson(file.abs, file.data);
  }

  for (const { id, version, notes } of applied) {
    const review = {
      questionId: id,
      version,
      contentReviewedBy: patch.reviewedBy,
      explanationReviewedBy: patch.reviewedBy,
      similarityReviewedBy: patch.reviewedBy,
      reviewedAt: patch.reviewedAt,
      decision: patch.decision ?? "approve",
      notes,
      authoredBy: patch.authoredBy ?? patch.reviewedBy,
    };
    writeJson(path.join(ROOT, REVIEW_DIR, `${id}.json`), review);
  }
}

console.log(`${dryRun ? "[dry-run] " : ""}改訂: ${applied.length}件（版を上げた）`);
if (skipped.length > 0) {
  console.log(`本文が変わらず版を据え置き: ${skipped.length}件 — ${skipped.join(", ")}`);
}
for (const { id, version } of applied) {
  console.log(`  ${id} -> v${version}`);
}
