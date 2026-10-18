"use client";

// 配色テーマ（lib/theme）を React から使うためのフック。

import { useSyncExternalStore } from "react";
import { readThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";

/** 保存されている配色。サーバー描画では ice。 */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeTheme, readThemePreference, () => "ice" as const);
}
