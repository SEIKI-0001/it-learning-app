// 配色ラボ（/dev/theme-lab）用の色計算。OKLCH で明度・彩度・色相を扱い、
// 現行トークンの段階（50〜950）の明度差・彩度比をそのまま新しい基準色へ写す。

export type Oklch = { l: number; c: number; h: number };

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** 色番号を #rrggbb にそろえる。全角（日本語入力のまま打った値）や空白まじりの貼り付けも受け付ける。 */
export function normalizeHex(input: string): string | null {
  const m = HEX_RE.exec(input.normalize("NFKC").replace(/\s+/g, ""));
  if (!m) return null;
  let hex = m[1].toLowerCase();
  if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
  return `#${hex}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? "#000000";
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinearRgb({ l: L, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** sRGB に収まらない場合は明度・色相を保ったまま彩度だけを下げる。 */
export function oklchToHex(color: Oklch): string {
  const l = Math.min(1, Math.max(0, color.l));
  let rgb = oklchToLinearRgb({ ...color, l });
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = color.c;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb({ l, c: mid, h: color.h }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinearRgb({ l, c: lo, h: color.h });
  }
  return rgbToHex(rgb.map((v) => toGamma(Math.min(1, Math.max(0, v)))) as [number, number, number]);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 のコントラスト比（1〜21）。 */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const CHROMATIC = 0.03;

/**
 * 元の段階（stops）の「基準段に対する明度・彩度・色相の関係」を保ったまま、
 * 基準段を newAnchor に置き換えた段階を作る。
 * - 明度: 基準より明るい段は [基準, 1]、暗い段は [0, 基準] の中で元の比率を保つ（段の順序が崩れない）。
 * - 彩度: 色みのある基準は比率で、ほぼ無彩色（グレー系）の基準は差分で写す。
 * - 色相: 元の段ごとの色相のずれを保つ。
 * newAnchor が元の基準色と同じなら、元の段階がそのまま返る。
 */
export function deriveScale(
  original: Record<string, string>,
  anchorStop: string,
  newAnchor: string,
): Record<string, string> {
  const base = normalizeHex(newAnchor);
  if (!base) return { ...original };
  const orig = hexToOklch(original[anchorStop]);
  const next = hexToOklch(base);
  const out: Record<string, string> = {};
  for (const [stop, hex] of Object.entries(original)) {
    if (stop === anchorStop) {
      out[stop] = base;
      continue;
    }
    const o = hexToOklch(hex);
    const l =
      o.l >= orig.l
        ? 1 - (1 - o.l) * ((1 - next.l) / Math.max(1e-6, 1 - orig.l))
        : o.l * (next.l / Math.max(1e-6, orig.l));
    const c =
      orig.c >= CHROMATIC ? next.c * (o.c / orig.c) : Math.max(0, next.c + (o.c - orig.c));
    // グレー系の基準に色みのある色を選んだときは、全段をその色相へ寄せる
    const h =
      orig.c >= CHROMATIC ? next.h + (o.h - orig.h) : next.c >= CHROMATIC ? next.h : o.h;
    out[stop] = oklchToHex({ l, c, h: (h + 360) % 360 });
  }
  return out;
}
