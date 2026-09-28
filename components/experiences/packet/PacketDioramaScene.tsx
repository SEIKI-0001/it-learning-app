"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Monitor,
  Parcel,
  Person,
  Plant,
  Wall,
  WallWindow,
  slicePath,
  type CarryTone,
  type RouteTone,
} from "../scene/DioramaParts";
import { Badge, Callout, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { PacketSceneProps, PacketSpot, RouteId } from "./PacketScene";
import styles from "./packetdiorama.module.css";

// インターネット・パケットの図解：左のオフィスの送信者A → 3台の通信会社のルータ（3本の道）→ 右のオフィスの受信者B。
// 「HELLO WORLD」を4つのパケットに分け、それぞれ別の道を通す。道ごとに混み具合が違うので届く順番が入れ替わり、
// Bの机の受信トレイに「届いた順」に並ぶ。Bのパソコンは番号を見て並べ直し、元のデータに戻す。

const SENDER: Vec3 = { x: 110, y: 330, z: 0 };
const RECEIVER: Vec3 = { x: 700, y: 236, z: 0 };
const ROUTER: Record<RouteId, Vec3> = {
  top: { x: 330, y: 120, z: 0 },
  mid: { x: 420, y: 256, z: 0 },
  bot: { x: 350, y: 396, z: 0 },
};
const OUT: Vec3 = { x: 176, y: 318, z: 3 };
const IN: Vec3 = { x: 628, y: 250, z: 3 };

const G = 3;
const LEGS: Record<RouteId, [Vec3[], Vec3[]]> = {
  top: [
    [OUT, { x: 230, y: 250, z: G }, { ...ROUTER.top, y: ROUTER.top.y + 20, z: G }],
    [{ ...ROUTER.top, y: ROUTER.top.y + 20, z: G }, { x: 520, y: 170, z: G }, IN],
  ],
  mid: [
    [OUT, { x: 300, y: 290, z: G }, { ...ROUTER.mid, y: ROUTER.mid.y + 20, z: G }],
    [{ ...ROUTER.mid, y: ROUTER.mid.y + 20, z: G }, { x: 530, y: 262, z: G }, IN],
  ],
  bot: [
    [OUT, { x: 240, y: 370, z: G }, { ...ROUTER.bot, y: ROUTER.bot.y + 20, z: G }],
    [{ ...ROUTER.bot, y: ROUTER.bot.y + 20, z: G }, { x: 520, y: 360, z: G }, IN],
  ],
};
const ROUTE_TONE: Record<RouteId, RouteTone> = { top: "request", mid: "violet", bot: "amber" };
const PACKET_TONE: Record<RouteId, CarryTone> = { top: "info", mid: "muted", bot: "warn" };
const ROUTER_NODE: Record<RouteId, "rTop" | "rMid" | "rBot"> = { top: "rTop", mid: "rMid", bot: "rBot" };

const Z = G + 1;
const stackAt = (slot: number): Vec3 => ({ x: SENDER.x + 44, y: SENDER.y - 4, z: 44 + slot * 13 });
const trayAt = (slot: number): Vec3 => ({ x: RECEIVER.x - 40, y: RECEIVER.y + 52 + slot * 34, z: 34 });

function where(spot: PacketSpot, route: RouteId): Vec3 {
  if (spot.kind === "stack") return stackAt(spot.slot);
  if (spot.kind === "tray") return trayAt(spot.slot);
  const leg = LEGS[spot.route][spot.leg];
  const p = slicePath(leg, spot.t, Z);
  return p[p.length - 1] ?? LEGS[route][0][0];
}

/** 前へ進んだときに通る道のり（積み場 → 道の途中 → 受信トレイ） */
function pathTo(spot: PacketSpot, route: RouteId): Vec3[] {
  if (spot.kind === "stack") return [stackAt(spot.slot)];
  if (spot.kind === "road") {
    const legs = LEGS[spot.route];
    return spot.leg === 0 ? slicePath(legs[0], spot.t, Z) : [...slicePath(legs[0], 1, Z), ...slicePath(legs[1], spot.t, Z)];
  }
  const legs = LEGS[route];
  return [...slicePath(legs[1], 1, Z).slice(-2), trayAt(spot.slot)];
}

const SHOTS: Camera[] = [
  { yaw: -14, pitch: 52, zoom: 1.35, fx: 150, fy: 310, fz: 60 },
  { yaw: -16, pitch: 52, zoom: 1.3, fx: 160, fy: 310, fz: 60 },
  { yaw: -18, pitch: 56, zoom: 0.9, fx: 420, fy: 260, fz: 30 },
  { yaw: -16, pitch: 50, zoom: 1.3, fx: 620, fy: 320, fz: 50 },
  { yaw: -16, pitch: 50, zoom: 1.3, fx: 620, fy: 320, fz: 50 },
  { yaw: -18, pitch: 50, zoom: 1.2, fx: 650, fy: 270, fz: 60 },
];

function shotIndex({ whole, packets, trayMode, restored }: Omit<PacketSceneProps, "reducedMotion">) {
  if (whole) return 0;
  if (restored) return 5;
  if (trayMode === "sorted") return 4;
  if (trayMode === "arrival") return 3;
  if (packets.some((p) => p.spot.kind === "road")) return 2;
  return 1;
}

export function PacketDioramaScene(props: PacketSceneProps & { forward?: boolean }) {
  const { nodes, routes, whole, packets, trayMode, restored, reducedMotion, forward = true } = props;
  const shot = shotIndex(props);

  const tokens = Object.fromEntries(
    packets.map((p) => {
      const at = where(p.spot, p.route);
      return [
        `p${p.no}`,
        {
          at,
          path: pathTo(p.spot, p.route),
          // 受信トレイへは届いた順に1つずつ着く
          delay: p.spot.kind === "tray" && trayMode === "arrival" ? p.spot.slot * 420 : 0,
        },
      ];
    }),
  );

  return (
    <DioramaStage
      testId="packet-scene"
      ariaLabel="左手前のオフィスに送信者A、右奥のオフィスに受信者B。間に通信会社のルータが3台あり、上・中・下の3本の経路でつながっている。Bの机には受信トレイがある"
      shot={SHOTS[shot]}
      shotKey={shot}
      forward={forward}
      reducedMotion={reducedMotion}
      tokens={tokens}
      world={
        <>
          <Floor x={0} y={40} w={820} d={410} h={16} material="plain" />

          {/* ---------- 送信者Aのオフィス ---------- */}
          <Floor x={16} y={250} w={190} d={180} h={5} z={4} material="carpet" />
          <Wall x={16} y={250} length={190} h={96} tone="office">
            <WallWindow left={24} top={16} w={70} h={44} />
          </Wall>
          <Group z={4} data={{ "data-node": "sender", "data-state": nodes.sender }}>
            <Desk x={SENDER.x} y={SENDER.y} w={124} d={58} />
            <Monitor x={SENDER.x - 14} y={SENDER.y - 4} w={56} glow={nodes.sender === "active"} />
            <Person x={SENDER.x - 14} y={SENDER.y + 64} pose="sit" shirt="#4f86e8" size={0.95} />
          </Group>

          {/* ---------- インターネット：3台のルータ ---------- */}
          <Floor x={220} y={80} w={380} d={350} h={3} z={4} material="concrete" />
          {(Object.keys(ROUTER) as RouteId[]).map((id) => (
            <Group key={id} z={4} data={{ "data-node": ROUTER_NODE[id], "data-state": nodes[ROUTER_NODE[id]], "data-illustration": "router" }}>
              <Appliance x={ROUTER[id].x} y={ROUTER[id].y} kind="router" stand={30} w={52} state={nodes[ROUTER_NODE[id]]} />
            </Group>
          ))}
          {(Object.keys(LEGS) as RouteId[]).map((id) => (
            <FloorRoute
              key={id}
              points={[...LEGS[id][0], ...LEGS[id][1].slice(1)]}
              width={9}
              z={4.8}
              tone={routes[id] ? ROUTE_TONE[id] : "idle"}
              active={routes[id] === "active"}
              data={{ "data-route": id, "data-state": routes[id] ?? "idle" }}
            />
          ))}

          {/* ---------- 受信者Bのオフィス ---------- */}
          <Floor x={612} y={100} w={200} d={330} h={5} z={4} material="carpet" />
          <Wall x={612} y={100} length={200} h={110} tone="office">
            <WallWindow left={100} top={18} w={76} h={46} />
          </Wall>
          <Group z={4} data={{ "data-node": "receiver", "data-state": nodes.receiver }}>
            <Desk x={RECEIVER.x} y={RECEIVER.y} w={110} d={56} />
            <Monitor x={RECEIVER.x} y={RECEIVER.y - 4} w={56} glow={!!restored} screen={restored ? <div className={styles.screen}>{restored}</div> : undefined} />
            <Person x={RECEIVER.x + 60} y={RECEIVER.y + 30} pose="sit" shirt="#6b7fd6" size={0.9} />
            {/* 受信トレイ（届いたパケットを置く台） */}
            <Box x={RECEIVER.x - 62} y={RECEIVER.y + 40} w={44} d={150} h={30} color="#9aa3b0" />
            <Box x={RECEIVER.x - 62} y={RECEIVER.y + 40} z={30} w={44} d={150} h={3} color="#e5e7eb" />
            <Plant x={790} y={400} size={0.8} />
          </Group>

          {packets.map((p) => (
            <DioramaToken key={p.no} id={`p${p.no}`}>
              <Parcel tone={PACKET_TONE[p.route]} icon={String(p.no)} size={0.9} />
            </DioramaToken>
          ))}
        </>
      }
      labels={
        <>
          {whole && (
            <DioramaLabel at={{ x: SENDER.x, y: SENDER.y - 10, z: 110 }} place="above">
              <div data-testid="packet-whole">
                <Callout tone="info" title="送るデータ（1かたまり）" body={whole} />
              </div>
            </DioramaLabel>
          )}

          {packets.map((p) => (
            <DioramaLabel
              key={p.no}
              token={`p${p.no}`}
              dz={12}
              place={p.spot.kind === "stack" ? "right" : p.spot.kind === "tray" ? "left" : "above"}
            >
              <div
                className={styles.packet}
                data-route={p.route}
                data-packet={p.no}
                data-spot={p.spot.kind}
                data-slot={p.spot.kind === "road" ? undefined : p.spot.slot}
                data-testid={`packet-${p.no}`}
                role="img"
                aria-label={`パケット${p.no}番：宛先B、データ「${p.data}」${p.arrived ? `、${p.arrived}番目に到着` : ""}`}
              >
                <b>#{p.no}</b>
                <span className={styles.dest}>→B</span>
                <span className={styles.data}>{p.data}</span>
              </div>
            </DioramaLabel>
          ))}

          {trayMode && (
            <DioramaLabel at={{ x: RECEIVER.x - 40, y: RECEIVER.y + 40, z: 40 }} place="above">
              <span data-testid="tray-head" data-mode={trayMode}>
                <Badge tone={trayMode === "arrival" ? "warn" : "ok"}>{trayMode === "arrival" ? "届いた順" : "番号順に並べ直し"}</Badge>
              </span>
            </DioramaLabel>
          )}

          {restored && (
            <DioramaLabel at={{ x: RECEIVER.x, y: RECEIVER.y - 10, z: 96 }} place="above">
              <div role="status" data-testid="packet-restored">
                <Callout tone="ok" title="元のデータに戻った" body={restored} />
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ x: SENDER.x, y: SENDER.y + 84, z: 0 }} place="below" optional>
            <NameChip name="送信者A" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={{ x: RECEIVER.x + 60, y: RECEIVER.y + 40, z: 90 }} place="above" optional>
            <NameChip name="受信者B" tone="info" />
          </DioramaLabel>
          {(Object.keys(ROUTER) as RouteId[]).map((id, i) => (
            <DioramaLabel key={id} at={{ ...ROUTER[id], z: 52 }} place="above" optional>
              <NameChip name={`ルータ${"①②③"[i]}`} tone="muted" />
            </DioramaLabel>
          ))}
        </>
      }
    />
  );
}
