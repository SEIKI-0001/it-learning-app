// 公開英略語ページ（/words）のパスと表示文言。
// データは lib/wordlist（data/wordlist/itpassAcronyms.json が唯一の正）から読む。

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

/** 例: "KPI（Key Performance Indicator）とは？意味とKGIとの違い"、"Zero Trust（ゼロトラスト）とは？…"。 */
export function wordTitle(w: WordlistEntry): string {
  const paren = isWordLikeEntry(w) ? w.japanese : w.fullName;
  const base = `${w.acronym}（${paren}）とは？意味`;
  const confused = w.confusedWith[0];
  return confused ? `${base}と${confused}との違い` : `${base}と試験のポイント`;
}

export function wordDescription(w: WordlistEntry): string {
  return `${w.acronym}は「${w.japanese}」。${w.oneLine} ITパスポート試験で問われるポイントと、似た用語との見分け方をまとめています。`;
}
