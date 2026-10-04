"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import {
  Building,
  Floor,
  FloorRoute,
  Group,
  Paper,
  Person,
  ServerRack,
  Tree,
  Truck,
  type RouteTone,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken } from "../scene/DioramaStage";
import type { BcpSceneProps, DataSpot, StaffSpot } from "./bcpTypes";
import styles from "./bcpdiorama.module.css";

// BCP（事業継続計画）の図解：ある会社のまわりの街区。
//   左奥＝本社ビルと、隣のシステム・データのサーバ、手前の広場＝社員、右手前＝代替拠点のオフィス、右奥＝バックアップのデータセンター。
// 大地震で本社は立入禁止・システム停止。あとは事前の備え（連絡網・代替拠点・バックアップ）の有無で、
// 社員が代替拠点へ移れるか、データを復元できるか、いつ営業を再開できるかが決まる。
// 備えていないもの（代替拠点・バックアップ）は半透明の「まだ無い」建物で見せる。

const AT = {
  hq: { x: 180, y: 150, z: 0 },
  system: { x: 330, y: 122, z: 0 },
  staff: { x: 200, y: 340, z: 0 },
  alt: { x: 560, y: 320, z: 0 },
  vault: { x: 720, y: 96, z: 0 },
} satisfies Record<string, Vec3>;

const STAFF_AT: Record<StaffSpot, Vec3> = {
  staff: { x: 210, y: 350, z: 0 },
  alt: { x: 540, y: 410, z: 0 },
  hq: { x: 190, y: 236, z: 0 },
};
const DATA_AT: Record<DataSpot, Vec3> = {
  vault: { x: 720, y: 150, z: 84 },
  alt: { x: 570, y: 282, z: 104 },
  lost: { x: 330, y: 150, z: 96 },
};

const G = 3;
const LANE: Record<"move" | "restore" | "sync", Vec3[]> = {
  move: [
    { x: 250, y: 350, z: G },
    { x: 380, y: 370, z: G },
    { x: 510, y: 410, z: G },
  ],
  restore: [
    { x: 700, y: 150, z: G },
    { x: 640, y: 210, z: G },
    { x: 590, y: 262, z: G },
  ],
  sync: [
    { x: 360, y: 140, z: G },
    { x: 500, y: 110, z: G },
    { x: 650, y: 100, z: G },
  ],
};

const SHOT_WIDE: Camera = { yaw: -18, pitch: 54, zoom: 0.9, fx: 410, fy: 240, fz: 40 };
const SHOT_HQ: Camera = { yaw: -16, pitch: 50, zoom: 1.12, fx: 240, fy: 220, fz: 60 };
const SHOT_ALT: Camera = { yaw: -20, pitch: 52, zoom: 1.08, fx: 540, fy: 270, fz: 50 };

