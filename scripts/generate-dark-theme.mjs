#!/usr/bin/env node
// ダーク配色（html[data-theme="dark"]）の CSS を生成する → app/theme-dark.css
//
//   node scripts/generate-dark-theme.mjs
//
// 仕組み:
//   1. 色ランプ（gray / brand / emerald / rose …）の変数をダーク用に差し替える。
//      50〜300 は「暗い地に少しだけ色を混ぜた面・線」、600 以上は「暗い地で読める明るい文字色」になる。
//      Tailwind の bg-gray-50 / text-gray-700 / border-gray-200 などはこれだけでダークになる。
//   2. 同じ変数を「塗りつぶしの背景（bg-brand-600 に text-white など）」にも使っているので、
//      500 以上の bg-* はソースを走査して、ライト時と同じ濃さの塗りに戻すルールを出す。
//      bg-white（カード）も暗いカード色にする（text-white は白のまま残すため変数は触らない）。
//   3. 図解（模型・アニメ）は色を直書きしているので、[data-light-island] の中は
//      ライトの変数に戻し、明るい紙面のまま見せる（ExperienceSlideDeck が付ける）。
//
// 新しい画面で 500 以上の bg-* に透明度や新しい装飾子を付けたら、このスクリプトを再実行する。

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// ダークの面（/progress のダークと同じ値）
const PAGE = "#0f1722";
const CARD = "#172231";

// アイス（globals.css）の値。ダークの色相はアイスに合わせる
const ice = {
  brand: ["#f2f6fd", "#dfebff", "#c1d5f6", "#94b6f0", "#5b8ee9", "#2b6de2", "#175cd3", "#184ca4", "#194797", "#163977", "#0f254e"],
  accent: ["#fdf5ec", "#fff0d5", "#f2cda4", "#e7b275", "#e19f4c", "#d78b17", "#a46804", "#8d5109", "#754902", "#754902", "#5a3802"],
  emerald: ["#ddf2e9", "#cfede1", "#a9dec9", "#73c9ab", "#2dae89", "#12a07c", "#0c8064", "#066950", "#07513f", "#044433", "#03362a"],
};

// Tailwind 既定のランプ（node_modules/tailwindcss/theme.css から読む）
function tailwindPalette(name) {
  const css = readFileSync(join(root, "node_modules/tailwindcss/theme.css"), "utf8");
  return STEPS.map((step) => {
    const m = css.match(new RegExp(`--color-${name}-${step}:\\s*([^;]+);`));
    if (!m) throw new Error(`tailwind palette not found: ${name}-${step}`);
    return m[1].trim();
  });
}

const HUES = ["rose", "amber", "sky", "red", "orange", "yellow", "lime", "green", "teal", "cyan", "blue", "indigo", "violet", "purple", "pink", "fuchsia"];
const NEUTRALS = ["gray", "slate", "zinc", "neutral", "stone"];

const light = { ...ice };
for (const name of HUES) light[name] = tailwindPalette(name);

// 無彩色のダーク（/progress のダーク: 線 #2a3a4f・文字 #eef3fa / #b8c6d8 / #8fa1b8）
const NEUTRAL_DARK = ["#1b2738", "#1f2c3e", "#2a3a4f", "#3b4d64", "#6f8299", "#8fa1b8", "#b0bfd1", "#c9d5e3", "#dee6ef", "#eef3fa", "#f6f9fc"];
// 無彩色の塗り（bg-gray-900 + text-white のような濃い札・ボタン）
const NEUTRAL_FILL = { 500: "#4f627a", 600: "#45576e", 700: "#3d4f66", 800: "#34465d", 900: "#2f425a", 950: "#26374c" };

const mix = (color, pct, base = CARD) => `color-mix(in oklab, ${color} ${pct}%, ${base})`;

function darkRamp(l) {
  return [
    mix(l[5], 14),
    mix(l[5], 22),
    mix(l[5], 34),
    mix(l[5], 52),
    l[4],
    l[4],
    l[3],
    l[2],
    l[1],
    l[0],
    l[0],
  ];
}

// 塗りの背景はライトと同じ濃さ（白い文字が読める）。800 以上は 700 に揃える（暗い地に沈むため）
function fillFor(name, step) {
  if (NEUTRALS.includes(name)) return NEUTRAL_FILL[step];
  const l = light[name];
  if (!l) return null;
  const idx = STEPS.indexOf(step);
  return l[Math.min(idx, STEPS.indexOf(700))];
}

// ---- ソースを走査して、塗りに使っている bg-* を集める ----
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(path);
  }
  return out;
}

const PALETTES = [...Object.keys(ice), ...HUES, ...NEUTRALS].join("|");
const tokenRe = new RegExp(`(?<![\\w-])((?:[a-z-]+:)*)bg-(${PALETTES})-(500|600|700|800|900|950)(?:/(\\d+))?(?![\\w-])`, "g");
const VARIANTS = {
  "": "",
  "hover:": ":hover",
  "active:": ":active",
  "focus:": ":focus",
  "focus-visible:": ":focus-visible",
  "disabled:": ":disabled",
  "group-hover:": "GROUP_HOVER",
  "peer-checked:": "PEER_CHECKED",
};

const fills = new Map();
const skipped = new Set();
for (const file of [...walk(join(root, "app")), ...walk(join(root, "components"))]) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(tokenRe)) {
    const [token, variant, name, step, alpha] = m;
    if (!(variant in VARIANTS)) {
      skipped.add(token);
      continue;
    }
    fills.set(token, { variant, name, step: Number(step), alpha: alpha ? Number(alpha) : null });
  }
}

const escapeClass = (cls) => cls.replace(/[:/.[\]]/g, (c) => `\\${c}`);
const DARK = 'html[data-theme="dark"]';
const OUTSIDE_ISLAND = ":not([data-light-island] *)";

