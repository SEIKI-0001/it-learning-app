"use client";

import { getUserId } from "@/lib/userSession";
import {
  mergeWordProgressMaps,
  type SelfRating,
  type WordProgress,
  type WordProgressMap,
  type WordStatus,
} from "@/lib/wordProgressModel";

// 英略語の単語帳の学習進捗を localStorage に保存する小さなストア。
// ミニゲーム(lib/minigameProgress)と同じ方針で、
// 学習進捗本体(AppState=fequest:appstate)には手を入れず、機能ローカルの別キーに閉じ込める。
//
// 保存は二重化：必ず localStorage を更新したうえで、user_id があれば（=LINE経由）
// Supabase にも fire-and-forget で保存する。Supabase 未設定・401・503・失敗でも
// localStorage は更新済みなので UI は止まらない（フォールバック方針）。
// 直接アクセス（user_id 無し）は従来どおり localStorage のみで動く。

export type { SelfRating, WordProgress, WordProgressMap, WordStatus } from "@/lib/wordProgressModel";
export { isValidWordProgress, mergeWordProgressMaps } from "@/lib/wordProgressModel";

const STORAGE_KEY = "fequest:wordlistProgress";
const EVENT_NAME = "fequest:wordlistProgress:change";

const DAY_MS = 24 * 60 * 60 * 1000;

function readAll(): WordProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WordProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: WordProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // 保存に失敗しても学習体験は止めない（フォールバック方針）。
  }
}

/**
 * 1件の進捗を Supabase へ保存する（fire-and-forget）。
 * - user_id が無ければ何もしない（直接アクセスは localStorage のみ）。
 * - 失敗しても握りつぶす（localStorage は呼び出し前に更新済み）。
 */
