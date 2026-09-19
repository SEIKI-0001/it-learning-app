// 配色ラボの「装飾」側の設定: 淡いパネルの塗り方、部品ごとの色、背景画像。
// 色は未指定ならテーマのトークンに連動し（CSS 変数参照）、指定すればその色で固定する。

export type PanelFill = "flat" | "gradient" | "glow" | "dots" | "none";
export type PanelColorKey = "base" | "from" | "to" | "glow1" | "glow2" | "dot";

export type PanelState = {
  fill: PanelFill;
  /** 未指定の色はテーマ連動 */
  colors: Partial<Record<PanelColorKey, string>>;
};

export const PANEL_FILLS: { id: PanelFill; label: string; colors: PanelColorKey[] }[] = [
  { id: "flat", label: "ベタ塗り", colors: ["base"] },
  { id: "gradient", label: "グラデーション", colors: ["from", "base", "to"] },
  { id: "glow", label: "ソフトグロー", colors: ["base", "glow1", "glow2"] },
  { id: "dots", label: "ドット", colors: ["base", "dot"] },
  { id: "none", label: "色なし", colors: [] },
];

export const PANEL_COLORS: Record<PanelColorKey, { label: string; autoLabel: string; auto: string }> = {
  base: { label: "地の色", autoLabel: "テーマカラー 50", auto: "var(--color-brand-50)" },
  from: { label: "始まりの色", autoLabel: "テーマカラー 100", auto: "var(--color-brand-100)" },
  to: { label: "終わりの色", autoLabel: "カードの面", auto: "var(--theme-surface, #ffffff)" },
  glow1: { label: "光の色 1", autoLabel: "テーマカラー 200", auto: "var(--color-brand-200)" },
  glow2: { label: "光の色 2", autoLabel: "アクセント 200", auto: "var(--color-accent-200)" },
  dot: {
    label: "ドットの色",
    autoLabel: "テーマカラー 300（半透明）",
    auto: "color-mix(in srgb, var(--color-brand-300) 55%, transparent)",
  },
};

const PANEL_FILL_IDS = PANEL_FILLS.map((f) => f.id);

export function defaultPanel(): PanelState {
  return { fill: "flat", colors: {} };
}

function panelColor(panel: PanelState, key: PanelColorKey): string {
  return panel.colors[key] ?? PANEL_COLORS[key].auto;
}

/** 淡いパネルの background（--theme-wash）に入れる値。 */
export function panelFillCss(panel: PanelState): string {
  const c = (key: PanelColorKey) => panelColor(panel, key);
  switch (panel.fill) {
    case "gradient":
      return `linear-gradient(135deg, ${c("from")} 0%, ${c("base")} 55%, ${c("to")} 100%)`;
    case "glow":
      // ぼかした光だまりを重ねる（ソフトグロー / メッシュ風）
      return [
        `radial-gradient(70% 100% at 8% 12%, ${c("glow1")} 0%, transparent 72%)`,
        `radial-gradient(60% 95% at 95% 20%, color-mix(in srgb, ${c("glow2")} 90%, transparent) 0%, transparent 72%)`,
        `radial-gradient(90% 80% at 55% 115%, color-mix(in srgb, ${c("glow1")} 70%, transparent) 0%, transparent 72%)`,
        c("base"),
      ].join(", ");
    case "dots":
      return `radial-gradient(circle, ${c("dot")} 1px, transparent 1.5px) 0 0 / 12px 12px, ${c("base")}`;
    case "none":
      return "transparent";
    default:
      return c("base");
  }
}

// ───────── 部品ごとの色（未指定ならテーマ連動） ─────────

export type PartKey = "nav" | "cta";

export const PARTS: Record<PartKey, { label: string; role: string; autoLabel: string }> = {
  nav: { label: "ナビの面", role: "下部ナビ（PCでは左サイドバー）の地", autoLabel: "カードの面" },
  cta: { label: "主ボタンの色", role: "「はじめる」などいちばん強いボタン", autoLabel: "墨 900" },
};

export const PART_ORDER: PartKey[] = ["nav", "cta"];

export function partsCss(parts: Partial<Record<PartKey, string>>): { vars: string[]; rules: string[] } {
  const vars: string[] = [];
  const rules: string[] = [];
  if (parts.cta) {
    vars.push(`  --theme-cta: ${parts.cta};`);
    vars.push(`  --theme-cta-hover: color-mix(in srgb, ${parts.cta} 80%, #000000);`);
  }
  if (parts.nav) {
    rules.push(`nav[data-app-nav] { background-color: ${parts.nav} !important; }`);
  }
  return { vars, rules };
}

// ───────── 背景画像 ─────────

export type BackdropPlacement = "full" | "top";

