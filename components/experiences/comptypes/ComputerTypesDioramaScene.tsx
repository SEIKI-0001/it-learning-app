"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box, Cylinder } from "../scene/Diorama3D";
import { Building, Desk, Floor, FloorRoute, Group, Laptop, Monitor, Paper, Person, Plant, ServerRack, Tree, Wall, WallWindow } from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import styles from "./comptypes.module.css";

// コンピュータの種類を、実際に置かれている場所ごと1つの街に並べた模型。
//   PC＝自宅の机で1人が1台／サーバ＝会社の部屋で多数のPCからの依頼に応える／
//   汎用機（メインフレーム）＝銀行の計算センターの大きな筐体。故障しても予備へ切り替わる／
//   スーパーコンピュータ＝研究所に同じ計算ノードのラックがずらりと並ぶ／
//   マイコン＝台所の炊飯器の中のチップ（選ぶと本体が透けて、底の基板のチップが見える）
// 種類を選ぶとカメラがその場所へ寄り、その種類らしい動き（依頼が集まる・予備へ切替・全ノードが計算）を見せる。

export type CompKind = "pc" | "server" | "mainframe" | "super" | "micro";

const up = (p: Vec3, dz: number): Vec3 => ({ ...p, z: (p.z ?? 0) + dz });

// 場所
const HOME = { x: 110, y: 330 };
const OFFICE = { x: 330, y: 300 };
const BANK = { x: 560, y: 150 };
const LAB = { x: 820, y: 150 };

const SERVER: Vec3 = { x: 330, y: 250, z: 0 };
const CLIENTS: Vec3[] = [
  { x: 260, y: 320 },
  { x: 400, y: 320 },
  { x: 260, y: 380 },
  { x: 400, y: 380 },
];
const MAIN: Vec3 = { x: 530, y: 160, z: 0 };
const SPARE: Vec3 = { x: 610, y: 160, z: 0 };
const COOKER = { x: 840, y: 350, z: 38 } satisfies Vec3;

const SHOTS: Record<CompKind | "none", Camera> = {
  none: { yaw: -10, pitch: 58, zoom: 0.58, fx: 480, fy: 250, fz: 30 },
  pc: { yaw: -10, pitch: 54, zoom: 1.5, fx: HOME.x, fy: HOME.y - 20, fz: 50 },
  server: { yaw: -12, pitch: 56, zoom: 1.2, fx: OFFICE.x, fy: OFFICE.y, fz: 40 },
  mainframe: { yaw: -14, pitch: 54, zoom: 1.25, fx: BANK.x + 10, fy: BANK.y + 30, fz: 60 },
  super: { yaw: -18, pitch: 56, zoom: 1.05, fx: LAB.x, fy: LAB.y + 10, fz: 50 },
  micro: { yaw: -6, pitch: 52, zoom: 2.0, fx: COOKER.x + 30, fy: COOKER.y + 10, fz: 50 },
};

