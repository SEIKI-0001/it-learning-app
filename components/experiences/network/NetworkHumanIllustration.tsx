import { isoBox, isoLocal, points, type NodeState } from "./NetworkSceneBase";
import styles from "./network.module.css";

// ユーザー: デスクでノートPCを操作する人。斜め上から見た 2.5D で、
// 人はデスクの奥（左）に座り、右手前 = DNS・Webサーバのある方向を向いている。

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
// 天板はヒンジ（x=5）から少し奥へ傾けて立てる。こちらから見えているのは天板の背面。
const lid = points([
  isoLocal(7, 9, 30.5),
  isoLocal(7, -9, 30.5),
  isoLocal(5, -9, 17.4),
  isoLocal(5, 9, 17.4),
]);
const lidLogo = isoLocal(6, 0, 24);
const person = isoLocal(-26, -4, 0);
const hand = isoLocal(-4, 1, 17.6);

export function NetworkHumanIllustration({ state }: { state: NodeState }) {
  const px = person.x;
  const py = person.y;
  return (
    <g data-illustration="human">
      {/* 人（デスクの奥に座っている） */}
      <path
        d={`M ${px - 9} ${py + 2} L ${px - 9} ${py - 26} Q ${px - 9} ${py - 34} ${px - 3} ${py - 35} L ${px + 3} ${py - 35} Q ${px + 9} ${py - 34} ${px + 9} ${py - 26} L ${px + 9} ${py + 2} Z`}
        fill="#3D7BE0"
      />
      <path d={`M ${px - 3.5} ${py - 35} Q ${px + 1} ${py - 30.5} ${px + 5} ${py - 34.5}`} fill="none" stroke="#2F62B8" strokeWidth={1.2} />
      <circle cx={px} cy={py - 43} r={8} fill="#F6D3B8" />
      <path
        d={`M ${px + 8.2} ${py - 43.5} A 8.2 8.2 0 0 0 ${px - 8.2} ${py - 43} Q ${px - 8.4} ${py - 39} ${px - 6.6} ${py - 37.8} Q ${px - 5.4} ${py - 44} ${px + 1} ${py - 46} Q ${px + 5.5} ${py - 45.5} ${px + 8.2} ${py - 43.5} Z`}
        fill="#2B3140"
      />
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
        stroke="#3D7BE0"
        strokeWidth={4.6}
        strokeLinecap="round"
      />
      <circle cx={hand.x} cy={hand.y} r={2.3} fill="#F6D3B8" />
      <polygon points={lid} fill="#8292AB" stroke="#6F7F99" strokeWidth={0.6} strokeLinejoin="round" />
      <ellipse cx={lidLogo.x} cy={lidLogo.y} rx={2.2} ry={2.4} className={styles[`screen_${state}`]} />
    </g>
  );
}
