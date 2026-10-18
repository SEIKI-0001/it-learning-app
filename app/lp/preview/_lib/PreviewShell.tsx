"use client";

// 確認用ページの外枠（テスト環境専用）。最初の描画でサンプルデータを書き、画面を切り替えるバーを出す。

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { saveThemePreference, THEME_OPTIONS } from "@/lib/theme";
import { useThemePreference } from "@/lib/useTheme";
import { seedPreviewData } from "./seed";

export const PREVIEW_SCREENS = [
  { id: "today", label: "今日" },
  { id: "learn", label: "学ぶ" },
  { id: "review", label: "復習" },
  { id: "progress", label: "進捗" },
  { id: "more", label: "その他" },
  { id: "plan", label: "ロードマップ" },
  { id: "glossary", label: "単語帳" },
  { id: "badges", label: "CP条件" },
  { id: "report", label: "週間レポート" },
  { id: "settings", label: "設定" },
] as const;

export default function PreviewShell({ screen, children }: { screen: string; children: ReactNode }) {
  const theme = useThemePreference();
  // 子ページの effect が localStorage を読む前に書き込む。
  // 書くのはこのタブで1回だけ（毎回書き直すと、ランクアップ等の演出が画面を開くたびに出るため）。
  // ?reseed を付けると書き直す。
  useState(() => {
    if (typeof window === "undefined") return true;
    const force = new URLSearchParams(window.location.search).has("reseed");
    let seeded = false;
    try {
      seeded = window.sessionStorage.getItem("fequest:previewSeeded") === "1";
    } catch {
      /* 読めなければ毎回書く */
    }
    if (force || !seeded) {
      seedPreviewData();
      try {
        window.sessionStorage.setItem("fequest:previewSeeded", "1");
      } catch {
        /* 書けなくても表示は続ける */
      }
    }
    return true;
  });
  return (
    <>
      <nav
        aria-label="確認用の画面切り替え"
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          zIndex: 60,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          maxWidth: "min(560px, calc(100vw - 16px))",
          padding: 4,
          borderRadius: 10,
          background: "rgba(17,17,17,0.85)",
          fontSize: 11,
        }}
      >
        {PREVIEW_SCREENS.map((s) => (
          <Link
            key={s.id}
            href={`/lp/preview/${s.id}`}
            style={{
              padding: "3px 7px",
              borderRadius: 7,
              background: s.id === screen ? "#fff" : "transparent",
              color: s.id === screen ? "#111" : "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {s.label}
          </Link>
        ))}
        <span style={{ width: 1, margin: "2px 4px", background: "rgba(255,255,255,0.3)" }} aria-hidden />
        {THEME_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => saveThemePreference(o.value)}
            style={{
              padding: "3px 7px",
              border: 0,
              borderRadius: 7,
              background: theme === o.value ? "#7fb2ff" : "transparent",
              color: theme === o.value ? "#0b1a28" : "#fff",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </nav>
      {children}
    </>
  );
}
