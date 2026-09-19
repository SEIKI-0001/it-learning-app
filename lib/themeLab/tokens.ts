// 配色ラボ（/dev/theme-lab）が扱うトークン。値は app/globals.css の @theme と一致させる
// （test/themeLab.test.ts が globals.css と突き合わせる）。

import { deriveScale, normalizeHex } from "./color";
import {
  PANEL_COLORS,
  defaultBackdrop,
  defaultPanel,
  panelFillCss,
  parseBackdrop,
  parsePanel,
  parseParts,
  partsCss,
  type BackdropState,
  type PanelColorKey,
  type PanelFill,
  type PanelState,
  type PartKey,
} from "./decor";

export type ScaleKey = "brand" | "accent" | "emerald" | "gray";
export type SurfaceKey = "page" | "surface" | "washLine";

export type ScaleDef = {
  key: ScaleKey;
  label: string;
  role: string;
  /** 基準色として選ぶ段。ここを差し替えると他の段が同じ関係で追従する。 */
  anchor: string;
  stops: Record<string, string>;
  swatches: string[];
};

export const CURRENT_SCALES: Record<ScaleKey, ScaleDef> = {
  brand: {
    key: "brand",
    label: "テーマカラー",
    role: "現在地・進捗バー・リンク・淡いパネル（50）",
    anchor: "500",
    stops: {
      "50": "#f2f6fc",
      "100": "#dce7fa",
      "200": "#c3d5f4",
      "300": "#97b6ec",
      "400": "#5f8fe3",
      "500": "#2f6fdb",
      "600": "#2463d1",
      "700": "#2257b0",
      "800": "#1d4892",
      "900": "#183a73",
      "950": "#10264b",
    },
    swatches: ["#2f6fdb", "#187bd7", "#1d6285", "#3b5bdb", "#0f766e", "#6d4bd8", "#c2410c", "#be185d"],
  },
  accent: {
    key: "accent",
    label: "アクセントカラー",
    role: "復習・注意・受け取れる報酬",
    anchor: "500",
    stops: {
      "50": "#fdf5ec",
      "100": "#f9e5d0",
      "200": "#f2cda6",
      "300": "#eab07a",
      "400": "#e59c55",
      "500": "#e08a34",
      "600": "#b35c12",
      "700": "#9a5a18",
      "800": "#7a4512",
    },
    swatches: ["#e08a34", "#f58a17", "#d9822b", "#e0a526", "#d9534f", "#c8642d", "#d946ef", "#0ea5a4"],
  },
  emerald: {
    key: "emerald",
    label: "達成の色",
    role: "完了・正解・獲得済み",
    anchor: "500",
    stops: {
      "50": "#ebf6f0",
      "100": "#d3ecdf",
      "200": "#b0dcc6",
      "300": "#82c7a5",
      "400": "#4fab80",
      "500": "#2f8f63",
      "600": "#287a55",
      "700": "#22684a",
      "800": "#1c553d",
      "900": "#164330",
    },
    swatches: ["#2f8f63", "#16a34a", "#10b981", "#3f8f3a", "#0d9488", "#5b8c5a", "#2563eb", "#7c3aed"],
  },
  gray: {
    key: "gray",
    label: "文字・線（墨）",
    role: "本文・補足・罫線・主ボタン（900）",
    anchor: "900",
    stops: {
      "50": "#f7f8fa",
      "100": "#f1f3f6",
      "200": "#eceef2",
      "300": "#cdd2d9",
      "400": "#9aa1ab",
      "500": "#6e747d",
      "600": "#4d535c",
      "700": "#3a3f46",
      "800": "#25292e",
      "900": "#16191d",
      "950": "#0d0f12",
    },
    swatches: ["#16191d", "#111827", "#1f2a37", "#1c2433", "#2b2522", "#1d2a24", "#231f2e", "#000000"],
  },
};

export const SCALE_ORDER: ScaleKey[] = ["brand", "accent", "emerald", "gray"];

export type SurfaceDef = { key: SurfaceKey; label: string; role: string; value: string; swatches: string[] };

export const CURRENT_SURFACES: Record<SurfaceKey, SurfaceDef> = {
  page: {
    key: "page",
    label: "ページの地",
    role: "画面全体の背景（--background）",
    value: "#ffffff",
    swatches: ["#ffffff", "#f6f8fb", "#fafaf7", "#f7f5f0", "#f4f6f4", "#f5f3f8", "#eef2f7", "#16191d"],
  },
  surface: {
    key: "surface",
    label: "カードの面",
    role: "カード・タイルの地（/today・/progress）",
    value: "#ffffff",
    swatches: ["#ffffff", "#fcfcfd", "#fbfaf7", "#f8fafc", "#fffdf8", "#f9f9fb", "#1f2328"],
  },
  washLine: {
    key: "washLine",
    label: "淡いパネルの線",
    role: "淡いパネル（テーマカラー50）の区切り線",
    value: "#dfe7f3",
    swatches: ["#dfe7f3", "#e5e7eb", "#e8e2d6", "#dde8e1", "#e4dff0", "#2c3440"],
  },
};

