// Today に出す「用語を4択で確認する」タスクを1件だけ決める（純粋関数）。
//
// Today の単語タスクは必ず4択（/glossary/quiz?mode=task）で解き、実際の正誤を記録する。
// 「覚えた」を自己申告するカード学習（/glossary/study）は単語帳の自由学習にだけ残す
// （Today はユーザーの現在地を測って次の推薦につなげる場所なので、客観的な正誤を使う）。
//
// 分量: 1語=1問=約15秒。最大20語（約5分）まで。候補が少なければ少ないまま出す
// （20語にするために無関係な単語で水増ししない）。
//
// 方針（毎日必ず単語帳5分、にはしない）:
//   - CP0〜1（全体像把握まで）は出さない。
//   - 高優先: 確認パックが用語定着待ち（terms_stabilizing）のトピックの関連語
//             → そのトピックを先へ進めるための課題なので、Primary 候補にもなる。
//             まずそのトピックの関連語をすべて入れ、枠が余れば 期限到来語 → 苦手語 →
//             他の今日のトピックの関連語 の順で足す。
//   - 次点  : 復習期限が来た単語 → 苦手（weak）の単語。
//   - 中優先: 今日学ぶトピック（upcomingTopicIds の順）に紐づく、まだ学んでいない関連語
//             （CP2〜3 のみ。複数トピックから集める）。
//             CP4 以降は新しい単語を増やさず、期限・苦手・定着不足だけを出す。
//   - 対象が無ければ null（Today に出さない）。
//
// トピックと単語の関連付けは data/topicWordLinks（Single Source of Truth）を使う。
// 確認パックの有無とは独立（確認パックの用語ステップも同じ表を参照している）。
//
// タスクは「spec（復元に必要な最小限の中身）→ TodayActivity」の順に組み立てる。
// 出題する単語は spec.wordIds がすべて（4択の問題データは別に持たない）。
// 別端末では保存済みの spec から vocabActivityFromSpec() で同じタスクを作り直す。

import type { TodayActivity } from "@/types";
import type { TopicStage } from "@/types/studyProgress";
import type { WordProgressMap } from "@/lib/wordProgressModel";
import type { VocabSpec } from "@/lib/todayActivitySpec";
import { ACTIVITY_KEYS } from "@/lib/todayActivitySpec";
import { topicWordIds } from "@/data/topicWordLinks";
import { getAllWords, getWord } from "@/lib/wordlist";
import { getTopic } from "@/lib/content";
import { TODAY_ACTIVITY_PRIORITY } from "@/lib/learningLoop";

export const VOCAB_ACTIVITY_ID = ACTIVITY_KEYS.vocab;
/** Today の単語タスクの上限（1語15秒 × 20語 = 約5分）。 */
export const TODAY_VOCAB_MAX_WORDS = 20;
/** 4択1問あたりの目安秒数。 */
export const SECONDS_PER_VOCAB_QUIZ = 15;
/** 詳細行に並べる略語の数（残りは「ほかN語」にまとめる）。 */
const DETAIL_MAX = 6;

/** トピックの関連語（wordlist に実在するものだけ。関連語が無ければ空配列）。 */
export function relatedWordIdsForTopic(topicId: string): string[] {
  return topicWordIds(topicId).filter((id) => getWord(id) !== undefined);
}

function endOfLocalDay(now: Date): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * 語数から目安の分数。1語=15秒（4語で1分）・最低1分。
 * 1→1 / 4→1 / 8→2 / 12→3 / 16→4 / 20→5。
 */
export function vocabMinutes(count: number): number {
  return Math.max(1, Math.ceil((count * SECONDS_PER_VOCAB_QUIZ) / 60));
}

function detailOf(ids: string[]): string {
  const shown = ids.slice(0, DETAIL_MAX).map((id) => getWord(id)?.acronym ?? id).join(" / ");
  const rest = ids.length - DETAIL_MAX;
  return rest > 0 ? `${shown} ほか${rest}語` : shown;
}

/** Today から開く4択（指定した単語だけを1語1問で出す）。 */
function quizHref(ids: string[], topicId?: string): string {
  const params = new URLSearchParams({
    mode: "task",
    ids: ids.join(","),
    from: "today",
    task: VOCAB_ACTIVITY_ID,
  });
  if (topicId) params.set("topicId", topicId);
  return `/glossary/quiz?${params.toString()}`;
}

/** 出題語がすべてそのトピックの関連語か（「○○の関連用語」と名乗ってよいか）。 */
function onlyTopicWords(wordIds: string[], topicId: string): boolean {
  const related = new Set(relatedWordIdsForTopic(topicId));
  return wordIds.every((id) => related.has(id));
}

