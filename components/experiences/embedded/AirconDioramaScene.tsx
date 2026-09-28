"use client";

import type { CSSProperties } from "react";
import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Billboard, Box, Cylinder } from "../scene/Diorama3D";
import { Desk, Floor, Group, Person, Plant, Wall, WallWindow } from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage } from "../scene/DioramaStage";
import styles from "./aircon.module.css";

// 組込みシステムの図解：リビングの壁掛けエアコンを、カバーを透明にして中の部品が見える模型にする。
//   吸い込み口の温度センサー（測る）→ 制御基板のマイコン（目標と比べて決める）→ ファンのモーター（動かす）
//   → 吹き出した風で部屋の温度が下がる → また吸い込み口のセンサーが測る（フィードバック）。
// 部屋の床の色は室温（赤いほど暑い）、ファンの回る速さと風の量はファンの強さで変わる。

export type LoopPhase = "sense" | "decide" | "act" | "result" | "idle";
export type FanLevel = "強" | "中" | "弱";

// エアコン本体（壁の上）の中の部品
const UNIT = { x: 150, y: 2, z: 124, w: 230, d: 42, h: 52 };
const SENSOR = { x: 176, y: 20, z: 170 } satisfies Vec3;
const BOARD = { x: 214, y: 12, z: 150 } satisfies Vec3;
const FAN_FROM = { x: 262, y: 26, z: 138 } satisfies Vec3;
const FAN_LEN = 96;
const FAN_MID = { x: 310, y: 30, z: 138 } satisfies Vec3;
const ROOM: Vec3 = { x: 250, y: 250, z: 0 };

const SHOT: Camera = { yaw: -12, pitch: 62, zoom: 1.75, fx: 266, fy: 90, fz: 130 };
const SHOT_ROOM: Camera = { yaw: -16, pitch: 56, zoom: 0.9, fx: 260, fy: 190, fz: 80 };

const SPIN: Record<FanLevel, string> = { 強: "0.35s", 中: "0.8s", 弱: "1.8s" };
const WINDS: Record<FanLevel, number> = { 強: 4, 中: 3, 弱: 1 };

