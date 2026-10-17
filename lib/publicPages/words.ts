// 公開英略語ページ（/words）のパスと表示文言。
// データは lib/wordlist（data/wordlist/itpassAcronyms.json が唯一の正）から読む。

import { buildQuizQuestion, getAllWords, getWordByAcronym } from "@/lib/wordlist";
import type { ChoiceKey } from "@/types";
import type { WordlistEntry } from "@/types/wordlist";

export const WORDS_BASE_PATH = "/words";

export function wordPath(id: string): string {
  return `${WORDS_BASE_PATH}/${id}`;
}

/**
 * 略語ではなく英単語の見出し（"Zero Trust" "Hallucination" など）か。
 * これらは「〜の略」と書けないので、正式名称の代わりに日本語名を添える。
 */
export function isWordLikeEntry(w: WordlistEntry): boolean {
  return /\s/.test(w.acronym) || /[a-z]{3,}/.test(w.acronym);
}

/** title・見出しに並べる似た用語の数。3つ以上並べると検索結果で切れる。 */
const TITLE_CONFUSED_MAX = 2;

/**
 * 名前に出す表記。英単語の見出し（Deepfake など）は日本語名で出す。
 * 検索は「ディープフェイク ハルシネーション 違い」のようにカタカナで打たれるため。
 */
function displayName(name: string): string {
  const entry = getWordByAcronym(name);
  return entry && isWordLikeEntry(entry) ? entry.japanese : name;
}

/**
 * 例: "RPO（Recovery Point Objective）とは？意味とRTO・BCPとの違い"、
 * "ディープフェイク（Deepfake）とは？意味とハルシネーション・GANとの違い"。
 * 「RPO RTO 違い」のような比較の検索は1ページ目に入りやすいので、似た用語を2つまで名前に出す。
 */
export function wordTitle(w: WordlistEntry): string {
  const base = isWordLikeEntry(w)
    ? `${w.japanese}（${w.acronym}）とは？意味`
    : `${w.acronym}（${w.fullName}）とは？意味`;
  const confused = w.confusedWith.slice(0, TITLE_CONFUSED_MAX).map(displayName);
  return confused.length > 0 ? `${base}と${confused.join("・")}との違い` : `${base}と試験のポイント`;
}

/** 比較表に並べる似た用語（単語帳に載っているものだけ。載っていない語は表に出せる情報が無い）。 */
export function wordComparisonEntries(w: WordlistEntry): WordlistEntry[] {
  return w.confusedWith
    .map((name) => getWordByAcronym(name))
    .filter((x): x is WordlistEntry => x !== undefined && x.id !== w.id);
}

/**
 * 検索結果に出る説明文。似た用語があれば「AはX、BはY。見分けるポイントは…」から始め、
 * 比較の検索で「違いが書いてあるページだ」と分かるようにする。
 */
export function wordDescription(w: WordlistEntry): string {
  const other = wordComparisonEntries(w)[0];
  if (other) {
    const axis = w.differenceAxis ? `見分けるポイントは「${w.differenceAxis}」。` : "";
    // 英単語の見出しは日本語名が検索語なので、「AはX」と言い換えず日本語名どうしで並べる
    const pair =
      isWordLikeEntry(w) && isWordLikeEntry(other)
        ? `${w.japanese}（${w.acronym}）と${other.japanese}（${other.acronym}）の違い。`
        : `${w.acronym}は「${w.japanese}」、${other.acronym}は「${other.japanese}」。`;
    return `${pair}${axis}${w.oneLine} ITパスポート試験で問われるポイントとあわせて解説します。`;
  }
  return `${w.acronym}は「${w.japanese}」。${w.oneLine} ITパスポート試験で問われるポイントと、似た用語との見分け方をまとめています。`;
}

// ---- 1問で確認（WordMiniQuiz） -----------------------------------------------

export type WordMiniQuizChoice = {
  key: ChoiceKey;
  text: string;
  /** 選んだときに出す一言（誤答なら「それは何か」、正答なら意味）。 */
  note: string;
};

export type WordMiniQuizData = {
  prompt: string;
  choices: WordMiniQuizChoice[];
  correctKey: ChoiceKey;
  /** 正誤のあとに必ず出す一言。 */
  takeaway: string;
};

/** 語ごとに決まった並びにする（サーバーとブラウザで選択肢の順番がずれないように乱数は使わない）。 */
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 選択肢の文言（略語 or 日本語名）から、それが何かの一言を作る。 */
function choiceNote(w: WordlistEntry, text: string): string {
  if (text === w.acronym || text === w.japanese) return `${w.acronym}＝${w.japanese}。${w.oneLine}`;
  const trap = w.trapExplanations[text];
  if (trap) return trap;
  const other = getWordByAcronym(text) ?? getAllWords().find((x) => x.japanese === text);
  return other ? `${other.japanese}（${other.acronym}）。${other.oneLine}` : "";
}

/**
 * ページの最初に出す4択1問。似た用語がある語は「説明 → 略語」で似た用語と見分けさせ、
 * ない語は「略語 → 意味」を問う。選択肢づくりは単語帳アプリと同じ buildQuizQuestion を使う。
 */
export function wordMiniQuiz(w: WordlistEntry): WordMiniQuizData {
  const type = w.confusedWith.length > 0 ? "confusion" : "acronym_to_meaning";
  const q = buildQuizQuestion(w, type, seededRng(w.id));
  // 英単語の見出し（Hallucination）や単語帳に無い似た用語（リスティング広告）が並ぶときは「略語」と呼べない
  const allAcronyms = !isWordLikeEntry(w) && w.confusedWith.every((name) => getWordByAcronym(name));
  return {
    prompt: allAcronyms ? q.prompt : q.prompt.replace("略語は？", "用語は？"),
    choices: q.choices.map((c) => ({ ...c, note: choiceNote(w, c.text) })),
    correctKey: q.correctKey,
    takeaway: w.differenceAxis
      ? `見分けるポイントは「${w.differenceAxis}」。`
      : !isWordLikeEntry(w) && w.words.length > 0
        ? `${w.acronym}は ${w.words.map((p) => `${p.word}（${p.meaning}）`).join("・")} の頭文字です。`
        : `${w.acronym}は日本語で「${w.japanese}」です。`,
  };
}
