"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box, Cylinder } from "../scene/Diorama3D";
import {
  Building,
  Cable,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Monitor,
  Parcel,
  Person,
  Phone,
  Plant,
  ServerRack,
  Tree,
  Wall,
  WallWindow,
  WifiRouter,
} from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import styles from "./lanwan.module.css";

// LAN と WAN の図解：実際の家から先の配線をそのまま模型にする。
//   自宅（LAN・自分で用意）：Wi-Fiルータを真ん中に、PC・プリンタはLANケーブル、スマホはWi-Fiで星形につながる（スター型）。
//   壁の ONU（光回線の終端装置）から先は、電柱の光ファイバ → 通信事業者の局舎（WAN・回線を借りる）。
//   局舎から、地中の回線で会社（本社のLAN）へ／海底ケーブルで海外の動画サイトのデータセンターへ。
// 宛先を選ぶと、小包がその道をたどる。プリンタなら家の中（LAN）だけで完結し、WANは通らない。

export type LanWanDest = "printer" | "office" | "video";

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });

// 自宅
const PHONE: Vec3 = { x: 96, y: 372, z: 44 };
const ROUTER: Vec3 = { x: 150, y: 262, z: 34 };
const PC: Vec3 = { x: 226, y: 340, z: 44 };
const PRINTER: Vec3 = { x: 62, y: 262, z: 30 };
const ONU: Vec3 = { x: 236, y: 212, z: 34 };
// 外
const POLE1: Vec3 = { x: 330, y: 206, z: 118 };
const POLE2: Vec3 = { x: 410, y: 176, z: 118 };
const CARRIER: Vec3 = { x: 490, y: 150, z: 0 };

const OFFICE_RACK: Vec3 = { x: 690, y: 342, z: 0 };
const DC: Vec3 = { x: 730, y: 82, z: 0 };

const Z = 12; // 床の上を通るときの小包の高さ
const ROUTES: Record<LanWanDest, Vec3[]> = {
  printer: [up(PHONE, 26), up(ROUTER, 26), up(PRINTER, 26)],
  office: [
    up(PHONE, 26),
    up(ROUTER, 26),
    up(ONU, 22),
    up(POLE1, 8),
    up(POLE2, 8),
    { x: 470, y: 180, z: 60 },
    { x: 540, y: 250, z: Z },
    { x: 620, y: 330, z: Z },
    up(OFFICE_RACK, 60),
  ],
  video: [
    up(PHONE, 26),
    up(ROUTER, 26),
    up(ONU, 22),
    up(POLE1, 8),
    up(POLE2, 8),
    { x: 490, y: 110, z: 96 },
    { x: 580, y: 96, z: Z },
    { x: 690, y: 88, z: Z },
    up(DC, 96),
  ],
};

// 地面・海底を通る区間（床に引く道）
const OFFICE_LINE: Vec3[] = [
  { x: 520, y: 190, z: 1 },
  { x: 540, y: 250, z: 1 },
  { x: 620, y: 330, z: 1 },
];
const SEA_LINE: Vec3[] = [
  { x: 540, y: 110, z: 1 },
  { x: 690, y: 88, z: 1 },
];

const SHOTS: Record<LanWanDest | "none", Camera> = {
  none: { yaw: -18, pitch: 55, zoom: 0.78, fx: 400, fy: 230, fz: 40 },
  printer: { yaw: -12, pitch: 52, zoom: 1.35, fx: 150, fy: 300, fz: 40 },
  office: { yaw: -20, pitch: 56, zoom: 0.8, fx: 450, fy: 270, fz: 40 },
  video: { yaw: -22, pitch: 56, zoom: 0.8, fx: 470, fy: 200, fz: 40 },
};