export const SURFACE_ORDER: SurfaceKey[] = ["page", "surface", "washLine"];

export type ThemeState = {
  surfaces: Record<SurfaceKey, string>;
  scales: Record<ScaleKey, { anchor: string; stops: Record<string, string> }>;
  panel: PanelState;
  parts: Partial<Record<PartKey, string>>;
  backdrop: BackdropState;
};

export function currentTheme(): ThemeState {
  return {
    surfaces: {
      page: CURRENT_SURFACES.page.value,
      surface: CURRENT_SURFACES.surface.value,
      washLine: CURRENT_SURFACES.washLine.value,
    },
    panel: defaultPanel(),
    parts: {},
    backdrop: defaultBackdrop(),
    scales: Object.fromEntries(
      SCALE_ORDER.map((key) => {
        const def = CURRENT_SCALES[key];
        return [key, { anchor: def.stops[def.anchor], stops: { ...def.stops } }];
      }),
    ) as ThemeState["scales"],
  };
}

/** 基準色を変え、段階を現行の関係のまま作り直す（段ごとの個別調整は破棄）。 */
export function withAnchor(theme: ThemeState, key: ScaleKey, hex: string): ThemeState {
  const def = CURRENT_SCALES[key];
  const base = normalizeHex(hex);
  if (!base) return theme;
  return {
    ...theme,
    scales: { ...theme.scales, [key]: { anchor: base, stops: deriveScale(def.stops, def.anchor, base) } },
  };
}

export function withStop(theme: ThemeState, key: ScaleKey, stop: string, hex: string): ThemeState {
  const value = normalizeHex(hex);
  if (!value) return theme;
  const scale = theme.scales[key];
  const anchor = stop === CURRENT_SCALES[key].anchor ? value : scale.anchor;
  return {
    ...theme,
    scales: { ...theme.scales, [key]: { anchor, stops: { ...scale.stops, [stop]: value } } },
  };
}

export function withSurface(theme: ThemeState, key: SurfaceKey, hex: string): ThemeState {
  const value = normalizeHex(hex);
  if (!value) return theme;
  return { ...theme, surfaces: { ...theme.surfaces, [key]: value } };
}

export function withPanelFill(theme: ThemeState, fill: PanelFill): ThemeState {
  return { ...theme, panel: { ...theme.panel, fill } };
}

/** hex=null でテーマ連動に戻す */
export function withPanelColor(theme: ThemeState, key: PanelColorKey, hex: string | null): ThemeState {
  const colors = { ...theme.panel.colors };
  const value = hex === null ? null : normalizeHex(hex);
  if (value) colors[key] = value;
  else delete colors[key];
  return { ...theme, panel: { ...theme.panel, colors } };
}

/** hex=null でテーマ連動に戻す */
export function withPart(theme: ThemeState, key: PartKey, hex: string | null): ThemeState {
  const parts = { ...theme.parts };
  const value = hex === null ? null : normalizeHex(hex);
  if (value) parts[key] = value;
  else delete parts[key];
  return { ...theme, parts };
}

export function withBackdrop(theme: ThemeState, patch: Partial<BackdropState>): ThemeState {
  return { ...theme, backdrop: { ...theme.backdrop, ...patch } };
}

/** 配色だけ差し替え、パネル・部品・背景画像の設定は今のものを保つ（プリセット用） */
export function withColorsFrom(theme: ThemeState, colors: ThemeState): ThemeState {
  return { ...colors, panel: theme.panel, parts: theme.parts, backdrop: theme.backdrop };
}

/** テーマ連動の色が今の配色で何色になるか（色欄の表示用） */
export function autoPanelHex(theme: ThemeState, key: PanelColorKey): string {
  const brand = theme.scales.brand.stops;
  switch (key) {
    case "from":
      return brand["100"];
    case "to":
      return theme.surfaces.surface;
    case "glow1":
      return brand["200"];
    case "glow2":
      return theme.scales.accent.stops["200"];
    case "dot":
      return brand["300"];
    default:
      return brand["50"];
  }
}

export function autoPartHex(theme: ThemeState, key: PartKey): string {
  return key === "nav" ? theme.surfaces.surface : theme.scales.gray.stops["900"];
}

export { PANEL_COLORS };

export type ThemePreset = { id: string; label: string; build: () => ThemeState };

