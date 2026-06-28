"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/types";
import { loadAppState, saveAppState } from "@/lib/storage";
import {
  getUserId,
  readTokenFromUrl,
  resolveToken,
  restoreFromSessionOnce,
  setUserId,
} from "@/lib/userSession";

/**
 * 保存済み AppState をマウント後に読み込むクライアント専用フック。
 * 戻り値: undefined = 読み込み中 / null = 未保存 / AppState = 読み込み済み。
 *
 * 体感速度の方針（ログイン後のページ遷移をブロックしない）:
 *   - まず localStorage を即時反映する。データがあればそのまま表示し、全画面「読み込み中」を出さない。
 *   - セッション復元（/api/session/state）は SPA セッション内で一度だけ・背景で実行する
 *     （restoreFromSessionOnce）。ページ遷移ごとにサーバー（getUser + DB）へ問い合わせない。
 *   - localStorage が空（＝初回ロード／別端末）のときだけ、サーバー復元の完了を待ってから
 *     表示を確定する。空のまま確定した場合は null（→ オンボーディング）になる。
 *
 * LINE 経由のアクセス（URL に ?t=トークン）は従来どおりトークンを優先解決する。
 */
export function useAppState() {
  const [state, setState] = useState<AppState | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1) localStorage を即時反映（ネットワーク不要）。既存データがあれば即表示し、
      //    全画面「読み込み中」を出さない。
      const local = loadAppState();
      if (local && !cancelled) setState(local);

      const token = readTokenFromUrl();
      if (token) {
        // LINE 経由（?t=）: トークンを解決し user_id と DB 進捗を復元（fq_line Cookie も発行される）。
        const resolved = await resolveToken(token);
        if (cancelled) return;
        if (resolved?.userId) {
          setUserId(resolved.userId);
          if (resolved.appState) {
            saveAppState(resolved.appState);
            setState(resolved.appState);
            return;
          }
        }
        if (!local) setState(loadAppState());
        return;
      }

      // 直接アクセスで既にローカルデータと user_id が揃っていれば、復元は不要（ネットワーク0）。
      if (local && getUserId()) return;

      // セッション復元は一度だけ・背景で。localStorage が空のときだけ結果で表示を確定する。
      const restored = await restoreFromSessionOnce();
      if (cancelled) return;
      if (restored?.userId) {
        setUserId(restored.userId);
        if (!local && restored.appState) {
          // 別端末などローカルが空のケースのみサーバー状態を採用（ローカルの編集を潰さない）。
          saveAppState(restored.appState);
          setState(restored.appState);
          return;
        }
      }
      // ローカルが空のままならここで確定（null → オンボーディングへ）。
      if (!local) setState(loadAppState());
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  return [state, setState] as const;
}