function saveWordProgressToDb(progress: WordProgress): void {
  if (typeof window === "undefined") return;
  const userId = getUserId();
  if (!userId) return;
  void fetch("/api/word-progress/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, progress }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

function emptyProgress(id: string): WordProgress {
  return {
    acronymId: id,
    status: "new",
    correctCount: 0,
    wrongCount: 0,
    reviewCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    lastSelfRating: null,
  };
}

/** その日の終わり（ローカル23:59:59）の epoch ms。「今日の復習対象」の判定に使う。 */
function endOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function daysFromNow(days: number): number {
  return Date.now() + days * DAY_MS;
}

/** 全件の進捗マップを取得。 */
export function getWordProgressMap(): WordProgressMap {
  return readAll();
}

/** 1件の進捗を取得（未学習なら status="new" の初期値）。 */
export function getWordProgress(id: string): WordProgress {
  return readAll()[id] ?? emptyProgress(id);
}

/**
 * カード学習での自己評価を記録する。
 * - 覚えた   : correctCount+1、連続正解で mastered（3日後 / mastered は7日後）
 * - あいまい : learning（翌日）
 * - 覚えていない: weak（当日＝すぐ復習対象）
 */
export function recordSelfRating(id: string, rating: SelfRating): WordProgress {
  const all = readAll();
  const prev = all[id] ?? emptyProgress(id);
  const next: WordProgress = {
    ...prev,
    reviewCount: prev.reviewCount + 1,
    lastReviewedAt: Date.now(),
    lastSelfRating: rating,
  };

  if (rating === "remembered") {
    next.correctCount = prev.correctCount + 1;
    // 連続正解（不正解でリセットされる correctCount）が2以上で定着とみなす。
    if (next.correctCount >= 2) {
      next.status = "mastered";
      next.nextReviewAt = daysFromNow(7);
    } else {
      next.status = "learning";
      next.nextReviewAt = daysFromNow(3);
    }
  } else if (rating === "vague") {
    next.status = "learning";
    next.nextReviewAt = daysFromNow(1);
  } else {
    // forgot
    next.status = "weak";
    next.correctCount = 0; // 連続正解を切る
    next.nextReviewAt = endOfToday(); // 当日中に復習対象
  }

  all[id] = next;
  writeAll(all);
  saveWordProgressToDb(next);
  return next;
}

/**
 * 4択確認モードの正誤を記録する。
 * - 正解 : correctCount+1、連続正解で mastered（3日後 / mastered は7日後）
 * - 不正解: wrongCount+1、weak（当日＝すぐ復習対象）
 */
export function recordQuizResult(id: string, correct: boolean): WordProgress {
  const all = readAll();
  const prev = all[id] ?? emptyProgress(id);
  const next: WordProgress = {
    ...prev,
    reviewCount: prev.reviewCount + 1,
    lastReviewedAt: Date.now(),
  };

  if (correct) {
    next.correctCount = prev.correctCount + 1;
    if (next.correctCount >= 2) {
      next.status = "mastered";
      next.nextReviewAt = daysFromNow(7);
    } else {
      next.status = "learning";
      next.nextReviewAt = daysFromNow(3);
    }
  } else {
    next.wrongCount = prev.wrongCount + 1;
    next.correctCount = 0;
    next.status = "weak";
    next.nextReviewAt = endOfToday();
  }

  all[id] = next;
  writeAll(all);
  saveWordProgressToDb(next);
  return next;
}

/** 端末にしか無い進捗を DB へまとめて送る（1回あたりの件数を抑える）。 */
const UPLOAD_BATCH_SIZE = 100;

async function uploadWordProgress(userId: string, list: WordProgress[]): Promise<void> {
  for (let i = 0; i < list.length; i += UPLOAD_BATCH_SIZE) {
    const res = await fetch("/api/word-progress/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, progresses: list.slice(i, i + UPLOAD_BATCH_SIZE) }),
    });
    if (!res.ok) return; // 次回の同期で再送される（端末側は消していない）
  }
}

/**
 * Supabase と localStorage の単語帳進捗を双方向に同期する。
 * - user_id が無ければ（未ログイン）何もせず false。localStorage だけで従来どおり動く。
 * - 取得失敗・未設定・401・503 でも false を返すだけで、既存 localStorage は保持。
 * - DB の進捗を端末へ取り込み（別端末の学習を反映）、端末の方が新しい進捗は DB へ送る
 *   （localStorage にしか無かった既存ユーザーのデータを正式なユーザーデータへ移す）。
 * - 同期に成功すれば true。
 */
export async function syncWordProgress(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const userId = getUserId();
  if (!userId) return false;

  try {
    const res = await fetch("/api/word-progress/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return false;

    const data = (await res.json()) as {
      ok: boolean;
      progress?: WordProgressMap;
    };
    if (!data.ok || !data.progress) return false;

    // 取得中に端末側で記録が増えていても消さないよう、マージ直前に読み直す。
    const { merged, toUpload } = mergeWordProgressMaps(readAll(), data.progress);
    writeAll(merged);
    if (toUpload.length > 0) await uploadWordProgress(userId, toUpload);
    return true;
  } catch {
    return false;
  }
}

/** 旧名（単語帳画面から呼ばれている）。双方向同期と同じ。 */
export const syncWordProgressFromDb = syncWordProgress;

let sessionSync: { userId: string; promise: Promise<boolean> } | null = null;

/**
 * 画面を開くたびに通信しないよう、SPA セッション中はユーザーごとに1回だけ同期する（Today 用）。
 * アカウントが切り替わったら（userId が変わったら）その人のぶんを改めて同期する。
 * 単語帳の各画面は従来どおり毎回 syncWordProgress() を呼ぶ。
 */
export function syncWordProgressOnce(): Promise<boolean> {
  const userId = typeof window === "undefined" ? null : getUserId();
  if (!userId) return Promise.resolve(false);
  if (sessionSync?.userId !== userId) {
    const promise = syncWordProgress().then((ok) => {
      if (!ok && sessionSync?.promise === promise) sessionSync = null; // 次の画面で再試行
      return ok;
    });
    sessionSync = { userId, promise };
  }
  return sessionSync.promise;
}

/** 状態別の件数。allIds を渡すと未学習(new)も総数から差し引いて数える。 */
export function countByStatus(
  allIds: string[],
  map: WordProgressMap = readAll(),
): Record<WordStatus, number> {
  const counts: Record<WordStatus, number> = {
    new: 0,
    learning: 0,
    weak: 0,
    mastered: 0,
  };
  for (const id of allIds) {
    const p = map[id];
    counts[p ? p.status : "new"] += 1;
  }
  return counts;
}

/** 「今日の復習対象」の id 一覧（nextReviewAt が今日の終わりまでに来ているもの）。 */
export function getDueIds(
  allIds: string[],
  map: WordProgressMap = readAll(),
  now: number = Date.now(),
): string[] {
  const limit = endOfToday(now);
  return allIds.filter((id) => {
    const p = map[id];
    return p && p.nextReviewAt != null && p.nextReviewAt <= limit;
  });
}

/** 「苦手」の id 一覧（status === "weak"）。 */
export function getWeakIds(
  allIds: string[],
  map: WordProgressMap = readAll(),
): string[] {
  return allIds.filter((id) => map[id]?.status === "weak");
}

/** 進捗の変更を購読する。返り値で解除。 */
export function subscribeWordProgress(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}