/** spec から Today のタスクを組み立てる（生成時も、別端末での復元時も同じ関数）。 */
export function vocabActivityFromSpec(spec: VocabSpec): TodayActivity | null {
  const wordIds = spec.wordIds.filter((id) => getWord(id) !== undefined);
  if (wordIds.length === 0) return null;
  const base = {
    id: VOCAB_ACTIVITY_ID,
    kind: "vocab" as const,
    detail: detailOf(wordIds),
    countLabel: `${wordIds.length}語`,
    estimatedMinutes: vocabMinutes(wordIds.length),
    spec: { ...spec, wordIds },
  };
  const topicTitle = spec.topicId ? getTopic(spec.topicId)?.title : undefined;
  // 「○○の関連用語」と出すのは、そのトピックの単語だけで組んだときに限る。
  const topicOnly = topicTitle !== undefined && onlyTopicWords(wordIds, spec.topicId!);

  if (spec.variant === "stabilizing") {
    if (!topicTitle) return null;
    return {
      ...base,
      title: topicOnly ? `${topicTitle}の関連用語を4択で確認` : "今日の重要用語を4択で確認",
      priority: TODAY_ACTIVITY_PRIORITY.termsStabilizing,
      reason: topicOnly
        ? "確認パックで用語がまだ定着していません。4択で確かめると次の段階へ進めます"
        : `確認パックで${topicTitle}の用語がまだ定着していません。その用語を中心に4択で確かめます`,
      href: quizHref(wordIds, spec.topicId),
      ctaLabel: "4択で確認する",
      primaryEligible: true,
    };
  }

  if (spec.variant === "related") {
    if (!topicTitle) return null;
    return {
      ...base,
      title: topicOnly ? `${topicTitle}の関連用語を4択で確認` : "関連用語を4択で確認",
      priority: TODAY_ACTIVITY_PRIORITY.wordsRelated,
      reason: "今日学ぶテーマに出てくる用語です。解説と確認問題のあとに4択で確かめます",
      href: quizHref(wordIds, spec.topicId),
      ctaLabel: "4択で確認する",
      primaryEligible: false,
      anchorTopicId: spec.topicId,
    };
  }

  const dueCount = spec.dueCount ?? 0;
  return {
    ...base,
    title: dueCount > 0 ? "今日の単語復習" : "苦手な用語を4択で復習",
    countLabel: dueCount === 0
      ? `苦手な${wordIds.length}語`
      : dueCount >= wordIds.length ? `期限が来た${wordIds.length}語` : `${wordIds.length}語`,
    priority: spec.late ? TODAY_ACTIVITY_PRIORITY.wordsReviewLate : TODAY_ACTIVITY_PRIORITY.wordsReview,
    reason: dueCount > 0
      ? "復習の期限が来た用語です。忘れかける前に4択で確かめます"
      : "前に間違えた用語です。4択でもう一度確かめます",
    href: quizHref(wordIds),
    ctaLabel: "4択で復習する",
    primaryEligible: false,
  };
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

/** 重複を除いて、上限まで順に積む。 */
function collect(...groups: string[][]): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const id of group) {
      if (picked.length >= TODAY_VOCAB_MAX_WORDS) return picked;
      if (seen.has(id)) continue;
      seen.add(id);
      picked.push(id);
    }
  }
  return picked;
}

/** 今日の単語タスクの spec を決める（対象が無ければ null）。 */
export function selectVocabSpec(input: VocabTaskInput): VocabSpec | null {
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

  const allIds = getAllWords().map((word) => word.id);
  const due = allIds.filter(isDue);
  const dueSet = new Set(due);
  const weak = allIds.filter((id) => map[id]?.status === "weak" && !dueSet.has(id));
  // 今日のトピック（upcomingTopicIds の順）の、まだ学んでいない関連語。新しい単語は CP2〜3 だけ。
  const upcomingUnlearned = order <= 3
    ? input.upcomingTopicIds
      .filter((topicId) => getTopic(topicId) !== undefined)
      .flatMap((topicId) => relatedWordIdsForTopic(topicId).filter((id) => !map[id]))
    : [];

  // 1. 用語定着待ちのトピック（今日のメニューに近いものを先に）。
  //    そのトピックの関連語をすべて入れ、枠が余れば 期限 → 苦手 → 他の今日のトピックの関連語。
  const upcomingRank = new Map(input.upcomingTopicIds.map((id, index) => [id, index]));
  const stabilizing = Object.entries(input.topicStages)
    .filter(([, stage]) => stage === "terms_stabilizing")
    .map(([topicId]) => topicId)
    .filter((topicId) => getTopic(topicId) !== undefined)
    .sort((a, b) =>
      (upcomingRank.get(a) ?? Infinity) - (upcomingRank.get(b) ?? Infinity) || a.localeCompare(b));
  for (const topicId of stabilizing) {
    const target = relatedWordIdsForTopic(topicId).filter(needsWork);
    if (target.length === 0) continue;
    const wordIds = collect(target, due, weak, upcomingUnlearned);
    return { kind: "vocab", variant: "stabilizing", wordIds, topicId };
  }

  // 2. 期限が来た単語 → 苦手な単語。
  const review = collect(due, weak);
  if (review.length > 0) {
    return {
      kind: "vocab",
      variant: "review",
      wordIds: review,
      dueCount: review.filter((id) => dueSet.has(id)).length,
      ...(order >= 5 ? { late: true } : {}),
    };
  }

  // 3. 今日のトピックの、まだ学んでいない関連語（CP2〜3 だけ。複数トピックから集める）。
  const related = collect(upcomingUnlearned);
  if (related.length > 0) {
    // 元トピック（Today のメニューでこのトピックの後に並ぶ）は、最初に語を出したトピック。
    const topicId = input.upcomingTopicIds.find((id) =>
      getTopic(id) !== undefined && relatedWordIdsForTopic(id).includes(related[0]))!;
    return { kind: "vocab", variant: "related", wordIds: related, topicId };
  }

  return null;
}

export function buildVocabActivity(input: VocabTaskInput): TodayActivity | null {
  const spec = selectVocabSpec(input);
  return spec ? vocabActivityFromSpec(spec) : null;
}
