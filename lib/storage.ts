import type { AppState, UserProfile } from "@/types";

// localStorage 操作をこのファイルに隠蔽する。
// プロトタイプのため保存先は localStorage のみ（将来はDBへ差し替え予定）。

const STORAGE_KEY = "fequest:appstate";
const PENDING_KEY = "fequest:pendingResult"; // クエスト→結果画面への一時受け渡し（sessionStorage）
const LAST_RESULT_KEY = "fequest:lastResult"; // 結果画面の再表示用スナップショット（sessionStorage）

export { PENDING_KEY, LAST_RESULT_KEY };

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** 保存済みの AppState を読み込む。無ければ null。 */
export function loadAppState(): AppState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

/** AppState を保存する。 */
export function saveAppState(state: AppState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存に失敗してもアプリは止めない（プロトタイプ）
  }
}

/** すべての保存データを初期化する。 */
export function resetAppState(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(PENDING_KEY);
  window.sessionStorage.removeItem(LAST_RESULT_KEY);
}

/** 初回診断（プロフィール）から初期 AppState を作る。 */
export function initializeAppState(profile: UserProfile): AppState {
  const state: AppState = {
    profile,
    progress: {
      level: 1,
      exp: 0,
      currentDay: 1,
      completedDays: [],
      streakCount: 0,
      weakTags: [],
    },
    answers: [],
  };
  saveAppState(state);
  return state;
}
