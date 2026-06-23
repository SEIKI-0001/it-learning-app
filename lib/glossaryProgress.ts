"use client";

// 単語帳（用語フラッシュカード）の「覚えた / まだ」をローカル(localStorage)に保存する小さなストア。
// ミニゲーム結果(lib/minigameProgress.ts)と同じ方針で、学習進捗本体(AppState=fequest:appstate)
// には手を入れず、機能ローカルの別キーに閉じ込めておく（最も低リスク）。
// 将来 Supabase に寄せたくなったら、この Record をそのまま送れる形にしてある。

export type GlossaryStatus = "known" | "learning";

const STATUS_KEY = "fequest:glossaryProgress";

export type GlossaryStatusMap = Record<string, GlossaryStatus>;

// 同一タブ内で list 画面と study 画面が状態を共有できるよう、変更を通知する軽いイベント。
const EVENT_NAME = "fequest:glossaryProgress:change";

function readAll(): GlossaryStatusMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as GlossaryStatusMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: GlossaryStatusMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // 保存に失敗しても学習体験は止めない（フォールバック方針）。
  }
}

/** すべての用語の状態を取得。 */
export function getGlossaryStatuses(): GlossaryStatusMap {
  return readAll();
}

/** 指定用語の状態を取得（未操作なら undefined）。 */
export function getGlossaryStatus(id: string): GlossaryStatus | undefined {
  return readAll()[id];
}

/** 用語の状態を設定する（覚えた / まだ）。 */
export function setGlossaryStatus(id: string, status: GlossaryStatus): void {
  const all = readAll();
  all[id] = status;
  writeAll(all);
}

/** 用語の状態を消す（未操作に戻す）。 */
export function clearGlossaryStatus(id: string): void {
  const all = readAll();
  if (id in all) {
    delete all[id];
    writeAll(all);
  }
}

/** 「覚えた」の件数。 */
export function countKnown(map: GlossaryStatusMap = readAll()): number {
  return Object.values(map).filter((s) => s === "known").length;
}

/** 状態変更を購読する。返り値の関数で解除。 */
export function subscribeGlossaryProgress(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, listener);
  // 別タブでの変更も拾う。
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}
