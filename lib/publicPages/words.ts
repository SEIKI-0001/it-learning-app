// 公開英略語ページ（/words）のパスと表示文言。
// データは lib/wordlist（data/wordlist/itpassAcronyms.json が唯一の正）から読む。

import { getWordByAcronym } from "@/lib/wordlist";
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
 * 例: "RPO（Recovery Point Objective）とは？意味とRTO・BCPとの違い"、"Zero Trust（ゼロトラスト）とは？…"。
 * 「RPO RTO 違い」のような比較の検索は1ページ目に入りやすいので、似た用語を2つまで名前に出す。
 */
export function wordTitle(w: WordlistEntry): string {
  const paren = isWordLikeEntry(w) ? w.japanese : w.fullName;
  const base = `${w.acronym}（${paren}）とは？意味`;
  const confused = w.confusedWith.slice(0, TITLE_CONFUSED_MAX);
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
    return `${w.acronym}は「${w.japanese}」、${other.acronym}は「${other.japanese}」。${axis}${w.oneLine} ITパスポート試験で問われるポイントとあわせて解説します。`;
  }
  return `${w.acronym}は「${w.japanese}」。${w.oneLine} ITパスポート試験で問われるポイントと、似た用語との見分け方をまとめています。`;
}