export type BackdropState = {
  /** サンプルの id、"custom"（手元の画像）、または null（なし） */
  imageId: string | null;
  placement: BackdropPlacement;
  /** 画像の見え方（10〜100） */
  strength: number;
};

export type BackdropSample = {
  id: string;
  label: string;
  kind: "写真" | "イラスト";
  /** cover=画面いっぱいに1枚 / tile=模様として敷き詰める */
  mode: "cover" | "tile";
  /** public/ 配下のパス（Artifact 版はデータURLに差し替える） */
  src: string;
  credit: string;
};

export const BACKDROP_SAMPLES: BackdropSample[] = [
  {
    id: "nature-lake",
    label: "湖と山",
    kind: "写真",
    mode: "cover",
    src: "/theme-lab/nature-lake.jpg",
    credit: "Wikimedia Commons「Lake Mountain Landscape」CC0",
  },
  {
    id: "nature-frost",
    label: "霧氷の森",
    kind: "写真",
    mode: "cover",
    src: "/theme-lab/nature-frost.jpg",
    credit: "Wikimedia Commons（U.S. Fish and Wildlife Service）パブリックドメイン",
  },
  {
    id: "office-desks",
    label: "オープンオフィス",
    kind: "写真",
    mode: "cover",
    src: "/theme-lab/office-desks.jpg",
    credit: "Wikimedia Commons「Desks in an open office space」CC0（Unsplash）",
  },
  {
    id: "illust-hills",
    label: "やわらかな山並み",
    kind: "イラスト",
    mode: "cover",
    src: "/theme-lab/illust-hills.svg",
    credit: "このラボ用に作成",
  },
  {
    id: "illust-shapes",
    label: "図形パターン",
    kind: "イラスト",
    mode: "tile",
    src: "/theme-lab/illust-shapes.svg",
    credit: "このラボ用に作成",
  },
];

export function defaultBackdrop(): BackdropState {
  return { imageId: null, placement: "full", strength: 45 };
}

/** 背景画像の CSS。本文の後ろに body::before で敷き、濃さは不透明度で調整する。 */
export function backdropCss(backdrop: BackdropState, src: string | null, mode: "cover" | "tile"): string {
  if (!backdrop.imageId || !src) return "";
  const url = `url("${src}")`;
  const image = mode === "tile" ? `${url} 0 0 / 360px 360px repeat` : `${url} center / cover no-repeat`;
  const opacity = Math.min(100, Math.max(10, backdrop.strength)) / 100;
  const layout =
    backdrop.placement === "top"
      ? "position: absolute; inset: 0 0 auto 0; height: 460px; -webkit-mask-image: linear-gradient(#000 45%, transparent); mask-image: linear-gradient(#000 45%, transparent);"
      : "position: fixed; inset: 0;";
  return [
    "body { position: relative; isolation: isolate; }",
    `body::before { content: ""; ${layout} background: ${image}; opacity: ${opacity}; z-index: -1; pointer-events: none; }`,
  ].join("\n");
}

// ───────── 保存値の読み戻し ─────────

const HEX6 = /^#[0-9a-f]{6}$/;

export function parsePanel(value: unknown): PanelState {
  const panel = defaultPanel();
  if (!value || typeof value !== "object") return panel;
  const v = value as Partial<PanelState>;
  if (v.fill && PANEL_FILL_IDS.includes(v.fill)) panel.fill = v.fill;
  for (const key of Object.keys(PANEL_COLORS) as PanelColorKey[]) {
    const hex = v.colors?.[key];
    if (typeof hex === "string" && HEX6.test(hex)) panel.colors[key] = hex;
  }
  return panel;
}

export function parseParts(value: unknown): Partial<Record<PartKey, string>> {
  const parts: Partial<Record<PartKey, string>> = {};
  if (!value || typeof value !== "object") return parts;
  for (const key of PART_ORDER) {
    const hex = (value as Record<string, unknown>)[key];
    if (typeof hex === "string" && HEX6.test(hex)) parts[key] = hex;
  }
  return parts;
}

export function parseBackdrop(value: unknown): BackdropState {
  const backdrop = defaultBackdrop();
  if (!value || typeof value !== "object") return backdrop;
  const v = value as Partial<BackdropState>;
  if (v.imageId === "custom" || BACKDROP_SAMPLES.some((s) => s.id === v.imageId)) backdrop.imageId = v.imageId!;
  if (v.placement === "top" || v.placement === "full") backdrop.placement = v.placement;
  if (typeof v.strength === "number" && Number.isFinite(v.strength)) {
    backdrop.strength = Math.min(100, Math.max(10, Math.round(v.strength)));
  }
  return backdrop;
}
