"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Barrier,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Parcel,
  Person,
  ServerRack,
  Tree,
  Wall,
  slicePath,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { GateSceneProps, PacketStop } from "./GateScene";
import styles from "./firewalldiorama.module.css";

// ファイアウォール／WAF の図解：社外のPC → インターネット（通信会社のルータ）→ 会社の境界。
// 会社の敷地はフェンスで囲まれていて、外から入れる口にファイアウォール（赤い機器）が立つ。
// 中へ入ると Webアプリのサーバの直前に WAF（橙の機器）。FW は「宛先・ポート」だけ、WAF は「中身」を見る。
// 止められた通信は機器の手前で止まり、赤い板で遮られる。

const SENDER: Vec3 = { x: 110, y: 300, z: 0 };
const ISP: Vec3 = { x: 250, y: 262, z: 0 };
const FW: Vec3 = { x: 350, y: 262, z: 0 };
const WAF: Vec3 = { x: 540, y: 262, z: 0 };
const APP: Vec3 = { x: 712, y: 300, z: 0 };

const G = 3;
const ROAD: Vec3[] = [
  { x: 146, y: 286, z: G },
  { x: 250, y: 280, z: G },
  { x: 336, y: 280, z: G },
  { x: 520, y: 280, z: G },
  { x: 650, y: 280, z: G },
];
const Z = G + 1;

/** 止まる場所。遮断されたときは機器の手前で止める */
function stopPath(stop: PacketStop, blocked: boolean): Vec3[] {
  const t = { src: 0.04, fw: blocked ? 0.33 : 0.4, waf: blocked ? 0.7 : 0.77, app: 0.98 }[stop];
  return slicePath(ROAD, t, Z);
}

const SHOTS: Record<PacketStop, Camera> = {
  src: { yaw: -16, pitch: 52, zoom: 1.25, fx: 190, fy: 290, fz: 50 },
  fw: { yaw: -20, pitch: 52, zoom: 1.12, fx: 330, fy: 260, fz: 50 },
  waf: { yaw: -24, pitch: 54, zoom: 1.1, fx: 500, fy: 250, fz: 50 },
  app: { yaw: -22, pitch: 54, zoom: 0.86, fx: 470, fy: 240, fz: 40 },
};

