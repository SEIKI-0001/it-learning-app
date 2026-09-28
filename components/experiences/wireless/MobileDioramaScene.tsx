"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box, CablePulses, Cylinder } from "../scene/Diorama3D";
import {
  Building,
  Cable,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Parcel,
  Person,
  Phone,
  Tree,
  Truck,
  type CarryTone,
} from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip, type TokenSpec } from "../scene/DioramaStage";
import styles from "./mobilediorama.module.css";

// モバイル通信の図解：街角の模型。
//   奥のビルの屋上に大手キャリア（MNO）の基地局、その奥に交換局（ここからインターネットへ）。
//   右手前に「格安SIMの会社（MVNO）」の小さなオフィス。基地局も交換局も持っていない。
//   手前の公園のベンチに、あなたのスマホとノートPC（SIMなし）。道路には車、街灯には監視カメラ。
//     5G       … 1つの基地局が、スマホ・車・カメラなど多数の機器へ同時に・遅れ少なく届く
//     テザリング … ノートPC →（Wi-Fi）→ スマホ →（モバイル回線）→ 基地局。スマホが親機になる
//     MVNO     … 格安SIMのスマホも、電波は大手の基地局・交換局を通る。MVNOは設備を「借りて」売る

export type MobileMode = "5g" | "tether" | "mvno";

const TOWER: Vec3 = { x: 300, y: 110, z: 178 }; // 基地局のアンテナ
const CORE: Vec3 = { x: 560, y: 70, z: 84 }; // 交換局（屋上）
const PHONE: Vec3 = { x: 196, y: 330, z: 34 };
const LAPTOP: Vec3 = { x: 128, y: 334, z: 34 };
const MVNO: Vec3 = { x: 700, y: 300, z: 0 };

// 5G で同時につながる機器（電波の届く先）
const DEVICES: { id: string; at: Vec3; name: string }[] = [
  { id: "phone", at: { ...PHONE, z: 66 }, name: "スマホ" },
  { id: "car", at: { x: 452, y: 318, z: 44 }, name: "車" },
  { id: "cam", at: { x: 560, y: 222, z: 104 }, name: "監視カメラ" },
  { id: "phone2", at: { x: 380, y: 224, z: 96 }, name: "歩く人のスマホ" },
];

const SHOTS: Record<MobileMode, Camera> = {
  "5g": { yaw: -18, pitch: 54, zoom: 0.86, fx: 380, fy: 210, fz: 70 },
  tether: { yaw: -12, pitch: 52, zoom: 0.92, fx: 300, fy: 220, fz: 70 },
  mvno: { yaw: -22, pitch: 55, zoom: 0.82, fx: 470, fy: 200, fz: 60 },
};

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });

const TETHER_PATH: Vec3[] = [up(LAPTOP, 26), up(PHONE, 40), up(TOWER, 6), up(CORE, 20)];
const MVNO_PATH: Vec3[] = [up(PHONE, 40), up(TOWER, 6), up(CORE, 20)];

function tokensFor(mode: MobileMode): Record<string, TokenSpec> {
  const hidden: TokenSpec = { at: null };
  const out: Record<string, TokenSpec> = { data: hidden };
  for (const d of DEVICES) out[d.id] = hidden;
  if (mode === "5g") {
    for (const d of DEVICES) out[d.id] = { at: up(d.at, 14), start: up(TOWER, 4), path: [up(d.at, 14)], restart: true };
  } else {
    const path = mode === "tether" ? TETHER_PATH : MVNO_PATH;
    out.data = { at: path[path.length - 1], start: path[0], path: path.slice(1), restart: true };
  }
  return out;
}

const PARCEL_TONE: Record<MobileMode, CarryTone> = { "5g": "info", tether: "warn", mvno: "ok" };

