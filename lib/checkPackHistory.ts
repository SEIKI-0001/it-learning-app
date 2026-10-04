"use client";

// 確認パックを「解き終えたことがあるか」を後から見返すための記録（クライアント）。
//
// 正式な記録はサーバ（topic_check_pack_attempts）。ただし未ログイン・保存失敗の回は
// サーバに残らないので、解き終えた時点で端末にも残し、表示時に両方を合わせる。
// ここは「受けたかどうか・前回の結果」を見せるためだけに使い、stage・合格準備度は動かさない。
//
// キーは fequest: プレフィクス（ログアウト・アカウント切替時にまとめて消える）。

import type { CheckPackResultStatus } from "@/types/checkPack";
import { getUserId } from "@/lib/userSession";
import {
  mergeCheckPackHistoryEntry,
  type CheckPackHistoryEntry,
  type CheckPackHistoryMap,
} from "@/lib/checkPackHistorySummary";

const STORAGE_KEY = "fequest:checkPackHistory:v1";

function read(): CheckPackHistoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as CheckPackHistoryMap) : {};
  } catch {
    return {};
  }
}

function write(map: CheckPackHistoryMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 見返し用の表示なので、保存できなくても学習は止めない。
  }
}

/** 端末に残っている記録（即時表示用）。 */
export function loadLocalCheckPackHistory(topicId: string): CheckPackHistoryEntry | null {
  return read()[topicId] ?? null;
}

/** 確認パックを最後まで解き終えたときに1回だけ呼ぶ。 */
export function recordCheckPackCompletion(
  topicId: string,
  result: {
    completedAt: string;
    resultStatus: CheckPackResultStatus;
    quizRate: number | null;
    flashcardRate: number | null;
    examLevelRate: number | null;
  },
): void {
  const map = read();
  const prev = map[topicId];
  map[topicId] = {
    lastCompletedAt: result.completedAt,
    lastResultStatus: result.resultStatus,
    quizRate: result.quizRate,
    flashcardRate: result.flashcardRate,
    examLevelRate: result.examLevelRate,
    count: (prev?.count ?? 0) + 1,
    everPassed: (prev?.everPassed ?? false) || result.resultStatus === "passed",
  };
  write(map);
}

/** サーバの判定（連続未達で weak など）が返ってきたら、前回の結果だけ差し替える。 */
export function updateLastCheckPackStatus(
  topicId: string,
  resultStatus: CheckPackResultStatus,
): void {
  const map = read();
  const prev = map[topicId];
  if (!prev) return;
  map[topicId] = {
    ...prev,
    lastResultStatus: resultStatus,
    everPassed: prev.everPassed || resultStatus === "passed",
  };
  write(map);
}

/**
 * サーバの記録と端末の記録を合わせて返す。
 * 未ログイン・失敗時は端末の記録だけを返す。
 */
export async function fetchCheckPackHistory(
  topicId: string,
): Promise<CheckPackHistoryEntry | null> {
  const local = loadLocalCheckPackHistory(topicId);
  if (!getUserId()) return local;
  try {
    const res = await fetch("/api/check-pack/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId }),
    });
    if (!res.ok) return local;
    const data = (await res.json()) as { ok: boolean; history?: CheckPackHistoryMap };
    if (!data.ok || !data.history) return local;
    return mergeCheckPackHistoryEntry(local, data.history[topicId]);
  } catch {
    return local;
  }
}
