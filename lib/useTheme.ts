"use client";

// 配色テーマ（lib/theme）を React から使うためのフック。

import { useEffect, useSyncExternalStore } from "react";
import { readThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";

/** 保存されている配色。サーバー描画では ice。 */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeTheme, readThemePreference, () => "ice" as const);
}

/** ダーク対応画面で呼ぶ: ダークを選んでいる間だけ <html data-surface="dark"> を付ける。 */
export function useDarkSurface(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.setAttribute("data-surface", "dark");
    return () => root.removeAttribute("data-surface");
  }, [enabled]);
}
