"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box } from "../scene/Diorama3D";
import {
  Appliance,
  Building,
  Cable,
  Chair,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Monitor,
  Paper,
  Parcel,
  Plant,
  Tree,
  Wall,
  WallWindow,
  WifiRouter,
  type RouteTone,
} from "../scene/DioramaParts";
import { DataTag, DioramaLabel, DioramaStage, DioramaToken, NameChip, pathLength } from "../scene/DioramaStage";
import styles from "./netdev.module.css";

// ネットワーク機器の役割：小さな会社の1フロアを模型にし、機器を1つずつ選んでデータの流れを見せる。
//   ハブ／スイッチ：PC-A から PC-C へ。ハブは B・D にも届き、スイッチは C だけ（真ん中の機器を差し替える）
//   ルータ：PC-A からインターネットへ。社内LANの出口で IPアドレスを見て外へ出す
//   AP：ノートPCの無線を、スイッチへの有線につなぐ入口
//   リピータ：別棟の倉庫まで長いケーブル。弱った信号を元の強さに戻す
//   ゲートウェイ：工場の機械（別の通信方式）と、形式を変換してつなぐ

export type NetDevMode = "hub" | "switch" | "router" | "ap" | "repeater" | "gateway";

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });
const flat = (p: Vec3, z = 10): Vec3 => ({ x: p.x, y: p.y, z });

// 真ん中の集線装置（ハブ／スイッチ）
const HUB: Vec3 = { x: 300, y: 310, z: 0 };
const HUB_TOP = 46;
// 机（PC）
const PCS = {
  A: { x: 160, y: 220 },
  B: { x: 440, y: 220 },
  C: { x: 160, y: 400 },
  D: { x: 440, y: 400 },
} as const;
type PcId = keyof typeof PCS;
// 机の手前の床（ケーブルの出口）
const jack = (id: PcId): Vec3 => ({ x: PCS[id].x, y: PCS[id].y + 34, z: 0 });
const onDesk = (id: PcId): Vec3 => ({ x: PCS[id].x + 30, y: PCS[id].y + 6, z: 52 });

const ROUTER: Vec3 = { x: 300, y: 168, z: 0 };
const NET: Vec3 = { x: 300, y: 30, z: 0 };
const AP: Vec3 = { x: 46, y: 300, z: 78 };
const LAPTOP: Vec3 = { x: 54, y: 410, z: 34 };
const GATEWAY: Vec3 = { x: 520, y: 170, z: 0 };
const FACTORY: Vec3 = { x: 700, y: 70, z: 0 };
// 壁の上の穴から外の建物の正面へ（ルータ・ゲートウェイの外向きの線）
const WALL_HOLE: Vec3 = { x: 300, y: 128, z: 60 };
const NET_DOOR: Vec3 = { x: 300, y: 64, z: 44 };
const GW_HOLE: Vec3 = { x: 540, y: 128, z: 60 };
const FACTORY_DOOR: Vec3 = { x: 660, y: 117, z: 36 };
const REPEATER: Vec3 = { x: 640, y: 380, z: 0 };
const FAR_PC: Vec3 = { x: 800, y: 380, z: 0 };

// 床の配線（星形：どのPCも真ん中の機器へ1本ずつ）
const WIRE: Record<PcId, Vec3[]> = {
  A: [jack("A"), HUB],
  B: [jack("B"), HUB],
  C: [jack("C"), HUB],
  D: [jack("D"), HUB],
};
const WIRE_ROUTER: Vec3[] = [HUB, ROUTER];
const WIRE_AP: Vec3[] = [{ x: AP.x + 6, y: AP.y, z: 0 }, HUB];
const WIRE_GW: Vec3[] = [HUB, { x: GATEWAY.x, y: 310, z: 0 }, GATEWAY];
const WIRE_LONG: Vec3[] = [HUB, { x: 560, y: 380, z: 0 }, REPEATER];
const WIRE_FAR: Vec3[] = [REPEATER, { x: FAR_PC.x - 34, y: FAR_PC.y + 34, z: 0 }];

// 机 → 床 → 真ん中の機器 → 床 → 机
const viaHub = (from: PcId, to: PcId): Vec3[] => [flat(jack(from)), up(HUB, HUB_TOP), flat(jack(to)), onDesk(to)];

