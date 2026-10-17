"use client";

// 確認用: /progress の配色案を切り替える（テスト環境専用。main へは入れない）。
// 画面の色はすべて todayView.module.css の .view が定義する変数なので、ここでは変数だけを差し替える。
// 状態の3色（得意=緑系 / まずまず=主色 / 要強化=橙系）は、色覚の違いでも区別できるかを検証済み。

import { useEffect, useState } from "react";

type Palette = {
  id: string;
  name: string;
  note: string;
  vars: Record<string, string>;
  /** 案ごとの追加ルール */
  extra?: string;
};

const PALETTES: Palette[] = [
  {
    id: "0",
    name: "現行",
    note: "いまのアプリの色",
    vars: {},
  },
  {
    id: "1",
    name: "クリアブルー",
    note: "いまの青を澄ませ、文字を紺寄りに締めた案",
    vars: {
      "--background": "#F5F7FB",
      "--canvas": "#FFFFFF",
      "--wash": "#EEF3FD",
      "--line": "#E6EAF0",
      "--line-strong": "#CBD3DF",
      "--ink": "#0F172A",
      "--ink-2": "#475569",
      "--ink-3": "#64748B",
      "--blue": "#2563EB",
      "--blue-700": "#1D4ED8",
      "--blue-soft": "#DCE7FD",
      "--green": "#0E9F86",
      "--vocab": "#0E9F86",
      "--vocab-700": "#0B6E5D",
      "--vocab-soft": "#E3F5F1",
      "--orange": "#E8742A",
      "--orange-700": "#B4501A",
      "--orange-soft": "#FDEBDD",
      "--color-brand-600": "#2563EB",
      "--color-brand-700": "#1D4ED8",
    },
  },
  {
    id: "2",
    name: "モノトーン",
    note: "墨色が主役。色は状態だけに使う",
    vars: {
      "--background": "#F4F4F2",
      "--canvas": "#FFFFFF",
      "--wash": "#F0F0EE",
      "--line": "#E7E6E3",
      "--line-strong": "#CFCDC8",
      "--ink": "#111111",
      "--ink-2": "#4A4A48",
      "--ink-3": "#76746F",
      "--blue": "#2D63A6",
      "--blue-700": "#1F4A80",
      "--blue-soft": "#E3EAF3",
      "--green": "#0F9D7A",
      "--vocab": "#0F9D7A",
      "--vocab-700": "#0B6B54",
      "--vocab-soft": "#E2F3EE",
      "--orange": "#E8590C",
      "--orange-700": "#B5440A",
      "--orange-soft": "#FCE9DD",
      "--color-brand-600": "#111111",
      "--color-brand-700": "#000000",
    },
  },
  {
    id: "3",
    name: "藍と柿",
    note: "生成りの紙に藍。落ち着いた和の配色",
    vars: {
      "--background": "#F6F3EC",
      "--canvas": "#FFFDF8",
      "--wash": "#EFEBE2",
      "--line": "#E8E2D6",
      "--line-strong": "#D2C9B8",
      "--ink": "#1E2430",
      "--ink-2": "#4F5563",
      "--ink-3": "#7A7E88",
      "--blue": "#2C62A8",
      "--blue-700": "#1E4A82",
      "--blue-soft": "#E2EAF4",
      "--green": "#25967A",
      "--vocab": "#25967A",
      "--vocab-700": "#1A6B57",
      "--vocab-soft": "#E3F2EC",
      "--orange": "#E07A2E",
      "--orange-700": "#A9561C",
      "--orange-soft": "#FBEBDC",
      "--color-brand-600": "#1E4A82",
      "--color-brand-700": "#163866",
    },
  },
  {
    id: "4",
    name: "ダークヒーロー",
    note: "合格準備度のカードだけ濃紺にして主役を立てる",
    vars: {
      "--background": "#F3F5F9",
      "--canvas": "#FFFFFF",
      "--wash": "#EEF2FC",
      "--line": "#E4E8F0",
      "--line-strong": "#C9D1DF",
      "--ink": "#0E1A33",
      "--ink-2": "#46516A",
      "--ink-3": "#6B7590",
      "--blue": "#3B5BDB",
      "--blue-700": "#2F4AC0",
      "--blue-soft": "#E1E7FB",
      "--green": "#11A38E",
      "--vocab": "#11A38E",
      "--vocab-700": "#0B7062",
      "--vocab-soft": "#E0F4F1",
      "--orange": "#EF7A35",
      "--orange-700": "#B5521A",
      "--orange-soft": "#FDEADD",
      "--color-brand-600": "#3B5BDB",
      "--color-brand-700": "#2F4AC0",
    },
    extra: `
      html[data-palette="4"] main section[aria-labelledby="hero-heading"] {
        --canvas: #0E1A33; --ink: #F4F7FC; --ink-2: #C5CEDF; --ink-3: #8D9AB5;
        --line: #24345A; --blue: #7C95FF; --blue-700: #B4C2FF; --blue-soft: #1F2E57;
        --vocab-700: #6FE3CB; --vocab-soft: #133A36; --orange-700: #FFB98A; --orange-soft: #3A2A22;
        border-color: #0E1A33;
        color: var(--ink);
      }
      html[data-palette="4"] main section[aria-labelledby="hero-heading"] a[href] {
        background: #FFFFFF; color: #0E1A33;
      }
      html[data-palette="4"] main section[aria-labelledby="hero-heading"] a[href]:hover {
        background: #E8EDFF;
      }
    `,
  },
  {
    id: "5",
    name: "ラベンダー",
    note: "やわらかい紫と青緑。親しみやすい案",
    vars: {
      "--background": "#F6F5FB",
      "--canvas": "#FFFFFF",
      "--wash": "#F1EFFB",
      "--line": "#E7E4F2",
      "--line-strong": "#CFCAE3",
      "--ink": "#1B1730",
      "--ink-2": "#4D4866",
      "--ink-3": "#77728F",
      "--blue": "#6A5AE0",
      "--blue-700": "#4F3FC4",
      "--blue-soft": "#ECE9FC",
      "--green": "#0F9F8A",
      "--vocab": "#0F9F8A",
      "--vocab-700": "#0B6F61",
      "--vocab-soft": "#E1F4F1",
      "--orange": "#F06A4A",
      "--orange-700": "#B9452B",
      "--orange-soft": "#FDE7E1",
      "--color-brand-600": "#6A5AE0",
      "--color-brand-700": "#4F3FC4",
    },
  },
];

