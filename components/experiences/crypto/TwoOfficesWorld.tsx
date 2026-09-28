import type { ReactNode } from "react";
import { Box, type Vec3 } from "../scene/Diorama3D";
import {
  Desk,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Monitor,
  Person,
  Plant,
  Wall,
  WallWindow,
  offsetPath,
  slicePath,
  type RouteTone,
} from "../scene/DioramaParts";
import type { NodeState } from "../network/NetworkSceneBase";

// 暗号・署名の図解で共通の舞台：手前のA社のオフィス ⇄ インターネットの公衆回線 ⇄ 奥のB社のオフィス。
// 回線の途中（道ばたの通信設備）には第三者（盗聴者・攻撃者）が立ち、回線にケーブルをつないで盗み見る。
// 2本の車線：① 鍵の車線（奥・B→A 向き）と ② データの車線（手前・A→B 向き）。
// 公開鍵暗号・共通鍵暗号・ディジタル署名の3テーマが同じ舞台を使うので、見比べたときに違いが「鍵の扱い」だけに見える。

export const A_DESK: Vec3 = { x: 140, y: 330, z: 0 };
export const B_DESK: Vec3 = { x: 660, y: 120, z: 0 };
export const EVE_AT: Vec3 = { x: 430, y: 372, z: 0 };
export const JUNCTION: Vec3 = { x: 420, y: 300, z: 0 };
const DESK_TOP = 48; // 床(4)+机(44)

/** 机の上の置き場（鍵・書類） */
export const SPOT = {
  aLeft: { x: A_DESK.x - 42, y: A_DESK.y + 12, z: DESK_TOP + 2 },
  aRight: { x: A_DESK.x + 40, y: A_DESK.y + 10, z: DESK_TOP + 2 },
  aScreen: { x: A_DESK.x + 4, y: A_DESK.y + 8, z: DESK_TOP + 4 },
  bLeft: { x: B_DESK.x - 42, y: B_DESK.y + 12, z: DESK_TOP + 2 },
  bRight: { x: B_DESK.x + 40, y: B_DESK.y + 10, z: DESK_TOP + 2 },
  bScreen: { x: B_DESK.x + 4, y: B_DESK.y + 8, z: DESK_TOP + 4 },
  eveHand: { x: EVE_AT.x + 40, y: EVE_AT.y - 18, z: 34 },
} satisfies Record<string, Vec3>;

const G = 3;
const CENTER: Vec3[] = [
  { x: 214, y: 300, z: G },
  { x: 320, y: 262, z: G },
  { x: 420, y: 232, z: G },
  { x: 520, y: 200, z: G },
  { x: 596, y: 168, z: G },
];
/** ① 鍵の車線（B → A）と ② データの車線（A → B） */
export const LANE_PATH = {
  key: offsetPath([...CENTER].reverse(), -9),
  data: offsetPath(CENTER, -9),
};

/** 鍵の車線の向き：公開鍵は B→A（受信者が配る）、共通鍵は A→B（送信者が渡す） */
export type KeyDirection = "toA" | "toB";

function lanePoints(lane: "key" | "data", keyDirection: KeyDirection) {
  // 向きを変えても同じ車線（奥側）に乗るよう、点の並びだけを逆にする
  return lane === "key" && keyDirection === "toB" ? [...LANE_PATH.key].reverse() : LANE_PATH[lane];
}

/** 車線上の点（小包・鍵が移動するときの経由点） */
export function laneTo(lane: "key" | "data", t: number, z = 10, keyDirection: KeyDirection = "toA"): Vec3[] {
  return slicePath(lanePoints(lane, keyDirection), t, z);
}

export type LaneState = "idle" | "active" | "done";

const LANE_TONE: Record<"key" | "data", RouteTone> = { key: "response", data: "violet" };