/** DioramaStage のトークンの所要時間（DioramaStage と同じ式）。続けて動かす物の delay に使う */
const travelMs = (points: Vec3[]) => 900 + pathLength(points) * 2.6;

const SHOTS: Record<NetDevMode | "none", Camera> = {
  none: { yaw: -14, pitch: 54, zoom: 0.7, fx: 420, fy: 240, fz: 30 },
  hub: { yaw: -10, pitch: 50, zoom: 1.12, fx: 300, fy: 300, fz: 30 },
  switch: { yaw: -10, pitch: 50, zoom: 1.12, fx: 300, fy: 300, fz: 30 },
  router: { yaw: -14, pitch: 52, zoom: 0.95, fx: 280, fy: 200, fz: 40 },
  ap: { yaw: 8, pitch: 52, zoom: 1.05, fx: 180, fy: 330, fz: 40 },
  repeater: { yaw: -12, pitch: 54, zoom: 1.0, fx: 620, fy: 370, fz: 30 },
  gateway: { yaw: -18, pitch: 54, zoom: 0.95, fx: 520, fy: 200, fz: 40 },
};

type Tok = { at: Vec3 | null; path?: Vec3[]; start?: Vec3; delay?: number; restart?: boolean };
const hidden: Tok = { at: null };
const run = (points: Vec3[], delay = 0): Tok => ({ start: points[0], path: points.slice(1), at: points[points.length - 1], restart: true, delay });

function tokensFor(mode: NetDevMode | null): Record<string, Tok> {
  const none = { t1: hidden, t2: hidden, t3: hidden };
  switch (mode) {
    case "hub":
      return { t1: run([onDesk("A"), ...viaHub("A", "B")]), t2: run([onDesk("A"), ...viaHub("A", "C")]), t3: run([onDesk("A"), ...viaHub("A", "D")]) };
    case "switch":
      return { ...none, t2: run([onDesk("A"), ...viaHub("A", "C")]) };
    case "router":
      return {
        ...none,
        t1: run([onDesk("A"), flat(jack("A")), up(HUB, HUB_TOP), flat(ROUTER), up(ROUTER, 50), up(WALL_HOLE, 10), up(NET_DOOR, 10)]),
      };
    case "ap": {
      const air = [up(LAPTOP, 20), up(AP, 12)];
      return { ...none, t1: run(air), t2: run([up(AP, -6), flat(WIRE_AP[0]), up(HUB, HUB_TOP), flat(jack("B")), onDesk("B")], travelMs(air)) };
    }
    case "repeater": {
      const weak = [up(HUB, HUB_TOP), flat({ x: 560, y: 380 }), up(REPEATER, 24)];
      return { ...none, t1: run(weak), t2: run([up(REPEATER, 24), flat(WIRE_FAR[1]), up(FAR_PC, 52)], travelMs(weak)) };
    }
    case "gateway": {
      const lan = [onDesk("A"), flat(jack("A")), up(HUB, HUB_TOP), flat({ x: GATEWAY.x, y: 310 }), up(GATEWAY, 44)];
      return { ...none, t1: run(lan), t2: run([up(GATEWAY, 50), up(GW_HOLE, 10), up(FACTORY_DOOR, 10)], travelMs(lan)) };
    }
    default:
      return none;
  }
}