export function MobileDioramaScene({ mode, reducedMotion }: { mode: MobileMode; reducedMotion: boolean }) {
  const tether = mode === "tether";
  const mvno = mode === "mvno";
  const is5g = mode === "5g";
  const lit = (id: string) => is5g || ((tether || mvno) && id === "phone");

  return (
    <DioramaStage
      testId="mobile-scene"
      ariaLabel="街角の模型。奥のビルの屋上に大手キャリアの基地局、その奥に交換局。右手前に基地局を持たない格安SIMの会社。手前の公園のベンチにスマホとノートPC、道路に車、街灯に監視カメラ"
      shot={SHOTS[mode]}
      shotKey={mode}
      forward
      reducedMotion={reducedMotion}
      className={styles.stage}
      dataAttrs={{ "data-mode": mode }}
      tokens={tokensFor(mode)}
      corner={
        <span className={styles.modePlate} data-mode={mode} data-testid="mobile-mode">
          {is5g ? "📶 5G：高速・大容量／低遅延／多数同時接続" : tether ? "📲 テザリング：スマホが親機" : "💴 MVNO：大手の回線を借りる"}
        </span>
      }
      world={
        <>
          <Floor x={-10} y={-20} w={820} d={460} h={16} material="concrete" />
          {/* 公園（手前左） */}
          <Floor x={10} y={250} w={270} d={180} h={4} z={0} material="grass" />
          {/* 道路 */}
          <Floor x={290} y={286} w={520} d={70} h={2} z={0} material="asphalt" className={styles.road} />
          <Tree x={40} y={276} />
          <Tree x={250} y={410} size={0.8} />

          {/* ---------- 大手キャリア（MNO）の基地局：ビルの屋上のアンテナ ---------- */}
          <Building x={300} y={110} w={130} d={96} h={110} kind="office" testId="mobile-tower">
            <Box x={-3} y={-3} w={6} d={6} h={66} color="#9aa3b0" />
            {[-1, 1].map((s) => (
              <Box key={s} x={s * 8 - 3} y={-6} z={48} w={6} d={3} h={22} color="#f4f6f9" />
            ))}
            <Box x={-3} y={4} z={48} w={6} d={3} h={22} color="#f4f6f9" />
            <Box x={-4} y={-4} z={66} w={8} d={8} h={4} color={is5g ? "#2f6fdb" : "#64748b"} />
          </Building>

          {/* ---------- 交換局（キャリアのネットワーク → インターネット） ---------- */}
          <Building x={CORE.x} y={CORE.y} w={140} d={96} h={80} kind="datacenter" testId="mobile-core" />
          {/* 基地局と交換局を結ぶ光ファイバ（地中→地上に見せる） */}
          <Cable from={{ x: 366, y: 110, z: 4 }} to={{ x: 490, y: 90, z: 4 }} r={3} tone={is5g ? "idle" : "request"} />

          {/* ---------- 格安SIMの会社（MVNO）：基地局は持たない ---------- */}
          <Building x={MVNO.x} y={MVNO.y} w={96} d={70} h={58} kind="store" testId="mobile-mvno" />
          <FloorRoute
            points={[
              { x: 700, y: 262, z: 1 },
              { x: 700, y: 180, z: 1 },
              { x: 630, y: 130, z: 1 },
            ]}
            width={8}
            tone={mvno ? "violet" : "idle"}
            active={mvno}
            testId="mobile-lease"
          />

          {/* ---------- 公園のベンチ：あなたのスマホとノートPC ---------- */}
          <Box x={100} y={316} z={0} w={120} d={34} h={30} color="#8a6a4a" faceClass={{ top: styles.benchTop }} />
          <Laptop x={LAPTOP.x} y={LAPTOP.y} z={30} w={56} glow={tether} testId="mobile-laptop" tone={tether ? "light" : "off"} />
          <Phone x={PHONE.x} y={PHONE.y} z={30} glow={lit("phone")} scale={0.9} testId="mobile-phone" />
          <Person x={244} y={356} pose="stand" shirt="#4f86e8" />

          {/* テザリング：ノートPCとスマホの間の小さな Wi-Fi */}
          {tether && (
            <div className={styles.hotspot} style={{ transform: `translate3d(${PHONE.x}px, ${PHONE.y}px, 36px)` }} data-testid="mobile-hotspot">
              <span />
              <span />
            </div>
          )}

          {/* ---------- 5G でつながる街の機器 ---------- */}
          <Truck x={452} y={318} color="#e7ecf3" />
          {/* 街灯＋監視カメラ */}
          <Box x={556} y={232} w={6} d={6} h={100} color="#6b7280" />
          <Box x={552} y={222} z={94} w={16} d={12} h={9} color="#e5e7eb" />
          <Person x={380} y={236} pose="stand" shirt="#d98a4a" size={0.9} />
          <Phone x={392} y={230} z={58} scale={0.45} glow={is5g} />

          {/* ---------- 電波：基地局から各機器へ ---------- */}
          {DEVICES.map((d) => {
            const on = lit(d.id);
            return (
              <Group key={d.id} data={{ "data-radio": d.id, "data-on": on ? "true" : "false" }} className={styles.radio}>
                <Cylinder from={TOWER} to={d.at} z={0} r={1.4} segments={4} stripClassName={styles.beamStrip} />
                <CablePulses from={TOWER} to={d.at} r={1.4} count={is5g ? 4 : 3} on={on && !reducedMotion} color={is5g ? "#60a5fa" : mvno ? "#34d399" : "#fbbf24"} />
              </Group>
            );
          })}

          {/* ---------- 流れるデータ ---------- */}
          <DioramaToken id="data">
            <Parcel tone={PARCEL_TONE[mode]} size={0.8} />
          </DioramaToken>
          {DEVICES.map((d) => (
            <DioramaToken key={d.id} id={d.id}>
              <Parcel tone="info" size={0.6} />
            </DioramaToken>
          ))}
        </>
      }
      labels={
        <>
          {is5g && (
            <DioramaLabel at={up(TOWER, 20)} place="above">
              <div className={styles.badges} data-testid="mobile-5g">
                <Badge tone="info">高速・大容量</Badge>
                <Badge tone="info">低遅延</Badge>
                <Badge tone="info">多数同時接続</Badge>
              </div>
            </DioramaLabel>
          )}
          {tether && (
            <DioramaLabel at={{ x: LAPTOP.x + 20, y: LAPTOP.y + 50, z: 0 }} place="below">
              <div className={styles.note} data-testid="mobile-tether">
                <b>ノートPC（SIMなし）</b>
                <span>→ Wi-Fi でスマホへ</span>
                <span>→ スマホの回線で基地局へ</span>
              </div>
            </DioramaLabel>
          )}
          {mvno && (
            <DioramaLabel at={{ x: 700, y: 340, z: 0 }} place="below">
              <div className={styles.note} data-tone="violet" data-testid="mobile-lease-note">
                <b>回線を借りる契約</b>
                <span>基地局・交換局は大手のものを使う</span>
              </div>
            </DioramaLabel>
          )}
          {mvno && (
            <DioramaLabel at={up(PHONE, 64)} place="left">
              <span className={styles.sim} data-testid="mobile-sim">
                格安SIM（MVNO）
              </span>
            </DioramaLabel>
          )}

          <DioramaLabel at={up(TOWER, 4)} place="right" optional>
            <NameChip name="基地局" sub="大手キャリア（MNO）" status={is5g ? "5G" : undefined} tone="info" />
          </DioramaLabel>
          <DioramaLabel at={up(CORE, 16)} place="above" optional>
            <NameChip name="交換局" sub="→ インターネット" tone="muted" />
          </DioramaLabel>
          <DioramaLabel at={up(MVNO, 60)} place="above" optional>
            <NameChip name="格安SIMの会社" sub="基地局を持たない" status={mvno ? "MVNO" : undefined} tone={mvno ? "warn" : "muted"} />
          </DioramaLabel>
          <DioramaLabel at={up(PHONE, 60)} place="right" optional>
            <NameChip name="スマホ" status={tether ? "親機" : undefined} tone={tether ? "warn" : "info"} />
          </DioramaLabel>
          {DEVICES.filter((d) => d.id !== "phone").map((d) => (
            <DioramaLabel key={d.id} at={up(d.at, 8)} place="above" optional>
              <NameChip name={d.name} tone={is5g ? "info" : "muted"} />
            </DioramaLabel>
          ))}
        </>
      }
    />
  );
}
