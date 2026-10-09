"use client";

import type { CSSProperties } from "react";
import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box, Cylinder } from "../scene/Diorama3D";
import { Building, Desk, Floor, Group, Parcel, Paper, Person, Phone, Plant, Tree, Wall, WallWindow, WifiRouter } from "../scene/DioramaParts";
import { Callout, DataTag, DioramaLabel, DioramaStage, DioramaToken, NameChip, pathLength } from "../scene/DioramaStage";
import { useTimeline } from "../scene/useTimeline";
import styles from "./iot.module.css";

// IoT の一周を、実際の家とクラウドの模型で見せる。
//   リビングの壁のエアコン（センサー付き）→ 棚の Wi-Fi ルータ → 電柱の光回線 → クラウドのデータセンター
//   ① 測る：エアコンのセンサーが室温 32℃ を測る（床が赤い＝暑い）
//   ② 送る：測ったデータがルータ・回線を通ってクラウドへ
//   ③ 判断：クラウドが「暑い → 28℃まで冷やす」と決める
//   ④ 動く：指示がエアコンへ戻り、自動で冷房が動く（風が出て、床の色が冷える）

export type IotPhase = 0 | 1 | 2 | 3;

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });

const AIRCON = { x: 150, y: 140, z: 128 } satisfies Vec3;
const ROUTER: Vec3 = { x: 262, y: 200, z: 40 };
const WALL_OUT: Vec3 = { x: 300, y: 196, z: 70 };
const POLE1: Vec3 = { x: 380, y: 210, z: 120 };
const POLE2: Vec3 = { x: 470, y: 170, z: 120 };
const CLOUD: Vec3 = { x: 600, y: 110, z: 0 };
const CLOUD_DOOR: Vec3 = { x: 560, y: 156, z: 50 };

// エアコン → ルータ → 壁の穴 → 電柱 → クラウド
const UPLINK: Vec3[] = [up(AIRCON, 6), up(ROUTER, 14), up(WALL_OUT, 4), up(POLE1, 10), up(POLE2, 10), up(CLOUD_DOOR, 6)];
const DOWNLINK: Vec3[] = [...UPLINK].reverse();

/** DioramaStage が UPLINK / DOWNLINK を運び終えるまでの時間 */
const ARRIVE_MS = 150 + 900 + pathLength(UPLINK) * 2.6;

const SHOTS: Record<IotPhase, Camera> = {
  0: { yaw: -12, pitch: 56, zoom: 1.2, fx: 160, fy: 230, fz: 70 },
  1: { yaw: -18, pitch: 56, zoom: 0.78, fx: 360, fy: 220, fz: 60 },
  2: { yaw: -22, pitch: 54, zoom: 1.05, fx: 540, fy: 160, fz: 60 },
  3: { yaw: -14, pitch: 56, zoom: 0.92, fx: 260, fy: 230, fz: 60 },
};

