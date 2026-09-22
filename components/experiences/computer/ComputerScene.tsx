import type { CSSProperties } from "react";
import styles from "./computer.module.css";

// PCケースの中（2D の断面図）。マザーボードの上に
//   ストレージ（引き出し） ⇄ メモリ（作業机） ⇄ CPU（頭脳）
// が1列に並び、配線（バス）でつながる。文書は「物体」として部品の上を移動する。
// ストレージの中身（保存版）とメモリ上の作業版を別々に描くことで、
// 「開く＝コピーを机に広げる」「保存＝机の内容を引き出しへ書き戻す」「電源OFF＝机の上だけ消える」が見える。

export type PartId = "storage" | "memory" | "cpu";
export type BusId = "load" | "bus" | "save";
export type DocVersion = 1 | 2;
export type PartState = "idle" | "sending" | "active" | "error" | "disabled";

export const DOC_TEXT: Record<DocVersion, string> = { 1: "売上 100万円", 2: "売上 120万円" };

/** 部品の列の中心（ケース内の横位置 %） */
const COL: Record<PartId, number> = { storage: 18, memory: 50, cpu: 82 };

export type WorkDoc = {
  spot: "storage" | "memory";
  version: DocVersion;
  /** clean=保存版と同じ / dirty=未保存の編集あり / saved=今保存した / vanished=電源OFFで消えた */
  status: "clean" | "dirty" | "saved" | "vanished";
};

export type ComputerSceneProps = {
  nodes: Record<PartId, PartState>;
  lanes: Partial<Record<BusId, "active" | "idle">>;
  stored: DocVersion;
  storedFlash: boolean;
  doc: WorkDoc | null;
  packet: { spot: PartId; text: string; kind: BusId } | null;
  power: "on" | "off";
  reducedMotion: boolean;
};

function StoragePart() {
  return (
    <span className={styles.ssd} data-illustration="storage" aria-hidden>
      <span className={styles.ssdLabel}>SSD</span>
      <span className={styles.drawer} />
      <span className={styles.drawer} />
    </span>
  );
}

function MemoryPart() {
  return (
    <span className={styles.ram} data-illustration="memory" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={styles.ramChip} />
      ))}
    </span>
  );
}

function CpuPart() {
  return (
    <span className={styles.cpu} data-illustration="cpu" aria-hidden>
      <span className={styles.cpuDie}>CPU</span>
    </span>
  );
}

const PARTS: { id: PartId; name: string; role: string; offRole?: string; Part: () => React.JSX.Element }[] = [
  { id: "storage", name: "ストレージ", role: "引き出し", Part: StoragePart },
  { id: "memory", name: "メモリ", role: "作業机", offRole: "電気が無いと保てない", Part: MemoryPart },
  { id: "cpu", name: "CPU", role: "頭脳", Part: CpuPart },
];

export function ComputerScene({ nodes, lanes, stored, storedFlash, doc, packet, power, reducedMotion }: ComputerSceneProps) {
  return (
    <div
      className={styles.scene}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-power={power}
      data-testid="computer-scene"
      role="group"
      aria-label="PCケースの中。マザーボードの上に、左からストレージ（引き出し）、メモリ（作業机）、CPU（頭脳）が並び、配線でつながっている"
    >
      <div className={styles.case}>
        <div className={styles.caseHead}>
          <span className={styles.caseTitle}>🖥 PCケースの中</span>
          <span className={styles.powerLed} data-on={power === "on" ? "true" : "false"} aria-hidden />
          <span className={styles.powerText}>{power === "on" ? "電源ON" : "電源OFF"}</span>
        </div>

        <div className={styles.board}>
          {/* 文書と処理の札が置かれる空間 */}
          <div className={styles.air} />

          {/* 配線（バス）。ストレージ⇄メモリは読み込み（上）と保存（下）の2本 */}
          <div className={styles.buses} aria-hidden>
            <span className={styles.bus} data-bus="load" data-active={lanes.load === "active" ? "true" : "false"} style={{ left: `${COL.storage + 9}%`, width: `${COL.memory - COL.storage - 18}%` } as CSSProperties}>
              <span className={styles.busTag}>読み込み →</span>
            </span>
            <span className={styles.bus} data-bus="save" data-active={lanes.save === "active" ? "true" : "false"} style={{ left: `${COL.storage + 9}%`, width: `${COL.memory - COL.storage - 18}%` } as CSSProperties}>
              <span className={styles.busTag}>← 保存</span>
            </span>
            <span className={styles.bus} data-bus="bus" data-active={lanes.bus === "active" ? "true" : "false"} style={{ left: `${COL.memory + 9}%`, width: `${COL.cpu - COL.memory - 18}%` } as CSSProperties}>
              <span className={styles.busTag}>⇄ 超高速</span>
            </span>
          </div>

          <div className={styles.parts}>
            {PARTS.map(({ id, name, role, offRole, Part }) => (
              <div key={id} className={styles.part} data-node={id} data-state={nodes[id]} data-part-label={id}>
                <span className={styles.socket}>
                  <Part />
                </span>
                <span className={styles.partName}>
                  {name}＝<b>{role}</b>
                </span>
                {id === "storage" ? (
                  <span key={stored} className={styles.storedChip} data-flash={storedFlash ? "true" : "false"} data-testid="stored-file">
                    🗄 保存版 v{stored}
                    <br />
                    {DOC_TEXT[stored]}
                  </span>
                ) : (
                  <span className={styles.partRole}>{power === "off" && offRole ? offRole : id === "memory" ? "今使うものを広げる" : "計算・処理する"}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {power === "off" && (
        <div className={styles.powerOff} role="status" data-testid="power-off">
          ⚡ 電源OFF
        </div>
      )}

      {packet && (
        <div
          className={styles.packetAnchor}
          style={{ left: `${COL[packet.spot]}%` }}
          data-kind={packet.kind}
          data-spot={packet.spot}
          data-testid="bus-packet"
        >
          <span className={styles.packet}>{packet.text}</span>
        </div>
      )}

      {doc && (
        <div
          className={styles.docAnchor}
          style={{ left: `${COL[doc.spot]}%` }}
          data-spot={doc.spot}
          data-status={doc.status}
          data-version={doc.version}
          data-testid="work-doc"
          role="img"
          aria-label={
            doc.status === "vanished"
              ? "メモリ上の文書は電源OFFで消えた"
              : `${doc.spot === "memory" ? "メモリ上" : "ストレージ上"}の文書 v${doc.version}（${DOC_TEXT[doc.version]}）`
          }
        >
          {doc.status === "vanished" ? (
            <span className={styles.ghost}>
              <span className={styles.ghostTitle}>消えた</span>
              <span className={styles.ghostBody}>v{doc.version}：{DOC_TEXT[doc.version]}</span>
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
          <span className={styles.docPin} aria-hidden />
        </div>
      )}
    </div>
  );
}
