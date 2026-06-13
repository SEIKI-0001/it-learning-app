"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/types";
import { loadAppState } from "@/lib/storage";

/**
 * 保存済み AppState をマウント後に読み込むクライアント専用フック。
 * 戻り値: undefined = 読み込み中 / null = 未保存 / AppState = 読み込み済み。
 *
 * localStorage はサーバー側（プリレンダリング時）には存在しないため、
 * 「外部システムとの同期」としてマウント後の effect で1度だけ読み込む。
 */
export function useAppState() {
  const [state, setState] = useState<AppState | null | undefined>(undefined);

  useEffect(() => {
    // localStorage はクライアントでのみ参照可能（外部ストアとの同期）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadAppState());
  }, []);

  return [state, setState] as const;
}
