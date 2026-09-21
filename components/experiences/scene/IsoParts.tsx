import type { CSSProperties, ReactNode } from "react";
import {
  IsoEllipse,
  PAD_RADIUS,
  iso,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";

// 2.5D シーンで繰り返し出てくる部品（HTTPS / Transaction / Firewall / API …）。
// 床とノード台座は network/NetworkSceneBase、ここは「台の上の物体」と「レール」だけ。

export type Lane = { from: WorldPoint; to: WorldPoint };

/** 2つの台座の縁どうしを結ぶレール。offset>0 で進行方向の右側へずらす。 */
export function laneBetween(a: WorldPoint, b: WorldPoint, offset = 0, inset = PAD_RADIUS): Lane {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  const ox = -uy * offset;
  const oy = ux * offset;
  return {
    from: { x: a.x + ux * inset + ox, y: a.y + uy * inset + oy },
    to: { x: b.x - ux * inset + ox, y: b.y - uy * inset + oy },
  };
}

export function along(lane: Lane, t: number, z = 0): WorldPoint {
  return {
    x: lane.from.x + (lane.to.x - lane.from.x) * t,
    y: lane.from.y + (lane.to.y - lane.from.y) * t,
    z,
  };
}

export function nudge(p: ScreenPoint, dx: number, dy: number): ScreenPoint {
  return { x: p.x + dx, y: p.y + dy };
}

/** 台の上の物体。位置用 <g transform> とアニメ用 <g className> を分ける（CSS transform が属性を潰すため）。 */
export function SceneNode({
  id,
  at,
  state,
  shadow = 17,
  scale,
  children,
}: {
  id: string;
  at: WorldPoint;
  state: NodeState;
  shadow?: number;
  scale?: number;
  children: ReactNode;
}) {
  const p = iso(at);
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <g className={netStyles.node} data-node={id} data-state={state}>
        <IsoEllipse center={{ x: 0, y: 1 }} radius={shadow} className={netStyles.nodeShadow} />
        <g className={netStyles.nodeLift}>
          {scale ? <g transform={`scale(${scale})`}>{children}</g> : children}
        </g>
      </g>
    </g>
  );
}

/** 路面標示つきのレール。state=active で流れる破線と色が付く。 */
export function SceneRail({
  lane,
  id,
  state,
  color,
  chevrons = [0.5],
}: {
  lane: Lane;
  id: string;
  state: "idle" | "active" | "blocked";
  color: string;
  chevrons?: number[];
}) {
  const a = iso(lane.from);
  const b = iso(lane.to);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <g className={netStyles.lane} style={{ "--lane": color } as CSSProperties} data-lane={id} data-state={state}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneBed} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneTrack} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneFlow} />
      {chevrons.map((t) => (
        <path
          key={t}
          d="M -2.4 -2.6 L 1.2 0 L -2.4 2.6"
          className={netStyles.laneChevron}
          transform={`translate(${a.x + (b.x - a.x) * t} ${a.y + (b.y - a.y) * t}) rotate(${angle})`}
        />
      ))}
    </g>
  );
}

/** シーン共通の影グラデーション（NetworkSceneBase の nodeShadow が参照する） */
export function SceneDefs() {
  return (
    <defs>
      <radialGradient id="net-shadow">
        <stop offset="0" stopColor="#1E2A40" stopOpacity={0.32} />
        <stop offset="1" stopColor="#1E2A40" stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}
