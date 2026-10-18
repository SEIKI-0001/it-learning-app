"use client";

// 画面遷移・配色の変更に合わせて <html data-theme> を付け直す（最初の描画前は themeBootScript が付ける）。

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { documentThemeFor } from "@/lib/theme";
import { useThemePreference } from "@/lib/useTheme";

export default function ThemeSync() {
  const pathname = usePathname();
  const preference = useThemePreference();
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", documentThemeFor(preference, pathname ?? "/"));
  }, [preference, pathname]);
  return null;
}
