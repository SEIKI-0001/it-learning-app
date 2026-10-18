"use client";

// 設定画面の「画面の配色」。値は lib/theme（端末ごとに保存）。

import { saveThemePreference, THEME_OPTIONS, type ThemePreference } from "@/lib/theme";
import { useThemePreference } from "@/lib/useTheme";

// 選択肢の見本（地・カード・主ボタンの色）
const SWATCH: Record<ThemePreference, { ground: string; card: string; cta: string }> = {
  ice: { ground: "#edf5fa", card: "#ffffff", cta: "#175cd3" },
  classic: { ground: "#ffffff", card: "#f2f6fc", cta: "#16191d" },
  dark: { ground: "#0f1722", card: "#172231", cta: "#3d6be0" },
};

export default function ThemePicker() {
  const preference = useThemePreference();
  return (
    <div role="radiogroup" aria-label="画面の配色" className="grid grid-cols-3 gap-2">
      {THEME_OPTIONS.map((option) => {
        const selected = preference === option.value;
        const swatch = SWATCH[option.value];
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => saveThemePreference(option.value)}
            className={`rounded-lg border p-2 text-left transition ${
              selected ? "border-brand-500 ring-1 ring-brand-500" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span
              aria-hidden
              className="block h-12 rounded-md p-1.5"
              style={{ background: swatch.ground, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.06)" }}
            >
              <span className="flex h-full flex-col justify-between rounded-sm p-1" style={{ background: swatch.card }}>
                <span className="block h-1 w-2/3 rounded-full" style={{ background: option.value === "dark" ? "#4a5d75" : "#cbd5e1" }} />
                <span className="block h-2 w-1/2 rounded-sm" style={{ background: swatch.cta }} />
              </span>
            </span>
            <span className={`mt-1.5 block text-sm ${selected ? "font-semibold text-brand-700" : "text-gray-900"}`}>
              {option.label}
            </span>
            <span className="block text-[11px] leading-snug text-gray-500">{option.note}</span>
          </button>
        );
      })}
    </div>
  );
}