export function NetworkDevicesDioramaScene({ mode, runKey, reducedMotion }: { mode: NetDevMode | null; runKey: number; reducedMotion: boolean }) {
  const isSwitch = mode !== "hub";
  const toward = (id: PcId): RouteTone => {
    if (mode === "hub") return id === "A" || id === "C" ? "request" : "warn";
    if (mode === "switch") return id === "A" || id === "C" ? "request" : "idle";
    if (mode === "router" || mode === "gateway") return id === "A" ? "request" : "idle";
    if (mode === "ap") return id === "B" ? "request" : "idle";
    return "idle";
  };
  const wireOn = (tone: RouteTone) => tone !== "idle";

  return (
    <DioramaStage
      testId="netdev-scene"
      ariaLabel="小さな会社のフロアの模型。4台のPCが真ん中のハブ（またはスイッチ）に1本ずつつながり、奥の壁ぎわにルータ（インターネットへの出口）、右奥にゲートウェイ（工場の機械とつなぐ）、左の壁にAP（ノートPCの無線の入口）。右手前は長いケーブルの途中にリピータを置いた別棟の倉庫"
      shot={SHOTS[mode ?? "none"]}
      shotKey={`${mode ?? "none"}-${runKey}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-mode": mode ?? "none" }}
      tokens={tokensFor(mode)}
      world={
        <>
          <Floor x={-30} y={-30} w={920} d={510} h={16} material="concrete" />

          {/* ---------- 外：インターネット（奥）と工場（右奥） ---------- */}
          <Building x={NET.x - 70} y={NET.y + 6} w={70} d={60} h={120} kind="tower" />
          <Building x={NET.x} y={NET.y} w={80} d={64} h={96} kind="datacenter" state={mode === "router" ? "active" : "idle"} testId="netdev-internet" />
          <Building x={NET.x + 80} y={NET.y + 10} w={60} d={50} h={70} kind="office" />
          <Building x={FACTORY.x} y={FACTORY.y} w={120} d={90} h={70} kind="factory" state={mode === "gateway" ? "active" : "idle"} testId="netdev-factory" />
          <Tree x={620} y={40} size={0.7} />
          <Tree x={800} y={150} size={0.6} />

          {/* ---------- 社内LAN（オフィスのフロア） ---------- */}
          <Floor x={0} y={130} w={580} d={320} h={6} z={6} material="carpet" />
          <Wall x={0} y={130} length={580} h={64} tone="office">
            <WallWindow left={60} top={12} w={110} h={36} />
            <WallWindow left={400} top={12} w={110} h={36} />
          </Wall>
          <Wall x={0} y={130} length={320} h={64} side="left" tone="office" />

          <Group z={6}>
            {/* 机とPC（A・B・C・D） */}
            {(Object.keys(PCS) as PcId[]).map((id) => (
              <Group key={id} data={{ "data-pc": id }}>
                <Desk x={PCS[id].x} y={PCS[id].y} w={86} d={50} />
                <Monitor x={PCS[id].x} y={PCS[id].y} z={44} w={52} glow={id === "A" && mode !== null && mode !== "ap" && mode !== "repeater"} />
                <Chair x={PCS[id].x} y={PCS[id].y + 44} />
              </Group>
            ))}

            {/* 真ん中の機器：ハブ（白い小箱）とスイッチ（業務用の箱）を差し替える */}
            <Box x={HUB.x - 20} y={HUB.y - 14} w={40} d={28} h={30} color="#9aa3b0" />
            {isSwitch ? (
              <Appliance x={HUB.x} y={HUB.y} z={30} kind="switch" w={56} state={mode === "switch" ? "active" : "idle"} testId="netdev-switch" />
            ) : (
              <Box
                x={HUB.x - 24}
                y={HUB.y - 14}
                z={30}
                w={48}
                d={28}
                h={10}
                color="#e8e2d4"
                faceClass={{ front: styles.hubFront }}
                faces={{ front: <span className={styles.hubPorts} aria-hidden /> }}
                testId="netdev-hub"
              />
            )}

            {/* ルータ（奥の壁ぎわ） */}
            <Appliance x={ROUTER.x} y={ROUTER.y} kind="router" stand={30} w={56} state={mode === "router" ? "active" : "idle"} testId="netdev-router" />

            {/* ゲートウェイ（右奥） */}
            <Appliance x={GATEWAY.x} y={GATEWAY.y} kind="gateway" stand={30} w={56} state={mode === "gateway" ? "active" : "idle"} testId="netdev-gateway" />

            {/* 左の壁の AP と、ノートPCの小机 */}
            <Box x={8} y={AP.y - 14} z={64} w={44} d={28} h={4} color="#cfd5dd" />
            <Group data={{ "data-node": "ap" }}>
              <WifiRouter x={AP.x} y={AP.y} z={68} on testId="netdev-ap" />
            </Group>
            <Desk x={LAPTOP.x} y={LAPTOP.y} w={64} d={44} h={34} tone="wood" />
            <Laptop x={LAPTOP.x} y={LAPTOP.y} z={34} w={40} glow={mode === "ap"} testId="netdev-laptop" />

            <Plant x={548} y={420} size={0.7} />
            <Plant x={24} y={160} size={0.6} />
          </Group>

          {/* 床の配線 */}
          {(Object.keys(PCS) as PcId[]).map((id) => {
            const tone = toward(id);
            return <FloorRoute key={id} points={WIRE[id]} width={6} z={7} tone={tone} active={wireOn(tone)} testId={`netdev-wire-${id}`} />;
          })}
          <FloorRoute points={WIRE_ROUTER} width={6} z={7} tone={mode === "router" ? "request" : "idle"} active={mode === "router"} />
          <FloorRoute points={WIRE_AP} width={6} z={7} tone={mode === "ap" ? "request" : "idle"} active={mode === "ap"} />
          <FloorRoute points={WIRE_GW} width={6} z={7} tone={mode === "gateway" ? "request" : "idle"} active={mode === "gateway"} />
          {/* ルータ → 壁の穴 → インターネット */}
          <Cable from={up(ROUTER, 50)} to={WALL_HOLE} r={1.8} tone={mode === "router" ? "request" : "idle"} segments={5} />
          <Cable from={WALL_HOLE} to={NET_DOOR} r={1.8} tone={mode === "router" ? "request" : "idle"} segments={5} />
          {/* ゲートウェイ → 工場（別の通信方式の線） */}
          <Cable from={up(GATEWAY, 50)} to={GW_HOLE} r={1.8} tone={mode === "gateway" ? "amber" : "idle"} segments={5} />
          <Cable from={GW_HOLE} to={FACTORY_DOOR} r={1.8} tone={mode === "gateway" ? "amber" : "idle"} segments={5} />

          {/* AP の電波 */}
          {mode === "ap" && (
            <div className={styles.wifi} style={{ transform: `translate3d(${AP.x}px, ${AP.y}px, ${AP.z ?? 0}px)` }}>
              <span />
              <span />
            </div>
          )}

          {/* ---------- 別棟の倉庫まで長いケーブル（途中にリピータ） ---------- */}
          <FloorRoute points={WIRE_LONG} width={6} z={7} tone={mode === "repeater" ? "warn" : "idle"} active={mode === "repeater"} testId="netdev-wire-long" />
          <FloorRoute points={WIRE_FAR} width={6} z={1} tone={mode === "repeater" ? "request" : "idle"} active={mode === "repeater"} />
          <Box x={REPEATER.x - 14} y={REPEATER.y - 10} w={28} d={20} h={18} color="#dfe5ee" faceClass={{ front: styles.repeaterFront }} testId="netdev-repeater" />
          <Floor x={710} y={300} w={170} d={150} h={4} z={4} material="concrete" />
          <Wall x={710} y={300} length={170} h={60} tone="office" />
          <Group z={4}>
            <Desk x={FAR_PC.x} y={FAR_PC.y} w={80} d={48} />
            <Monitor x={FAR_PC.x} y={FAR_PC.y} z={44} w={48} glow={mode === "repeater"} testId="netdev-far-pc" />
            <Box x={740} y={320} w={40} d={30} h={44} color="#c7a77a" />
            <Box x={744} y={324} z={44} w={32} d={22} h={28} color="#d6b88c" />
          </Group>

          {/* 動くデータ */}
          <DioramaToken id="t1">
            {mode === "repeater" ? (
              <span className={styles.signal} data-weak="true" />
            ) : (
              <Parcel tone={mode === "hub" ? "warn" : "info"} size={0.8} />
            )}
          </DioramaToken>
          <DioramaToken id="t2">
            {mode === "repeater" ? (
              <span className={styles.signal} />
            ) : mode === "gateway" ? (
              <Paper tone="warn" count={2} />
            ) : (
              <Parcel tone={mode === "hub" || mode === "switch" ? "ok" : "info"} size={0.8} />
            )}
          </DioramaToken>
          <DioramaToken id="t3">
            <Parcel tone="warn" size={0.8} />
          </DioramaToken>
        </>
      }
      labels={<Labels mode={mode} />}
    />
  );
}

function Labels({ mode }: { mode: NetDevMode | null }) {
  const pc = (id: PcId, tone: "info" | "ok" | "warn" | "muted", status?: string, optional = true) => (
    <DioramaLabel key={id} at={{ ...PCS[id], z: 100 }} place="above" optional={optional}>
      <NameChip name={`PC-${id}`} tone={tone} status={status} />
    </DioramaLabel>
  );

  if (mode === null) {
    return (
      <>
        <DioramaLabel at={{ x: 290, y: 450, z: 6 }} place="below" pinned>
          <span className={styles.area}>社内LAN（1つのネットワーク）</span>
        </DioramaLabel>
        <DioramaLabel at={up(NET, 130)} place="above" optional>
          <NameChip name="インターネット" tone="muted" />
        </DioramaLabel>
        <DioramaLabel at={up(FACTORY, 80)} place="above" optional>
          <NameChip name="工場（別の通信方式）" tone="muted" />
        </DioramaLabel>
        <DioramaLabel at={{ x: 800, y: 450, z: 4 }} place="below" optional>
          <span className={styles.area}>別棟の倉庫</span>
        </DioramaLabel>
      </>
    );
  }

  if (mode === "hub" || mode === "switch") {
    return (
      <>
        <DioramaLabel at={up(HUB, 60)} place="below" testId="netdev-center-label">
          {mode === "hub" ? (
            <NameChip name="ハブ" status="宛先を見ない" tone="warn" />
          ) : (
            <div className={styles.macTable} data-testid="netdev-mac-table">
              <b>スイッチのMACアドレス表</b>
              {(["A", "B", "C", "D"] as PcId[]).map((id, i) => (
                <span key={id} data-hit={id === "C" ? "true" : undefined}>
                  PC-{id}→ポート{i + 1}
                </span>
              ))}
            </div>
          )}
        </DioramaLabel>
        {pc("A", "info", "送信")}
        {pc("C", "ok", "宛先")}
        {mode === "hub" ? (
          <>
            {pc("B", "warn", "関係ないのに届く", false)}
            {pc("D", "warn", "関係ないのに届く", false)}
          </>
        ) : null}
      </>
    );
  }

  if (mode === "router") {
    return (
      <>
        <DioramaLabel token="t1" place="right">
          <DataTag tag="パケット" body="宛先IP 203.0.113.10" tone="info" />
        </DioramaLabel>
        <DioramaLabel at={up(ROUTER, 60)} place="left">
          <NameChip name="ルータ" status="IPで外へ" tone="info" />
        </DioramaLabel>
        <DioramaLabel at={up(NET, 130)} place="above" optional>
          <NameChip name="インターネット（別のネットワーク）" tone="info" />
        </DioramaLabel>
      </>
    );
  }

  if (mode === "ap") {
    return (
      <>
        <DioramaLabel at={up(AP, 40)} place="above">
          <NameChip name="AP" status="無線→有線" tone="info" />
        </DioramaLabel>
        <DioramaLabel at={up(LAPTOP, 40)} place="below" optional>
          <NameChip name="ノートPC（無線）" tone="info" />
        </DioramaLabel>
        {pc("B", "ok", "宛先")}
      </>
    );
  }

  if (mode === "repeater") {
    return (
      <>
        <DioramaLabel token="t1" place="left">
          <DataTag tag="信号" body="弱っている" tone="plain" />
        </DioramaLabel>
        <DioramaLabel token="t2" place="above">
          <DataTag tag="信号" body="元の強さ" tone="ok" />
        </DioramaLabel>
        <DioramaLabel at={REPEATER} place="below">
          <NameChip name="リピータ" status="増幅して延長" tone="info" />
        </DioramaLabel>
      </>
    );
  }

  // gateway
  return (
    <>
      <DioramaLabel token="t1" place="left">
        <DataTag tag="社内の方式" body="TCP/IP" tone="info" />
      </DioramaLabel>
      <DioramaLabel token="t2" place="above">
        <DataTag tag="工場の方式" body="形式を変換済み" tone="ok" />
      </DioramaLabel>
      <DioramaLabel at={up(GATEWAY, 30)} place="below">
        <NameChip name="ゲートウェイ" status="変換" tone="info" />
      </DioramaLabel>
    </>
  );
}
