"use client";

// Today のトピック以外のタスク（関連用語・公式過去問）の「今日の分」の端末キャッシュ。
//
// 正はサーバの daily_study_tasks（lib/todayActivitySync）。ここは
//   - 初期表示を待たせないための即時表示
//   - 未ログイン・オフライン・API 失敗時のフォールバック
//   - サーバへまだ届いていない完了の控え（次に Today を開いたとき再送する）
// の役割だけを持つ。Today はサーバから取れたらサーバの内容で上書きする。
//
// 表示のための記録であって、学習の評価（進捗・合格準備度）には使わない。
// キーは fequest: プレフィクス（ログアウト・アカウント切替時にまとめて消える）。

import type { TodayActivity } from "@/types";
import { completeRemoteActivity } from "@/lib/todayActivitySync";

const STORAGE_KEY = "fequest:todayActivities:v1";

type StoredLog = {
  date: string;
  /** その日に Today へ出したタスク（id → 中身）。学習先の画面が完了記録に使う。 */
  offered: Record<string, TodayActivity>;
  /** 完了したタスク（id → 中身）。 */
  done: Record<string, TodayActivity>;
};

export type TodayActivityLog = {
  offered: Record<string, TodayActivity>;
  done: Record<string, TodayActivity>;
};

function localDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 旧形式（spec を持たない）の記録は、復元できないので読み捨てる。 */
function hasSpec(value: unknown): value is TodayActivity {
  return typeof value === "object" && value !== null && typeof (value as TodayActivity).spec === "object";
}

function clean(record: unknown): Record<string, TodayActivity> {
  if (typeof record !== "object" || record === null) return {};
  return Object.fromEntries(Object.entries(record).filter(([, value]) => hasSpec(value)));
}

function read(date: string): StoredLog {
  const empty: StoredLog = { date, offered: {}, done: {} };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as StoredLog;
    if (parsed?.date !== date) return empty;
    return { date, offered: clean(parsed.offered), done: clean(parsed.done) };
  } catch {
    return empty;
  }
}

function write(log: StoredLog): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // 保存できなくても、Today は毎回タスクを組み立て直せる。
  }
}

export function loadTodayActivityLog(date: string = localDate()): TodayActivityLog {
  const { offered, done } = read(date);
  return { offered, done };
}

/** サーバと突き合わせた結果でキャッシュを置き換える。 */
export function saveTodayActivityLog(log: TodayActivityLog, date: string = localDate()): void {
  write({ date, offered: log.offered, done: log.done });
}

/**
 * Today に出したタスクを記録する。同じ日のうちは最初に出した中身を保つ
 * （学習途中で対象の単語・問題が入れ替わらないように）。
 */
export function rememberOfferedActivities(activities: TodayActivity[], date: string = localDate()): void {
  const log = read(date);
  let changed = false;
  for (const activity of activities) {
    if (log.offered[activity.id] || log.done[activity.id]) continue;
    log.offered[activity.id] = activity;
    changed = true;
  }
  if (changed) write(log);
}

/**
 * 学習先の画面で実際にセッションを終えたときに呼ぶ（ページを開いただけでは呼ばない）。
 * 端末に完了を残し、サーバの daily_study_tasks も completed / app_actual にする。
 * Today から来ていない場合（task id が無い）は何もしない。
 */
export function markTodayActivityDone(taskId: string | null | undefined, date: string = localDate()): void {
  if (!taskId) return;
  const log = read(date);
  const activity = log.offered[taskId] ?? log.done[taskId];
  if (!activity) return;
  if (!log.done[taskId]) {
    log.done[taskId] = activity;
    write(log);
  }
  // 失敗しても、次に Today を開いたときに端末の完了を再送する。
  void completeRemoteActivity(date, activity);
}

/**
 * 部分演習で問題が決まったら、その日のタスクの中身にも残す
 * （Today に戻ってもう一度開いたとき、同じ問題で開けるように）。
 */
export function rememberDrillQuestions(taskId: string | null, questionIds: string[], date: string = localDate()): void {
  if (!taskId) return;
  const log = read(date);
  const activity = log.offered[taskId];
  if (!activity || activity.spec.kind !== "past_exam_drill") return;
  const url = new URL(activity.href, "http://local");
  url.searchParams.set("ids", questionIds.join(","));
  log.offered[taskId] = {
    ...activity,
    href: `${url.pathname}?${url.searchParams.toString()}`,
    spec: { ...activity.spec, questionIds },
  };
  write(log);
}
