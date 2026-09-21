import { isoBox, isoLocal, points, type NodeState } from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";

// 暗号通信シーンの登場人物。デスクでノートPCを操作する人（A・B）と、
// 通信路の奥に立つ第三者。A は右向き、B は左右反転して A と向き合う。
// ジオメトリは network/NetworkHumanIllustration と同じ投影を使い、服の色だけ変える。

const desk = isoBox({ x0: -14, x1: 14, y0: -18, y1: 18, z0: 13, z1: 16 });
const legFront = isoBox({ x0: -13, x1: 13, y0: 14, y1: 17, z0: 0, z1: 13 });
const legBack = isoBox({ x0: -13, x1: 13, y0: -17, y1: -14, z0: 0, z1: 13 });
const modesty = points([
  isoLocal(-12, 14, 13),
  isoLocal(-12, -14, 13),
  isoLocal(-12, -14, 4),
  isoLocal(-12, 14, 4),
]);
const laptopBase = isoBox({ x0: -7, x1: 5, y0: -9, y1: 9, z0: 16, z1: 17.4 });
const lid = points([
  isoLocal(7, 9, 30.5),
  isoLocal(7, -9, 30.5),
  isoLocal(5, -9, 17.4),
  isoLocal(5, 9, 17.4),
]);
const lidLogo = isoLocal(6, 0, 24);
const person = isoLocal(-26, -4, 0);
const hand = isoLocal(-4, 1, 17.6);

const OUTFIT = {
  A: { shirt: "#3D7BE0", fold: "#2F62B8", hair: "#2B3140" },
  B: { shirt: "#8B5CF6", fold: "#6D3FD6", hair: "#5A3A22" },
} as const;

export function DeskPersonIllustration({ who, state }: { who: "A" | "B"; state: NodeState }) {
  const px = person.x;
  const py = person.y;
  const outfit = OUTFIT[who];
  return (
    <g data-illustration={`person-${who}`} transform={who === "B" ? "scale(-1 1)" : undefined}>
      {/* 人（デスクの奥に座っている） */}
      <path
        d={`M ${px - 9} ${py + 2} L ${px - 9} ${py - 26} Q ${px - 9} ${py - 34} ${px - 3} ${py - 35} L ${px + 3} ${py - 35} Q ${px + 9} ${py - 34} ${px + 9} ${py - 26} L ${px + 9} ${py + 2} Z`}
        fill={outfit.shirt}
      />
      <path d={`M ${px - 3.5} ${py - 35} Q ${px + 1} ${py - 30.5} ${px + 5} ${py - 34.5}`} fill="none" stroke={outfit.fold} strokeWidth={1.2} />
      <circle cx={px} cy={py - 43} r={8} fill="#F6D3B8" />
      {who === "A" ? (
        <path
          d={`M ${px + 8.2} ${py - 43.5} A 8.2 8.2 0 0 0 ${px - 8.2} ${py - 43} Q ${px - 8.4} ${py - 39} ${px - 6.6} ${py - 37.8} Q ${px - 5.4} ${py - 44} ${px + 1} ${py - 46} Q ${px + 5.5} ${py - 45.5} ${px + 8.2} ${py - 43.5} Z`}
          fill={outfit.hair}
        />
      ) : (
        // B は肩までの髪で A と見分ける
        <path
          d={`M ${px + 8.4} ${py - 42} A 8.4 8.4 0 0 0 ${px - 8.4} ${py - 43} L ${px - 9.6} ${py - 33} Q ${px - 6.5} ${py - 32} ${px - 5.8} ${py - 36} Q ${px - 4.6} ${py - 44.5} ${px + 1.5} ${py - 46} Q ${px + 6} ${py - 45} ${px + 8.4} ${py - 42} Z`}
          fill={outfit.hair}
        />
      )}
      <circle cx={px + 4.3} cy={py - 41.2} r={0.95} fill="#2B3140" />
      <circle cx={px - 0.4} cy={py - 41.6} r={0.95} fill="#2B3140" />
      <ellipse cx={px + 5.2} cy={py - 38.5} rx={1.4} ry={0.8} fill="#F2A7A0" opacity={0.7} />

      {/* デスク */}
      <polygon points={modesty} fill="#D5DCE7" />
      <polygon points={legBack.right} fill="#CBD4E1" />
      <polygon points={legFront.left} fill="#E3E8F0" />
      <polygon points={legFront.right} fill="#CBD4E1" />
      <polygon points={desk.left} fill="#E6EBF3" />
      <polygon points={desk.right} fill="#D3DBE7" />
      <polygon points={desk.top} fill="#FFFFFF" stroke="#D8DFEA" strokeWidth={0.7} />

      {/* ノートPC＋キーボードに伸ばした腕 */}
      <polygon points={laptopBase.left} fill="#AEB9CA" />
      <polygon points={laptopBase.right} fill="#9CA8BB" />
      <polygon points={laptopBase.top} fill="#CDD5E1" />
      <path
        d={`M ${px + 5} ${py - 27} Q ${px + 11} ${py - 16} ${hand.x} ${hand.y}`}
        fill="none"
        stroke={outfit.shirt}
        strokeWidth={4.6}
        strokeLinecap="round"
      />
      <circle cx={hand.x} cy={hand.y} r={2.3} fill="#F6D3B8" />
      <polygon points={lid} fill="#8292AB" stroke="#6F7F99" strokeWidth={0.6} strokeLinejoin="round" />
      <ellipse cx={lidLogo.x} cy={lidLogo.y} rx={2.2} ry={2.4} className={netStyles[`screen_${state}`]} />
    </g>
  );
}

/** 通信路の奥で盗み見を試みる第三者。主役ではないので小さく、灰色のフードで描く。 */
export function EavesdropperIllustration({ state }: { state: NodeState }) {
  return (
    <g data-illustration="eavesdropper" transform="scale(0.82)">
      {/* 体（フード付き） */}
      <path d="M -8 0 L -8 -22 Q -8 -30 0 -31 Q 8 -30 8 -22 L 8 0 Z" fill="#5B6474" />
      <path d="M -9.6 -36 A 9.6 9.6 0 0 1 9.6 -36 L 9 -26 Q 0 -22 -9 -26 Z" fill="#4A5262" />
      <circle cx={0} cy={-35} r={6.6} fill="#F6D3B8" />
      <path d="M -7.4 -37.5 A 7.6 7.6 0 0 1 7.4 -37.5 L 7 -35.6 Q 0 -39.5 -7 -35.6 Z" fill="#4A5262" />
      {/* 目線は通信路（手前）へ */}
      <circle cx={-2.4} cy={-33.6} r={0.9} fill="#2B3140" />
      <circle cx={2.4} cy={-33.6} r={0.9} fill="#2B3140" />
      {/* 盗聴用の端末 */}
      <rect x={-7} y={-19} width={14} height={9} rx={1.6} fill="#2F3747" />
      <rect x={-5.6} y={-17.6} width={11.2} height={6.2} rx={1} className={netStyles[`screen_${state}`]} />
      <path d="M 5 -19 L 8 -26" stroke="#2F3747" strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={8} cy={-26.6} r={1.3} fill="#F43F5E" />
    </g>
  );
}
