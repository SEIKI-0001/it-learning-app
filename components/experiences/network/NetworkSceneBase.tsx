// ネットワーク体験で共有する 2.5D（アイソメトリック）シーンの土台。
// 床・グリッド・ノードの台座と、ワールド座標 → SVG 座標の投影だけを受け持つ。
// 登場物（人・サーバ）や通信フローは各イラスト/シーン側で描く。

import type { ReactNode, SVGProps } from "react";
import styles from "./network.module.css";

/** ノードの見た目の状態。色だけでなく浮上・LED・ラベルでも区別する。 */
export type NodeState = "idle" | "sending" | "active" | "error" | "disabled";

export const SCENE_WIDTH = 320;
export const SCENE_HEIGHT = 256;

const COS30 = 0.866;
const SIN30 = 0.5;
const ORIGIN = { x: 160, y: 144 };
const FLOOR_RADIUS = 86;
const FLOOR_THICKNESS = 8;
export const PAD_RADIUS = 26;

export type WorldPoint = { x: number; y: number; z?: number };
export type ScreenPoint = { x: number; y: number };

/** ローカル座標（原点=物体の接地中心）を画面座標の差分へ投影する。 */
export function isoLocal(x: number, y: number, z = 0): ScreenPoint {
  return { x: (x - y) * COS30, y: (x + y) * SIN30 - z };
}

/** シーンのワールド座標を SVG viewBox 上の座標へ投影する。 */
export function iso({ x, y, z = 0 }: WorldPoint): ScreenPoint {
  const p = isoLocal(x, y, z);
  return { x: ORIGIN.x + p.x, y: ORIGIN.y + p.y };
}

/** 画面座標を、オーバーレイ（HTML）配置用の百分率に変換する。 */
export function toPercent(point: ScreenPoint) {
  return {
    left: `${(point.x / SCENE_WIDTH) * 100}%`,
    top: `${(point.y / SCENE_HEIGHT) * 100}%`,
  };
}

export function points(list: ScreenPoint[]) {
  return list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

/** 直方体の見える3面（上面・左前面 y=y1・右側面 x=x1）をローカル座標で返す。 */
export function isoBox({ x0, x1, y0, y1, z0, z1 }: Box) {
  return {
    top: points([
      isoLocal(x0, y0, z1),
      isoLocal(x1, y0, z1),
      isoLocal(x1, y1, z1),
      isoLocal(x0, y1, z1),
    ]),
    left: points([
      isoLocal(x0, y1, z1),
      isoLocal(x1, y1, z1),
      isoLocal(x1, y1, z0),
      isoLocal(x0, y1, z0),
    ]),
    right: points([
      isoLocal(x1, y1, z1),
      isoLocal(x1, y0, z1),
      isoLocal(x1, y0, z0),
      isoLocal(x1, y1, z0),
    ]),
  };
}

/**
 * 面に「貼り付ける」ための SVG transform。面ローカル座標 (u=右方向, v=下方向) で
 * 描いた部品（LED・スリット・文字）がその面の傾きに沿って歪む。
 */
export function leftFaceTransform(x0: number, y1: number, zTop: number) {
  const o = isoLocal(x0, y1, zTop);
  return `matrix(${COS30} ${SIN30} 0 1 ${o.x.toFixed(2)} ${o.y.toFixed(2)})`;
}

export function rightFaceTransform(x1: number, y1: number, zTop: number) {
  const o = isoLocal(x1, y1, zTop);
  return `matrix(${COS30} ${-SIN30} 0 1 ${o.x.toFixed(2)} ${o.y.toFixed(2)})`;
}

/** 床に置いた円（アイソメトリックでは楕円）。 */
export function IsoEllipse({
  center,
  radius,
  ...rest
}: { center: ScreenPoint; radius: number } & SVGProps<SVGEllipseElement>) {
  return (
    <ellipse
      cx={center.x}
      cy={center.y}
      rx={radius * 1.2247}
      ry={radius * 0.7071}
      {...rest}
    />
  );
}

const GRID_STEPS = [-64, -43, -21, 0, 21, 43, 64];

export function NetworkSceneBase({
  pads,
  children,
}: {
  pads: { id: string; at: WorldPoint; state: NodeState }[];
  children?: ReactNode;
}) {
  const r = FLOOR_RADIUS;
  const corners = [
    iso({ x: -r, y: -r }),
    iso({ x: r, y: -r }),
    iso({ x: r, y: r }),
    iso({ x: -r, y: r }),
  ];
  const drop = (p: ScreenPoint) => ({ x: p.x, y: p.y + FLOOR_THICKNESS });

  return (
    <g data-scene-base>
      <defs>
        <linearGradient id="net-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7F9FD" />
          <stop offset="1" stopColor="#EAF0F8" />
        </linearGradient>
      </defs>
      {/* 床スラブ（厚み付き） */}
      <polygon points={points([corners[3], corners[2], drop(corners[2]), drop(corners[3])])} fill="#D9E1EE" />
      <polygon points={points([corners[2], corners[1], drop(corners[1]), drop(corners[2])])} fill="#C8D3E4" />
      <polygon points={points(corners)} fill="url(#net-floor)" stroke="#D5DEEC" strokeWidth={1} />
      {/* アイソメトリックグリッド */}
      <g stroke="#DFE6F1" strokeWidth={0.7}>
        {GRID_STEPS.map((step) => (
          <g key={step}>
            <line
              x1={iso({ x: step, y: -r }).x}
              y1={iso({ x: step, y: -r }).y}
              x2={iso({ x: step, y: r }).x}
              y2={iso({ x: step, y: r }).y}
            />
            <line
              x1={iso({ x: -r, y: step }).x}
              y1={iso({ x: -r, y: step }).y}
              x2={iso({ x: r, y: step }).x}
              y2={iso({ x: r, y: step }).y}
            />
          </g>
        ))}
      </g>
      {/* ノードの台座 */}
      {pads.map((pad) => (
        <g key={pad.id} className={styles.pad} data-pad={pad.id} data-state={pad.state}>
          <IsoEllipse center={{ ...iso(pad.at), y: iso(pad.at).y + 2 }} radius={PAD_RADIUS} fill="#D3DCEA" />
          <IsoEllipse center={iso(pad.at)} radius={PAD_RADIUS} className={styles.padTop} />
        </g>
      ))}
      {children}
    </g>
  );
}
