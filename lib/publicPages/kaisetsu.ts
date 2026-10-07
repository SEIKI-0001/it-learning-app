// 公開テーマ別解説ページ（/kaisetsu）のデータ層（サーバ専用）。
//
// アプリの教材（data/topics のトピック）を、未ログインで読める読み物として出す。
// 「SWOT分析とは」「公開鍵暗号方式 わかりやすく」のような論点名の検索の入口で、
// そのテーマの公開過去問（/kakomon）と英略語（/words）へつなぐハブを兼ねる。
// 教材は無料で公開している（docs/operations/2026-09-first-ten-users.md）ので、本文をそのまま出してよい。
// 操作できる図解・3D模型はアプリ側にだけあり、ここからはアプリへの導線にする。

import { getAllTopics, getTopic } from "@/lib/content";
import { getAllKakomonQuestions, type KakomonQuestion } from "@/lib/publicPages/kakomon";
import { getAllWords, getWord, getWordByAcronym } from "@/lib/wordlist";
import { wordPath } from "@/lib/publicPages/words";
import { TOPIC_WORD_LINKS } from "@/data/topicWordLinks";
import { FIELD_LABELS, type Topic, type TopicField } from "@/types/content";
import type { WordlistEntry } from "@/types/wordlist";
import type { ChoiceKey } from "@/types";

export const KAISETSU_BASE_PATH = "/kaisetsu";

export const KAISETSU_FIELD_ORDER: TopicField[] = ["strategy", "management", "technology"];

export function kaisetsuPath(topicId: string): string {
  return `${KAISETSU_BASE_PATH}/${topicId}`;
}

export function getKaisetsuTopics(): Topic[] {
  return getAllTopics();
}

export function getKaisetsuTopic(id: string): Topic | null {
  return getTopic(id) ?? null;
}

/** 分野 → 中分類 → トピック（データの並び順を保つ）。 */
export function getKaisetsuTopicsByField(
  field: TopicField,
): { category: string; topics: Topic[] }[] {
  const groups = new Map<string, Topic[]>();
  for (const t of getAllTopics()) {
    if (t.field !== field) continue;
    groups.set(t.category, [...(groups.get(t.category) ?? []), t]);
  }
  return [...groups].map(([category, topics]) => ({ category, topics }));
}

// ---- 公開過去問との相互リンク ----------------------------------------------

let kakomonByTopic: Map<string, KakomonQuestion[]> | null = null;

/** そのテーマ（primaryTopicId）の公開過去問（新しい年度・問番号順）。 */
export function getKakomonForTopic(topicId: string): KakomonQuestion[] {
  if (!kakomonByTopic) {
    kakomonByTopic = new Map();
    for (const q of getAllKakomonQuestions()) {
      kakomonByTopic.set(q.view.topicId, [...(kakomonByTopic.get(q.view.topicId) ?? []), q]);
    }
  }
  return kakomonByTopic.get(topicId) ?? [];
}

const RELATED_KAKOMON_MAX = 10;

/**
 * 略語が独立した語として出てくるか。直前が英数字・漢字・かなのときは別の用語の一部とみなす
 * （"無線LAN" の LAN は LAN/WAN のテーマの問題ではない）。
 */