export function GateDioramaScene({
  sender,
  packet,
  gates,
  appState,
  roadState,
  reducedMotion,
  forward = true,
}: GateSceneProps & { forward?: boolean }) {
  const path = stopPath(packet.stop, packet.blocked);
  const attacker = packet.kind === "attack";
  const blockedAt = packet.blocked ? packet.stop : null;

  return (
    <DioramaStage
      testId="gate-scene"
      ariaLabel="社外のPCからインターネットを通って会社へ向かう模型。会社の敷地の入口にファイアウォール、Webアプリのサーバの直前にWAFが立っている"
      shot={SHOTS[packet.stop]}
      shotKey={`${packet.stop}-${packet.kind}-${packet.port}`}
      forward={forward}
      reducedMotion={reducedMotion}
      tokens={{ packet: { at: path[path.length - 1], path } }}
      world={
        <>
          <Floor x={0} y={60} w={820} d={380} h={16} material="plain" />

          {/* ---------- 社外：送信元のPC ---------- */}
          <Floor x={16} y={200} w={194} d={220} h={5} z={4} material="paving" />
          <Group z={4} data={{ "data-illustration": "internet" }}>
            <Desk x={SENDER.x} y={SENDER.y} w={96} d={56} tone="wood" />
            <Laptop x={SENDER.x} y={SENDER.y} z={44} tone={attacker ? "dark" : "light"} glow />
            <Person x={SENDER.x} y={SENDER.y + 64} pose={attacker ? "attacker" : "sit"} active={attacker} shirt="#4f86e8" />
            <Tree x={40} y={226} size={0.8} />
          </Group>
          <Appliance x={ISP.x} y={ISP.y} kind="router" stand={30} w={54} state={roadState === "active" ? "active" : "idle"} />

          {/* ---------- 会社の敷地：フェンス（境界）と入口の FW ---------- */}
          <Floor x={330} y={96} w={480} d={324} h={5} z={4} material="concrete" />
          <Wall x={330} y={96} length={480} h={120} tone="dc" />
          <Group z={4}>
            <Box x={326} y={100} w={8} d={148} h={46} color="#aab2bd" />
            <Box x={326} y={312} w={8} d={106} h={46} color="#aab2bd" />
            <Group data={{ "data-illustration": "gate-fw", "data-state": gates.fw.state }}>
              <Appliance x={FW.x} y={FW.y + 10} kind="firewall" stand={36} w={50} rot={90} state={gates.fw.state} />
            </Group>
            {/* DMZ の中：WAF とWebアプリ */}
            <Group data={{ "data-illustration": "gate-waf", "data-state": gates.waf.state }}>
              <Appliance x={WAF.x} y={WAF.y + 10} kind="waf" stand={36} w={50} rot={90} state={gates.waf.state} />
            </Group>
            <Group data={{ "data-illustration": "web", "data-state": appState }}>
              <ServerRack x={APP.x} y={APP.y - 40} state={appState} accent="#2f6fdb" />
              <ServerRack x={APP.x + 70} y={APP.y - 40} state={appState === "active" ? "active" : "idle"} />
            </Group>
          </Group>

          <FloorRoute points={ROAD} width={12} z={4.8} tone={roadState === "blocked" ? "danger" : roadState === "active" ? "request" : "idle"} active={roadState === "active"} />
          <Barrier x={FW.x - 20} y={280} z={4} w={60} h={70} axis="y" on={blockedAt === "fw"} />
          <Barrier x={WAF.x - 22} y={280} z={4} w={60} h={70} axis="y" on={blockedAt === "waf"} />

          <DioramaToken id="packet">
            <Parcel tone={packet.blocked ? "danger" : attacker ? "warn" : "info"} icon={packet.blocked ? "✕" : attacker ? "!" : "✉"} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          <DioramaLabel token="packet" dz={16} place={packet.stop === "src" ? "right" : "below"}>
            <div
              className={styles.packetWrap}
              data-stop={packet.stop}
              data-blocked={packet.blocked ? "true" : "false"}
              data-kind={packet.kind}
              data-testid="packet"
            >
              <span className={styles.packet} data-inspect={packet.inspect ?? "none"}>
                <span className={`${styles.row} ${styles.packetPort}`} data-lit={packet.inspect === "port" ? "true" : "false"}>
                  <span className={styles.key}>ポート</span>
                  {packet.port}
                </span>
                <span className={`${styles.row} ${styles.packetBody}`} data-lit={packet.inspect === "body" ? "true" : "false"}>
                  <span className={styles.key}>中身</span>
                  {packet.body}
                </span>
              </span>
              {packet.blocked && (
                <span className={styles.stop} aria-label="遮断">
                  ⛔
                </span>
              )}
            </div>
          </DioramaLabel>

          {(["fw", "waf"] as const).map((id) => {
            const verdict = gates[id].verdict;
            const at = id === "fw" ? FW : WAF;
            return (
              <DioramaLabel key={id} at={{ ...at, z: 60 }} place="above">
                <div className={styles.gateLabel} data-gate-label={id} data-verdict={verdict?.state ?? "none"}>
                  <b>{id === "fw" ? "ファイアウォール" : "WAF"}</b>
                  <span className={styles.looksAt} data-looks={id === "fw" ? "port" : "body"}>
                    見る：{id === "fw" ? "IP・ポート" : "通信の中身"}
                  </span>
                  {verdict && (
                    <span className={styles.verdict} data-state={verdict.state} data-testid={`verdict-${id}`}>
                      {verdict.state === "pass" ? "✅" : "⛔"} {verdict.text}
                    </span>
                  )}
                </div>
              </DioramaLabel>
            );
          })}

          <DioramaLabel at={{ x: SENDER.x, y: SENDER.y + 80, z: 0 }} place="below" optional>
            <NameChip name={sender} sub="社外のPC" tone={attacker ? "danger" : "info"} />
          </DioramaLabel>
          <DioramaLabel at={{ ...APP, x: APP.x + 36, z: 130 }} place="above" optional>
            <NameChip name="Webアプリ" status={appState === "active" ? "✅ 正常に到達" : undefined} sub="守る対象" tone="ok" />
          </DioramaLabel>
          <DioramaLabel at={{ ...ISP, y: ISP.y + 26, z: 0 }} place="below" optional>
            <NameChip name="インターネット" tone="muted" />
          </DioramaLabel>
          <DioramaLabel at={{ x: 570, y: 100, z: 124 }} place="above" optional>
            <NameChip name="会社の敷地" sub="社内ネットワーク" tone="muted" />
          </DioramaLabel>
        </>
      }
    />
  );
}
