"use client";

// 画面の色（ライト / ダーク）。いまは /progress だけが対応している。
//   - 好み: "system"（端末の設定に合わせる・既定）/ "light" / "dark"。この端末の localStorage に保存する
//   - 実際の色: 好みが system なら端末の prefers-color-scheme で決める
// 対応画面は表示中だけ <html data-surface="dark"> を付け、離れるときに外す
// （未対応の画面が暗い枠の中で明るく浮かないようにするため。globals.css のナビの暗色も同じ印で切り替える）。

import { useEffect, useSyncExternalStore } from "react";

export type ColorSchemePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const STORAGE_KEY = "fequest:colorScheme";
const CHANGE_EVENT = "fequest:colorSchemeChange";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ColorSchemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function saveColorSchemePreference(preference: ColorSchemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* 保存できなくても、この表示中は切り替わる */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 好みと、実際に使う色。サーバー描画では system / light。 */
export function useColorScheme(): { preference: ColorSchemePreference; scheme: ColorScheme } {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const scheme: ColorScheme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;
  return { preference, scheme };
}

/** 対応画面で呼ぶ: 表示中だけ <html data-surface> を付ける。 */
export function useColorSchemeSurface(scheme: ColorScheme): void {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-surface", scheme);
    return () => root.removeAttribute("data-surface");
  }, [scheme]);
}
