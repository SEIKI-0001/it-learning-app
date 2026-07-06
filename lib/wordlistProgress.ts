"use client";

import { getUserId } from "@/lib/userSession";

// 英略語の単語帳の学習進捗を localStorage に保存する小さなストア。
// ミニゲーム(lib/minigameProgress)と同じ方針で、
// 学習進捗本体(AppState=fequest:appstate)には手を入れず、機能ローカルの別キーに閉じ込める。
//
// 保存は二重化：必ず localStorage を更新したうえで、user_id があれば（=LINE経由）
// Supabase にも fire-and-forget で保存する。Supabase 未設定・401・503・失敗でも
// localStorage は更新済みなので UI は止まらない（フォールバック方針）。
// 直接アクセス（user_id 無し）は従来どおり localStorage のみで動く。

export type WordStatus = "new" | "learning" | "weak" | "mastered";

/** カード裏面の自己評価。 */
export type SelfRating = "remembered" | "vague" | "forgot";

export type WordProgress = {
  acronymId: string;
  status: WordStatus;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  /** 直近に学習した日時（epoch ms）。 */
  lastReviewedAt: number | null;
  /** 次に復習する目安の日時（epoch ms）。これ以前なら「今日の復習対象」。 */
  nextReviewAt: number | null;
  lastSelfRating: SelfRating | null;
};

export type WordProgressMap = Record<string, WordProgress>;

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

/**
 * Supabase から単語帳進捗を取得し、localStorage にマージ同期する。
 * - user_id が無ければ（直接アクセス）何もせず false。
 * - 取得失敗・未設定・401・503 でも false を返すだけで、既存 localStorage は保持。
 * - マージ方針：localStorage 側にしか無い進捗は消さない。両方にある単語は
 *   lastReviewedAt が新しい方を採用する（単純マージ）。
 * - 同期に成功して何か変化があれば true。
 */
export async function syncWordProgressFromDb(): Promise<boolean> {
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

    const remote = data.progress;
    const local = readAll();
    const merged: WordProgressMap = { ...local };

    for (const [id, r] of Object.entries(remote)) {
      const l = local[id];
      if (!l) {
        merged[id] = r;
      } else {
        // lastReviewedAt が新しい方を優先（null は 0 扱い）。
        const lTime = l.lastReviewedAt ?? 0;
        const rTime = r.lastReviewedAt ?? 0;
        merged[id] = rTime > lTime ? r : l;
      }
    }

    writeAll(merged);
    return true;
  } catch {
    return false;
  }
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
