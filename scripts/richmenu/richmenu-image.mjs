/**
 * ITパスポート学習コーチ の LINE リッチメニュー画像を生成する。
 *
 * - サイズは LINE 推奨の 2500x1686（フルサイズ）。
 * - 2x2 グリッドで「今日 / 復習 / 進捗 / ヘルプ」の 4 ボタンを配置する。
 * - 絵文字はカラー描画できない環境があるため、アイコンは SVG のベクターで自作する。
 * - 日本語ラベルは Hiragino Sans で描画（macOS / sharp の librsvg で描画確認済み）。
 *
 * 使い方:
 *   node scripts/richmenu/richmenu-image.mjs            # プレビューPNGを書き出す
 *   import { buildRichMenuPng } from "./richmenu-image.mjs"  # Buffer を得る
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

export const RICH_MENU_SIZE = { width: 2500, height: 1686 };

const COL_W = RICH_MENU_SIZE.width / 2; // 1250
const ROW_H = RICH_MENU_SIZE.height / 2; // 843

// macOS は Hiragino、Linux(CI) は Noto CJK を使う。CI 側で fonts-noto-cjk の導入が必要。
const FONT = "Hiragino Sans, Noto Sans CJK JP, Noto Sans JP, sans-serif";

/**
 * 4 ボタンの定義。`text` は LINE の message アクションで送る文言で、
 * webhook（buildReplyText）が認識する語と一致させること。
 */
export const BUTTONS = [
  { key: "today", text: "今日", title: "今日の学習", sub: "今日やることを見る", accent: "#fbbf24", icon: bookIcon },
  { key: "review", text: "復習", title: "復習", sub: "間違い・苦手を克服", accent: "#fb923c", icon: refreshIcon },
  { key: "progress", text: "進捗", title: "進捗", sub: "学習の進み具合", accent: "#38bdf8", icon: pinIcon },
  { key: "help", text: "ヘルプ", title: "ヘルプ", sub: "使い方を見る", accent: "#c4b5fd", icon: questionIcon },
];

/** 開いた本（今日の学習）。 */
function bookIcon(cx, cy, color) {
  return `
    <path d="M ${cx} ${cy - 95}
             C ${cx - 40} ${cy - 120}, ${cx - 120} ${cy - 110}, ${cx - 135} ${cy - 85}
             L ${cx - 135} ${cy + 95}
             C ${cx - 120} ${cy + 70}, ${cx - 40} ${cy + 60}, ${cx} ${cy + 85} Z" fill="${color}"/>
    <path d="M ${cx} ${cy - 95}
             C ${cx + 40} ${cy - 120}, ${cx + 120} ${cy - 110}, ${cx + 135} ${cy - 85}
             L ${cx + 135} ${cy + 95}
             C ${cx + 120} ${cy + 70}, ${cx + 40} ${cy + 60}, ${cx} ${cy + 85} Z" fill="${color}" fill-opacity="0.7"/>`;
}

/** 円を描く矢印（復習＝繰り返し）。 */
function refreshIcon(cx, cy, color) {
  const R = 105;
  return `
    <path d="M ${cx - R} ${cy}
             A ${R} ${R} 0 1 1 ${cx + R * 0.7} ${cy + R * 0.7}"
          fill="none" stroke="${color}" stroke-width="26" stroke-linecap="round"/>
    <polygon points="${cx - R - 28},${cy - 20} ${cx - R + 28},${cy - 20} ${cx - R},${cy + 34}" fill="${color}"/>`;
}

/** マップピン（進捗）。 */
function pinIcon(cx, cy, color) {
  const topY = cy - 50;
  return `
    <path d="M ${cx} ${cy + 125}
             C ${cx - 80} ${cy + 10}, ${cx - 80} ${topY}, ${cx} ${topY - 0}
             M ${cx} ${cy + 125}
             C ${cx + 80} ${cy + 10}, ${cx + 80} ${topY}, ${cx} ${topY - 0} Z" fill="none"/>
    <path d="M ${cx} ${cy + 130}
             C ${cx - 90} ${cy + 5}, ${cx - 78} ${cy - 120}, ${cx} ${cy - 120}
             C ${cx + 78} ${cy - 120}, ${cx + 90} ${cy + 5}, ${cx} ${cy + 130} Z" fill="${color}"/>
    <circle cx="${cx}" cy="${cy - 45}" r="34" fill="#1e1b4b"/>`;
}

/** 疑問符（ヘルプ）。 */
function questionIcon(cx, cy, color) {
  return `
    <circle cx="${cx}" cy="${cy}" r="105" fill="none" stroke="${color}" stroke-width="18"/>
    <text x="${cx}" y="${cy + 56}" font-family="${FONT}" font-size="150" font-weight="700"
          fill="${color}" text-anchor="middle">?</text>`;
}

/** 1 つのカード（ボタン）を描く。col,row は 0/1。 */
function card(btn, col, row) {
  const M = 70; // 外周マージン
  const G = 60; // カード間ギャップ
  const x = col === 0 ? M : COL_W + G / 2;
  const y = row === 0 ? M : ROW_H + G / 2;
  const w = COL_W - M - G / 2;
  const h = ROW_H - M - G / 2;
  const cx = x + w / 2;
  const iconCy = y + h * 0.36;
  const titleY = y + h * 0.68;
  const subY = y + h * 0.82;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="48"
            fill="#ffffff" fill-opacity="0.05"
            stroke="${btn.accent}" stroke-opacity="0.45" stroke-width="3"/>
      <rect x="${x}" y="${y}" width="${w}" height="10" rx="5" fill="${btn.accent}" fill-opacity="0.85"/>
      ${btn.icon(cx, iconCy, btn.accent)}
      <text x="${cx}" y="${titleY}" font-family="${FONT}" font-size="92" font-weight="700"
            fill="#ffffff" text-anchor="middle">${btn.title}</text>
      <text x="${cx}" y="${subY}" font-family="${FONT}" font-size="46"
            fill="#c7d2fe" text-anchor="middle">${btn.sub}</text>
    </g>`;
}

/** リッチメニュー全体の SVG を組み立てる。 */
export function buildRichMenuSvg() {
  const cards = [
    card(BUTTONS[0], 0, 0),
    card(BUTTONS[1], 1, 0),
    card(BUTTONS[2], 0, 1),
    card(BUTTONS[3], 1, 1),
  ].join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${RICH_MENU_SIZE.width}" height="${RICH_MENU_SIZE.height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1e1b4b"/>
        <stop offset="1" stop-color="#312e81"/>
      </linearGradient>
    </defs>
    <rect width="${RICH_MENU_SIZE.width}" height="${RICH_MENU_SIZE.height}" fill="url(#bg)"/>
    ${cards}
  </svg>`;
}

/** SVG を PNG の Buffer にして返す。 */
export async function buildRichMenuPng() {
  return sharp(Buffer.from(buildRichMenuSvg())).png().toBuffer();
}

// 直接実行された場合はプレビュー PNG を書き出す。
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "richmenu-preview.png");
  const buf = await buildRichMenuPng();
  await sharp(buf).toFile(out);
  console.log(`Wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
}
