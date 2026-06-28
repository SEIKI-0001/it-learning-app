"use client";

import type { AppState, UserAnswer, UserProfile, UserProgress } from "@/types";

// LINE 経由で解決した user_id を localStorage に保存し、以降のDB保存に使う。
// user_id が無ければ（= 直接アクセス）すべて localStorage だけで動く（フォールバック）。

const USER_ID_KEY = "fequest:userId";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getUserId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setUserId(userId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(USER_ID_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function clearUserId(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(USER_ID_KEY);
  } catch {
    /* ignore */
  }
}

/** URL の ?t=... から一時トークンを取り出す。 */
export function readTokenFromUrl(): string | null {
  if (!isBrowser()) return null;
  try {
    return new URLSearchParams(window.location.search).get("t");
  } catch {
    return null;
  }
}

export type ResolveResult = {
  userId: string;
  appState: AppState | null; // DB に既存データがあれば復元用の AppState
};

/** トークンを検証し、user_id と（あれば）DB上の AppState を取得する。 */
export async function resolveToken(token: string): Promise<ResolveResult | null> {
  try {
    const res = await fetch("/api/session/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<ResolveResult>;
    if (!data.ok || !data.userId) return null;
    return { userId: data.userId, appState: data.appState ?? null };
  } catch {
    return null;
  }
}

// SPA セッション内で /api/session/state を一度だけ呼ぶためのキャッシュ。
// ページ遷移ごとに毎回サーバー（getUser + DB）へ問い合わせるのを防ぐ。
// モジュール変数はクライアントサイド遷移の間は保持されるため、全画面で共有される。
let sessionRestorePromise: Promise<ResolveResult | null> | null = null;

/**
 * セッション復元を「このページロード中に一度だけ」実行する。
 * 2回目以降の呼び出し（＝別ページへの遷移）は最初の結果を再利用し、ネットワークを発生させない。
 */
export function restoreFromSessionOnce(): Promise<ResolveResult | null> {
  if (!sessionRestorePromise) {
    sessionRestorePromise = restoreFromSession();
  }
  return sessionRestorePromise;
}

/**
 * セッション復元キャッシュを破棄する（ログイン直後・ログアウト時などの明示的な再検証用）。
 */
export function invalidateSessionRestore(): void {
  sessionRestorePromise = null;
}

/**
 * 現在のセッション（Google ログイン / LINE 署名 Cookie）から user_id と DB上の AppState を復元する。
 * ?t= が無い直接アクセス時に使う。未ログインなら null。
 */
export async function restoreFromSession(): Promise<ResolveResult | null> {
  try {
    const res = await fetch("/api/session/state", { method: "GET" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean } & Partial<ResolveResult>;
    if (!data.ok || !data.userId) return null;
    return { userId: data.userId, appState: data.appState ?? null };
  } catch {
    return null;
  }
}

/** 進捗をDBへ保存（user_id がある場合のみ呼ぶ。失敗してもUIは止めない）。 */
export function saveProgressToDb(userId: string, progress: UserProgress): void {
  void fetch("/api/progress/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, progress }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

/** プロフィールをDBへ保存（オンボーディング完了時）。 */
export function saveProfileToDb(userId: string, profile: UserProfile): void {
  void fetch("/api/progress/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, profile }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

/** 回答履歴をDBへ保存。 */
export function saveAnswersToDb(
  userId: string,
  dayNo: number,
  answers: UserAnswer[],
): void {
  void fetch("/api/answers/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, dayNo, answers }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

export type FeedbackAnswers = {
  q1_service?: string;
  q2_tedious?: string;
  q3_unclear?: string;
  q4_onemore?: string;
  q5_easier?: string;
};

/** フィードバックをDBへ保存。 */
export async function saveFeedbackToDb(
  userId: string,
  dayNo: number,
  feedback: FeedbackAnswers,
): Promise<boolean> {
  try {
    const res = await fetch("/api/feedback/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, dayNo, feedback }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