export function TwoOfficesWorld({
  nodes,
  lanes,
  tap,
  eveVisible = true,
  aScreen,
  bScreen,
  aPerson = { shirt: "#4f86e8" },
  keyDirection = "toA",
}: {
  nodes: { a: NodeState; b: NodeState; eve: NodeState };
  lanes: { key: LaneState; data: LaneState };
  /** 第三者がつないでいる車線（null＝つないでいない） */
  tap: "key" | "data" | null;
  eveVisible?: boolean;
  aScreen?: ReactNode;
  bScreen?: ReactNode;
  aPerson?: { shirt: string; pose?: "sit" | "attacker" };
  keyDirection?: KeyDirection;
}) {
  const tapTo = tap ? slicePath(LANE_PATH[tap], 0.5, G) : null;
  return (
    <>
      <Floor x={0} y={10} w={820} d={430} h={16} material="plain" />

      {/* ---------- A社のオフィス（送信側） ---------- */}
      <Floor x={16} y={236} w={236} d={196} h={5} z={4} material="carpet" />
      <Wall x={16} y={236} length={236} h={100} tone="office">
        <WallWindow left={26} top={16} w={80} h={46} />
      </Wall>
      <Group z={4} data={{ "data-node": "a", "data-state": nodes.a, "data-illustration": "person-A" }}>
        <Desk x={A_DESK.x} y={A_DESK.y} w={130} d={62} />
        <Monitor x={A_DESK.x} y={A_DESK.y - 8} w={62} glow={nodes.a === "active" || nodes.a === "sending"} screen={aScreen} />
        <Person x={A_DESK.x - 4} y={A_DESK.y + 70} pose={aPerson.pose ?? "sit"} active={aPerson.pose === "attacker"} shirt={aPerson.shirt} />
        <Plant x={232} y={410} size={0.8} />
      </Group>

      {/* ---------- 公衆回線と道ばたの通信設備 ---------- */}
      <Floor x={262} y={150} w={276} d={262} h={3} z={4} material="concrete" />
      <Group z={4}>
        <Box x={JUNCTION.x - 20} y={JUNCTION.y - 12} w={40} d={24} h={44} color="#9aa3af" />
        <Box x={JUNCTION.x - 20} y={JUNCTION.y - 12} z={44} w={40} d={24} h={3} color="#7d8694" />
      </Group>
      {(["key", "data"] as const).map((id) => (
        <FloorRoute
          key={id}
          points={lanePoints(id, keyDirection)}
          width={9}
          z={4.8}
          tone={lanes[id] === "idle" ? "idle" : LANE_TONE[id]}
          active={lanes[id] === "active"}
          data={{ "data-lane": id, "data-state": lanes[id] === "active" ? "active" : "idle", "data-rail-state": lanes[id] }}
        />
      ))}
      {eveVisible && (
        <Group z={4} data={{ "data-node": "eve", "data-state": nodes.eve, "data-illustration": "eavesdropper" }}>
          <Person x={EVE_AT.x} y={EVE_AT.y} pose="attacker" active={nodes.eve === "error" || nodes.eve === "active"} />
          <Laptop x={EVE_AT.x + 44} y={EVE_AT.y - 20} z={0} w={44} tone="dark" rot={200} />
        </Group>
      )}
      {eveVisible && tapTo && (
        <FloorRoute
          points={[{ x: EVE_AT.x + 8, y: EVE_AT.y - 30, z: G }, { x: JUNCTION.x, y: JUNCTION.y + 12, z: G }, tapTo[tapTo.length - 1]]}
          width={3}
          z={4.8}
          tone="danger"
          active
        />
      )}

      {/* ---------- B社のオフィス（受信側） ---------- */}
      <Floor x={548} y={24} w={262} d={212} h={5} z={4} material="carpet" />
      <Wall x={548} y={24} length={262} h={112} tone="office">
        <WallWindow left={150} top={18} w={90} h={52} />
      </Wall>
      <Group z={4} data={{ "data-node": "b", "data-state": nodes.b, "data-illustration": "person-B" }}>
        <Desk x={B_DESK.x} y={B_DESK.y} w={130} d={62} />
        <Monitor x={B_DESK.x} y={B_DESK.y - 8} w={62} glow={nodes.b === "active" || nodes.b === "sending"} screen={bScreen} />
        <Person x={B_DESK.x - 4} y={B_DESK.y + 70} pose="sit" shirt="#6b7fd6" />
        <Plant x={784} y={60} size={0.8} />
      </Group>
    </>
  );
}