function standalone(acronym: string): RegExp {
  const escaped = acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}])${escaped}(?![A-Za-z0-9])`, "u");
}

/**
 * 主題の過去問が1問も無いテーマに出す「関連する過去問」。
 * 過去問は primaryTopicId だけで束ねているので、SWOT分析・PPM・HTTPS のように
 * 他テーマの問題の選択肢としてだけ出るテーマは過去問欄が空になる。そこを、取り違えの少ない一致だけで補う:
 * - 過去問のタグが、テーマの関連用語と完全に一致する
 * - テーマ名に入っている英略語（"SWOT分析" の SWOT）が、問題文か選択肢に単独の語として出てくる
 * 主題の過去問があるテーマでは空（そちらで足りるし、混ぜると「このテーマの問題」と誤読される）。
 */
export function getRelatedKakomonForTopic(topicId: string): KakomonQuestion[] {
  const t = getTopic(topicId);
  if (!t || getKakomonForTopic(topicId).length > 0) return [];
  const terms = new Set(t.relatedTerms ?? []);
  const titleAcronyms = getWordsForTopic(topicId)
    .map((w) => w.acronym)
    .filter((a) => standalone(a).test(t.title))
    .map(standalone);
  return getAllKakomonQuestions()
    .filter(
      (q) =>
        q.tags.some((tag) => terms.has(tag)) ||
        titleAcronyms.some((re) =>
          re.test([q.view.prompt, ...q.view.choices.map((c) => c.text)].join("\n")),
        ),
    )
    .slice(0, RELATED_KAKOMON_MAX);
}

// ---- 英略語との相互リンク --------------------------------------------------

/** そのテーマの関連英略語（data/topicWordLinks が正）。 */
export function getWordsForTopic(topicId: string): WordlistEntry[] {
  return (TOPIC_WORD_LINKS[topicId] ?? [])
    .map((id) => getWord(id))
    .filter((w): w is WordlistEntry => w !== undefined);
}

/** その英略語を関連語に持つテーマ。 */
export function getTopicsForWord(wordId: string): Topic[] {
  return getAllTopics().filter((t) => TOPIC_WORD_LINKS[t.id]?.includes(wordId));
}

/** 前提・次に学ぶテーマ（存在するものだけ）。 */
export function getLinkedTopics(ids: readonly string[] | undefined): Topic[] {
  return (ids ?? [])
    .map((id) => getTopic(id))
    .filter((t): t is Topic => t !== undefined);
}

/**
 * 関連用語のリンク先。英略語ページ（略語か日本語名が一致）→ 別テーマの解説（タイトルが一致）の順。
 * どちらにも無い語は null（本文中ではリンクなしの文字のまま出す）。
 */
export function relatedTermHref(term: string, selfTopicId: string): string | null {
  const word = getWordByAcronym(term) ?? getAllWords().find((w) => w.japanese === term);
  if (word) return wordPath(word.id);
  const topic = getAllTopics().find((x) => x.title === term && x.id !== selfTopicId);
  return topic ? kaisetsuPath(topic.id) : null;
}

// ---- 表示文言 ---------------------------------------------------------------

/** 例: "SWOT分析とは？わかりやすく解説【ITパスポート】"。 */
export function kaisetsuTitle(t: Topic): string {
  return `${t.title}とは？わかりやすく解説【ITパスポート】`;
}

/** 検索結果に出る説明文。一覧用の要約＋過去問の数。 */
export function kaisetsuDescription(t: Topic): string {
  const count = getKakomonForTopic(t.id).length + getRelatedKakomonForTopic(t.id).length;
  const kakomon = count > 0 ? `関連する公式過去問${count}問へのリンク付き。` : "";
  return `${FIELD_LABELS[t.field]}「${t.title}」をITパスポート試験向けに解説。${t.summary}たとえ・試験のポイント・間違えやすい点・確認問題をまとめています。${kakomon}`;
}

// ---- 確認問題 ---------------------------------------------------------------

export type KaisetsuQuiz = {
  id: string;
  prompt: string;
  /** 表示順に並べ替え済み。key は表示位置（A=ア…）。 */
  choices: { key: ChoiceKey; text: string }[];
  correctChoice: ChoiceKey;
  explanation: string;
};

const DISPLAY_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

function stableHash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * 教材の確認問題（アプリ独自問題のみ）。
 * 教材データは正解が常に先頭（A）なので、そのまま出すと「全部アが正解」になる。
 * 問題 id から決まる位置へ正解を移し、ほかの選択肢は元の順のまま詰める（ビルドごとに変わらない）。
 */
export function getKaisetsuQuizzes(t: Topic): KaisetsuQuiz[] {
  return t.checkQuestions
    .filter((q) => !q.official && q.choices.length === DISPLAY_KEYS.length)
    .map((q) => {
      const correct = q.choices.find((c) => c.key === q.correctChoice)!;
      const others = q.choices.filter((c) => c.key !== q.correctChoice);
      const at = stableHash(q.id) % DISPLAY_KEYS.length;
      const ordered = [...others.slice(0, at), correct, ...others.slice(at)];
      return {
        id: q.id,
        prompt: q.prompt,
        choices: ordered.map((c, i) => ({ key: DISPLAY_KEYS[i], text: c.text })),
        correctChoice: DISPLAY_KEYS[at],
        explanation: q.explanation,
      };
    });
}
