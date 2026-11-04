// 公開過去問の正解（データ上の correctChoice）が、IPA 公式の解答PDFと一致しているかを確かめる。
//
// 照らし合わせるもの（どれか1つでもずれたら失敗）:
//   1. IPA の解答PDF（answerSourceUrl）から読み取った正解
//   2. 表示用の correctChoice（data/question-bank/official/ipa/it-passport-<年>.json）
//   3. 原文として保存している official.original.correctChoice（同上）
//   4. 取り込み元の source.json の正解（data/question-bank/sources/official/ipa/…）
//
// 使い方:
//   node scripts/kakomon/check-official-answers.mjs                 … 全年度。PDFは IPA から取得する
//   node scripts/kakomon/check-official-answers.mjs 2025 2026       … 年度を指定
//   node scripts/kakomon/check-official-answers.mjs --pdf-dir <dir> … 手元に保存したPDFを使う
//     （<dir> に IPA のファイル名のまま置く。例: 2025r07_ip_ans.pdf）
//
// PDF の文字は pdftotext（poppler-utils）で取り出す。公式PDFはリポジトリに含めない。
// 読み取れた正解が100問そろわないときも失敗にする（読み取りの失敗を「一致」と見なさない）。
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const YEARS_ALL = [2022, 2023, 2024, 2025, 2026];
const KEY_BY_KANA = { ア: "A", イ: "B", ウ: "C", エ: "D" };
const KANA_BY_KEY = { A: "ア", B: "イ", C: "ウ", D: "エ" };

const args = process.argv.slice(2);
const pdfDirIndex = args.indexOf("--pdf-dir");
const pdfDir = pdfDirIndex >= 0 ? path.resolve(args[pdfDirIndex + 1]) : null;
const yearArgs = args
  .filter((a, i) => /^\d{4}$/.test(a) && !(pdfDirIndex >= 0 && i === pdfDirIndex + 1))
  .map(Number);
const years = yearArgs.length > 0 ? yearArgs : YEARS_ALL;

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
}

async function loadPdf(url) {
  const name = path.basename(new URL(url).pathname);
  if (pdfDir) {
    const local = path.join(pdfDir, name);
    if (!existsSync(local)) throw new Error(`${local} がありません（${url} を保存して置いてください）`);
    return local;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} の取得に失敗しました（HTTP ${res.status}）`);
  const file = path.join(mkdtempSync(path.join(tmpdir(), "ipa-ans-")), name);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/** 解答PDFの文字から「問番号 → 正解（A〜D）」を取り出す。表が2段組みでも拾えるよう、行ではなく全文から探す。 */
export function parseAnswers(text) {
  const answers = new Map();
  const normalized = text.normalize("NFKC");
  for (const m of normalized.matchAll(/問\s*(\d{1,3})\s+([アイウエ])(?![ァ-ヶ])/g)) {
    const no = Number(m[1]);
    const key = KEY_BY_KANA[m[2]];
    if (answers.has(no) && answers.get(no) !== key) throw new Error(`問${no} の正解が2通り読み取れました`);
    answers.set(no, key);
  }
  return answers;
}

async function checkYear(year) {
  const bank = readJson(`data/question-bank/official/ipa/it-passport-${year}.json`);
  const source = readJson(`data/question-bank/sources/official/ipa/it-passport-${year}.source.json`);
  const url = source.exam.answerSourceUrl;
  const pdf = await loadPdf(url);
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  const official = parseAnswers(text);

  const problems = [];
  if (official.size !== bank.questions.length) {
    problems.push(`解答PDFから読み取れた正解が ${official.size} 問（問題データは ${bank.questions.length} 問）。読み取り方を見直してください`);
  }
  const sourceByNo = new Map(source.questions.map((q) => [q.number, q]));
  for (const q of bank.questions) {
    const no = q.official.questionNumber;
    const want = official.get(no);
    const got = {
      表示用: q.correctChoice,
      原文: q.official.original?.correctChoice,
      取込元: sourceByNo.get(no)?.correctChoice,
    };
    for (const [label, value] of Object.entries(got)) {
      if (want && value !== want) {
        problems.push(`問${no}: IPA解答は${KANA_BY_KEY[want]}、${label}の正解は${KANA_BY_KEY[value] ?? String(value)}`);
      }
    }
  }
  return { year, url, problems };
}

let failed = false;
for (const year of years) {
  try {
    const { url, problems } = await checkYear(year);
    if (problems.length === 0) {
      console.log(`✓ ${year}: 100問すべて IPA 公式の解答と一致（${url}）`);
    } else {
      failed = true;
      console.log(`✗ ${year}: ${problems.length} 件のずれ（${url}）`);
      for (const p of problems) console.log(`  - ${p}`);
    }
  } catch (e) {
    failed = true;
    console.log(`✗ ${year}: 確認できませんでした — ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