function cssFor(palette: Palette): string {
  if (palette.id === "0") return "";
  const decl = Object.entries(palette.vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
  return `
    html[data-palette="${palette.id}"] { --background: ${palette.vars["--background"]}; }
    html[data-palette="${palette.id}"] body { background: ${palette.vars["--background"]}; }
    html[data-palette="${palette.id}"] main { ${decl} }
    ${palette.extra ?? ""}
  `;
}

const ALL_CSS = PALETTES.map(cssFor).join("\n");

function initialId(): string {
  if (typeof window === "undefined") return "0";
  const q = new URLSearchParams(window.location.search).get("palette");
  return PALETTES.some((p) => p.id === q) ? (q as string) : "0";
}

export default function PaletteSwitcher() {
  // null = まだ URL を読んでいない（読む前に URL を書き換えないため）
  const [picked, setId] = useState<string | null>(null);
  const id = picked ?? "0";

  // URL の ?palette= を初期値にする（共有用）。サーバー描画と一致させるため mount 後に読む。
  useEffect(() => {
    const timer = window.setTimeout(() => setId(initialId()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // 選んだ案を画面と URL に反映する。
  useEffect(() => {
    if (picked === null) return;
    const id = picked;
    document.documentElement.setAttribute("data-palette", id);
    const url = new URL(window.location.href);
    if (id === "0") url.searchParams.delete("palette");
    else url.searchParams.set("palette", id);
    window.history.replaceState(null, "", url);
  }, [picked]);

  const choose = (next: string) => setId(next);

  const current = PALETTES.find((p) => p.id === id) ?? PALETTES[0];

  return (
    <>
      <style>{ALL_CSS}</style>
      <div
        style={{
          position: "fixed",
          bottom: 84,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          maxWidth: "calc(100vw - 16px)",
          padding: "6px 8px",
          borderRadius: 12,
          background: "rgba(17,17,17,0.88)",
          color: "#fff",
          fontSize: 12,
          backdropFilter: "blur(6px)",
        }}
      >
        <div role="radiogroup" aria-label="配色案" style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === id}
              onClick={() => choose(p.id)}
              style={{
                padding: "4px 8px",
                border: 0,
                borderRadius: 8,
                background: p.id === id ? "#fff" : "transparent",
                color: p.id === id ? "#111" : "#fff",
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {p.id === "0" ? p.name : `${p.id} ${p.name}`}
            </button>
          ))}
        </div>
        <span style={{ opacity: 0.8, fontSize: 11 }}>{current.note}</span>
      </div>
    </>
  );
}
