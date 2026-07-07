// 初期アバター4種のSVGアート（オリジナル素材）。
//
// 描画ルール（全プリセット・全装備で統一）:
//   - viewBox は 0 0 120 120（AvatarRenderer が合成する）。
//   - 線は INK 色・太さ3・丸端で統一（2Dデフォルメ・清潔感のあるテイスト）。
//   - 頭は中心 (60,44) 半径21、胴体は M41 98 V80 Q41 64 60 64 Q79 64 79 80 V98 Z。
//     この共通ジオメトリに合わせることで、装備（AvatarItemArt）を全プリセットに
//     同じ座標で重ねられる。
//   - 色数は絞る: 線 INK / 肌 SKIN / 各タイプのアクセント1色＋髪1色まで。

import type { ReactElement } from "react";
import type { AvatarPresetId } from "@/types/avatar";

export const INK = "#3d4a5c";
export const SKIN = "#f7d9b9";

/** 胴体（シャツ）。全プリセット共通の形。 */
const TORSO_D = "M41 98 V80 Q41 64 60 64 Q79 64 79 80 V98 Z";

/** 顔（髪の下に見える肌の部分）。fringe = 前髪の輪郭で個性を出す。 */
function faceD(fringe: string): string {
  return `M39.5 44 ${fringe} 80.5 44 A20.5 20.5 0 0 1 39.5 44 Z`;
}

// ---------------------------------------------------------------------------
// まじめタイプ: きっちり前髪・穏やかな表情・インディゴのシャツ
// ---------------------------------------------------------------------------

const MAJIME = (
  <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d={TORSO_D} fill="#6366f1" />
    <path d="M53 65.5 L60 71 L67 65.5" fill="none" strokeWidth={2.5} />
    <circle cx={60} cy={44} r={21} fill="#3b4668" />
    <path d={faceD("Q46 32 60 32 Q74 32")} fill={SKIN} strokeWidth={2.5} />
    <circle cx={52} cy={47} r={2.2} fill={INK} stroke="none" />
    <circle cx={68} cy={47} r={2.2} fill={INK} stroke="none" />
    <path d="M55.5 54.5 Q60 58 64.5 54.5" fill="none" strokeWidth={2.5} />
  </g>
);

// ---------------------------------------------------------------------------
// 元気タイプ: ギザギザ前髪・大きな笑顔・アンバーのシャツ
// ---------------------------------------------------------------------------

const GENKI = (
  <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d={TORSO_D} fill="#f59e0b" />
    <path d="M53 65.5 L60 71 L67 65.5" fill="none" strokeWidth={2.5} />
    <circle cx={60} cy={44} r={21} fill="#9a5b33" />
    <path d="M62 24 Q67 15 73 17" fill="none" strokeWidth={2.5} />
    <path
      d={faceD("L46 35 L53 41 L60 33 L67 41 L74 35 L")}
      fill={SKIN}
      strokeWidth={2.5}
    />
    <circle cx={52} cy={47} r={2.2} fill={INK} stroke="none" />
    <circle cx={68} cy={47} r={2.2} fill={INK} stroke="none" />
    <circle cx={46} cy={52.5} r={2.4} fill="#f6b39a" stroke="none" opacity={0.75} />
    <circle cx={74} cy={52.5} r={2.4} fill="#f6b39a" stroke="none" opacity={0.75} />
    <path d="M54 52.5 Q60 60 66 52.5 Z" fill="#fff" strokeWidth={2.5} />
  </g>
);

// ---------------------------------------------------------------------------
// クールタイプ: 流し前髪・切れ長の目・ティールのシャツ
// ---------------------------------------------------------------------------

const COOL = (
  <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d={TORSO_D} fill="#14b8a6" />
    <path d="M53 65.5 L60 71 L67 65.5" fill="none" strokeWidth={2.5} />
    <circle cx={60} cy={44} r={21} fill="#2e6b66" />
    <path d={faceD("Q48 29 64 33 Q76 36")} fill={SKIN} strokeWidth={2.5} />
    <path d="M68 33.5 Q75 35.5 77.5 41" fill="none" strokeWidth={2.5} />
    <path d="M49 47 h6 M65 47 h6" fill="none" strokeWidth={2.5} />
    <path d="M56 55 h8" fill="none" strokeWidth={2.5} />
  </g>
);

// ---------------------------------------------------------------------------
// ロボ/マスコットタイプ: 角丸ヘッド・アンテナ・スクリーンの顔
// ---------------------------------------------------------------------------

const ROBO = (
  <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d={TORSO_D} fill="#dce5ef" />
    <rect x={52} y={74} width={16} height={10} rx={3} fill="#f8fafc" strokeWidth={2.5} />
    <circle cx={56.5} cy={79} r={1.6} fill="#38bdf8" stroke="none" />
    <circle cx={60.5} cy={79} r={1.6} fill="#aebccb" stroke="none" />
    <circle cx={64.5} cy={79} r={1.6} fill="#aebccb" stroke="none" />
    <path d="M60 25 V16" fill="none" strokeWidth={2.5} />
    <circle cx={60} cy={14} r={2.8} fill="#38bdf8" strokeWidth={2.5} />
    <circle cx={39.5} cy={45} r={3} fill="#94a3b8" strokeWidth={2.5} />
    <circle cx={80.5} cy={45} r={3} fill="#94a3b8" strokeWidth={2.5} />
    <rect x={41} y={25} width={38} height={38} rx={11} fill="#dce5ef" />
    <rect x={47.5} y={37} width={25} height={15} rx={5} fill="#233044" strokeWidth={2.5} />
    <circle cx={54.5} cy={44} r={2.3} fill="#7dd3fc" stroke="none" />
    <circle cx={65.5} cy={44} r={2.3} fill="#7dd3fc" stroke="none" />
    <path
      d="M56.5 48.5 Q60 51 63.5 48.5"
      fill="none"
      stroke="#7dd3fc"
      strokeWidth={2}
    />
  </g>
);

/** presetId → SVGアート。AvatarRenderer から参照する。 */
export const PRESET_ART: Record<AvatarPresetId, ReactElement> = {
  majime: MAJIME,
  genki: GENKI,
  cool: COOL,
  robo: ROBO,
};
