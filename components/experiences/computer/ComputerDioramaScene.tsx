"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import { Desk, Floor, FloorRoute, Group, Monitor, Paper, Parcel, Person, Plant, Wall, WallWindow, type RouteTone } from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken } from "../scene/DioramaStage";
import { DOC_TEXT, type BusId, type ComputerSceneProps, type PartId } from "./computerTypes";
import styles from "./computerdiorama.module.css";

// CPU・メモリ・ストレージの図解：机の上のオープンフレームPC（ケースを外してマザーボードが見える組み立て途中のPC）。
// 左からストレージ（M.2 SSD＝引き出し）、メモリ（RAM＝作業机）、CPU（クーラーの下＝頭脳）が1枚の基板に並び、
// 奥のモニターには同じ文書（レポート）が映る。文書はストレージ → メモリ → CPU で処理 → メモリ上で編集 → ストレージへ保存。
// 電源を切るとモニターと基板の光が消え、メモリ上の未保存の編集だけが消える（ストレージの保存版は残る）。

const BOARD = { x: 250, y: 210, w: 300, d: 130, z: 48 };
const TOP = BOARD.z + 3;
const AT: Record<PartId, Vec3> = {
  storage: { x: 300, y: 280, z: TOP },
  memory: { x: 400, y: 262, z: TOP },
  cpu: { x: 490, y: 262, z: TOP },
};
/** 文書・処理の札を置く点（部品の真上） */
const DOC_AT: Record<"storage" | "memory", Vec3> = {
  storage: { x: AT.storage.x, y: AT.storage.y, z: TOP + 20 },
  memory: { x: AT.memory.x, y: AT.memory.y, z: TOP + 44 },
};
const PACKET_AT: Record<PartId, Vec3> = {
  storage: { x: AT.storage.x + 10, y: AT.storage.y + 6, z: TOP + 16 },
  memory: { x: AT.memory.x + 16, y: AT.memory.y + 20, z: TOP + 16 },
  cpu: { x: AT.cpu.x, y: AT.cpu.y + 26, z: TOP + 26 },
};
const G = TOP + 0.6;
// 基板の上の配線（金色の線）。ストレージ⇄メモリは読み込み（奥）と保存（手前）の2本
const BUS: Record<BusId, Vec3[]> = {
  load: [
    { x: 318, y: 270, z: G },
    { x: 382, y: 258, z: G },
  ],
  save: [
    { x: 382, y: 294, z: G },
    { x: 318, y: 294, z: G },
  ],
  bus: [
    { x: 420, y: 276, z: G },
    { x: 468, y: 276, z: G },
  ],
};

// ステップの主役の部品に寄る（ストレージ → メモリ → CPU → メモリ → ストレージ）
const SHOT_AT: Record<PartId, Camera> = {
  storage: { yaw: -12, pitch: 50, zoom: 1.75, fx: 330, fy: 262, fz: 64 },
  memory: { yaw: -12, pitch: 50, zoom: 1.75, fx: 400, fy: 250, fz: 70 },
  cpu: { yaw: -14, pitch: 50, zoom: 1.75, fx: 460, fy: 252, fz: 66 },
};
const SHOT_OFF: Camera = { yaw: -12, pitch: 50, zoom: 1.4, fx: 390, fy: 240, fz: 80 };

