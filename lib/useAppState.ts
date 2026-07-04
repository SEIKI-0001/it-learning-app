"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/types";
import { loadAppState, saveAppState } from "@/lib/storage";
import { mergeAppState } from "@/lib/mergeAppState";
import {
  clearLocalUserData,
  getUserId,
  readTokenFromUrl,
  resolveToken,
  restoreFromSessionOnce,
  saveProgressToDb,
  setUserId,
} from "@/lib/userSession";

// サーバー状態とのマージ（＋必要なら書き戻し）を SPA セッション内で一度だけに
// するためのフラグ。restoreFromSessionOnce の結果はセッション開始時点のスナップ
// ショットなので、2回目以降のマウントでマージし直すと、その後にこの端末で行った
// 変更（設定画面での試験日変更など）を古いサーバー値で上書きしてしまう。
let sessionReconciled = false;

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
 * ユーザー管理の方針（アカウントの取り違え・端末間のズレを防ぐ）:
 *   - ローカルデータがあっても、セッション照合は必ず一度行う。セッションのユーザーが
 *     ローカルの user_id と異なる場合（共有端末でのアカウント切替）は、前ユーザーの
 *     ローカルデータをすべて破棄してサーバー状態を採用する。
 *   - 同一ユーザーでサーバーにも状態がある場合は mergeAppState で取り込み、
 *     別端末で進めた進捗・変更した試験日などを反映する。マージでサーバーより進んだ
 *     progress になった場合は一度だけ書き戻し、丸ごと UPSERT による巻き戻しを防ぐ。
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
          const localUserId = getUserId();
          if (localUserId && localUserId !== resolved.userId) {
            // 別アカウントの LINE リンクを開いた: 前ユーザーのローカルデータを破棄。
            clearLocalUserData();
          }
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

      // 2) セッション照合＋復元は SPA セッション内で一度だけ・背景で行う。
      //    ローカルデータがあっても省略しない（アカウント切替の検出と端末間同期のため）。
      const restored = await restoreFromSessionOnce();
      if (cancelled) return;

      if (!restored?.userId) {
        // 未ログイン（または一時的な失敗）。ローカルがあれば表示は維持し（通信断で
        // データを消さない）、空ならここで確定する（null → オンボーディングへ）。
        if (!local) setState(loadAppState());
        return;
      }

      const localUserId = getUserId();
      if (localUserId && localUserId !== restored.userId) {
        // 3) アカウント切替を検出: 前ユーザーのローカルデータをすべて破棄し、
        //    いまログインしているユーザーのサーバー状態だけを採用する。
        clearLocalUserData();
        setUserId(restored.userId);
        if (restored.appState) {
          saveAppState(restored.appState);
          setState(restored.appState);
        } else {
          setState(null);
        }
        return;
      }

      setUserId(restored.userId);

      if (restored.appState) {
        if (!local) {
          // 別端末などローカルが空のケースはサーバー状態を採用。
          saveAppState(restored.appState);
          setState(restored.appState);
          return;
        }
        if (!sessionReconciled) {
          // 4) 同一ユーザー: サーバー状態をローカルへ一度だけマージ
          //    （別端末で進めた進捗・変更した試験日などを反映）。
          sessionReconciled = true;
          const merged = mergeAppState(local, restored.appState);
          saveAppState(merged);
          setState(merged);
          // ローカル側が進んでいた場合はサーバーへ書き戻す（丸ごと UPSERT による巻き戻し防止）。
          if (
            JSON.stringify(merged.progress) !==
            JSON.stringify(restored.appState.progress)
          ) {
            saveProgressToDb(restored.userId, merged.progress);
          }
        }
        return;
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
