"use client";

// Today のトピック以外のタスク（関連用語・公式過去問）の「今日の分」を端末に記録する。
//
// トピック学習は「今日そのトピックに解答したか」で完了が分かるが、単語や過去問の部分演習は
// 対象が毎回の再計算で入れ替わる（例: 単語を学ぶと期限が先へ延び、別の単語が期限切れになる）。
// そこで、Today で出したタスクの中身をその日のうちは固定し、学習先の画面で終えたら
// 完了として残す。完了したタスクは同じ日にもう一度は出さない（1日1件/種類）。
//
// 表示のための記録であって、学習の評価（進捗・合格準備度）には使わない。
// キーは fequest: プレフィクス（ログアウト・アカウント切替時にまとめて消える）。

import type { TodayActivity } from "@/types";

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

function read(date: string): StoredLog {
  const empty: StoredLog = { date, offered: {}, done: {} };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as StoredLog;
    if (parsed?.date !== date || typeof parsed.offered !== "object" || typeof parsed.done !== "object") {
      return empty;
    }
    return parsed;
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

/** 学習先の画面で終えたときに呼ぶ。Today から来ていない場合（task id が無い）は何もしない。 */
export function markTodayActivityDone(taskId: string | null | undefined, date: string = localDate()): void {
  if (!taskId) return;
  const log = read(date);
  const activity = log.offered[taskId];
  if (!activity || log.done[taskId]) return;
  log.done[taskId] = activity;
  write(log);
}
