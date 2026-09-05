// 復帰ミッション（GF-P1-002・純関数・保存なし）。
//
// 数日空いたユーザーに、いきなり山積みの未完了タスクを見せない。
// 過去に学んだ内容から3〜5分で終わる短い確認だけを出し、そこから通常学習へ戻す。
// 分量は件数ではなく COMEBACK_TARGET_MINUTES で決める（件数固定だと通常の学習量になる）。
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

/**
 * 復帰ルートの所要時間の上限（分）。GF-P1-002「3〜5分の復帰ルートを提示する」。
 *
 * 件数ではなくこの分数が主制約。件数で固定すると、1件8分のトピックが2件選ばれて
 * 通常の学習量と変わらない分量になってしまう（実測15分）。
 */
export const COMEBACK_TARGET_MINUTES = 5;

/**
 * 件数の上限。分数が主制約なので通常は先に予算で頭打ちになるが、
 * ごく短い単位が増えたときに一覧が長くなりすぎないための保険。
 */
export const COMEBACK_MAX_ITEMS = 3;

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

  // 候補は「しばらく触れていない完了済みトピック」を古い順に。
  const candidates: ComebackItem[] = state.progress.completedTopics
    .flatMap((topicId) => {
      const topic = getTopic(topicId);
      if (!topic || !getLessonLocation(topicId)) return [];
      return [{ topicId, topic, at: lastAnsweredAt.get(topicId) ?? "" }];
    })
    .sort((a, b) => a.at.localeCompare(b.at) || a.topicId.localeCompare(b.topicId))
    .map(({ topicId, topic }) => ({
      topicId,
      title: topic.title,
      estimatedMinutes: topic.estimatedMinutes,
    }));

  if (candidates.length === 0) return null;

  // 予算に収まるものを古い順に詰める。
  const items: ComebackItem[] = [];
  let total = 0;
  for (const candidate of candidates) {
    if (items.length >= COMEBACK_MAX_ITEMS) break;
    if (total + candidate.estimatedMinutes > COMEBACK_TARGET_MINUTES) continue;
    items.push(candidate);
    total += candidate.estimatedMinutes;
  }

  // フォールバック: 予算に収まる単位が1つも無い場合（学習単位が5分より大きいとき）は、
  // いちばん短いものを1件だけにする。復帰直後に通常どおりの学習量を強制しないための
  // 歯止めなので、ここでは「古い順」より「短い順」を優先する。
  // 同じ長さが並ぶときは candidates が古い順なので、そのまま古い方が残る。
  if (items.length === 0) {
    const shortest = candidates.reduce((best, candidate) =>
      candidate.estimatedMinutes < best.estimatedMinutes ? candidate : best,
    );
    items.push(shortest);
    total = shortest.estimatedMinutes;
  }

  return {
    daysAway,
    items,
    totalMinutes: total,
  };
}