export function IotDioramaScene({ phase, forward, reducedMotion }: { phase: IotPhase; forward: boolean; reducedMotion: boolean }) {
  // 運んでいる間だけデータの札を出し、着いたら行き先の札（クラウドの判断・エアコン）に切り替える
  const moving = phase === 1 || phase === 3;
  const arrived = useTimeline(phase, moving ? [ARRIVE_MS] : [], !forward || reducedMotion || !moving) > 0;
  const cooled = phase === 3 && arrived;
  const heat = cooled ? 0 : 1;

  return (
    <DioramaStage
      testId="iot-scene"
      ariaLabel="家のリビングの模型。壁のエアコンにはセンサーが付いていて、棚のWi-Fiルータから電柱の光回線を通って、遠くのクラウド（データセンター）につながっている"
      shot={SHOTS[phase]}
      shotKey={phase}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-phase": String(phase), "data-cooled": cooled ? "true" : "false" }}
      tokens={{
        up: phase === 1 ? { at: UPLINK[UPLINK.length - 1], start: UPLINK[0], path: UPLINK.slice(1) } : phase === 2 ? { at: UPLINK[UPLINK.length - 1] } : { at: null },
        down: phase === 3 ? { at: DOWNLINK[DOWNLINK.length - 1], start: DOWNLINK[0], path: DOWNLINK.slice(1) } : { at: null },
      }}
      world={
        <>
          <Floor x={-20} y={-20} w={760} d={460} h={16} material="grass" />

          {/* ---------- 家（リビングを屋根なしで） ---------- */}
          <Floor x={0} y={130} w={300} d={280} h={6} z={6} material="wood" />
          <div
            className={styles.heat}
            style={{ transform: "translate3d(0px, 130px, 6.8px)", width: 300, height: 280, "--heat": heat } as CSSProperties}
            data-testid="iot-heat"
          />
          <Wall x={0} y={130} length={300} h={170} tone="home">
            <WallWindow left={200} top={40} w={70} h={60} />
          </Wall>
          <Wall x={0} y={130} length={280} h={170} side="left" tone="home" />

          {/* 壁掛けエアコン（センサー付き） */}
          <Group data={{ "data-node": "aircon", "data-on": phase === 0 || phase === 3 ? "true" : "false" }} testId="iot-aircon">
            <Box x={AIRCON.x - 60} y={AIRCON.y - 10} z={AIRCON.z} w={120} d={28} h={36} color="#f8fafc" faceClass={{ front: styles.airconFront }} />
            <Box x={AIRCON.x - 52} y={AIRCON.y + 17} z={AIRCON.z + 22} w={8} d={2} h={8} color={phase === 0 ? "#ef4444" : "#334155"} />
          </Group>
          {cooled && (
            <div className={styles.wind} data-reduced={reducedMotion ? "true" : "false"} style={{ transform: `translate3d(${AIRCON.x - 50}px, ${AIRCON.y + 24}px, ${AIRCON.z - 4}px)` }}>
              <span />
              <span />
              <span />
            </div>
          )}

          <Group z={6}>
            {/* ソファと人 */}
            <Box x={60} y={320} w={160} d={50} h={24} color="#7d8fb3" />
            <Box x={60} y={362} w={160} d={14} h={54} color="#6b7ea3" />
            <Person x={140} y={350} pose="back" shirt="#e8835f" />
            <Desk x={140} y={260} w={90} d={44} h={28} tone="wood" />
            {/* ルータの棚 */}
            <Desk x={ROUTER.x} y={ROUTER.y} w={50} d={30} h={34} tone="wood" />
            <WifiRouter x={ROUTER.x} y={ROUTER.y} z={34} on={phase === 1 || phase === 3} testId="iot-router" />
            <Plant x={30} y={180} size={0.7} />
          </Group>

          {/* ---------- 外：電柱と光回線 ---------- */}
          {[POLE1, POLE2].map((p, i) => (
            <Group key={i}>
              <Box x={p.x - 3} y={p.y - 3} w={6} d={6} h={124} color="#9ca3af" />
              <Box x={p.x - 14} y={p.y - 2} z={110} w={28} d={4} h={4} color="#6b7280" />
            </Group>
          ))}
          <Group className={styles.line} data={{ "data-on": phase === 1 || phase === 3 ? "true" : "false" }} testId="iot-line">
            <Cylinder from={up(ROUTER, 10)} to={WALL_OUT} z={0} r={1.5} segments={5} stripClassName={styles.lineStrip} />
            <Cylinder from={WALL_OUT} to={POLE1} z={0} r={1.5} segments={5} stripClassName={styles.lineStrip} />
            <Cylinder from={POLE1} to={POLE2} z={0} r={1.5} segments={5} stripClassName={styles.lineStrip} />
            <Cylinder from={POLE2} to={CLOUD_DOOR} z={0} r={1.5} segments={5} stripClassName={styles.lineStrip} />
          </Group>
          <Tree x={360} y={360} size={0.8} />
          <Tree x={680} y={330} size={0.7} />

          {/* ---------- クラウド（データセンター） ---------- */}
          <Floor x={500} y={40} w={210} d={170} h={4} z={4} material="concrete" />
          <Building x={CLOUD.x} y={CLOUD.y} z={4} w={150} d={90} h={96} kind="datacenter" state={phase === 2 ? "active" : "idle"} testId="iot-cloud" />

          {/* 外出先の人（スマホでも確認できる） */}
          <Person x={560} y={330} pose="stand" shirt="#4f86e8" />
          <Phone x={576} y={322} z={56} scale={0.45} glow={cooled} />

          <DioramaToken id="up">
            <Parcel tone="info" size={0.8} />
          </DioramaToken>
          <DioramaToken id="down">
            <Paper tone="ok" count={2} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          {phase === 0 && (
            <DioramaLabel at={up(AIRCON, 40)} place="above">
              <DataTag tag="センサーで測る" body="室温 32℃" tone="danger" />
            </DioramaLabel>
          )}
          {phase === 1 && !arrived && (
            <DioramaLabel token="up" place="above">
              <DataTag tag="データ" body="32℃" tone="info" />
            </DioramaLabel>
          )}
          {phase === 2 && (
            <DioramaLabel at={up(CLOUD, 110)} place="above">
              <Callout title="クラウドが判断" body="32℃は暑い → 28℃まで冷やす" tone="info" testId="iot-decision" />
            </DioramaLabel>
          )}
          {phase === 3 && !arrived && (
            <DioramaLabel token="down" place="above">
              <DataTag tag="指示" body="冷房ON 28℃" tone="ok" />
            </DioramaLabel>
          )}
          {cooled && (
            <DioramaLabel at={up(AIRCON, 40)} place="above">
              <NameChip name="エアコン" status="自動で冷房" tone="ok" />
            </DioramaLabel>
          )}
          {(phase === 0 || (phase === 1 && arrived)) && (
            <DioramaLabel at={up(CLOUD, 100)} place="right" optional>
              <NameChip name="クラウド" tone="muted" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
