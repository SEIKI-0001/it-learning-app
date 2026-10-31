// AI が組んだ場面を、部品キット（public/models/explain-kit.glb）でどう並べるかを決める（純関数）。
// 座標は glTF（x＝右、y＝上、z＝手前、単位 m）。
//   - 場所（自宅・データセンターなど）の床を、流れの順に左から1列に並べる。全体の真ん中が x=0
//   - 場所の中の物は、奥の飾り（壁際の本棚・予備のラックなど）を避けて、手前寄りに1列（入らなければ2列）に並べる
//   - 運ぶ物は物の手前を出入りする。場所をまたぐときは、床の手前の通路を通る
//   - カメラは、そのコマの動きの両端（または主役）が入るように寄せる。縦長の枠では真上寄りから見る

import { KIT_FLOOR_Y, KIT_PARTS, KIT_ZONES, type KitBox } from "./kit";
import type { ActorKind, GeneratedScene, Place, SceneMove, SceneStep } from "./types";

export type V3 = [number, number, number];
export type Shot = { pos: V3; look: V3 };

export type ZoneLayout = { place: Place; x: number; w: number; d: number };
export type ActorLayout = {
  id: string;
  kind: ActorKind;
  name: string;
  place: Place;
  /** 足もとの中心 */
  pos: V3;
  scale: number;
  /** 床からてっぺんまでの高さ（拡大後） */
  height: number;
  /** 奥行き（拡大後） */
  depth: number;
  /** 名札を持ち上げる高さ。隣と近いときは互い違いにして重ならないようにする */
  labelLift: number;
};
export type SceneLayout = { zones: ZoneLayout[]; actors: ActorLayout[]; width: number };

/** 場所の床どうしのすき間 */
const ZONE_GAP = 0.05;
/** 場所の左右のふち（物を置かない幅） */
const SIDE_MARGIN = 0.06;
/** 物どうしの横のすき間 */
const ITEM_GAP = 0.03;
/** 運ぶ物の高さ（床からの浮き） */
export const CARRY_Y = KIT_FLOOR_Y + 0.025;
/** 運ぶ物は小さいので、模型の中では少し大きく見せる */
export const ITEM_SCALE = 1.9;

const partBox = (kind: ActorKind): KitBox => KIT_PARTS[`Kit_${kind}`] ?? { w: 0.12, h: 0.15, d: 0.12 };
const zoneBox = (place: Place) => KIT_ZONES[`Zone_${place}`] ?? { w: 0.62, d: 0.56, h: 0.16 };

/** 1列に並べるときの z（奥の飾りを避けた手前寄り）。インターネットは奥に地球儀があるので、さらに手前 */
function rowZ(place: Place, rows: 1 | 2, row: 0 | 1): number {
  if (place === "internet") return 0.11;
  if (rows === 1) return place === "town" ? 0.0 : 0.03;
  return row === 0 ? 0.1 : -0.08;
}

function placeRow(
  items: { id: string; kind: ActorKind; name: string; place: Place }[],
  zone: ZoneLayout,
  z: number,
  baseScale: number,
): ActorLayout[] {
  const usable = zone.w - SIDE_MARGIN * 2;
  const total = items.reduce((sum, a) => sum + partBox(a.kind).w * baseScale, 0) + ITEM_GAP * Math.max(0, items.length - 1);
  const scale = total > usable ? (baseScale * usable) / total : baseScale;
  const widths = items.map((a) => partBox(a.kind).w * scale);
  const rowWidth = widths.reduce((s, w) => s + w, 0) + ITEM_GAP * Math.max(0, items.length - 1);
  let x = zone.x - rowWidth / 2;
  return items.map((a, i) => {
    const b = partBox(a.kind);
    const cx = x + widths[i] / 2;
    x += widths[i] + ITEM_GAP;
    return {
      ...a,
      pos: [round(cx), KIT_FLOOR_Y, round(z)],
      scale: round(scale),
      height: round(b.h * scale),
      depth: round(b.d * scale),
      labelLift: 0,
    };
  });
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** インターネット：真ん中奥の地球儀を隠さないよう、左右に振り分けて手前に置く */
function placeInternet(items: { id: string; kind: ActorKind; name: string; place: Place }[], zone: ZoneLayout): ActorLayout[] {
  if (items.length > 2) return placeRow(items, zone, 0.17, 0.85);
  // 1つなら地球儀の右、2つなら左右（流れの順に左から）
  const offsets = items.length === 1 ? [0.25] : [-0.25, 0.25];
  return items.flatMap((a, i) => {
    const b = partBox(a.kind);
    const slot = zone.w * 0.42;
    const scale = Math.min(1, slot / b.w);
    return placeRow([a], { ...zone, x: zone.x + zone.w * offsets[i], w: slot + SIDE_MARGIN * 2 }, 0.1, scale);
  });
}

/** 隣どうしの名札がぶつかる距離なら、ひとつおきに持ち上げる（場所・列ごと、左から順に） */
function staggerLabels(actors: ActorLayout[]) {
  const rows = new Map<string, ActorLayout[]>();
  for (const a of actors) {
    const key = `${a.place}|${a.pos[2]}`;
    rows.set(key, [...(rows.get(key) ?? []), a]);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a.pos[0] - b.pos[0]);
    for (let i = 1; i < row.length; i++) {
      const near = row[i].pos[0] - row[i - 1].pos[0] < 0.24;
      // 持ち上げるときは、隣の名札より一段上（背の高さの違いも足す）
      row[i].labelLift = near && row[i - 1].labelLift === 0 ? round(Math.max(0, row[i - 1].height - row[i].height) + 0.065) : 0;
    }
  }
}