export function ComputerDioramaScene({ nodes, lanes, stored, storedFlash, doc, packet, power, reducedMotion, forward = true }: ComputerSceneProps & { forward?: boolean }) {
  const on = power === "on";
  const vanished = doc?.status === "vanished";
  // 保存してから電源を切った：メモリは空になったが、同じ版がストレージに残っているので失ったものはない
  const safeOff = vanished && !!doc && stored === doc.version;
  const focus: PartId = packet?.spot ?? (doc?.spot === "memory" ? (lanes.save === "active" ? "storage" : "memory") : "storage");
  const busTone = (id: BusId): RouteTone => (lanes[id] === "active" ? (id === "save" ? "response" : "request") : "idle");

  return (
    <DioramaStage
      testId="computer-scene"
      ariaLabel="机の上のオープンフレームPC。マザーボードの上に、左からストレージ（M.2 SSD＝引き出し）、メモリ（作業机）、CPU（クーラーの下＝頭脳）が並び、金色の配線でつながっている。奥のモニターに同じ文書が映る"
      shot={on ? SHOT_AT[focus] : SHOT_OFF}
      shotKey={`${doc?.spot ?? "-"}-${doc?.status ?? ""}-${packet?.spot ?? "-"}-${power}`}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-power": power }}
      tokens={{
        doc: {
          at: doc?.spot === "memory" && !vanished ? DOC_AT.memory : null,
          // 読み込みは「コピー」：保存版はストレージに置いたまま、写しがメモリへ運ばれる
          start: DOC_AT.storage,
          path: doc?.spot === "memory" ? [...BUS.load.map((p) => ({ ...p, z: TOP + 30 })), DOC_AT.memory] : undefined,
        },
        packet: { at: packet ? PACKET_AT[packet.spot] : null, path: packet ? [...BUS[packet.kind].map((p) => ({ ...p, z: TOP + 16 })), PACKET_AT[packet.spot]] : undefined },
      }}
      world={
        <>
          <Floor x={100} y={60} w={600} d={380} h={16} material="wood" />
          <Wall x={100} y={60} length={600} h={150}>
            <WallWindow left={40} top={24} w={120} h={70} />
          </Wall>
          <Plant x={660} y={120} />
          <Desk x={400} y={260} w={360} d={170} tone="wood" />

          {/* モニター：同じ文書が映る。電源OFFで真っ暗 */}
          <Monitor
            x={400}
            y={196}
            z={44}
            w={150}
            keyboard={false}
            tone={on ? "light" : "off"}
            glow={on}
            screen={
              <div className={styles.app}>
                <div className={styles.appBar}>📄 レポート.docx</div>
                <div className={styles.appBody}>{doc && !vanished ? DOC_TEXT[doc.version] : ""}</div>
              </div>
            }
          />

          {/* ---------- 基板（マザーボード） ---------- */}
          <Group data={{ "data-power": power }}>
            <Box x={BOARD.x} y={BOARD.y} z={BOARD.z - 4} w={BOARD.w} d={BOARD.d} h={4} color="#1f2937" />
            <Box x={BOARD.x + 6} y={BOARD.y + 6} z={BOARD.z} w={BOARD.w - 12} d={BOARD.d - 12} h={3} color="#14532d" faceClass={{ top: styles.pcb }} />
          </Group>

          {/* ストレージ：M.2 SSD（引き出し） */}
          <Group data={{ "data-node": "storage", "data-state": nodes.storage, "data-illustration": "storage" }}>
            <Box x={AT.storage.x - 30} y={AT.storage.y - 9} z={TOP} w={60} d={18} h={3} color="#111827" faceClass={{ top: styles.ssd }} />
          </Group>

          {/* メモリ：RAM（作業机）を2枚 */}
          <Group data={{ "data-node": "memory", "data-state": nodes.memory, "data-illustration": "memory" }}>
            {[0, 1].map((i) => (
              <Box key={i} x={AT.memory.x - 34} y={AT.memory.y - 26 + i * 12} z={TOP} w={68} d={4} h={22} color="#1e293b" faceClass={{ front: styles.ram }} faces={{ front: <span className={styles.ramLeds} data-on={on && nodes.memory !== "idle" ? "true" : "false"} /> }} />
            ))}
          </Group>

          {/* CPU とクーラー（頭脳） */}
          <Group data={{ "data-node": "cpu", "data-state": nodes.cpu, "data-illustration": "cpu" }}>
            <Box x={AT.cpu.x - 20} y={AT.cpu.y - 20} z={TOP} w={40} d={40} h={4} color="#9ca3af" />
            <Box x={AT.cpu.x - 18} y={AT.cpu.y - 18} z={TOP + 4} w={36} d={36} h={22} color="#cbd5e1" faceClass={{ top: styles.fan, front: styles.fins, left: styles.fins }} faces={{ top: <span className={styles.fanBlade} data-on={on && nodes.cpu === "active" ? "true" : "false"} /> }} />
          </Group>

          {/* 電源のボタンと LED */}
          <Box x={BOARD.x + BOARD.w - 30} y={BOARD.y + BOARD.d - 20} z={TOP} w={14} d={8} h={6} color={on ? "#22c55e" : "#374151"} />

          {(Object.keys(BUS) as BusId[]).map((id) => (
            <FloorRoute key={id} points={BUS[id]} width={5} z={0} tone={busTone(id)} active={lanes[id] === "active"} data={{ "data-bus": id, "data-active": lanes[id] === "active" ? "true" : "false" }} />
          ))}

          {/* キーボードと、使っている人 */}
          <Box x={340} y={352} z={44} w={120} d={26} h={4} color="#e5e7eb" />
          <Person x={400} y={400} pose="sit" shirt="#4f86e8" />

          {/* ストレージの保存版（いつもここに残る。保存すると版が上がる） */}
          <Group x={DOC_AT.storage.x} y={DOC_AT.storage.y} z={TOP + 3}>
            <Paper count={2} stamp={stored === 2 ? "ok" : undefined} />
          </Group>

          <DioramaToken id="doc">
            <Paper count={2} stamp={doc?.status === "saved" ? "ok" : doc?.status === "dirty" ? "danger" : undefined} />
          </DioramaToken>
          <DioramaToken id="packet">
            <Parcel tone="info" size={0.7} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          {!on && (
            <DioramaLabel at={{ x: 400, y: 196, z: 160 }} place="above" pinned>
              <span className={styles.powerOff} role="status" data-testid="power-off">
                ⚡ 電源OFF
              </span>
            </DioramaLabel>
          )}

          {doc && (
            <DioramaLabel at={{ ...DOC_AT[doc.spot], x: DOC_AT[doc.spot].x + (doc.spot === "memory" ? 36 : -36), z: DOC_AT[doc.spot].z! }} place={doc.spot === "memory" ? "right" : "left"} pinned>
              <div
                className={styles.docAnchor}
                data-spot={doc.spot}
                data-status={doc.status}
                data-version={doc.version}
                data-testid="work-doc"
                role="img"
                aria-label={vanished ? "メモリ上の文書は電源OFFで消えた" : `${doc.spot === "memory" ? "メモリ上" : "ストレージ上"}の文書 v${doc.version}（${DOC_TEXT[doc.version]}）`}
              >
                {safeOff ? (
                  <span className={styles.ghost} data-safe="true">
                    <span className={styles.ghostTitle}>メモリは空に</span>
                    <span className={styles.ghostBody}>
                      v{doc.version}（{DOC_TEXT[doc.version]}）はストレージに保存済み
                    </span>
                  </span>
                ) : vanished ? (
                  <span className={styles.ghost}>
                    <span className={styles.ghostTitle}>消えた</span>
                    <span className={styles.ghostBody}>
                      v{doc.version}：{DOC_TEXT[doc.version]}
                    </span>
                  </span>
                ) : (
                  <span className={styles.doc}>
                    <span className={styles.docHead}>
                      📄 レポート <span className={styles.docVer}>v{doc.version}</span>
                    </span>
                    <span key={doc.version} className={styles.docBody}>
                      {DOC_TEXT[doc.version]}
                    </span>
                    {doc.status === "dirty" && <span className={styles.docBadge}>未保存</span>}
                    {doc.status === "saved" && <span className={`${styles.docBadge} ${styles.docBadgeOk}`}>保存済み</span>}
                  </span>
                )}
              </div>
            </DioramaLabel>
          )}

          {packet && (
            <DioramaLabel token="packet" dz={10} place="below">
              <span className={styles.packet} data-kind={packet.kind} data-spot={packet.spot} data-testid="bus-packet">
                {packet.text}
              </span>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ ...AT.storage, y: AT.storage.y + 14, z: TOP }} place="below" pinned>
            <div className={styles.part} data-part-label="storage" data-state={nodes.storage}>
              <b>ストレージ</b>＝引き出し
              <span key={stored} className={styles.storedChip} data-flash={storedFlash ? "true" : "false"} data-testid="stored-file">
                🗄 保存版 v{stored}
                <br />
                {DOC_TEXT[stored]}
              </span>
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.memory, y: AT.memory.y + 20, z: TOP }} place="below" optional>
            <div className={styles.part} data-part-label="memory" data-state={nodes.memory}>
              <b>メモリ</b>＝作業机
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.cpu, y: AT.cpu.y + 24, z: TOP }} place="below" optional>
            <div className={styles.part} data-part-label="cpu" data-state={nodes.cpu}>
              <b>CPU</b>＝頭脳
            </div>
          </DioramaLabel>
        </>
      }
    />
  );
}
