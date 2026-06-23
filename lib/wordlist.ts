// 英略語の単語帳（wordlist）のデータアクセス層。
// マスターデータは data/wordlist/itpassAcronyms.json（唯一のデータソース）。
// 画面側はこのモジュール経由でのみ用語を読む（ハードコード禁止）。

import rawData from "@/data/wordlist/itpassAcronyms.json";
import type { ChoiceKey } from "@/types";
import type {
  WordlistCategory,
  WordlistEntry,
  WordlistQuestionType,
} from "@/types/wordlist";

// JSON は id が重複しているエントリがありうる（既知: "slo" が2件）。
// id はルーティング・進捗保存のキーになるため、読み込み時に先勝ちで一意化する。
const ALL: WordlistEntry[] = (() => {
  const seen = new Set<string>();
  const out: WordlistEntry[] = [];
  for (const entry of rawData as unknown as WordlistEntry[]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
})();

const BY_ID = new Map(ALL.map((e) => [e.id, e]));
const BY_ACRONYM = new Map(ALL.map((e) => [e.acronym, e]));

/** すべての英略語エントリ。 */
export function getAllWords(): WordlistEntry[] {
  return ALL;
}

/** id で1件取得（なければ undefined）。 */
export function getWord(id: string): WordlistEntry | undefined {
  return BY_ID.get(id);
}

/** 略語そのもの（"KPI" など）で1件取得。 */
export function getWordByAcronym(acronym: string): WordlistEntry | undefined {
  return BY_ACRONYM.get(acronym);
}

/** カテゴリで絞り込む。 */
export function getWordsByCategory(
  category: WordlistCategory,
): WordlistEntry[] {
  return ALL.filter((e) => e.category === category);
}

/** 総単語数。 */
export function getWordlistCount(): number {
  return ALL.length;
}

// ---- 4択確認モードの問題生成 ----------------------------------------------

const KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

export type QuizChoice = { key: ChoiceKey; text: string };

export type QuizQuestion = {
  entryId: string;
  type: WordlistQuestionType;
  /** 問題文。 */
  prompt: string;
  /** 問題文の補足（任意・形式の説明など）。 */
  promptHint?: string;
  choices: QuizChoice[];
  correctKey: ChoiceKey;
  /** 正誤判定後に出す短い解説。 */
  explanation: string;
};

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wordPartText(entry: WordlistEntry): string {
  return entry.words.map((w) => w.word).join(" + ");
}

/**
 * 誤答を集める。preferred（confusedWith由来）を優先し、足りなければ pool から補う。
 * correct と重複しないようにする。
 */
function pickDistractors(
  correct: string,
  preferred: string[],
  pool: string[],
  n: number,
  rng: Rng,
): string[] {
  const chosen: string[] = [];
  const used = new Set<string>([correct]);
  for (const p of shuffle(preferred, rng)) {
    if (chosen.length >= n) break;
    if (p && !used.has(p)) {
      chosen.push(p);
      used.add(p);
    }
  }
  for (const p of shuffle(pool, rng)) {
    if (chosen.length >= n) break;
    if (p && !used.has(p)) {
      chosen.push(p);
      used.add(p);
    }
  }
  return chosen;
}

/** confusedWith の略語名のうち、データセットに存在するものを WordlistEntry に変換。 */
function confusedEntries(entry: WordlistEntry): WordlistEntry[] {
  return entry.confusedWith
    .map((name) => BY_ACRONYM.get(name))
    .filter((e): e is WordlistEntry => Boolean(e));
}

function baseExplanation(entry: WordlistEntry): string {
  const kw =
    entry.examKeywords.length > 0
      ? ` 試験キーワード: ${entry.examKeywords.join("・")}`
      : "";
  return `${entry.acronym}（${entry.fullName}）＝${entry.japanese}。${entry.oneLine}${kw}`;
}

function confusionExplanation(entry: WordlistEntry): string {
  const traps = Object.entries(entry.trapExplanations)
    .map(([name, text]) => `${name}: ${text}`)
    .join(" / ");
  const axis = entry.differenceAxis
    ? `見分けるポイント: ${entry.differenceAxis}。`
    : "";
  return `${entry.acronym}＝${entry.japanese}。${axis}${traps ? ` ${traps}` : ""}`;
}

/** このエントリで生成可能な出題形式（confusion は confusedWith が必要）。 */
function feasibleTypes(entry: WordlistEntry): WordlistQuestionType[] {
  return entry.questionTypes.filter((t) =>
    t === "confusion" ? entry.confusedWith.length > 0 : true,
  );
}

function assemble(
  entry: WordlistEntry,
  type: WordlistQuestionType,
  prompt: string,
  promptHint: string,
  correct: string,
  distractors: string[],
  explanation: string,
  rng: Rng,
): QuizQuestion {
  const texts = shuffle([correct, ...distractors], rng);
  const choices = texts.map((text, i) => ({ key: KEYS[i], text }));
  const correctKey =
    choices.find((c) => c.text === correct)?.key ?? choices[0].key;
  return {
    entryId: entry.id,
    type,
    prompt,
    promptHint,
    choices,
    correctKey,
    explanation,
  };
}

/**
 * 1エントリ＋出題形式から4択問題を作る。
 * 誤答選択肢は wordlist から生成し、confusedWith を優先利用する。
 */
export function buildQuizQuestion(
  entry: WordlistEntry,
  type: WordlistQuestionType,
  rng: Rng = Math.random,
): QuizQuestion {
  const others = ALL.filter((e) => e.id !== entry.id);
  const confused = confusedEntries(entry);

  switch (type) {
    case "acronym_to_meaning": {
      const correct = entry.japanese;
      const preferred = confused.map((e) => e.japanese);
      const pool = others.map((e) => e.japanese);
      const distractors = pickDistractors(correct, preferred, pool, 3, rng);
      return assemble(
        entry,
        type,
        `「${entry.acronym}」の意味は？`,
        "略語 → 意味",
        correct,
        distractors,
        baseExplanation(entry),
        rng,
      );
    }
    case "meaning_to_acronym": {
      const correct = entry.acronym;
      // confusedWith はデータに無い略語名も誤答として使える。
      const preferred = entry.confusedWith;
      const pool = others.map((e) => e.acronym);
      const distractors = pickDistractors(correct, preferred, pool, 3, rng);
      return assemble(
        entry,
        type,
        `「${entry.japanese}」を表す略語は？`,
        "意味 → 略語",
        correct,
        distractors,
        baseExplanation(entry),
        rng,
      );
    }
    case "word_part": {
      const correct = wordPartText(entry);
      const preferred = confused.map(wordPartText);
      const pool = others.map(wordPartText);
      const distractors = pickDistractors(correct, preferred, pool, 3, rng);
      return assemble(
        entry,
        type,
        `「${entry.acronym}」は何の略？（英単語の組み合わせ）`,
        "英単語パーツ",
        correct,
        distractors,
        `${entry.acronym} = ${entry.fullName}（${entry.japanese}）。${entry.words
          .map((w) => `${w.word}=${w.meaning}`)
          .join(" / ")}`,
        rng,
      );
    }
    case "confusion": {
      const correct = entry.acronym;
      // 混同しやすい略語そのものを誤答にする。
      const preferred = entry.confusedWith;
      const pool = others.map((e) => e.acronym);
      const distractors = pickDistractors(correct, preferred, pool, 3, rng);
      return assemble(
        entry,
        type,
        `次の説明にあてはまる略語は？\n「${entry.oneLine}」`,
        "混同語比較",
        correct,
        distractors,
        confusionExplanation(entry),
        rng,
      );
    }
  }
}

/** 1エントリから、生成可能な形式をランダムに1つ選んで4択問題を作る。 */
export function buildQuizForEntry(
  entry: WordlistEntry,
  rng: Rng = Math.random,
): QuizQuestion {
  const types = feasibleTypes(entry);
  const type = types[Math.floor(rng() * types.length)] ?? "acronym_to_meaning";
  return buildQuizQuestion(entry, type, rng);
}

/**
 * 出題プール（順序は呼び出し側で決める）から先頭 count 件で問題を作る。
 * 各エントリは生成可能な形式からランダムに1つ選ぶ。
 */
export function buildQuizSession(
  pool: WordlistEntry[],
  count: number,
  rng: Rng = Math.random,
): QuizQuestion[] {
  return pool
    .slice(0, Math.min(count, pool.length))
    .map((entry) => buildQuizForEntry(entry, rng));
}
