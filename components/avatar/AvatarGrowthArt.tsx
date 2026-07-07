// 成長段階のオーラ素材（オリジナル素材）。
// AvatarItemArt と同じ back/front レイヤー構成で、AvatarRenderer が
// stage に応じて合成する。段階1は素の姿（アートなし）。
//   - back: 素体の後ろに敷く光（装備の背景よりは前）。
//   - front: 顔にかからない位置のきらめき。
// 座標は共通ジオメトリ（頭(60,44)r21・胴〜y98）を避けて配置する。

import type { ReactElement } from "react";
import type { AvatarGrowthStage } from "@/lib/avatarGrowth";

/** 4方向にとがったきらめき。 */
function sparkle(
  x: number,
  y: number,
  r: number,
  fill: string,
  opacity = 1,
): ReactElement {
  const q = r * 0.22;
  return (
    <path
      d={`M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z`}
      fill={fill}
      stroke="none"
      opacity={opacity}
    />
  );
}

type GrowthArt = { back: ReactElement; front: ReactElement };

export const GROWTH_ART: Partial<Record<AvatarGrowthStage, GrowthArt>> = {
  // 成長期: ほのかな金色の光と小さなきらめき。
  2: {
    back: (
      <g stroke="none">
        <circle cx={60} cy={62} r={48} fill="#fcd34d" opacity={0.2} />
        <circle cx={60} cy={62} r={38} fill="#fde68a" opacity={0.26} />
      </g>
    ),
    front: (
      <g>
        {sparkle(27, 30, 3.4, "#f59e0b", 0.8)}
        {sparkle(94, 26, 2.6, "#fbbf24", 0.8)}
      </g>
    ),
  },
  // 歴戦: 強めのオーラ＋光の環＋きらめき3つ。
  3: {
    back: (
      <g>
        <circle cx={60} cy={62} r={52} fill="#fbbf24" opacity={0.24} stroke="none" />
        <circle cx={60} cy={62} r={42} fill="#fde68a" opacity={0.34} stroke="none" />
        <circle
          cx={60}
          cy={62}
          r={48}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="3 8"
          strokeLinecap="round"
          opacity={0.55}
        />
      </g>
    ),
    front: (
      <g>
        {sparkle(24, 32, 3.8, "#f59e0b", 0.85)}
        {sparkle(96, 24, 3, "#fbbf24", 0.85)}
        {sparkle(99, 74, 2.6, "#f59e0b", 0.7)}
      </g>
    ),
  },
};
