// 問題本文を変えたら version を上げているか、Git の比較元と突き合わせて検証する。
//
// 使い方:
//   npm run validate:question-versions
//   npm run validate:question-versions -- --base=origin/main
//   npm run validate:question-versions -- --allow-missing-base   # 比較元が無い環境向け
//
// なぜ Git が要るか:
//   「本文を書き換えて contentHash だけ再生成し、version は据え置く」は
//   1コミットの中身だけを見ても正しく見える（本文とハッシュは一致しているため）。
//   前の版と比べないと検出できないので、比較元を Git から読む。
//
// 比較元の決め方（上から順に採用）:
//   1. --base=<ref>
//   2. 環境変数 QUESTION_BANK_BASE_REF
//   3. GitHub Actions の PR: origin/$GITHUB_BASE_REF とのマージベース
//   4. origin/main → main の順に、存在するもののマージベース
//
// 比較元が取れないときは黙って通さない。既定ではエラーで落とし、
// --allow-missing-base を明示したときだけ理由を出してスキップする。

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { validateVersionTransitions } = await import(
  "../../lib/questionBank/versionDiff.ts"
);
const { formatIssues } = await import("../../lib/questionBank/validate.ts");

/** 問題データの JSON。data/question-bank/index.ts が束ねているものと同じ。 */
const QUESTION_FILES = [
  "data/question-bank/original/exam-level.json",
  "data/question-bank/official/ipa/it-passport-2026.json",
];

const REVIEW_DIR = "data/question-bank/reviews";

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function revisionExists(ref) {
  return git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
    allowFailure: true,
  }) !== null;
}

/** 比較元のコミットを決める。決められなければ理由つきで null。 */
function resolveBaseRef() {
  const explicit =
    process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ||
    process.env.QUESTION_BANK_BASE_REF;

  if (explicit) {
    if (!revisionExists(explicit)) {
      return { ref: null, reason: `指定された比較元 "${explicit}" が解決できません。` };
    }
    return { ref: mergeBaseOrRef(explicit), source: `--base=${explicit}` };
  }

  // GitHub Actions の pull_request では、マージ先のブランチ名が入る。
  const prBase = process.env.GITHUB_BASE_REF;
  if (prBase && revisionExists(`origin/${prBase}`)) {
    return { ref: mergeBaseOrRef(`origin/${prBase}`), source: `origin/${prBase}` };
  }

  for (const candidate of ["origin/main", "main"]) {
    if (revisionExists(candidate)) {
      return { ref: mergeBaseOrRef(candidate), source: candidate };
    }
  }

  return {
    ref: null,
    reason:
      "比較元が見つかりません（origin/main も main も解決できませんでした）。" +
      "浅いクローンでは fetch-depth: 0 が必要です。",
  };
}

/**
 * 比較元とのマージベースを使う。
 * ブランチが古いとき、比較元側で先に進んだ変更まで「自分の変更」として拾ってしまうのを避ける。
 */
function mergeBaseOrRef(ref) {
  const base = git(["merge-base", "HEAD", ref], { allowFailure: true });
  return base ? base.trim() : ref;
}

/** 比較元のファイル内容（無ければ null）。 */
function readAtRef(ref, relativePath) {
  return git(["show", `${ref}:${relativePath}`], { allowFailure: true });
}

/** 比較元に存在するレビュー記録のファイル名一覧。 */
function listReviewFilesAtRef(ref) {
  const out = git(["ls-tree", "--name-only", `${ref}:${REVIEW_DIR}`], {
    allowFailure: true,
  });
  if (out === null) return [];
  return out.split("\n").filter((name) => name.endsWith(".json"));
}

// ---------------------------------------------------------------------------
// スナップショットの組み立て
// ---------------------------------------------------------------------------

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} を JSON として読めません: ${error.message}`);
  }
}

function toQuestionSnapshots(files) {
  const questions = new Map();
  for (const { label, text } of files) {
    if (text === null) continue; // 比較元に無いファイル（新規追加）
    const parsed = parseJson(text, label);
    for (const q of parsed.questions ?? []) {
      questions.set(q.id, {
        id: q.id,
        version: q.version,
        contentHash: q.contentHash,
        reviewedAt: q.reviewedAt ?? null,
        reviewedBy: q.reviewedBy ?? null,
      });
    }
  }
  return questions;
}

function toReviewSnapshots(records) {
  const reviews = new Map();
  for (const { label, text } of records) {
    if (text === null) continue;
    const review = parseJson(text, label);
    const key = review?.questionId?.trim();
    if (!key) continue;
    reviews.set(key, {
      questionId: key,
      version: review.version,
      reviewedAt: review.reviewedAt,
    });
  }
  return reviews;
}

function readRevisionAtRef(ref) {
  const files = QUESTION_FILES.map((relativePath) => ({
    label: `${ref}:${relativePath}`,
    text: readAtRef(ref, relativePath),
  }));

  const records = listReviewFilesAtRef(ref).map((fileName) => ({
    label: `${ref}:${REVIEW_DIR}/${fileName}`,
    text: readAtRef(ref, `${REVIEW_DIR}/${fileName}`),
  }));

  return { questions: toQuestionSnapshots(files), reviews: toReviewSnapshots(records) };
}

async function readWorkingTree() {
  const { readFileSync, existsSync, readdirSync } = await import("node:fs");

  const files = QUESTION_FILES.map((relativePath) => ({
    label: relativePath,
    text: readFileSync(path.join(ROOT, relativePath), "utf8"),
  }));

  const reviewDir = path.join(ROOT, REVIEW_DIR);
  const records = existsSync(reviewDir)
    ? readdirSync(reviewDir)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((fileName) => ({
          label: `${REVIEW_DIR}/${fileName}`,
          text: readFileSync(path.join(reviewDir, fileName), "utf8"),
        }))
    : [];

  return { questions: toQuestionSnapshots(files), reviews: toReviewSnapshots(records) };
}

// ---------------------------------------------------------------------------

async function main() {
  const allowMissingBase = process.argv.includes("--allow-missing-base");
  const { ref, reason, source } = resolveBaseRef();

  if (!ref) {
    // 黙って通さない。既定はエラー、明示的に許可されたときだけスキップ理由を出す。
    if (allowMissingBase) {
      console.warn(`スキップ: ${reason}`);
      console.warn("--allow-missing-base が指定されているため、検証せずに終了します。");
      console.warn("この実行では version 据え置きを検出できていません。");
      return;
    }
    console.error(`比較元を決められないため検証できません。\n  ${reason}`);
    console.error(
      "\n比較元を指定するか、意図的に飛ばす場合は --allow-missing-base を付けてください。",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`比較元: ${source ?? ref}（${ref.slice(0, 12)}）`);

  const base = readRevisionAtRef(ref);
  const head = await readWorkingTree();
  const issues = validateVersionTransitions(base, head);

  console.log(`比較した問題数: ${base.questions.size}`);

  if (issues.length === 0) {
    console.log("本文変更と version の対応に問題はありません。");
    return;
  }

  console.error(`\n${issues.length} 件の違反があります:\n`);
  console.error(formatIssues(issues));
  process.exitCode = 1;
}

await main();