export function LanWanDioramaScene({ dest, runKey, reducedMotion }: { dest: LanWanDest | null; runKey: number; reducedMotion: boolean }) {
  const wan = dest === "office" || dest === "video";
  const route = dest ? ROUTES[dest] : null;
  const lanOn = dest !== null;

  return (
    <DioramaStage
      testId="lanwan-scene"
      ariaLabel="自宅の部屋（スマホ・PC・プリンタがWi-Fiルータを中心につながるLAN）、壁のONUから電柱の光ファイバで通信事業者の局舎へ。局舎からは地中の回線で会社へ、海底ケーブルで海外のデータセンターへつながる模型"
      shot={SHOTS[dest ?? "none"]}
      shotKey={`${dest ?? "none"}-${runKey}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{
        "data-dest": dest ?? "none",
        "data-wan": wan ? "true" : "false",
      }}
      tokens={{
        packet: route
          ? {
              at: route[route.length - 1],
              start: route[0],
              path: route.slice(1),
              restart: true,
            }
          : { at: null },
      }}
      corner={
        <span className={styles.plate} data-wan={wan ? "true" : dest ? "false" : "none"} data-testid="lanwan-plate">
          {!dest ? "宛先を選んでください" : wan ? "🌐 WANを通った" : "🏠 LAN内で完結（WANは通らない）"}
        </span>
      }
      world={
        <>
          <Floor x={-10} y={-20} w={840} d={480} h={16} material="concrete" />

          {/* ---------- 自宅（LAN） ---------- */}
          <Floor x={10} y={200} w={270} d={240} h={6} z={6} material="wood" />
          <Wall x={10} y={200} length={270} h={96} tone="home">
            <WallWindow left={80} top={16} w={90} h={52} />
          </Wall>
          <Wall x={10} y={200} length={240} h={96} side="left" tone="home" />
          <Group z={6}>
            {/* ルータの棚 */}
            <Desk x={ROUTER.x} y={ROUTER.y} w={60} d={34} h={28} tone="wood" />
            <Group data={{ "data-node": "router" }}>
              <WifiRouter x={ROUTER.x} y={ROUTER.y} z={28} on />
            </Group>
            {/* 壁の ONU（光回線の終端装置） */}
            <Box x={ONU.x - 12} y={ONU.y - 8} z={24} w={24} d={8} h={20} color="#f8fafc" testId="lanwan-onu" />
            {/* プリンタ */}
            <Box x={PRINTER.x - 22} y={PRINTER.y - 16} w={44} d={32} h={18} color="#9aa3b0" />
            <Box x={PRINTER.x - 20} y={PRINTER.y - 14} z={18} w={40} d={28} h={10} color="#e5e7eb" testId="lanwan-printer" />
            <Box x={PRINTER.x - 12} y={PRINTER.y + 8} z={20} w={24} d={10} h={2} color="#ffffff" />
            {/* PC */}
            <Desk x={PC.x} y={PC.y} w={86} d={54} tone="wood" />
            <Monitor x={PC.x} y={PC.y} z={44} w={56} />
            {/* スマホを持つ人（ソファの前） */}
            <Box x={40} y={390} w={60} d={34} h={22} color="#6b8cc7" />
            <Phone x={PHONE.x} y={PHONE.y} z={22} scale={0.7} glow={lanOn} testId="lanwan-phone" />
            <Person x={150} y={404} pose="back" shirt="#4f86e8" />
            <Plant x={258} y={420} size={0.7} />
          </Group>
          {/* 家の中のLANケーブル（ルータから星形に） */}
          <Group data={{ "data-star": "true" }} testId="lanwan-lan">
            <Cable from={up(ROUTER, 4)} to={{ x: 150, y: 300, z: 7 }} r={1.6} tone="idle" segments={5} />
            <Cable from={{ x: 150, y: 300, z: 7 }} to={{ x: 210, y: 330, z: 7 }} r={1.6} tone="idle" segments={5} />
            <Cable from={up(ROUTER, 4)} to={{ x: 86, y: 262, z: 30 }} r={1.6} tone={dest === "printer" ? "request" : "idle"} segments={5} />
            <Cable from={up(ROUTER, 6)} to={up(ONU, 12)} r={1.6} tone={wan ? "request" : "idle"} segments={5} />
          </Group>
          {/* スマホはWi-Fiでルータへ */}
          {lanOn && (
            <div
              className={styles.wifi}
              style={{
                transform: `translate3d(${ROUTER.x}px, ${ROUTER.y}px, 40px)`,
              }}
            >
              <span />
              <span />
            </div>
          )}

          {/* ---------- 電柱と光ファイバ（WAN：通信事業者の回線） ---------- */}
          {[POLE1, POLE2].map((p, i) => (
            <Group key={i}>
              <Box x={p.x - 3} y={p.y - 3} w={6} d={6} h={118} color="#9ca3af" />
              <Box x={p.x - 14} y={p.y - 2} z={104} w={28} d={4} h={4} color="#6b7280" />
            </Group>
          ))}
          <Group testId="lanwan-wan" className={styles.wanLine} data={{ "data-on": wan ? "true" : "false" }}>
            <Cylinder from={up(ONU, 40)} to={POLE1} z={0} r={1.6} segments={5} stripClassName={styles.fiberStrip} />
            <Cylinder from={POLE1} to={POLE2} z={0} r={1.6} segments={5} stripClassName={styles.fiberStrip} />
            <Cylinder from={POLE2} to={{ x: 470, y: 150, z: 80 }} z={0} r={1.6} segments={5} stripClassName={styles.fiberStrip} />
          </Group>

          {/* 通信事業者の局舎 */}
          <Building x={CARRIER.x} y={CARRIER.y} w={110} d={90} h={80} kind="datacenter" testId="lanwan-carrier" />

          {/* ---------- 会社（本社のLAN）：屋根を外したカットモデル ---------- */}
          <Floor x={600} y={296} w={200} d={120} h={4} z={4} material="carpet" />
          <Wall x={600} y={296} length={200} h={62} tone="office" />
          <ServerRack x={OFFICE_RACK.x} y={OFFICE_RACK.y} z={4} h={70} units={4} state={dest === "office" ? "active" : "idle"} testId="lanwan-office" />
          <Desk x={754} y={360} z={4} w={70} d={44} />
          <Monitor x={754} y={360} z={48} w={44} />
          <Desk x={640} y={388} z={4} w={60} d={40} />
          <Monitor x={640} y={388} z={48} w={40} />
          <FloorRoute points={OFFICE_LINE} width={7} tone={dest === "office" ? "request" : "idle"} active={dest === "office"} testId="lanwan-line-office" />

          {/* ---------- 海と海外のデータセンター ---------- */}
          <Box x={560} y={-10} z={0} w={260} d={200} h={2} color="#4f9fd6" faceClass={{ top: styles.sea }} testId="lanwan-sea" />
          <Floor x={660} y={30} w={140} d={110} h={6} z={6} material="grass" />
          <Building x={DC.x} y={DC.y} w={100} d={74} h={90} kind="datacenter" state={dest === "video" ? "active" : "idle"} testId="lanwan-dc" />
          <Tree x={680} y={130} size={0.6} />
          <FloorRoute points={SEA_LINE} width={7} tone={dest === "video" ? "request" : "idle"} active={dest === "video"} testId="lanwan-line-sea" />

          <DioramaToken id="packet">
            <Parcel tone={wan ? "info" : "ok"} size={0.85} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          <DioramaLabel at={{ x: 140, y: 440, z: 0 }} place="below" pinned>
            <span className={styles.area} data-area="lan" data-on={lanOn ? "true" : "false"}>
              🏠 自宅のLAN（自分で用意）
            </span>
          </DioramaLabel>
          {dest !== "printer" && (
            <DioramaLabel at={{ x: 400, y: 250, z: 0 }} place="below" optional>
              <span className={styles.area} data-area="wan" data-on={wan ? "true" : "false"}>
                🌐 WAN（通信事業者の回線を借りる）
              </span>
            </DioramaLabel>
          )}

          {dest === "printer" && (
            <DioramaLabel at={up(ROUTER, 60)} place="above">
              <div data-testid="lanwan-star">
                <Badge tone="ok">ルータを中心に星形＝スター型</Badge>
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel at={up(ROUTER, 50)} place="right" optional>
            <NameChip name="Wi-Fiルータ" sub="LANとWANの境目" tone={lanOn ? "info" : "muted"} />
          </DioramaLabel>
          <DioramaLabel at={up(ONU, 30)} place="above" optional>
            <NameChip name="ONU" sub="光回線の入口" tone={wan ? "info" : "muted"} />
          </DioramaLabel>
          <DioramaLabel at={up(PRINTER, 30)} place="above" optional>
            <NameChip name="プリンタ" status={dest === "printer" ? "印刷" : undefined} tone="ok" />
          </DioramaLabel>
          <DioramaLabel at={up(PHONE, 40)} place="left" optional>
            <NameChip name="あなたのスマホ" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={up(CARRIER, 90)} place="above" optional>
            <NameChip name="通信事業者の局舎" sub="回線を貸す" tone={wan ? "info" : "muted"} />
          </DioramaLabel>
          <DioramaLabel at={up(OFFICE_RACK, 76)} place="above" optional={dest !== "office"}>
            <NameChip name="会社のLAN" sub="本社のサーバ" status={dest === "office" ? "届いた" : undefined} tone={dest === "office" ? "ok" : "muted"} />
          </DioramaLabel>
          <DioramaLabel at={up(DC, 96)} place="above" optional={dest !== "video"}>
            <NameChip name="海外の動画サイト" sub="データセンター" status={dest === "video" ? "届いた" : undefined} tone={dest === "video" ? "ok" : "muted"} />
          </DioramaLabel>
          {dest === "video" && (
            <DioramaLabel at={{ x: 620, y: 100, z: 2 }} place="below" optional>
              <Badge tone="info">海底ケーブル</Badge>
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