export function ComputerTypesDioramaScene({ kind, runKey, reducedMotion }: { kind: CompKind | null; runKey: number; reducedMotion: boolean }) {
  const req = (i: number) => {
    const from = { ...CLIENTS[i], z: 52 };
    const path = [{ ...CLIENTS[i], z: 10 }, { ...SERVER, y: SERVER.y + 30, z: 10 }, up(SERVER, 90)];
    return kind === "server" ? { at: path[path.length - 1], start: from, path, restart: true, delay: i * 350 } : { at: null };
  };
  const failed = kind === "mainframe";

  return (
    <DioramaStage
      testId="comptypes-scene"
      ariaLabel="街の模型。左から、自宅の机のPC、会社の部屋のサーバとPC、銀行の計算センターの汎用機と予備機、研究所に並ぶスーパーコンピュータのラック、台所の炊飯器の中のマイコン"
      shot={SHOTS[kind ?? "none"]}
      shotKey={`${kind ?? "none"}-${runKey}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-kind": kind ?? "none" }}
      tokens={{ r0: req(0), r1: req(1), r2: req(2), r3: req(3) }}
      world={
        <>
          <Floor x={-20} y={-20} w={1000} d={480} h={16} material="grass" />

          {/* ---------- 自宅：PC（1人で1台） ---------- */}
          <Floor x={30} y={250} w={170} d={170} h={4} z={4} material="wood" />
          <Wall x={30} y={250} length={170} h={70} tone="home" />
          <Group z={4} testId="comptypes-pc">
            <Desk x={HOME.x} y={HOME.y - 10} w={90} d={50} tone="wood" />
            <Laptop x={HOME.x} y={HOME.y - 14} z={44} w={44} glow={kind === "pc"} />
            <Person x={HOME.x} y={HOME.y + 40} pose="back" shirt="#e8835f" size={0.9} />
            <Plant x={180} y={400} size={0.6} />
          </Group>

          {/* ---------- 会社：サーバ（多数の利用者へ） ---------- */}
          <Floor x={220} y={210} w={230} d={210} h={4} z={4} material="carpet" />
          <Wall x={220} y={210} length={230} h={70} tone="office" />
          <Group z={4}>
            <ServerRack x={SERVER.x} y={SERVER.y} h={86} units={4} state={kind === "server" ? "active" : "idle"} testId="comptypes-server" />
            {CLIENTS.map((c, i) => (
              <Group key={i}>
                <Desk x={c.x} y={c.y} w={60} d={36} />
                <Monitor x={c.x} y={c.y} z={44} w={36} keyboard={false} glow={kind === "server"} />
              </Group>
            ))}
          </Group>
          {CLIENTS.map((c, i) => (
            <FloorRoute key={i} points={[{ ...c, z: 4 }, { ...SERVER, y: SERVER.y + 30, z: 4 }]} width={5} z={1} tone={kind === "server" ? "request" : "idle"} active={kind === "server"} />
          ))}

          {/* ---------- 銀行の計算センター：汎用機（止まらない・予備へ切替） ---------- */}
          <Floor x={470} y={90} w={210} d={150} h={4} z={4} material="dc" />
          <Wall x={470} y={90} length={210} h={110} tone="dc" />
          <Group z={4}>
            <Group testId="comptypes-mainframe" data={{ "data-state": failed ? "error" : "idle" }}>
              <ServerRack x={MAIN.x} y={MAIN.y} w={70} d={60} h={120} units={7} tone="light" accent="#2455b8" state={failed ? "error" : "idle"} />
            </Group>
            <Group testId="comptypes-spare" data={{ "data-state": failed ? "active" : "idle" }}>
              <ServerRack x={SPARE.x} y={SPARE.y} w={70} d={60} h={120} units={7} tone="light" accent="#2455b8" state={failed ? "active" : "idle"} />
            </Group>
          </Group>
          <Building x={BANK.x + 10} y={BANK.y + 130} w={90} d={40} h={46} kind="bank" />

          {/* ---------- 研究所：スーパーコンピュータ（同じノードが多数） ---------- */}
          <Floor x={720} y={70} w={220} d={170} h={4} z={4} material="dc" />
          <Group z={4} testId="comptypes-super" data={{ "data-on": kind === "super" ? "true" : "false" }}>
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3, 4].map((col) => (
                <ServerRack key={`${row}-${col}`} x={750 + col * 40} y={100 + row * 56} w={32} d={36} h={70} units={4} state={kind === "super" ? "active" : "idle"} />
              )),
            )}
          </Group>

          {/* ---------- 台所：マイコン（炊飯器の中のチップ） ---------- */}
          <Floor x={760} y={290} w={200} d={150} h={4} z={4} material="tile" />
          {/* 台所の壁（裏の研究所を隠し、家の台所だと分かるように） */}
          <Wall x={760} y={300} length={200} h={110} tone="home">
            <WallWindow left={130} top={20} w={50} h={40} />
          </Wall>
          <Group z={4}>
            <Box x={770} y={318} w={180} d={64} h={COOKER.z - 4} color="#c9a27a" faceClass={{ top: styles.counter }} />
            {/* 炊飯器：丸い白い本体＋ふた＋前の操作パネル。マイコンを選ぶと本体が透けて、底の基板のチップが見える */}
            <RiceCooker see={kind === "micro"} />
            {/* やかん代わりの小物（台所らしさ） */}
            <Box x={912} y={334} z={COOKER.z - 4} w={20} d={16} h={22} color="#ef9a6a" />
          </Group>

          <Tree x={210} y={40} size={0.7} />
          <Tree x={420} y={60} size={0.6} />
          <Tree x={690} y={400} size={0.6} />

          {[0, 1, 2, 3].map((i) => (
            <DioramaToken key={i} id={`r${i}`}>
              <Paper tone="info" />
            </DioramaToken>
          ))}
        </>
      }
      labels={<Labels kind={kind} />}
    />
  );
}

/** 炊飯器。see=true で本体を透かし、内釜と底の制御基板（マイコンのチップ）を見せる */
function RiceCooker({ see }: { see: boolean }) {
  const { x, y } = COOKER;
  const z = COOKER.z - 4; // 台所の Group（z=4）の中なので、調理台の上面に合わせる
  const body = see ? styles.cookerSee : styles.cookerBody;
  return (
    <Group testId="comptypes-micro" data={{ "data-on": see ? "true" : "false" }}>
      {/* 底の制御基板とチップ（マイコン）：本体を透かしたときだけ見える高さに置く */}
      <Box x={x - 20} y={y + 6} z={z + 1} w={40} d={20} h={4} color={see ? "#22c55e" : "#15803d"} faceClass={{ top: styles.board }} />
      <Box x={x - 7} y={y + 10} z={z + 5} w={14} d={12} h={4} color="#111827" faceClass={{ top: styles.chip }} />
      {/* 内釜 */}
      <Cylinder from={{ x, y: y - 4, z: z + 12 }} to={{ x, y: y - 4, z: z + 40 }} z={0} r={24} segments={14} stripClassName={styles.pot} />
      {/* 本体（丸い白い胴） */}
      <Cylinder from={{ x, y, z }} to={{ x, y, z: z + 44 }} z={0} r={34} segments={18} stripClassName={body} />
      {/* ふた（少し盛り上がった円）と蒸気口 */}
      <div className={styles.lid} style={{ transform: `translate3d(${x}px, ${y}px, ${z + 44}px)` }} data-see={see ? "true" : "false"}>
        <span />
      </div>
      {/* 前の操作パネル（表示窓とボタン）。透かすときは外して、裏の基板とチップを見せる */}
      {!see && (
        <Box
          x={x - 17}
          y={y + 30}
          z={z + 14}
          w={34}
          d={6}
          h={20}
          color="#e2e8f0"
          faces={{
            front: (
              <div className={styles.panel}>
                <span className={styles.lcd}>炊飯</span>
                <span className={styles.buttons} />
              </div>
            ),
          }}
        />
      )}
      {see && (
        <div className={styles.steam} style={{ transform: `translate3d(${x - 6}px, ${y - 6}px, ${z + 48}px)` }}>
          <span />
          <span />
        </div>
      )}
    </Group>
  );
}

function Labels({ kind }: { kind: CompKind | null }) {
  if (kind === null) {
    return (
      <>
        <DioramaLabel at={{ ...HOME, z: 90 }} place="above" optional>
          <NameChip name="PC" tone="muted" />
        </DioramaLabel>
        <DioramaLabel at={up(SERVER, 100)} place="above" optional>
          <NameChip name="サーバ" tone="muted" />
        </DioramaLabel>
        <DioramaLabel at={up(MAIN, 140)} place="above" optional>
          <NameChip name="汎用機" tone="muted" />
        </DioramaLabel>
        <DioramaLabel at={{ ...LAB, z: 90 }} place="above" optional>
          <NameChip name="スーパーコンピュータ" tone="muted" />
        </DioramaLabel>
        <DioramaLabel at={up(COOKER, 40)} place="below" optional>
          <NameChip name="マイコン（炊飯器の中）" tone="muted" />
        </DioramaLabel>
      </>
    );
  }
  if (kind === "pc") {
    return (
      <DioramaLabel at={{ ...HOME, z: 100 }} place="above">
        <NameChip name="PC" status="1人で1台" tone="info" />
      </DioramaLabel>
    );
  }
  if (kind === "server") {
    return (
      <DioramaLabel at={up(SERVER, 110)} place="above">
        <NameChip name="サーバ" status="多数の依頼に応える" tone="info" />
      </DioramaLabel>
    );
  }
  if (kind === "mainframe") {
    return (
      <>
        <DioramaLabel at={up(MAIN, 130)} place="left">
          <NameChip name="汎用機" status="故障" tone="danger" />
        </DioramaLabel>
        <DioramaLabel at={up(SPARE, 130)} place="right">
          <NameChip name="予備機" status="引き継いで処理" tone="ok" />
        </DioramaLabel>
        <DioramaLabel at={{ x: BANK.x + 10, y: BANK.y + 150, z: 50 }} place="below" optional>
          <Badge tone="info">口座の取引は止まらない</Badge>
        </DioramaLabel>
      </>
    );
  }
  if (kind === "super") {
    return (
      <DioramaLabel at={{ ...LAB, z: 100 }} place="above">
        <NameChip name="スーパーコンピュータ" status="全ノードで計算" tone="info" />
      </DioramaLabel>
    );
  }
  return (
    <>
      <DioramaLabel at={{ ...COOKER, z: COOKER.z + 56 }} place="above">
        <NameChip name="炊飯器" tone="info" />
      </DioramaLabel>
      <DioramaLabel at={{ x: COOKER.x, y: COOKER.y + 40, z: COOKER.z - 2 }} place="below" testId="comptypes-micro-label">
        <NameChip name="中のチップ＝マイコン" status="炊き方を制御" tone="ok" />
      </DioramaLabel>
    </>
  );
}
