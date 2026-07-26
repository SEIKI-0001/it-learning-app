"use client";

// userId（localStorage の fequest:userId）を useSyncExternalStore で読むための購読口。
//
// なぜ useEffect + setState にしないか:
//   マウント後に localStorage を読んで setState すると、そのたびに再レンダリングが
//   連鎖する（react-hooks/set-state-in-effect）。外部ストアとして購読すれば、
//   サーバ描画とクライアント描画の食い違いも React 側が面倒を見てくれる。
//
// スナップショットは必ずプリミティブ（string | null）を返すこと。
// サーバでは null（＝まだ分からない）を返し、確定するまで保存処理を走らせない。

import { getUserId } from "@/lib/userSession";

const USER_ID_KEY = "fequest:userId";

/** userId が変わる場面は「別タブでのログイン/ログアウト」だけ。 */
export function subscribeToUserId(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== USER_ID_KEY) return;
    listener();
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

/**
 * クライアント側のスナップショット。
 * 未ログインは空文字を返す（null はサーバ側の「未確定」と区別するため）。
 */
export function getUserIdSnapshot(): string {
  return getUserId() ?? "";
}

/** サーバ描画時は「まだ分からない」を表す null。 */
export function getUserIdServerSnapshot(): null {
  return null;
}
