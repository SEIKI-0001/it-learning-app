"use client";

// Today のトピック以外のタスクを daily_study_tasks（サーバの正）と同期するクライアント。
// 失敗・未ログインでは null / false を返すだけで、画面は端末のキャッシュ
// （lib/todayActivityLog）で動き続ける。

import type { TodayActivity } from "@/types";
import { getUserId } from "@/lib/userSession";
import {
  ACTIVITY_KEYS,
  toActivityPayload,
  type TodayActivityKey,
  type TodayActivitySpec,
} from "@/lib/todayActivitySpec";

export type RemoteActivity = {
  key: TodayActivityKey;
  payload: TodayActivitySpec;
  done: boolean;
};

async function post(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const userId = getUserId();
  if (!userId) return null;
  try {
    const res = await fetch("/api/daily-tasks/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...body }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

function remoteList(data: Record<string, unknown> | null): RemoteActivity[] | null {
  return data && Array.isArray(data.activities) ? (data.activities as RemoteActivity[]) : null;
}

/** 保存する中身（表示文言のうち title・目安時間・理由だけを一覧用に添える）。 */
export function activityRowInput(activity: TodayActivity) {
  return {
    key: ACTIVITY_KEYS[activity.kind],
    payload: toActivityPayload(activity.spec),
    title: activity.title,
    estimatedMinutes: activity.estimatedMinutes,
    topicId: activity.anchorTopicId ?? (activity.spec.kind === "vocab" ? activity.spec.topicId : undefined),
    reason: activity.reason,
  };
}

/** その日のタスクをサーバから取る（未ログイン・失敗は null）。 */
export async function fetchRemoteActivities(date: string): Promise<RemoteActivity[] | null> {
  return remoteList(await post({ action: "list", date }));
}

/** Today に初めて出したタスクを保存し、保存後のサーバ状態を返す（失敗は null）。 */
export async function offerRemoteActivities(
  date: string,
  activities: TodayActivity[],
): Promise<RemoteActivity[] | null> {
  if (activities.length === 0) return null;
  return remoteList(await post({ action: "offer", date, activities: activities.map(activityRowInput) }));
}

/** 学習先で実際に終えたときに完了（app_actual）にする。成否を返す。 */
export async function completeRemoteActivity(date: string, activity: TodayActivity): Promise<boolean> {
  const data = await post({
    action: "complete",
    date,
    key: ACTIVITY_KEYS[activity.kind],
    activity: activityRowInput(activity),
  });
  return data !== null;
}

/**
 * 部分演習で選んだ問題をその日のタスクに固定する。既に別端末で固定済みなら、その問題を返す。
 * 未ログイン・失敗は null（呼び出し側は自分で選んだ問題で続ける）。
 */
export async function attachDrillQuestions(date: string, questionIds: string[]): Promise<string[] | null> {
  const data = await post({ action: "attach", date, key: ACTIVITY_KEYS.past_exam_drill, questionIds });
  return data && Array.isArray(data.questionIds) ? (data.questionIds as string[]) : null;
}
