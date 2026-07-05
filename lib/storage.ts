import type { AppState, UserProfile } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { migrateCheckpointProgress } from "@/lib/checkpoints";

// localStorage 操作をこのファイルに隠蔽する。
// プロトタイプのため保存先は localStorage のみ（将来はDBへ差し替え予定）。

// localStorage キーは旧版から変更しない（既存ユーザーのデータを引き継ぐため）。
const STORAGE_KEY = "fequest:appstate";
const PENDING_KEY = "fequest:pendingResult"; // 旧クエスト→結果画面の一時受け渡し（互換）
const LAST_RESULT_KEY = "fequest:lastResult"; // 旧結果画面の再表示用（互換）

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
    return normalizeAppState(JSON.parse(raw) as AppState);
  } catch {
    return null;
  }
}

/**
 * 旧バージョン(7日版)で保存された AppState を読み込んだ場合に、
 * 新フィールド(completedTopics / topicMastery / reviewQueue)を補完する。
 * 既存データは壊さず、欠けている項目だけ初期値で埋める。
 */
export function normalizeAppState(state: AppState): AppState {
  const p = state.progress ?? ({} as AppState["progress"]);
  const normalized: AppState = {
    ...state,
    progress: {
      level: p.level ?? 1,
      exp: p.exp ?? 0,
      streakCount: p.streakCount ?? 0,
      weakTags: p.weakTags ?? [],
      lastPlayedAt: p.lastPlayedAt,
      completedTopics: p.completedTopics ?? [],
      topicMastery: p.topicMastery ?? {},
      reviewQueue: p.reviewQueue ?? [],
      weeklyPlan: p.weeklyPlan ?? null,
      checkpointProgress: p.checkpointProgress,
      currentDay: p.currentDay ?? 1,
      completedDays: p.completedDays ?? [],
    },
  };

  // バッジゲート型ロードマップの進行状態を安全に補完する。
  //   - 既にあれば尊重する（進行・獲得バッジを壊さない）。
  //   - 無い既存ユーザーは、既存データから初期チェックポイントを一度だけ推定する
  //     （migrateCheckpointProgress は profile 未設定なら cp0 の初期値を返す）。
  if (!normalized.progress.checkpointProgress) {
    normalized.progress.checkpointProgress = migrateCheckpointProgress(normalized);
  }

  return normalized;
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

/** 初回設定（プロフィール）から初期 AppState を作る。 */
export function initializeAppState(profile: UserProfile): AppState {
  const state: AppState = {
    profile,
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      reviewQueue: [],
      weeklyPlan: null,
      // 初回設定（オンボーディング）完了 ＝ CP0 クリア。以降は最終問題突破で進む。
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
      },
      // 旧版互換(新ロジックでは未使用)
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
  saveAppState(state);
  return state;
}
