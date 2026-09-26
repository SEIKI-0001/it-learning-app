// Today のトピック以外のタスク（関連用語・公式過去問）をまとめる（純粋関数）。
//
// 各タスクの中身は lib/todayVocab・lib/todayKakomon が決める。ここでは
//   - その日のうちに一度出したタスクは中身を固定する（学習途中で対象が入れ替わらない）
//   - その日に終えたタスクは出し直さない（1日1件/種類）
// の2点だけを足して、学習キュー（lib/learningLoop）へ渡す形にする。

import type { AppState, TodayActivity } from "@/types";
import type { Topic } from "@/types/content";
import type { TopicStage } from "@/types/studyProgress";
import type { WordProgressMap } from "@/lib/wordProgressModel";
import { daysUntilExam } from "@/lib/aiPlanner";
import { checkpointOrderOf } from "@/lib/kakomonAccess";
import { buildVocabActivity } from "@/lib/todayVocab";
import { buildKakomonActivities } from "@/lib/todayKakomon";

export type TodayActivityLogInput = {
  offered: Record<string, TodayActivity>;
  done: Record<string, TodayActivity>;
};

export type TodayActivitiesInput = {
  state: AppState;
  topics: Topic[];
  now: Date;
  budgetMinutes: number;
  wordProgress: WordProgressMap;
  topicStages: Record<string, TopicStage>;
  /** 今日のメニューに入りそうなトピック（学習キューのトピック候補の上位）。 */
  upcomingTopicIds: string[];
  log: TodayActivityLogInput;
};

export type TodayActivitiesResult = {
  /** これから取り組むタスク。 */
  active: TodayActivity[];
  /** 今日すでに終えたタスク（ルート上に「済み」として残す）。 */
  done: TodayActivity[];
  /**
   * 今日すでに Today に出した、まだ終えていないタスク。時間予算の再計算で
   * メニューから押し出されても、その日のうちはルートに残す（出したり消したりしない）。
   */
  pinned: TodayActivity[];
};

export function buildTodayActivities(input: TodayActivitiesInput): TodayActivitiesResult {
  const { state, topics, now, log } = input;
  const generated: TodayActivity[] = [];
  const vocab = buildVocabActivity({
    checkpointOrder: checkpointOrderOf(state.progress),
    wordProgress: input.wordProgress,
    topicStages: input.topicStages,
    upcomingTopicIds: input.upcomingTopicIds,
    now,
  });
  if (vocab) generated.push(vocab);
  generated.push(
    ...buildKakomonActivities({
      topics,
      progress: state.progress,
      answers: state.answers,
      daysRemaining: daysUntilExam(state.profile, now),
      budgetMinutes: input.budgetMinutes,
      now,
    }),
  );

  const active = generated
    .filter((activity) => !log.done[activity.id])
    // 今日すでに出したものは、そのときの中身（対象の単語・問題）を使い続ける。
    .map((activity) => log.offered[activity.id] ?? activity);
  return {
    active,
    done: Object.values(log.done),
    pinned: active.filter((activity) => Boolean(log.offered[activity.id])),
  };
}
