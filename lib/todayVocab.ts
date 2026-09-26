// Today に出す「用語を固める」タスクを1件だけ決める（純粋関数）。
//
// 方針（毎日必ず単語帳5分、にはしない）:
//   - CP0〜1（全体像把握まで）は出さない。
//   - 高優先: 確認パックが用語定着待ち（terms_stabilizing）のトピックの関連語
//             → そのトピックを先へ進めるための課題なので、Primary 候補にもなる。
//   - 次点  : 復習期限が来た単語・苦手（weak）の単語。
//   - 中優先: 今日学ぶトピックに紐づく、まだ学んでいない関連語（CP2〜3 のみ）。
//             CP4 以降は新しい単語を増やさず、期限・苦手・定着不足だけを出す。
//   - 対象が無ければ null（Today に出さない）。
//
// トピックと単語の関連付けは確認パックの flashcardIds だけを使う（別のマッピングは作らない）。
// 確認パック本体（lib/checkPack）は問題バンクを読み込むので、ここではデータだけを参照する。

import type { TodayActivity } from "@/types";
import type { TopicStage } from "@/types/studyProgress";
import type { WordProgressMap } from "@/lib/wordProgressModel";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import { getAllWords, getWord } from "@/lib/wordlist";
import { getTopic } from "@/lib/content";
import { TODAY_ACTIVITY_PRIORITY } from "@/lib/learningLoop";

export const VOCAB_ACTIVITY_ID = "act:vocab";
/** 関連語は1回3〜5語。 */
const RELATED_MAX = 5;
/** 復習語・苦手語は1セッション（単語帳の SESSION_SIZE と同じ8語）まで。 */
const REVIEW_MAX = 8;

const PACK_WORDS_BY_TOPIC = new Map(
  topicCheckPacks.map((pack) => [
    pack.topicId,
    pack.flashcardIds.filter((id) => getWord(id) !== undefined),
  ]),
);

/** 確認パック上のトピックの関連語（wordlist に実在するものだけ）。 */
export function relatedWordIdsForTopic(topicId: string): string[] {
  return PACK_WORDS_BY_TOPIC.get(topicId) ?? [];
}

function endOfLocalDay(now: Date): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** 語数から目安の分数（1語あたり約40秒・最低2分）。 */
export function vocabMinutes(count: number): number {
  return Math.max(2, Math.ceil(count * 0.6));
}

function acronyms(ids: string[]): string {
  return ids.map((id) => getWord(id)?.acronym ?? id).join(" / ");
}

function studyHref(ids: string[], topicId?: string): string {
  const params = new URLSearchParams({
    mode: "task",
    ids: ids.join(","),
    from: "today",
    task: VOCAB_ACTIVITY_ID,
  });
  if (topicId) params.set("topicId", topicId);
  return `/glossary/study?${params.toString()}`;
}

export type VocabTaskInput = {
  /** 現在の CP 番号（不明なら null）。 */
  checkpointOrder: number | null;
  wordProgress: WordProgressMap;
  /** 確認パックのトピック別ステージ（lib/topicStageCache）。 */
  topicStages: Record<string, TopicStage>;
  /** 今日のメニューに入りそうなトピック（優先度順）。関連語を選ぶのに使う。 */
  upcomingTopicIds: string[];
  now: Date;
};

export function buildVocabActivity(input: VocabTaskInput): TodayActivity | null {
  const order = input.checkpointOrder ?? 0;
  if (order < 2) return null;

  const map = input.wordProgress;
  const limit = endOfLocalDay(input.now);
  const isDue = (id: string) => {
    const p = map[id];
    return p?.nextReviewAt != null && p.nextReviewAt <= limit;
  };
  const needsWork = (id: string) => {
    const p = map[id];
    return !p || p.status !== "mastered" || isDue(id);
  };

  // 1. 用語定着待ちのトピック（今日のメニューに近いものを先に）。
  const upcomingRank = new Map(input.upcomingTopicIds.map((id, index) => [id, index]));
  const stabilizing = Object.entries(input.topicStages)
    .filter(([, stage]) => stage === "terms_stabilizing")
    .map(([topicId]) => topicId)
    .filter((topicId) => getTopic(topicId) !== undefined)
    .sort((a, b) =>
      (upcomingRank.get(a) ?? Infinity) - (upcomingRank.get(b) ?? Infinity) || a.localeCompare(b));
  for (const topicId of stabilizing) {
    const ids = relatedWordIdsForTopic(topicId).filter(needsWork).slice(0, RELATED_MAX);
    if (ids.length === 0) continue;
    const title = getTopic(topicId)?.title ?? "";
    return {
      id: VOCAB_ACTIVITY_ID,
      kind: "vocab",
      title: `${title}の関連用語を固める`,
      detail: acronyms(ids),
      countLabel: `${ids.length}語`,
      estimatedMinutes: vocabMinutes(ids.length),
      priority: TODAY_ACTIVITY_PRIORITY.termsStabilizing,
      reason: "確認パックで用語がまだ定着していません。用語を固めると次の段階へ進めます",
      href: studyHref(ids, topicId),
      ctaLabel: "関連用語を固める",
      primaryEligible: true,
    };
  }

  // 2. 期限が来た単語 → 苦手な単語。
  const allIds = getAllWords().map((word) => word.id);
  const due = allIds.filter(isDue);
  const dueSet = new Set(due);
  const weak = allIds.filter((id) => map[id]?.status === "weak" && !dueSet.has(id));
  const review = [...due, ...weak].slice(0, REVIEW_MAX);
  if (review.length > 0) {
    const dueCount = review.filter((id) => dueSet.has(id)).length;
    return {
      id: VOCAB_ACTIVITY_ID,
      kind: "vocab",
      title: dueCount > 0 ? "今日の単語復習" : "苦手な用語を固める",
      detail: acronyms(review),
      countLabel: dueCount > 0 ? `期限が来た${review.length}語` : `苦手な${review.length}語`,
      estimatedMinutes: vocabMinutes(review.length),
      priority: order >= 5
        ? TODAY_ACTIVITY_PRIORITY.wordsReviewLate
        : TODAY_ACTIVITY_PRIORITY.wordsReview,
      reason: dueCount > 0
        ? "復習の期限が来た用語です。忘れかける前に確認します"
        : "前に間違えた用語です。短く確認して定着させます",
      href: studyHref(review),
      ctaLabel: "用語を確認する",
      primaryEligible: false,
    };
  }

  // 3. 今日のトピックの、まだ学んでいない関連語（CP2〜3 だけ）。
  if (order <= 3) {
    for (const topicId of input.upcomingTopicIds) {
      const ids = relatedWordIdsForTopic(topicId).filter((id) => !map[id]).slice(0, RELATED_MAX);
      if (ids.length === 0) continue;
      const title = getTopic(topicId)?.title ?? "";
      return {
        id: VOCAB_ACTIVITY_ID,
        kind: "vocab",
        title: `${title}の関連用語を確認`,
        detail: acronyms(ids),
        countLabel: `${ids.length}語`,
        estimatedMinutes: vocabMinutes(ids.length),
        priority: TODAY_ACTIVITY_PRIORITY.wordsRelated,
        reason: "今日学ぶテーマに出てくる用語です。解説と確認問題のあとに押さえます",
        href: studyHref(ids, topicId),
        ctaLabel: "関連用語を確認する",
        primaryEligible: false,
        anchorTopicId: topicId,
      };
    }
  }

  return null;
}
