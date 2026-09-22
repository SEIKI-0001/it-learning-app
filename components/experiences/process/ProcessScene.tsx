import type { CSSProperties } from "react";
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  isoBox,
  isoLocal,
  leftFaceTransform,
  toPercent,
  type NodeState,
  type ScreenPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs } from "../scene/IsoParts";
import type { DocSpot } from "./processSim";
import styles from "./process.module.css";

// 受付 → 転記 → 承認 → 発送 の4つの机を1本の作業台に並べた模型。
// 書類（注文）はトークンとして机から机へ移動し、処理待ちは机の手前のトレイに積み上がる。

const STATION_X = [-96, -32, 32, 96];
const LIFT = 12;

function P(x: number, y: number, z = 0): ScreenPoint {
  const p = isoLocal(x, y, z);
  return { x: 160 + p.x, y: 144 + LIFT + p.y };
}

function shift(list: string) {
  return list
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${(x + 160).toFixed(1)},${(y + 144 + LIFT).toFixed(1)}`;
    })
    .join(" ");
}

export type StationView = {
  name: string;
  emoji: string;
  minutes: number;
  improved: boolean;
  /** 改善前より遅い（ボトルネック候補） */
  slow: boolean;
  queue: number;
  busy: boolean;
};

const DECK = { x0: -132, x1: 140, y0: -22, y1: 22, z0: -6, z1: 0 };
const SHIRTS = ["#60A5FA", "#F59E0B", "#8B5CF6", "#10B981"];

function Desk({ index, state }: { index: number; state: NodeState }) {
  const top = isoBox({ x0: -12, x1: 12, y0: -9, y1: 9, z0: 12, z1: 14 });
  const leg = isoBox({ x0: -11, x1: 11, y0: 7, y1: 9, z0: 0, z1: 12 });
  const person = isoLocal(-4, -16, 0);
  return (
    <g data-illustration={`desk-${index}`}>
      <path
        d={`M ${person.x - 6} ${person.y} L ${person.x - 6} ${person.y - 18} Q ${person.x - 6} ${person.y - 24} ${person.x} ${person.y - 25} Q ${person.x + 6} ${person.y - 24} ${person.x + 6} ${person.y - 18} L ${person.x + 6} ${person.y} Z`}
        fill={SHIRTS[index]}
      />
      <circle cx={person.x} cy={person.y - 30} r={5.4} fill="#F6D3B8" />
      <path d={`M ${person.x - 5.6} ${person.y - 31} A 5.6 5.6 0 0 1 ${person.x + 5.6} ${person.y - 31} Q ${person.x} ${person.y - 33.5} ${person.x - 5.6} ${person.y - 31} Z`} fill="#2B3140" />
      <polygon points={leg.left} fill="#D5DCE7" />
      <polygon points={top.left} fill="#E6EBF3" />
      <polygon points={top.right} fill="#D3DBE7" />
      <polygon points={top.top} fill="#FFFFFF" stroke="#D8DFEA" strokeWidth={0.7} />
      <g transform={leftFaceTransform(-12, 9, 14)}>
        <circle cx={20} cy={1} r={0.9} className={netStyles[`led_${state}`]} />
      </g>
    </g>
  );
}

export function ProcessScene({
  stations,
  docs,
  reducedMotion,
}: {
  stations: StationView[];
  docs: DocSpot[];
  reducedMotion: boolean;
}) {
  const deck = isoBox(DECK);
  const docPoint = (spot: DocSpot): ScreenPoint => {
    switch (spot.kind) {
      case "incoming":
        return P(-150, 0, 6);
      case "queue":
        // 机の手前（左）のトレイに縦に積む
        return P(STATION_X[spot.station] - 24, 8, 4 + spot.slot * 5);
      case "work":
        return P(STATION_X[spot.station], 0, 20);
      case "done":
        return P(128, 6, 2 + spot.slot * 3.2);
    }
  };

  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="process-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="受付・手書き転記・承認・発送の4つの机が作業台の上に一列に並ぶ。書類は机から机へ流れ、処理待ちの書類は机の手前に積み上がる"
      >
        <SceneDefs />
        <polygon points={shift(deck.left)} fill="#E2E8F0" />
        <polygon points={shift(deck.right)} fill="#CBD5E1" />
        <polygon points={shift(deck.top)} fill="#F8FAFC" stroke="#D5DEEC" strokeWidth={0.8} />
        <line x1={P(-132, 0).x} y1={P(-132, 0).y} x2={P(140, 0).x} y2={P(140, 0).y} className={styles.path} />
        {/* 発送済みトレイ */}
        <polygon points={shift(isoBox({ x0: 118, x1: 138, y0: -4, y1: 16, z0: 0, z1: 2 }).top)} fill="#D1FAE5" stroke="#6EE7B7" strokeWidth={0.8} />
        {stations.map((s, i) => {
          const at = P(STATION_X[i], 0);
          const tray = isoBox({ x0: STATION_X[i] - 32, x1: STATION_X[i] - 16, y0: 0, y1: 16, z0: 0, z1: 1.5 });
          const state: NodeState = s.busy ? "active" : "idle";
          return (
            <g key={s.name}>
              <polygon
                points={shift(tray.top)}
                className={styles.tray}
                data-full={s.queue >= 2 ? "true" : "false"}
              />
              <g transform={`translate(${at.x} ${at.y})`}>
                <g className={netStyles.node} data-node={`station-${i}`} data-state={state}>
                  <ellipse cx={0} cy={1} rx={18} ry={10} className={netStyles.nodeShadow} />
                  <g className={netStyles.nodeLift}>
                    <Desk index={i} state={state} />
                  </g>
                </g>
              </g>
            </g>
          );
        })}
      </svg>

      {stations.map((s, i) => (
        <div
          key={s.name}
          className={styles.clock}
          style={toPercent(P(STATION_X[i], 0, 56))}
          data-slow={s.slow ? "true" : "false"}
          data-improved={s.improved ? "true" : "false"}
          data-testid={`clock-${i}`}
        >
          <span className={styles.clockName}>
            {s.emoji} {s.name}
          </span>
          <span className={styles.clockTime}>⏱ {s.minutes}分</span>
          {s.queue > 0 && (
            <span className={styles.queueBadge} data-testid={`queue-${i}`}>
              📄×{s.queue} 待ち
            </span>
          )}
        </div>
      ))}

      {docs.map((spot, k) => {
        const at = docPoint(spot);
        return (
          <span
            key={k}
            className={styles.doc}
            style={{ ...toPercent(at), "--progress": spot.kind === "work" ? spot.progress : 0 } as CSSProperties}
            data-kind={spot.kind}
            data-doc={k}
            aria-hidden
          >
            <span className={styles.docSheet}>
              <span className={styles.docLines} />
              {spot.kind === "done" && <span className={styles.docCheck}>✓</span>}
            </span>
          </span>
        );
      })}
    </div>
  );
}
