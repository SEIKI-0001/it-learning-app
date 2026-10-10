import type { DeviceId, HopId, PlaceableKind } from "./engine";

// オフィス模型の配置（ワールド座標 px。x=右、y=手前、z=上）。
//   奥の壁の向こう（y<0）が建物の外＝インターネット側。左奥がサーバ室、左手前が会議室、右側が執務室。

export type Point = { x: number; y: number; z?: number };

export type Slot = {
  id: string;
  /** 置いた機器の足もとの中心 */
  at: Point;
  /** 置ける機器 */
  accepts: PlaceableKind[];
  label: string;
};

const RACK_ITEMS: PlaceableKind[] = ["switch", "router", "firewall", "fileServer", "webServer"];

export const SLOTS: Slot[] = [
  { id: "s1", at: { x: 90, y: 80 }, accepts: RACK_ITEMS, label: "サーバ室 1" },
  { id: "s2", at: { x: 180, y: 80 }, accepts: RACK_ITEMS, label: "サーバ室 2" },
  { id: "s3", at: { x: 270, y: 80 }, accepts: RACK_ITEMS, label: "サーバ室 3" },
  { id: "s4", at: { x: 90, y: 190 }, accepts: RACK_ITEMS, label: "サーバ室 4" },
  { id: "s5", at: { x: 180, y: 190 }, accepts: RACK_ITEMS, label: "サーバ室 5" },
  { id: "s6", at: { x: 270, y: 190 }, accepts: RACK_ITEMS, label: "サーバ室 6" },
  { id: "w1", at: { x: 40, y: 380, z: 70 }, accepts: ["ap"], label: "会議室の壁" },
  { id: "w2", at: { x: 650, y: 290, z: 70 }, accepts: ["ap"], label: "執務室の柱" },
];

export const slotById = (id: string) => SLOTS.find((s) => s.id === id);

/** 置いたままにしている固定の機器 */
export const FIXED_AT: Record<"onu" | "pc-a" | "pc-b" | "pc-c" | "pc-d" | "laptop", Point> = {
  onu: { x: 60, y: 14, z: 40 },
  "pc-a": { x: 500, y: 150 },
  "pc-b": { x: 760, y: 150 },
  "pc-c": { x: 500, y: 410 },
  "pc-d": { x: 760, y: 410 },
  laptop: { x: 175, y: 470 },
};

export const EXTERNAL_AT: Record<"internet" | "customer" | "attacker" | "outsider", Point> = {
  internet: { x: 360, y: -150, z: 30 },
  customer: { x: 120, y: -160, z: 0 },
  attacker: { x: 640, y: -150, z: 0 },
  outsider: { x: -70, y: 520, z: 0 },
};

/** 機器の中心（ラベルとトークンが通る点） */
export function deviceAt(id: DeviceId, placed: Partial<Record<PlaceableKind, string>>): Point | null {
  if (id in FIXED_AT) return FIXED_AT[id as keyof typeof FIXED_AT];
  const slot = placed[id as PlaceableKind];
  return slot ? (slotById(slot)?.at ?? null) : null;
}

/** ケーブルの出口（床の上）。PC は机の手前、壁の機器は真下の床 */
export function jackOf(id: DeviceId, placed: Partial<Record<PlaceableKind, string>>): Point | null {
  const at = deviceAt(id, placed);
  if (!at) return null;
  if (id.startsWith("pc-")) return { x: at.x - 30, y: at.y + 40, z: 0 };
  if (id === "onu") return { x: at.x, y: at.y + 24, z: 0 };
  if (id === "ap") return { x: at.x + (at.x < 100 ? 8 : 0), y: at.y + 12, z: 0 };
  return { x: at.x, y: at.y + 22, z: 0 };
}

export function hopAt(id: HopId, placed: Partial<Record<PlaceableKind, string>>): Point | null {
  if (id in EXTERNAL_AT) return EXTERNAL_AT[id as keyof typeof EXTERNAL_AT];
  return deviceAt(id as DeviceId, placed);
}

/** 床の配線：机の列と列の間の通路（y=290）を幹線にして、L字で曲げる */
const AISLE_Y = 290;
const SERVER_AISLE_Y = 250;

export function cablePath(a: Point, b: Point, lane = 0): Point[] {
  const off = lane * 5;
  const inServer = (p: Point) => p.x < 340 && p.y < 260;
  if (inServer(a) && inServer(b)) {
    const y = Math.max(a.y, b.y) + 14 + off;
    return [a, { x: a.x, y }, { x: b.x, y }, b];
  }
  // サーバ室から出る線は、サーバ室の前の通路 → 執務室の通路を通す
  const ay = inServer(a) ? SERVER_AISLE_Y + off : AISLE_Y + off;
  const by = inServer(b) ? SERVER_AISLE_Y + off : AISLE_Y + off;
  if (ay === by) return [a, { x: a.x, y: ay }, { x: b.x, y: by }, b];
  const mid = 345 + off;
  return [a, { x: a.x, y: ay }, { x: mid, y: ay }, { x: mid, y: by }, { x: b.x, y: by }, b];
}
