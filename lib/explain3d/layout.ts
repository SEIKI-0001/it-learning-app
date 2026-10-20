// AI が組んだ場面の置き方・道・カメラを決める（純関数）。AI には座標を書かせず、ここで決める。
// 舞台は 820×440 の床。置く物は流れの順に左から右へ並べ、4個以上なら奥と手前に互い違いにずらす。
// 隣どうしは床をまっすぐ、離れた物どうしは手前の通路を回って運ぶ（間の物を突き抜けない）。

import type { ActorKind, GeneratedScene, SceneMove, SceneStep } from "./types";

export type Vec3 = { x: number; y: number; z?: number };
export type Camera = { yaw: number; pitch: number; zoom: number; fx: number; fy: number; fz: number };

export const WORLD = { w: 820, d: 440 } as const;
/** 離れた物どうしを結ぶ手前の通路 */
const FRONT_LANE_Y = 392;
/** 運ぶ物が床から浮く高さ */
export const CARRY_Z = 6;

const BUILDINGS = new Set<ActorKind>(["office", "house", "store", "bank", "factory", "datacenter"]);
export const isBuilding = (kind: ActorKind) => BUILDINGS.has(kind);

/** 物のてっぺんの高さ（名札を載せる位置） */
export function actorTop(kind: ActorKind): number {
  switch (kind) {
    case "pc":
      return 104;
    case "laptop":
      return 94;
    case "phone":
      return 84;
    case "server":
      return 124;
    case "database":
      return 60;
    case "router":
    case "switch":
    case "firewall":
      return 56;
    case "wifi":
      return 76;
    case "person":
    case "attacker":
      return 72;
    case "safe":
      return 76;
    case "truck":
      return 44;
    case "house":
      return 76;
    default:
      return 98; // 建物
  }
}

/** 物の床の半径（運ぶ物を手前で止める距離） */
const actorRadius = (kind: ActorKind) => (isBuilding(kind) ? 56 : kind === "pc" || kind === "laptop" ? 40 : 30);

export type PlacedActor = { id: string; kind: ActorKind; name: string; at: Vec3 };

export function placeActors(scene: Pick<GeneratedScene, "actors">): PlacedActor[] {
  const n = scene.actors.length;
  const left = 120;
  const right = WORLD.w - 120;
  const zigzag = n >= 4;
  return scene.actors.map((a, i) => ({
    ...a,
    at: {
      x: n === 1 ? WORLD.w / 2 : left + ((right - left) * i) / (n - 1),
      y: zigzag ? (i % 2 === 0 ? 190 : 290) : 240,
      z: 0,
    },
  }));
}

function shorten(from: Vec3, to: Vec3, d: number): Vec3 {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len <= d) return from;
  const t = d / len;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** 動きの道（床の点の列）。両端は物の手前で止める */
export function movePath(move: SceneMove, placed: readonly PlacedActor[]): Vec3[] {
  const fi = placed.findIndex((a) => a.id === move.from);
  const ti = placed.findIndex((a) => a.id === move.to);
  if (fi < 0 || ti < 0) return [];
  const a = placed[fi];
  const b = placed[ti];
  const z = CARRY_Z;
  if (Math.abs(fi - ti) <= 1) {
    const start = shorten(a.at, b.at, actorRadius(a.kind));
    const end = shorten(b.at, a.at, actorRadius(b.kind));
    return [
      { ...start, z },
      { ...end, z },
    ];
  }
  // 離れた物どうし：手前の通路へ出て、横へ進み、相手の前から入る
  const startY = Math.min(FRONT_LANE_Y, a.at.y + actorRadius(a.kind));
  const endY = Math.min(FRONT_LANE_Y, b.at.y + actorRadius(b.kind));
  return [
    { x: a.at.x, y: startY, z },
    { x: a.at.x, y: FRONT_LANE_Y, z },
    { x: b.at.x, y: FRONT_LANE_Y, z },
    { x: b.at.x, y: endY, z },
  ];
}

export const OVERVIEW: Camera = { yaw: -14, pitch: 54, zoom: 0.8, fx: WORLD.w / 2, fy: 240, fz: 40 };

/** そのコマで見せたい場所（吹き出しの指す先・カメラの寄り先） */
export function stepFocus(step: SceneStep, placed: readonly PlacedActor[]): Vec3 | null {
  const byId = new Map(placed.map((a) => [a.id, a]));
  if (step.move) {
    const path = movePath(step.move, placed);
    const end = path[path.length - 1];
    const to = byId.get(step.move.to);
    if (end && to) return { x: to.at.x, y: to.at.y, z: actorTop(to.kind) };
  }
  const focus = [...step.alert, ...step.active].map((id) => byId.get(id)).filter((a): a is PlacedActor => !!a);
  if (focus.length === 0) return null;
  const top = focus[0];
  return { x: top.at.x, y: top.at.y, z: actorTop(top.kind) };
}

/** コマごとのカメラ。動きがあれば出発点と行き先の両方が入るように、無ければ主役へ少し寄る */
export function stepCamera(step: SceneStep, placed: readonly PlacedActor[]): Camera {
  const byId = new Map(placed.map((a) => [a.id, a]));
  const pts: Vec3[] = [];
  if (step.move) {
    const from = byId.get(step.move.from);
    const to = byId.get(step.move.to);
    if (from) pts.push(from.at);
    if (to) pts.push(to.at);
  } else {
    for (const id of [...step.alert, ...step.active]) {
      const a = byId.get(id);
      if (a) pts.push(a.at);
    }
  }
  if (pts.length === 0) return OVERVIEW;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  // 横に広いほど引く（全体＝0.8、1つだけ＝1.25）
  const zoom = Math.max(OVERVIEW.zoom, Math.min(1.25, 1.25 - (spanX / (WORLD.w - 240)) * 0.45));
  return { yaw: -14, pitch: 54, zoom: Math.round(zoom * 100) / 100, fx: Math.round(cx), fy: Math.round(cy + 20), fz: 40 };
}
