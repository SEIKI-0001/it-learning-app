"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Chair,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Monitor,
  Paper,
  Person,
  Plant,
  Wall,
  WallBoard,
  WallWindow,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken } from "../scene/DioramaStage";
import type { DocSpot } from "./processSim";
import type { StationView } from "./processTypes";
import styles from "./processdiorama.module.css";

// 業務プロセス改善の図解：バックオフィスの部屋。注文の書類が 受付 → 手書き転記 → 承認 → 発送 の4つの机を順に回る。
// 各机の手前には未処理トレイがあり、処理が遅い机（ボトルネック）の前に書類が積み上がる。
// 改善後は遅かった机が速くなり、書類が溜まらずに流れる。書類の位置はシミュレーションの時刻そのもの。

const STATION_X = [170, 330, 490, 650];
const DESK_Y = 170;
const SHIRTS = ["#4f86e8", "#e0803a", "#8b5cf6", "#3f9a73"];

function docAt(spot: DocSpot): Vec3 {
  switch (spot.kind) {
    case "incoming":
      return { x: 76, y: 270, z: 24 };
    case "queue":
      // 机の手前（左）の未処理トレイに縦に積む
      // 積み上がりが見えるよう、1枚ごとに少しずらして高く積む
      return { x: STATION_X[spot.station] - 40 + (spot.slot % 2) * 3, y: DESK_Y + 74 - (spot.slot % 3) * 2, z: 40 + spot.slot * 7 };
    case "work":
      return { x: STATION_X[spot.station] - 6 + spot.progress * 12, y: DESK_Y + 18, z: 50 };
    case "done":
      return { x: 732, y: 260, z: 36 + spot.slot * 2.4 };
  }
}

const SHOT: Camera = { yaw: -14, pitch: 54, zoom: 1.0, fx: 400, fy: 200, fz: 50 };

export function ProcessDioramaScene({ stations, docs, reducedMotion }: { stations: StationView[]; docs: DocSpot[]; reducedMotion: boolean }) {
  return (
    <DioramaStage
      testId="process-scene"
      ariaLabel="バックオフィスの部屋の模型。受付・手書き転記・承認・発送の4つの机が一列に並び、書類は机から机へ流れる。処理待ちの書類は各机の手前のトレイに積み上がる"
      shot={SHOT}
      shotKey="process"
      forward={false}
      reducedMotion={reducedMotion}
      aspect="20 / 13"
      aspectMobile="10 / 9"
      tokens={Object.fromEntries(docs.map((spot, k) => [`doc${k}`, { at: docAt(spot), jump: true }]))}
      world={
        <>
          <Floor x={0} y={40} w={820} d={330} h={16} material="plain" />
          <Floor x={10} y={60} w={800} d={300} h={5} z={0} material="carpet" />
          <Wall x={10} y={60} length={800} h={130} tone="office">
            <WallWindow left={40} top={20} w={110} h={56} />
            <WallBoard left={330} top={22} w={160} h={60} kind="whiteboard" />
            <WallWindow left={620} top={20} w={110} h={56} />
          </Wall>

          {/* 受付の前の「届いた注文」置き場と、発送済みの箱 */}
          <Group z={5}>
            <Box x={52} y={250} w={48} d={40} h={16} color="#b08968" />
            <Box x={708} y={238} w={50} d={44} h={30} color="#c89a6c" />
            <Box x={708} y={238} z={30} w={50} d={44} h={2} color="#a67c52" />
            <Plant x={790} y={120} size={0.85} />
          </Group>

          {/* 書類の通り道 */}
          <FloorRoute
            points={[
              { x: 96, y: 262, z: 3 },
              ...STATION_X.flatMap((x) => [
                { x: x - 40, y: DESK_Y + 90, z: 3 },
                { x: x + 40, y: DESK_Y + 90, z: 3 },
              ]),
              { x: 712, y: 262, z: 3 },
            ]}
            width={6}
            z={5.8}
            tone="idle"
          />

          {stations.map((s, i) => {
            const x = STATION_X[i];
            const state = s.busy ? "active" : "idle";
            return (
              <Group key={s.name} z={5} data={{ "data-node": `station-${i}`, "data-state": state, "data-illustration": `desk-${i}` }}>
                <Desk x={x} y={DESK_Y} w={112} d={60} />
                <Monitor x={x + 18} y={DESK_Y - 8} w={46} keyboard={false} glow={s.busy} />
                <Chair x={x} y={DESK_Y - 52} rot={180} />
                <Person x={x} y={DESK_Y - 44} pose="stand" shirt={SHIRTS[i]} size={0.9} />
                {/* 未処理トレイ（机の手前の台） */}
                <Box x={x - 58} y={DESK_Y + 60} w={36} d={28} h={30} color={s.queue >= 2 ? "#f59e0b" : "#9aa3b0"} />
                <Box x={x - 58} y={DESK_Y + 60} z={30} w={36} d={28} h={3} color="#e5e7eb" />
              </Group>
            );
          })}

          {docs.map((spot, k) => (
            <DioramaToken key={k} id={`doc${k}`} className={styles.doc}>
              <Paper stamp={spot.kind === "done" ? "ok" : undefined} />
            </DioramaToken>
          ))}
        </>
      }
      labels={
        <>
          {stations.map((s, i) => (
            <DioramaLabel key={s.name} at={{ x: STATION_X[i], y: DESK_Y - 30, z: 116 }} place="above">
              <div className={styles.clock} data-slow={s.slow ? "true" : "false"} data-improved={s.improved ? "true" : "false"} data-testid={`clock-${i}`}>
                <span className={styles.clockName}>
                  {s.emoji} {s.name}
                </span>
                <span className={styles.clockTime}>⏱ {s.minutes}分</span>
                {s.queue > 0 && (
                  <span className={styles.queueBadge} data-testid={`queue-${i}`}>
                    📄×{s.queue} 待ち
                  </span>
                )}
              </div>
            </DioramaLabel>
          ))}
        </>
      }
    />
  );
}