function selectorFor(token, variant) {
  const cls = `.${escapeClass(token)}`;
  const pseudo = VARIANTS[variant];
  if (pseudo === "GROUP_HOVER") return `${DARK} .group:hover ${cls}${OUTSIDE_ISLAND}`;
  if (pseudo === "PEER_CHECKED") return `${DARK} .peer:checked ~ ${cls}${OUTSIDE_ISLAND}`;
  return `${DARK} ${cls}${OUTSIDE_ISLAND}${pseudo}`;
}

const lines = [];
lines.push("/* このファイルは scripts/generate-dark-theme.mjs が生成する。直接編集しない。 */");
lines.push("/* ダーク配色: lib/theme.ts が <html data-theme=\"dark\"> を付けたときだけ効く。 */");
lines.push("");
lines.push(`${DARK} {`);
lines.push("  color-scheme: dark;");
lines.push(`  --background: ${PAGE};`);
lines.push("  --foreground: #eef3fa;");
for (const name of NEUTRALS) {
  STEPS.forEach((step, i) => lines.push(`  --color-${name}-${step}: ${NEUTRAL_DARK[i]};`));
}
for (const [name, l] of Object.entries(light)) {
  const d = darkRamp(l);
  STEPS.forEach((step, i) => lines.push(`  --color-${name}-${step}: ${d[i]};`));
}
lines.push("  --color-cta: #3d6be0;");
lines.push("  --color-cta-hover: #2f59c4;");
lines.push(`  --surface-card: ${CARD};`);
lines.push(`  --panel-bg: ${CARD};`);
lines.push("  --panel-border: #2a3a4f;");
lines.push(`  --card-bg: ${CARD};`);
lines.push("  --card-border: #2a3a4f;");
lines.push(`  --emph-bg: ${CARD};`);
lines.push("  --emph-hover: #1e2b3d;");
lines.push(`  --emph-bg-accent: ${CARD};`);
lines.push("  --emph-hover-accent: #2a2a2c;");
lines.push("  --emph-border: #2a3a4f;");
lines.push("  --emph-bar: 4px;");
lines.push("}");
lines.push("");

// 図解はライトのまま（明るい紙面）
lines.push(`/* 図解（模型・アニメ）は色を直書きしているので、明るい紙面のまま見せる */`);
lines.push(`${DARK} [data-light-island] {`);
lines.push("  color-scheme: light;");
lines.push("  --foreground: #0f172a;");
const iceGray = ["#f8fafc", "#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#5b6b80", "#475569", "#334155", "#1e293b", "#0f172a", "#020617"];
for (const name of NEUTRALS) {
  const l = name === "gray" ? iceGray : tailwindPalette(name);
  STEPS.forEach((step, i) => lines.push(`  --color-${name}-${step}: ${l[i]};`));
}
for (const [name, l] of Object.entries(light)) {
  STEPS.forEach((step, i) => lines.push(`  --color-${name}-${step}: ${l[i]};`));
}
lines.push("  --color-cta: #175cd3;");
lines.push("  --color-cta-hover: #184ca4;");
lines.push("  --surface-card: #ffffff;");
lines.push("  color: var(--foreground);");
lines.push("  background: #edf5fa;");
lines.push("  padding: 12px;");
lines.push("  border-radius: 14px;");
lines.push("}");
lines.push("");

// カード（bg-white）。text-white は白のまま
lines.push("/* カード（bg-white）を暗いカード色に。text-white は白のまま */");
const whiteTokens = new Set();
const whiteRe = /(?<![\w-])((?:[a-z-]+:)*)(bg|ring|border|divide)-white(?:\/(\d+))?(?![\w-])/g;
for (const file of [...walk(join(root, "app")), ...walk(join(root, "components"))]) {
  for (const m of readFileSync(file, "utf8").matchAll(whiteRe)) {
    if (m[1] in VARIANTS) whiteTokens.add(m[0]);
  }
}
const PROP = { bg: "background-color", ring: "--tw-ring-color", border: "border-color", divide: "border-color" };
for (const token of [...whiteTokens].sort()) {
  const m = token.match(/^((?:[a-z-]+:)*)(bg|ring|border|divide)-white(?:\/(\d+))?$/);
  const [, variant, kind, alpha] = m;
  const value = alpha ? `color-mix(in oklab, ${CARD} ${alpha}%, transparent)` : CARD;
  let sel = selectorFor(token, variant);
  if (kind === "divide") sel = `${sel} > :not(:last-child)`;
  lines.push(`${sel} { ${PROP[kind]}: ${value}; }`);
}
lines.push("");

lines.push("/* 塗りの背景（bg-*-500 以上）はライトと同じ濃さに戻す（白い文字を読めるように） */");
for (const [token, { variant, name, step, alpha }] of [...fills.entries()].sort()) {
  let value = fillFor(name, step);
  if (!value) continue;
  // 半透明の濃い灰は「暗幕」。暗い地でも暗幕のまま
  if (alpha !== null && NEUTRALS.includes(name) && step >= 800) value = `rgb(0 0 0 / ${Math.min(100, alpha + 15)}%)`;
  else if (alpha !== null) value = `color-mix(in oklab, ${value} ${alpha}%, transparent)`;
  lines.push(`${selectorFor(token, variant)} { background-color: ${value}; }`);
}
lines.push("");

writeFileSync(join(root, "app/theme-dark.css"), lines.join("\n"));
console.log(`app/theme-dark.css: fills=${fills.size} white=${whiteTokens.size}`);
if (skipped.size) console.log(`未対応の装飾子（ダークで明るい塗りのまま）: ${[...skipped].sort().join(" ")}`);
