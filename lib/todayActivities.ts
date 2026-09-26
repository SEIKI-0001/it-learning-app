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
import { buildVocabActivity, vocabActivityFromSpec } from "@/lib/todayVocab";
import { buildKakomonActivities, kakomonActivityFromSpec } from "@/lib/todayKakomon";
import type { TodayActivitySpec } from "@/lib/todayActivitySpec";

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

  // その日に一度出した（サーバまたは端末に記録がある）未完了タスクは、その中身のまま出す。
  // 再計算で対象が変わっても入れ替えない（Today はその日の学習計画として固定）。
  const offered = Object.values(log.offered).filter((activity) => !log.done[activity.id]);
  const fresh = generated.filter((activity) => !log.done[activity.id] && !log.offered[activity.id]);
  return {
    active: [...offered, ...fresh],
    done: Object.values(log.done),
    pinned: offered,
  };
}

/** 保存済みの spec から Today のタスクを組み立て直す（別端末での復元）。 */
export function activityFromSpec(spec: TodayActivitySpec): TodayActivity | null {
  return spec.kind === "vocab" ? vocabActivityFromSpec(spec) : kakomonActivityFromSpec(spec);
}

/** サーバ（daily_study_tasks）から取った1件。lib/todayActivitySync の RemoteActivity と同じ形。 */
export type RemoteActivityState = {
  key: string;
  payload: TodayActivitySpec;
  done: boolean;
};

export type MergedActivityLog = TodayActivityLogInput & {
  /** 端末では完了したが、サーバにはまだ届いていない（再送する）もの。 */
  unsyncedDone: TodayActivity[];
};

/**
 * 端末のキャッシュとサーバの状態を突き合わせる（純粋関数）。
 *   - サーバから取れなかった（null）… 端末のキャッシュだけで続ける
 *   - サーバにあるタスク … サーバの中身（spec）を正として組み立て直す
 *   - 完了 … どちらかで完了していれば完了。端末だけの完了はサーバへ再送する
 *   - 端末にしか無い未完了タスク（オフライン中に出したもの）… 残す
 */
export function mergeActivityLogs(
  local: TodayActivityLogInput,
  remote: RemoteActivityState[] | null,
): MergedActivityLog {
  if (!remote) return { ...local, unsyncedDone: [] };
  const offered: Record<string, TodayActivity> = { ...local.offered };
  const done: Record<string, TodayActivity> = { ...local.done };
  const remoteDone = new Set<string>();
  for (const item of remote) {
    const activity = activityFromSpec(item.payload);
    if (!activity || activity.id !== item.key) continue;
    offered[activity.id] = activity;
    if (item.done) {
      done[activity.id] = activity;
      remoteDone.add(activity.id);
    }
  }
  const unsyncedDone = Object.values(local.done).filter((activity) => !remoteDone.has(activity.id));
  return { offered, done, unsyncedDone };
}