export function AirconDioramaScene({
  phase,
  measured,
  diff,
  fan,
  roomTemp,
  resultShown,
  reducedMotion,
}: {
  phase: LoopPhase;
  /** センサーが測った値 */
  measured: number;
  /** 目標とのずれ */
  diff: number;
  /** 制御部が決めたファンの強さ */
  fan: FanLevel;
  /** いまの室温（床の色） */
  roomTemp: number;
  /** 結果（下がった室温）を見せているか */
  resultShown: boolean;
  reducedMotion: boolean;
}) {
  const running = phase !== "idle" || resultShown;
  const heat = Math.max(0, Math.min(1, (roomTemp - 25) / 5));
  const blowing = phase === "act" || phase === "result";

  return (
    <DioramaStage
      testId="aircon-scene"
      ariaLabel="リビングの模型。壁の上のエアコンはカバーが透明で、左の吸い込み口に温度センサー、真ん中に制御基板（マイコン）、右にファンとモーターが見える。吹き出した風が部屋へ流れる"
      shot={phase === "result" ? SHOT_ROOM : SHOT}
      shotKey={phase === "result" ? "room" : "unit"}
      forward
      reducedMotion={reducedMotion}
      aspectMobile="1 / 1.05"
      className={styles.stage}
      dataAttrs={{ "data-phase": phase, "data-fan": fan }}
      corner={
        <span className={styles.remote} data-testid="aircon-target">
          🎛 リモコン：冷房 設定 <b>25℃</b>
        </span>
      }
      world={
        <>
          <Floor x={-10} y={-20} w={560} d={440} h={16} material="plain" />
          {/* 部屋の床：室温で色が変わる（赤いほど暑い） */}
          <Floor x={0} y={0} w={520} d={400} h={6} z={6} material="wood" />
          <div
            className={styles.heat}
            style={{ transform: "translate3d(0px, 0px, 6.8px)", width: 520, height: 400, "--heat": heat.toFixed(2) } as CSSProperties}
            data-testid="aircon-heat"
          />
          <Wall x={0} y={0} length={520} h={190} tone="home">
            <WallWindow left={400} top={40} w={90} h={80} />
          </Wall>
          <Wall x={0} y={0} length={400} h={190} side="left" tone="home" />

          {/* ソファと人・ローテーブル */}
          <Group z={6}>
            <Box x={120} y={300} w={180} d={60} h={26} color="#7d8fb3" />
            <Box x={120} y={350} w={180} d={16} h={58} color="#6b7ea3" />
            <Person x={200} y={336} pose="back" shirt="#e8835f" />
            <Desk x={220} y={220} w={100} d={50} h={30} tone="wood" />
            <Box x={236} y={214} z={30} w={10} d={20} h={3} color="#f1f5f9" />
            <Plant x={40} y={360} />
          </Group>

          {/* ---------- 壁掛けエアコン（カバーは透明） ---------- */}
          <Group data={{ "data-node": "unit" }}>
            {/* 奥の板（壁に付く面） */}
            <Box x={UNIT.x} y={UNIT.y} z={UNIT.z} w={UNIT.w} d={4} h={UNIT.h} color="#e9edf2" />
            {/* 温度センサー（吸い込み口のそば） */}
            <Group data={{ "data-part": "sensor", "data-on": phase === "sense" ? "true" : "false" }} className={styles.part}>
              <Box x={SENSOR.x - 4} y={SENSOR.y - 4} z={SENSOR.z - 4} w={8} d={8} h={8} color={phase === "sense" ? "#ef4444" : "#334155"} />
              <Box x={SENSOR.x - 1} y={SENSOR.y - 16} z={SENSOR.z - 2} w={2} d={12} h={2} color="#94a3b8" />
            </Group>
            {/* 制御基板とマイコン */}
            <Group data={{ "data-part": "board", "data-on": phase === "decide" ? "true" : "false" }} className={styles.part}>
              <Box x={BOARD.x - 22} y={BOARD.y - 4} z={BOARD.z - 16} w={44} d={4} h={32} color={phase === "decide" ? "#22c55e" : "#15803d"} faceClass={{ front: styles.pcb }} />
              <Box x={BOARD.x - 8} y={BOARD.y} z={BOARD.z - 6} w={16} d={4} h={12} color="#111827" />
            </Group>
            {/* ファン（クロスフローファン）とモーター */}
            <Group data={{ "data-part": "fan", "data-on": blowing ? "true" : "false" }}>
              <div
                className={styles.fanSpin}
                data-spin={running && !reducedMotion ? "true" : "false"}
                style={{ transform: `translate3d(${FAN_FROM.x}px, ${FAN_FROM.y}px, ${FAN_FROM.z}px)`, "--spin": SPIN[fan] } as CSSProperties}
              >
                <div className={styles.fanRotor}>
                  <Cylinder from={{ x: 0, y: 0, z: 0 }} to={{ x: FAN_LEN, y: 0, z: 0 }} z={0} r={10} segments={10} stripClassName={styles.fanStrip} />
                </div>
              </div>
              <Box x={FAN_FROM.x + FAN_LEN} y={FAN_FROM.y - 9} z={FAN_FROM.z - 9} w={16} d={18} h={18} color={phase === "act" ? "#f59e0b" : "#64748b"} />
            </Group>
            {/* 透明なカバー */}
            <Box
              x={UNIT.x}
              y={UNIT.y}
              z={UNIT.z}
              w={UNIT.w}
              d={UNIT.d}
              h={UNIT.h}
              color="#ffffff"
              className={styles.cover}
              faceClass={{ top: styles.glass, front: styles.glass, left: styles.glass, right: styles.glass }}
              omit={["back"]}
            />
          </Group>

          {/* 吹き出した風 */}
          {blowing &&
            Array.from({ length: WINDS[fan] }, (_, i) => (
              <Billboard key={i} x={200 + i * 44} y={70 + (i % 2) * 20} z={60} w={36} h={64}>
                <svg viewBox="0 0 36 64" className={styles.wind} style={{ animationDelay: `${i * 220}ms` }} aria-hidden>
                  <path d="M18 2 C 8 16, 28 26, 18 40 C 10 52, 22 56, 18 62" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </Billboard>
            ))}
        </>
      }
      labels={
        <>
          <DioramaLabel at={{ ...SENSOR, z: SENSOR.z + 10 }} place="above">
            <div className={styles.node} data-active={phase === "sense" ? "true" : "false"} data-testid="loop-sense">
              <span className={styles.nodeHead}>① 温度センサー（入力）</span>
              <span className={styles.nodeBody}>
                測る：<b>{measured.toFixed(1)}℃</b>
              </span>
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...BOARD, z: BOARD.z - 18 }} place="below">
            <div className={styles.node} data-active={phase === "decide" ? "true" : "false"} data-testid="loop-decide">
              <span className={styles.nodeHead}>② 制御部（マイコン）</span>
              <span className={styles.nodeBody}>
                目標より<b>+{diff.toFixed(1)}℃</b> → ファン「{fan}」
              </span>
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...FAN_MID, z: FAN_MID.z + 30 }} place="above">
            <div className={styles.node} data-active={phase === "act" ? "true" : "false"} data-testid="loop-act">
              <span className={styles.nodeHead}>③ アクチュエータ（出力）</span>
              <span className={styles.nodeBody}>
                モーターでファンを「<b>{fan}</b>」
              </span>
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...ROOM, z: 8 }} place="below">
            <div className={styles.node} data-active={phase === "result" ? "true" : "false"} data-testid="loop-result">
              <span className={styles.nodeHead}>④ 結果（部屋の温度）</span>
              <span className={styles.nodeBody}>
                <b>{roomTemp.toFixed(1)}℃</b>
                {resultShown && phase !== "idle" ? " に下がる → また①で測る" : resultShown ? " に下がる" : ""}
              </span>
            </div>
          </DioramaLabel>
        </>
      }
    />
  );
}
