// モチットの成長を本体SVGの中に描き足すための純粋ロジック（DOM非依存）。
// 座標はすべて mochitSvgMarkup のマスター座標（Mochit_Root の scale 前）。
// - 頭の芽: 段階2で横に小枝と葉 → 3で葉が2枚 → 4でつぼみ → 5で花ひらく（Anim_Antenna の中に置くので芽と一緒に揺れる）
// - 胸の回路: 段階3で上へ枝分かれ → 4で下へも伸びる（色は個性）
// - コアの3本のバー: 左からストラテジ・マネジメント・テクノロジの育ち（下端支点で伸びる）
import type { MochitFieldLevel, MochitPersonality } from "@/lib/mochit";
import type { MochitGrowthStage } from "./mochitTypes";

const INK = "#021C48";
const LEAF = "#8CF1D9";
const DEFAULT_CIRCUIT = "#52D1BC";

export type MochitGrowthPalette = { circuit: string; flower: string };

/** 個性ごとの色。undecided は原画の回路色のまま。 */
export const MOCHIT_GROWTH_PALETTES: Record<MochitPersonality, MochitGrowthPalette> = {
  undecided: { circuit: DEFAULT_CIRCUIT, flower: "#F7A8C4" },
  balanced: { circuit: DEFAULT_CIRCUIT, flower: "#F7A8C4" },
  strategy: { circuit: "#E9A93A", flower: "#F5B841" },
  management: { circuit: "#9C86EC", flower: "#B9A4F6" },
  technology: { circuit: "#3AA8E8", flower: "#7CC8F4" },
};

/** 描き足した要素に付ける目印（差し替え時にまとめて外す）。 */
export const GROWTH_DECOR_ATTR = "data-growth-decor";
/** 段階4以上でゆっくり明滅させる回路の先端。 */
export const GROWTH_PULSE_ATTR = "data-growth-pulse";

const TWIG = `<path d="M708,306 C690,268 668,236 640,200" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
const TIP_LEAF = `<g transform="translate(640,200) rotate(-20) scale(1.45)"><path d="M0,0 C-12,-20 -8,-46 12,-60 C30,-42 28,-16 0,0 Z" fill="${LEAF}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/></g>`;
const SIDE_LEAF = `<g transform="translate(682,256) rotate(-80) scale(1.4)"><path d="M0,0 C-6,-26 6,-52 30,-60 C40,-36 30,-10 0,0 Z" fill="${LEAF}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/></g>`;

function bud(color: string): string {
  return `<g transform="translate(640,196) rotate(-20) scale(1.4)"><path d="M0,6 C-22,-6 -18,-38 0,-52 C18,-38 22,-6 0,6 Z" fill="${color}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/><path d="M0,2 C-5,-14 -4,-28 0,-38" fill="none" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/></g>`;
}

function bloom(color: string): string {
  const petals = [0, 72, 144, 216, 288]
    .map((deg) => `<ellipse cx="0" cy="-30" rx="20" ry="28" transform="rotate(${deg})" fill="${color}" stroke="${INK}" stroke-width="9"/>`)
    .join("");
  return `<g transform="translate(634,168) scale(1.35)">${petals}<circle r="17" fill="#FFF3C4" stroke="${INK}" stroke-width="8"/></g>`;
}

/** 頭の芽の後ろに差し込む小枝・葉・つぼみ・花。段階1は何も足さない。 */
export function buildGrowthAntennaMarkup(stage: MochitGrowthStage, palette: MochitGrowthPalette): string {
  switch (stage) {
    case 1:
      return "";
    case 2:
      return TWIG + TIP_LEAF;
    case 3:
      return TWIG + TIP_LEAF + SIDE_LEAF;
    case 4:
      return TWIG + SIDE_LEAF + bud(palette.flower);
    default:
      return TWIG + SIDE_LEAF + bloom(palette.flower);
  }
}

/** 胸の回路から伸びる枝。Circuit_L の手前（＝コアより奥）に差し込む。 */
export function buildGrowthCircuitMarkup(stage: MochitGrowthStage, palette: MochitGrowthPalette): string {
  if (stage < 3) return "";
  const up =
    `<path d="M410,828 C398,808 392,790 392,770"/><circle ${GROWTH_PULSE_ATTR}="" cx="392" cy="756" r="13"/>` +
    `<path d="M826,828 C838,808 844,790 844,770"/><circle ${GROWTH_PULSE_ATTR}="" cx="844" cy="756" r="13"/>`;
  const down =
    stage >= 4
      ? `<path d="M512,890 C500,912 486,922 466,926"/><circle ${GROWTH_PULSE_ATTR}="" cx="452" cy="928" r="12"/>` +
        `<path d="M724,890 C736,912 750,922 770,926"/><circle ${GROWTH_PULSE_ATTR}="" cx="784" cy="928" r="12"/>`
      : "";
  return `<g fill="none" stroke="${palette.circuit}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${up}${down}</g>`;
}

/** 段階5で芽の葉の後ろにともる淡い光。 */
export function buildGrowthHaloMarkup(stage: MochitGrowthStage): string {
  if (stage < 5) return "";
  return `<circle cx="700" cy="230" r="150" fill="url(#coreGlowGrad)" opacity="0.55"/>`;
}

// Core_Bar の下端（y+height）。バー2だけ背が高い。
const CORE_BAR_BOTTOMS = [881, 887, 881] as const;
const CORE_BAR_CENTERS_X = [582, 623, 661] as const;
/** 分野Lv → バーの伸び（1=原画の長さ）。 */
const CORE_BAR_SCALE: Record<MochitFieldLevel, number> = { 0: 0.34, 1: 0.5, 2: 0.66, 3: 0.83, 4: 1 };
/** 分野Lv → バーの不透明度。Lv0 は消えかけの白。 */
const CORE_BAR_OPACITY: Record<MochitFieldLevel, number> = { 0: 0.45, 1: 0.8, 2: 0.9, 3: 1, 4: 1 };

export type CoreBarStyle = { transform: string; opacity: string };

/** index=0〜2 のバーの style（下端支点で縦に縮める）。 */
export function coreBarStyle(index: 0 | 1 | 2, level: MochitFieldLevel): CoreBarStyle {
  const scale = CORE_BAR_SCALE[level];
  const x = CORE_BAR_CENTERS_X[index];
  const y = CORE_BAR_BOTTOMS[index];
  return {
    transform: scale === 1 ? "" : `translate(${x}px, ${y}px) scale(1, ${scale}) translate(${-x}px, ${-y}px)`,
    opacity: level >= 3 ? "" : String(CORE_BAR_OPACITY[level]),
  };
}

/** "0,2,4" → [0,2,4]。壊れた値は0扱い。props を primitive で渡すための符号化。 */
export function parseFieldLevels(key: string | undefined): [MochitFieldLevel, MochitFieldLevel, MochitFieldLevel] | null {
  if (!key) return null;
  const parts = key.split(",").map((v) => Math.max(0, Math.min(4, Math.trunc(Number(v)) || 0)) as MochitFieldLevel);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function fieldLevelsKey(levels: readonly MochitFieldLevel[]): string {
  return levels.join(",");
}
