"use client";

// 章アイコン(ThemeAppIcon)の開発プレビュー（開発環境専用）。本番ビルドでは notFound を返す。

import { notFound } from "next/navigation";
import ThemeAppIcon, { getThemeAppIconMeta } from "@/components/ui/ThemeAppIcon";
import { getAllThemes } from "@/lib/learningCatalog";

export default function ThemeIconsPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const themes = getAllThemes();
  return (
    <main className="mx-auto max-w-3xl space-y-8 bg-white p-6">
      <div className="grid grid-cols-6 gap-x-4 gap-y-5">
        {themes.map((theme) => (
          <div key={theme.id} className="flex flex-col items-center gap-1.5">
            <ThemeAppIcon theme={theme} size={64} />
            <span className="w-full truncate text-center text-[11px] text-gray-700">
              {getThemeAppIconMeta(theme).shortLabel}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-5">
        {[28, 36, 44, 56, 96].map((size) => (
          <ThemeAppIcon key={size} theme={themes[17]} size={size} />
        ))}
        <ThemeAppIcon theme={themes[0]} size={48} badge={{ kind: "review", count: 3 }} />
        <ThemeAppIcon theme={themes[1]} size={48} badge={{ kind: "mastered" }} />
        <ThemeAppIcon theme={themes[2]} size={48} badge={{ kind: "fully_mastered" }} />
        <ThemeAppIcon theme={themes[3]} size={48} muted />
      </div>
    </main>
  );
}
