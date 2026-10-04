import type { AppState } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { StudyMode } from "@/lib/studyContext";

// チェックポイント判定（バッジ・ゲート・最終問題）へ「いまの学習モード」を渡すための写し。
// 正は lib/studyContext の resolveStudyContext。画面・サーバーで AppState を読んだら
// withStudyMode で毎回上書きしてから判定に渡す（各判定が独自にモードを決めないようにする）。

/** 参考書順で進めているか（チェックポイント判定用）。 */
export function isBookPaced(state: Pick<AppState, "progress">): boolean {
  return state.progress.checkpointProgress?.studyMode === "book";
}

/** 参考書順で解放済みの最終問題か（モードを切り替えても閉じない）。 */
export function isBookUnlockLatched(
  state: Pick<AppState, "progress">,
  checkpointId: CheckpointId,
): boolean {
  return state.progress.checkpointProgress?.bookUnlockedFinalExamIds?.includes(checkpointId) ?? false;
}

/**
 * 実効モードを AppState に写す。変化が無ければ同じ参照を返す（保存・再描画を避ける）。
 * アプリ順では studyMode を消す（checkpointProgress が無い旧データはそのまま）。
 */
export function withStudyMode(state: AppState, mode: StudyMode): AppState {
  const cp = state.progress.checkpointProgress;
  const current = cp?.studyMode === "book" ? "book" : "app";
  if (current === mode) return state;
  if (mode === "app") {
    if (!cp) return state;
    const { studyMode: _drop, ...rest } = cp;
    void _drop;
    return { ...state, progress: { ...state.progress, checkpointProgress: rest } };
  }
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: { ...(cp ?? INITIAL_CHECKPOINT_PROGRESS), studyMode: "book" },
    },
  };
}