export function BcpDioramaScene({ nodes, prep, disaster, lanes, staffToken, dataToken, shake, reducedMotion, forward = true }: BcpSceneProps & { forward?: boolean }) {
  const shot = !disaster ? SHOT_WIDE : staffToken.at === "alt" || dataToken?.at === "alt" ? SHOT_ALT : shake ? SHOT_HQ : SHOT_WIDE;
  const laneTone = (id: keyof typeof LANE): RouteTone => (lanes[id] === "blocked" ? "blocked" : lanes[id] === "active" ? "response" : "idle");

  return (
    <DioramaStage
      testId="bcp-scene"
      ariaLabel="会社のまわりの街区の模型。左奥に本社ビルとシステムのサーバ室、手前の広場に社員、右手前に代替拠点のオフィス、右奥にバックアップのデータセンター"
      shot={shot}
      shotKey={`${disaster ? "d" : "c"}-${staffToken.at}-${staffToken.text}-${dataToken?.at ?? "-"}`}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-disaster": disaster ? "true" : "false", "data-shake": shake ? "true" : "false" }}
      tokens={{
        staff: { at: STAFF_AT[staffToken.at], path: staffToken.at === "alt" ? [...LANE.move, STAFF_AT.alt] : undefined },
        data: {
          at: dataToken ? DATA_AT[dataToken.at] : null,
          path: dataToken?.at === "alt" ? [...LANE.restore.map((p) => ({ ...p, z: 60 })), DATA_AT.alt] : undefined,
        },
      }}
      world={
        <>
          <Floor x={0} y={20} w={800} d={420} h={16} material="asphalt" />
          <Floor x={20} y={40} w={400} d={250} h={4} z={0} material="paving" />
          <Floor x={20} y={300} w={400} d={124} h={4} z={0} material="paving" />
          <Floor x={470} y={40} w={316} d={150} h={4} z={0} material="concrete" />
          <Floor x={470} y={210} w={316} d={214} h={4} z={0} material="paving" />

          {/* ---------- 本社ビルとサーバ室（地震で揺れ、ひびが入る） ---------- */}
          <div className={styles.quakeWrap} data-shake={shake ? "true" : "false"}>
            <Group z={4} data={{ "data-node": "hq", "data-state": nodes.hq }}>
              <Building x={AT.hq.x} y={AT.hq.y} w={170} d={120} h={150} kind="office" damaged={disaster} state={nodes.hq} />
            </Group>
            <Group z={4} data={{ "data-node": "system", "data-state": nodes.system }}>
              <ServerRack x={AT.system.x} y={AT.system.y} h={96} units={5} state={disaster ? "error" : nodes.system} accent={disaster ? "#e11d48" : "#2f6fdb"} />
              <ServerRack x={AT.system.x + 56} y={AT.system.y} h={96} units={5} state={disaster ? "error" : nodes.system} />
            </Group>
          </div>
          <Tree x={60} y={300} size={0.9} />
          <Tree x={430} y={290} size={0.8} />

          {/* ---------- 代替拠点（備えがないと「まだ無い」） ---------- */}
          <Group z={4} data={{ "data-node": "alt", "data-state": nodes.alt }}>
            <Building x={AT.alt.x} y={AT.alt.y} w={150} d={110} h={96} kind="office" color="#d9efe4" dim={!prep.site} state={nodes.alt === "active" ? "active" : "idle"} />
          </Group>

          {/* ---------- バックアップのデータセンター ---------- */}
          <Group z={4} data={{ "data-node": "vault", "data-state": nodes.vault }}>
            <Building x={AT.vault.x} y={AT.vault.y} w={150} d={90} h={76} kind="datacenter" dim={!prep.backup} state={nodes.vault === "sending" ? "active" : "idle"} />
          </Group>
          <Truck x={330} y={410} rot={0} />

          {(Object.keys(LANE) as (keyof typeof LANE)[]).map((id) => (
            <FloorRoute key={id} points={LANE[id]} width={10} z={4.8} tone={laneTone(id)} active={lanes[id] === "active"} data={{ "data-lane": id, "data-state": lanes[id] ?? "idle" }} />
          ))}

          {/* 社員（3人がいっしょに移動する） */}
          <DioramaToken id="staff">
            <Person x={-22} y={0} pose="stand" shirt="#4f86e8" size={0.8} dim={staffToken.tone === "ng"} />
            <Person x={0} y={10} pose="stand" shirt="#e0803a" size={0.8} dim={staffToken.tone === "ng"} />
            <Person x={22} y={2} pose="stand" shirt="#3f9a73" size={0.8} dim={staffToken.tone === "ng"} />
          </DioramaToken>
          <DioramaToken id="data">
            {dataToken && <Paper count={3} tone={dataToken.tone === "ng" ? "danger" : "plain"} stamp={dataToken.tone === "ok" ? "ok" : undefined} />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {disaster && (
            <DioramaLabel at={{ ...AT.hq, z: 190 }} place="above">
              <span role="status" className={styles.quake}>
                🌋 大地震
              </span>
            </DioramaLabel>
          )}
          <DioramaLabel token="staff" dz={96} place="above">
            <span className={styles.token} data-tone={staffToken.tone} data-at={staffToken.at} data-testid="bcp-staff-token">
              {staffToken.text}
            </span>
          </DioramaLabel>
          {dataToken && (
            <DioramaLabel token="data" dz={14} place="above">
              <span className={`${styles.token} ${styles.dataToken}`} data-tone={dataToken.tone} data-at={dataToken.at} data-testid="bcp-data-token">
                {dataToken.text}
              </span>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ ...AT.hq, y: AT.hq.y + 60, z: 150 }} place="above">
            <span className={styles.label} data-state={nodes.hq}>
              本社{disaster && <b className={styles.ng}>立入禁止</b>}
            </span>
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.system, x: AT.system.x + 28, z: 106 }} place="above" optional>
            <span className={styles.label} data-state={nodes.system}>
              システム/データ{disaster && <b className={styles.ng}>停止</b>}
            </span>
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.vault, y: AT.vault.y + 46, z: 0 }} place="below">
            <span className={styles.label} data-present={prep.backup ? "true" : "false"} data-testid="bcp-vault-label">
              バックアップ{prep.backup ? "" : "（なし）"}
            </span>
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.alt, y: AT.alt.y + 56, z: 0 }} place="below">
            <span className={styles.label} data-present={prep.site ? "true" : "false"} data-testid="bcp-alt-label">
              代替拠点{prep.site ? "" : "（なし）"}
            </span>
          </DioramaLabel>
          <DioramaLabel token="staff" dz={-4} place="below" optional>
            <span className={styles.label} data-present={prep.contact ? "true" : "false"}>
              社員{prep.contact ? " 📞連絡網あり" : ""}
            </span>
          </DioramaLabel>
        </>
      }
    />
  );
}