function fromAnchors(anchors: Partial<Record<ScaleKey, string>>, surfaces?: Partial<Record<SurfaceKey, string>>) {
  return () => {
    let theme = currentTheme();
    for (const key of SCALE_ORDER) {
      const hex = anchors[key];
      if (hex) theme = withAnchor(theme, key, hex);
    }
    return { ...theme, surfaces: { ...theme.surfaces, ...surfaces } };
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "current", label: "現行（クリア）", build: currentTheme },
  {
    id: "july-blue",
    label: "7月の明るい青",
    build: () => {
      const theme = currentTheme();
      return {
        ...theme,
        surfaces: { ...theme.surfaces, page: "#f6f8fb" },
        scales: {
          ...theme.scales,
          brand: {
            anchor: "#187bd7",
            stops: {
              "50": "#eff7ff", "100": "#dbecff", "200": "#b8d9ff", "300": "#86bdff", "400": "#4f9df2",
              "500": "#187bd7", "600": "#0868c9", "700": "#0756a8", "800": "#0b4687", "900": "#103a6b",
              "950": "#0a2445",
            },
          },
          accent: {
            anchor: "#f58a17",
            stops: {
              "50": "#fff7ed", "100": "#ffedd5", "200": "#fed7aa", "300": "#fdba74", "400": "#fb923c",
              "500": "#f58a17", "600": "#d96c0b", "700": "#b45309", "800": "#8a3c08",
            },
          },
        },
      };
    },
  },
  { id: "indigo-kaki", label: "藍と柿", build: fromAnchors({ brand: "#1d6285", accent: "#c8642d" }, { page: "#fafaf7", washLine: "#e8e2d6" }) },
  { id: "forest", label: "深緑と金", build: fromAnchors({ brand: "#0f766e", accent: "#d9a326", emerald: "#3f8f3a", gray: "#1d2a24" }, { washLine: "#dde8e1" }) },
  { id: "violet", label: "すみれと珊瑚", build: fromAnchors({ brand: "#6d4bd8", accent: "#e0664f", gray: "#231f2e" }, { washLine: "#e4dff0" }) },
];

const SURFACE_VARS: Record<SurfaceKey, string> = {
  page: "--background",
  surface: "--theme-surface",
  washLine: "--theme-wash-line",
};

/** プレビューの iframe に差し込む CSS。:root の変数を上書きする。 */
export function themeToCss(theme: ThemeState): string {
  const lines: string[] = [];
  for (const key of SURFACE_ORDER) lines.push(`  ${SURFACE_VARS[key]}: ${theme.surfaces[key]};`);
  lines.push(`  --foreground: ${theme.scales.gray.stops["900"]};`);
  lines.push(`  --theme-wash: ${panelFillCss(theme.panel)};`);
  const parts = partsCss(theme.parts);
  lines.push(...parts.vars);
  for (const key of SCALE_ORDER) {
    for (const [stop, hex] of Object.entries(theme.scales[key].stops)) {
      lines.push(`  --color-${key}-${stop}: ${hex};`);
    }
  }
  // bg-white で塗っているカードもプレビューでは「カードの面」に揃える
  const whiteSurfaces = [
    ".bg-white { background-color: var(--theme-surface) !important; }",
    ".bg-white\\/95 { background-color: color-mix(in oklab, var(--theme-surface) 95%, transparent) !important; }",
    "@media (min-width: 1024px) { .lg\\:bg-white { background-color: var(--theme-surface) !important; } }",
  ];
  return `:root {\n${lines.join("\n")}\n}\n${[...whiteSurfaces, ...parts.rules].join("\n")}\n`;
}

/** globals.css へ貼り戻す形の書き出し。 */
export function themeToGlobalsSnippet(theme: ThemeState): string {
  const theming = SCALE_ORDER.map((key) =>
    Object.entries(theme.scales[key].stops)
      .map(([stop, hex]) => `  --color-${key}-${stop}: ${hex};`)
      .join("\n"),
  ).join("\n\n");
  return [
    "@theme {",
    theming,
    "}",
    "",
    ":root {",
    `  --background: ${theme.surfaces.page};`,
    `  --foreground: ${theme.scales.gray.stops["900"]};`,
    `  --theme-surface: ${theme.surfaces.surface};`,
    `  --theme-wash-line: ${theme.surfaces.washLine};`,
    `  --theme-wash: ${panelFillCss(theme.panel)};`,
    ...partsCss(theme.parts).vars,
    "}",
    ...partsCss(theme.parts).rules,
    ...(theme.backdrop.imageId
      ? ["", `/* 背景画像: ${theme.backdrop.imageId}（${theme.backdrop.placement === "top" ? "上部" : "全面"}・濃さ ${theme.backdrop.strength}%） */`]
      : []),
    "",
  ].join("\n");
}

/** localStorage 等から戻した値を検証する。形が合わなければ null。 */
export function parseTheme(value: unknown): ThemeState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ThemeState>;
  const base = currentTheme();
  if (!v.surfaces || !v.scales) return null;
  for (const key of SURFACE_ORDER) {
    const hex = normalizeHex(String(v.surfaces[key] ?? ""));
    if (!hex) return null;
    base.surfaces[key] = hex;
  }
  // パネル・部品・背景画像は後から足した項目なので、無ければ既定値で読む
  base.panel = parsePanel(v.panel);
  base.parts = parseParts(v.parts);
  base.backdrop = parseBackdrop(v.backdrop);
  for (const key of SCALE_ORDER) {
    const scale = v.scales[key];
    if (!scale) return null;
    const anchor = normalizeHex(String(scale.anchor ?? ""));
    if (!anchor) return null;
    base.scales[key].anchor = anchor;
    for (const stop of Object.keys(CURRENT_SCALES[key].stops)) {
      const hex = normalizeHex(String(scale.stops?.[stop] ?? ""));
      if (!hex) return null;
      base.scales[key].stops[stop] = hex;
    }
  }
  return base;
}
