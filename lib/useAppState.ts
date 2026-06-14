"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/types";
import { loadAppState, saveAppState } from "@/lib/storage";
import { readTokenFromUrl, resolveToken, setUserId } from "@/lib/userSession";

/**
 * 保存済み AppState をマウント後に読み込むクライアント専用フック。
 * 戻り値: undefined = 読み込み中 / null = 未保存 / AppState = 読み込み済み。
 *
 * LINE 経由のアクセス（URL に ?t=トークン）の場合は、先にトークンを解決して
 * user_id を localStorage に保存し、DB上の進捗があれば localStorage に復元してから読み込む。
 * トークンが無い直接アクセスでは、従来通り localStorage のみで動く（フォールバック）。
 */
export function useAppState() {
  const [state, setState] = useState<AppState | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const token = readTokenFromUrl();
      if (token) {
        const resolved = await resolveToken(token);
        if (resolved?.userId) {
          setUserId(resolved.userId);
          // DB に既存データがあれば localStorage に復元（別端末からの再開に対応）。
          if (resolved.appState) saveAppState(resolved.appState);
        }
      }
      if (!cancelled) {
        // localStorage はクライアントでのみ参照可能（外部ストアとの同期）
        setState(loadAppState());
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  return [state, setState] as const;
}
