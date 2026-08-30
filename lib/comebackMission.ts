// 復帰ミッション（GF-P1-002・純関数・保存なし）。
//
// 数日空いたユーザーに、いきなり山積みの未完了タスクを見せない。
// 過去に学んだ内容から3〜5分で終わる短い確認だけを出し、そこから通常学習へ戻す。
//
// 守る約束:
//   - 責めない。空いた日数を事実として一度示すだけで、失敗や遅れとして扱わない。
//   - ペナルティを持たない。やらなくても、途中でやめても失うものがない。
//   - 保存しない。表示のたびに導出するだけ。

import type { AppState } from "@/types";
import { getTopic } from "@/lib/content";
import { getLessonLocation } from "@/lib/learningCatalog";

const DAY_MS = 86_400_000;

/** 何日空いたら復帰扱いにするか。 */
export const COMEBACK_MIN_DAYS_AWAY = 2;

/** 復帰ミッションに載せる最大件数（3〜5分で終わる分量）。 */
export const COMEBACK_MISSION_SIZE = 2;

export type ComebackItem = {
  topicId: string;
  title: string;
  estimatedMinutes: number;
};

export type ComebackMission = {
  /** 最後の学習から空いた日数。 */
  daysAway: number;
  items: ComebackItem[];
  totalMinutes: number;
};

/** 最後に学習してから空いた日数。学習履歴が無ければ null。 */
export function getDaysAway(state: AppState, now: Date = new Date()): number | null {
  const lastPlayedAt = state.progress.lastPlayedAt;
  if (!lastPlayedAt) return null;
  const last = Date.parse(lastPlayedAt);
  if (!Number.isFinite(last)) return null;
  return Math.max(0, Math.floor((now.getTime() - last) / DAY_MS));
}

/**
 * 復帰ミッションを組み立てる。対象外なら null。
 *
 * 出題は「すでに完了したトピック」からだけ選ぶ。久しぶりの再開でいきなり
 * 新しい内容に当たると戻りにくいため、まず思い出せるものから触れてもらう。
 * 直近に完了したものより、しばらく触れていないものを優先する。
 */
export function buildComebackMission(input: {
  state: AppState;
  now?: Date;
}): ComebackMission | null {
  const { state } = input;
  const now = input.now ?? new Date();

  const daysAway = getDaysAway(state, now);
  if (daysAway === null || daysAway < COMEBACK_MIN_DAYS_AWAY) return null;

  // トピックごとの最終解答日。古いものから順に思い出す。
  const lastAnsweredAt = new Map<string, string>();
  for (const answer of state.answers) {
    if (!answer.topicId) continue;
    const current = lastAnsweredAt.get(answer.topicId);
    if (!current || answer.answeredAt > current) {
      lastAnsweredAt.set(answer.topicId, answer.answeredAt);
    }
  }

  const items: ComebackItem[] = state.progress.completedTopics
    .flatMap((topicId) => {
      const topic = getTopic(topicId);
      if (!topic || !getLessonLocation(topicId)) return [];
      return [{ topicId, topic, at: lastAnsweredAt.get(topicId) ?? "" }];
    })
    .sort((a, b) => a.at.localeCompare(b.at) || a.topicId.localeCompare(b.topicId))
    .slice(0, COMEBACK_MISSION_SIZE)
    .map(({ topicId, topic }) => ({
      topicId,
      title: topic.title,
      estimatedMinutes: topic.estimatedMinutes,
    }));

  if (items.length === 0) return null;

  return {
    daysAway,
    items,
    totalMinutes: items.reduce((sum, item) => sum + item.estimatedMinutes, 0),
  };
}
