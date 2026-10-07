// 公開過去問ページ（/kakomon）のデータ層（サーバ専用）。
//
// 未ログインでも読める SEO 向けの入口。出すのは「公式過去問・published・100問そろった年度」だけで、
// アプリ内の年度別演習（/past-exams/[year]）と同じ条件に揃える。アプリ独自問題は出さない。
// 表示用の形は年度別演習と同じ toPastExamQuestionView を使う（図表の実寸読みを含むのでサーバ専用）。

import { getTopic } from "@/lib/content";
import { formatJapaneseExamYear } from "@/lib/pastExam/yearLabel";
import { toPastExamQuestionView, type PastExamQuestionView } from "@/lib/pastExam/viewModel";
import {
  getPlayableOfficialExamYears,
  getPublishedOfficialQuestionsByYear,
} from "@/lib/questionBank";
import { getAllWords } from "@/lib/wordlist";
import type { QuestionRecord } from "@/types/questionBank";
import type { WordlistEntry } from "@/types/wordlist";

export const KAKOMON_BASE_PATH = "/kakomon";

export function kakomonYearPath(year: number): string {
  return `${KAKOMON_BASE_PATH}/${year}`;
}

export function kakomonQuestionPath(year: number, questionNumber: number): string {
  return `${KAKOMON_BASE_PATH}/${year}/${questionNumber}`;
}

export type KakomonQuestion = {
  view: PastExamQuestionView;
  /** 論点ラベル（tags の先頭）。タイトルと一覧の見出しに使う。 */
  topicLabel: string;
  tags: string[];
  path: string;
};

function toKakomonQuestion(record: QuestionRecord): KakomonQuestion {
  const view = toPastExamQuestionView(record);
  return {
    view,
    topicLabel: record.tags[0] ?? getTopic(record.primaryTopicId)?.title ?? "",
    tags: record.tags,
    path: kakomonQuestionPath(view.year, view.questionNumber),
  };
}

/** 公開する年度（新しい順）。 */
export function getKakomonYears(): number[] {
  return getPlayableOfficialExamYears();
}

const byYear = new Map<number, KakomonQuestion[]>();

/** その年度の公開問題（問番号順）。公開対象外の年度は空配列。 */
export function getKakomonQuestionsByYear(year: number): KakomonQuestion[] {
  if (!getKakomonYears().includes(year)) return [];
  let list = byYear.get(year);
  if (!list) {
    list = getPublishedOfficialQuestionsByYear(year).map(toKakomonQuestion);
    byYear.set(year, list);
  }
  return list;
}

export function getAllKakomonQuestions(): KakomonQuestion[] {
  return getKakomonYears().flatMap(getKakomonQuestionsByYear);
}

export function getKakomonQuestion(year: number, questionNumber: number): KakomonQuestion | null {
  return (
    getKakomonQuestionsByYear(year).find((q) => q.view.questionNumber === questionNumber) ?? null
  );
}

/** 同じ年度の前後の問題。 */
export function getAdjacentKakomon(q: KakomonQuestion): {
  prev: KakomonQuestion | null;
  next: KakomonQuestion | null;
} {
  const list = getKakomonQuestionsByYear(q.view.year);
  const i = list.findIndex((x) => x.view.id === q.view.id);
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

/** 同じトピックの他年度・他の問（新しい年度から最大 limit 件）。 */
export function getRelatedKakomon(q: KakomonQuestion, limit = 5): KakomonQuestion[] {
  return getAllKakomonQuestions()
    .filter((x) => x.view.topicId === q.view.topicId && x.view.id !== q.view.id)
    .slice(0, limit);
}

// ---- 英略語との相互リンク ----------------------------------------------------

/** 略語が英数字の一部としてではなく、単独の語として出てくるか（"IP" が "IPv6" や "ZIP" に当たらない）。 */
function acronymPattern(acronym: string): RegExp {
  const escaped = acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`);
}

function questionText(q: KakomonQuestion): string {
  return [q.view.prompt, ...q.view.choices.map((c) => c.text), q.view.explanation].join("\n");
}

let wordIndex: { byQuestion: Map<string, WordlistEntry[]>; byWord: Map<string, KakomonQuestion[]> } | null =
  null;

function getWordIndex() {
  if (wordIndex) return wordIndex;
  const byQuestion = new Map<string, WordlistEntry[]>();
  const byWord = new Map<string, KakomonQuestion[]>();
  const words = getAllWords().map((w) => ({ w, re: acronymPattern(w.acronym) }));
  for (const q of getAllKakomonQuestions()) {
    const text = questionText(q);
    for (const { w, re } of words) {
      if (!re.test(text)) continue;
      byQuestion.set(q.view.id, [...(byQuestion.get(q.view.id) ?? []), w]);
      byWord.set(w.id, [...(byWord.get(w.id) ?? []), q]);
    }
  }
  wordIndex = { byQuestion, byWord };
  return wordIndex;
}

/** 問題文・選択肢・解説に出てくる英略語。 */
export function getWordsInKakomon(q: KakomonQuestion): WordlistEntry[] {
  return getWordIndex().byQuestion.get(q.view.id) ?? [];
}

/** その英略語が出てくる公開過去問（新しい年度・問番号順）。 */
export function getKakomonForWord(wordId: string): KakomonQuestion[] {
  return getWordIndex().byWord.get(wordId) ?? [];
}

// ---- 表示文言 ---------------------------------------------------------------

export function kakomonYearLabel(year: number): string {
  return formatJapaneseExamYear(year);
}

/** 例: "令和7年度 ITパスポート 問26「売掛金」の解説"。 */
export function kakomonQuestionTitle(q: KakomonQuestion): string {
  const base = `${kakomonYearLabel(q.view.year)} ITパスポート 問${q.view.questionNumber}`;
  return q.topicLabel ? `${base}「${q.topicLabel}」の解説` : `${base}の解説`;
}

/**
 * 検索結果に出す title。h1（kakomonQuestionTitle）とは分ける。
 * 例: "ITパスポート過去問 令和7年度 問26「売掛金」正解と解説"。
 * 「過去問」は検索語としてよく打たれるのに h1 には無いので先頭に置き、
 * 末尾は「正解と解説」にして答え合わせ目的の人に中身が伝わるようにする。
 */
export function kakomonQuestionSeoTitle(q: KakomonQuestion): string {
  const base = `ITパスポート過去問 ${kakomonYearLabel(q.view.year)} 問${q.view.questionNumber}`;
  return q.topicLabel ? `${base}「${q.topicLabel}」正解と解説` : `${base} 正解と解説`;
}

/**
 * 検索結果に出る説明文。問題文を先頭に置く。
 * 流入の多くは問題文をそのまま打った検索で、Google は一致した部分を太字にするため、
 * 冒頭が問題文だと「探していた問題だ」と一目で分かる（旧版は年度・問番号が先で問題文が後ろに切れていた）。
 * 正解の記号は載せない（検索結果だけで用が済み、解説まで読まれなくなるため）。
 */
export function kakomonQuestionDescription(q: KakomonQuestion): string {
  const head = q.view.prompt.replace(/\s+/g, " ").trim();
  const excerpt = head.length > 80 ? `${head.slice(0, 80)}…` : head;
  return `${excerpt}（${kakomonYearLabel(q.view.year)} ITパスポート試験 問${q.view.questionNumber}）正解と、なぜその選択肢になるのかの解説付き。`;
}