export function layoutScene(scene: Pick<GeneratedScene, "actors">): SceneLayout {
  const places: Place[] = [];
  for (const a of scene.actors) if (!places.includes(a.place)) places.push(a.place);
  const sizes = places.map((p) => zoneBox(p));
  const width = sizes.reduce((s, z) => s + z.w, 0) + ZONE_GAP * Math.max(0, places.length - 1);
  let left = -width / 2;
  const zones: ZoneLayout[] = places.map((place, i) => {
    const z = { place, x: round(left + sizes[i].w / 2), w: sizes[i].w, d: sizes[i].d };
    left += sizes[i].w + ZONE_GAP;
    return z;
  });

  const actors: ActorLayout[] = [];
  for (const zone of zones) {
    const items = scene.actors.filter((a) => a.place === zone.place);
    const usable = zone.w - SIDE_MARGIN * 2;
    const total = items.reduce((s, a) => s + partBox(a.kind).w, 0) + ITEM_GAP * Math.max(0, items.length - 1);
    // 1列で縮みすぎるときだけ2列にする（インターネットは地球儀があるので1列のまま）
    if (zone.place === "internet") {
      actors.push(...placeInternet(items, zone));
    } else if (items.length < 3 || total <= usable * 1.15) {
      actors.push(...placeRow(items, zone, rowZ(zone.place, 1, 0), 1));
    } else {
      const half = Math.ceil(items.length / 2);
      actors.push(...placeRow(items.slice(0, half), zone, rowZ(zone.place, 2, 0), 0.9));
      actors.push(...placeRow(items.slice(half), zone, rowZ(zone.place, 2, 1), 0.9));
    }
  }
  staggerLabels(actors);
  // 並べた順は AI が書いた順に戻す（名札の優先・テストの見通しのため）
  const order = new Map(scene.actors.map((a, i) => [a.id, i]));
  actors.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { zones, actors, width: round(width) };
}

/** 運ぶ物が出入りする点（物の手前） */
export function portOf(a: ActorLayout): V3 {
  return [a.pos[0], CARRY_Y, round(a.pos[2] + a.depth / 2 + 0.025)];
}

/** 動きの道。同じ場所なら手前どうしをまっすぐ、場所をまたぐなら床の手前の通路を通る */
export function movePath3D(move: SceneMove, layout: SceneLayout): V3[] {
  const a = layout.actors.find((x) => x.id === move.from);
  const b = layout.actors.find((x) => x.id === move.to);
  if (!a || !b) return [];
  const pa = portOf(a);
  const pb = portOf(b);
  if (a.place === b.place) return [pa, pb];
  const zone = layout.zones.find((z) => z.place === a.place);
  const lane = round((zone?.d ?? 0.56) / 2 - 0.04);
  return [pa, [pa[0], CARRY_Y, lane], [pb[0], CARRY_Y, lane], pb];
}

/** 名札を載せる点（物のてっぺんの少し上） */
export const labelAt = (a: ActorLayout): V3 => [a.pos[0], round(KIT_FLOOR_Y + a.height + 0.02 + a.labelLift), a.pos[2]];

/** 見る向き（注視点からカメラへ）。横長は斜め上から、縦長・正方形は真上寄りから */
const VIEW_WIDE: V3 = [0, 0.69, 0.73];
const VIEW_SQUARE: V3 = [0, 0.87, 0.49];

function frame(minX: number, maxX: number, cz: number, square: boolean, minSpan: number): Shot {
  const span = Math.max(maxX - minX, minSpan);
  const cx = (minX + maxX) / 2;
  const dir = square ? VIEW_SQUARE : VIEW_WIDE;
  const dist = span * (square ? 1.35 : 0.95) + 0.15;
  const look: V3 = [round(cx), 0.06, round(cz)];
  return { pos: [round(cx + dir[0] * dist), round(0.06 + dir[1] * dist), round(cz + dir[2] * dist)], look };
}

export function overviewShot(layout: SceneLayout, square: boolean): Shot {
  return frame(-layout.width / 2, layout.width / 2, 0, square, 0.8);
}

/** そのコマで見せたい物（動きの両端、無ければ赤い物・光る物） */
export function stepFocusActors(step: SceneStep, layout: SceneLayout): ActorLayout[] {
  const byId = new Map(layout.actors.map((a) => [a.id, a]));
  const ids = step.move ? [step.move.from, step.move.to] : [...step.alert, ...step.active, ...(step.screen ? [step.screen.actor] : [])];
  return [...new Set(ids)].map((id) => byId.get(id)).filter((a): a is ActorLayout => !!a);
}

export function stepShot(step: SceneStep, layout: SceneLayout, square: boolean): Shot {
  const focus = stepFocusActors(step, layout);
  if (focus.length === 0) return overviewShot(layout, square);
  const xs = focus.flatMap((a) => [a.pos[0] - 0.12, a.pos[0] + 0.12]);
  const cz = focus.reduce((s, a) => s + a.pos[2], 0) / focus.length;
  return frame(Math.min(...xs), Math.max(...xs), cz, square, 0.45);
}

/** 吹き出しが指す点（行き先、無ければ主役のてっぺん） */
export function captionAt(step: SceneStep, layout: SceneLayout): V3 | null {
  const focus = stepFocusActors(step, layout);
  const target = step.move ? focus.find((a) => a.id === step.move?.to) : focus[0];
  return target ? [target.pos[0], round(KIT_FLOOR_Y + target.height * 0.6), target.pos[2]] : null;
}
