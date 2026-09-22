import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  leftFaceTransform,
  rightFaceTransform,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, laneBetween, nudge } from "../scene/IsoParts";
import styles from "./computer.module.css";

// PC内部の模型：ストレージ（左手前の引き出し）→ メモリ（中央の作業机）↔ CPU（右奥の頭脳）。
// 文書は「物体」として動く。ストレージの中身（保存版）とメモリ上の作業版を別々に描くことで、
// 「開く＝コピーを机に広げる」「保存＝机の内容を引き出しへ書き戻す」「電源OFF＝机の上だけ消える」が見える。

export type PartId = "storage" | "memory" | "cpu";
export type BusId = "load" | "bus" | "save";
export type DocVersion = 1 | 2;

export const DOC_TEXT: Record<DocVersion, string> = { 1: "売上 100万円", 2: "売上 120万円" };

const AT: Record<PartId, WorldPoint> = {
  storage: { x: -40, y: 60 },
  memory: { x: -10, y: -10 },
  cpu: { x: 60, y: -40 },
};

const LANE: Record<BusId, ReturnType<typeof laneBetween>> = {
  load: laneBetween(AT.storage, AT.memory, -5),
  save: laneBetween(AT.memory, AT.storage, -5),
  bus: laneBetween(AT.memory, AT.cpu),
};

const BUS_COLOR: Record<BusId, string> = { load: "#2F6FDB", bus: "#7C3AED", save: "#059669" };

const DOC_AT: Record<"storage" | "memory", ScreenPoint> = {
  storage: nudge(iso(AT.storage), 0, -64),
  memory: nudge(iso(AT.memory), 0, -62),
};

const PACKET_AT: Record<PartId, ScreenPoint> = {
  storage: nudge(iso(AT.storage), 30, -40),
  memory: nudge(iso(AT.memory), 34, -34),
  cpu: nudge(iso(AT.cpu), 0, -52),
};

/** 上面（z一定）に部品を貼るための transform。u=x方向、v=y方向。 */
function topFaceTransform(x0: number, y0: number, z: number) {
  const o = isoLocal(x0, y0, z);
  return `matrix(0.866 0.5 -0.866 0.5 ${o.x.toFixed(2)} ${o.y.toFixed(2)})`;
}

// ---------- 模型パーツ ----------

/** ストレージ＝引き出し付きのキャビネット（SSD）。電源を切っても中身は残る。 */
function StorageIllustration({ state }: { state: NodeState }) {
  const body = isoBox({ x0: -14, x1: 14, y0: -12, y1: 12, z0: 0, z1: 30 });
  return (
    <g data-illustration="storage">
      <polygon points={body.left} fill="#F3F4F8" />
      <polygon points={body.right} fill="#D9DEE8" />
      <polygon points={body.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.8} />
      <g transform={leftFaceTransform(-14, 12, 30)}>
        {[3, 16].map((y, i) => (
          <g key={y}>
            <rect x={3} y={y} width={22} height={11} rx={1.6} fill="#FFFFFF" stroke="#B7C2D4" strokeWidth={0.7} />
            <rect x={10} y={y + 4.4} width={8} height={2} rx={1} fill={i === 0 ? "#2F6FDB" : "#9AA8BD"} />
          </g>
        ))}
      </g>
      <g transform={rightFaceTransform(14, 12, 30)}>
        <text x={3} y={7} fontSize={4.4} fontWeight={800} fill="#475569" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          SSD
        </text>
        <circle cx={20} cy={5.6} r={1.3} className={netStyles[`led_${state}`]} />
      </g>
    </g>
  );
}

/** メモリ＝スロットに刺さった RAM 基板。電源が切れるとチップの灯りが消える。 */
function MemoryIllustration({ state }: { state: NodeState }) {
  const slot = isoBox({ x0: -22, x1: 22, y0: -5, y1: 5, z0: 0, z1: 5 });
  const board = isoBox({ x0: -20, x1: 20, y0: -1.2, y1: 1.2, z0: 5, z1: 25 });
  return (
    <g data-illustration="memory">
      <polygon points={slot.left} fill="#3B4458" />
      <polygon points={slot.right} fill="#2B3242" />
      <polygon points={slot.top} fill="#4A5367" />
      <polygon points={board.top} fill="#1F7A4D" />
      <polygon points={board.right} fill="#165C39" />
      <polygon points={board.left} fill="#23945C" />
      <g transform={leftFaceTransform(-20, 1.2, 25)}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={3 + i * 9.2} y={4} width={7} height={9} rx={0.8} className={styles.ramChip} data-state={state} />
        ))}
        <rect x={2} y={16} width={36} height={2.4} fill="#E3B341" opacity={0.9} />
      </g>
    </g>
  );
}

/** CPU＝ソケット上のチップと、上面の「CPU」刻印。 */
function CpuIllustration({ state }: { state: NodeState }) {
  const socket = isoBox({ x0: -16, x1: 16, y0: -16, y1: 16, z0: 0, z1: 5 });
  const chip = isoBox({ x0: -11, x1: 11, y0: -11, y1: 11, z0: 5, z1: 9 });
  return (
    <g data-illustration="cpu">
      <polygon points={socket.left} fill="#DCE3EE" />
      <polygon points={socket.right} fill="#C3CEDF" />
      <polygon points={socket.top} fill="#EEF2F8" stroke="#C3CEDF" strokeWidth={0.6} />
      <polygon points={chip.left} fill="#8F9AAD" />
      <polygon points={chip.right} fill="#788499" />
      <polygon points={chip.top} className={styles.cpuTop} data-state={state} />
      <g transform={topFaceTransform(-11, -11, 9)}>
        <rect x={3} y={3} width={16} height={16} rx={1.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={0.7} />
        <text x={11} y={13.4} textAnchor="middle" fontSize={5.4} fontWeight={800} fill="#FFFFFF" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          CPU
        </text>
      </g>
      <g transform={leftFaceTransform(-16, 16, 5)}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={3 + i * 4.6} y={1.4} width={2} height={2} fill="#D4A72C" />
        ))}
      </g>
    </g>
  );
}

// ---------- シーン ----------

export type WorkDoc = {
  spot: "storage" | "memory";
  version: DocVersion;
  /** clean=保存版と同じ / dirty=未保存の編集あり / saved=今保存した / vanished=電源OFFで消えた */
  status: "clean" | "dirty" | "saved" | "vanished";
};

export type ComputerSceneProps = {
  nodes: Record<PartId, NodeState>;
  lanes: Partial<Record<BusId, "active">>;
  /** ストレージに保存されている版（電源を切っても残る） */
  stored: DocVersion;
  storedFlash: boolean;
  doc: WorkDoc | null;
  packet: { spot: PartId; text: string; kind: BusId } | null;
  power: "on" | "off";
  reducedMotion: boolean;
};

export function ComputerScene({ nodes, lanes, stored, storedFlash, doc, packet, power, reducedMotion }: ComputerSceneProps) {
  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-power={power}
      data-testid="computer-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="PCの内部模型。左手前にストレージ（引き出し）、中央にメモリ（作業机）、右奥にCPU（頭脳）。文書はストレージからメモリへ読み込まれ、CPUが処理し、保存でストレージへ戻る"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(Object.keys(AT) as PartId[]).map((id) => ({ id, at: AT[id], state: nodes[id] }))} />
        <SceneRail lane={LANE.bus} id="bus" state={lanes.bus ?? "idle"} color={BUS_COLOR.bus} chevrons={[0.3, 0.7]} />
        <SceneNode id="cpu" at={AT.cpu} state={nodes.cpu} scale={1.25}>
          <CpuIllustration state={nodes.cpu} />
        </SceneNode>
        <SceneRail lane={LANE.load} id="load" state={lanes.load ?? "idle"} color={BUS_COLOR.load} chevrons={[0.5]} />
        <SceneRail lane={LANE.save} id="save" state={lanes.save ?? "idle"} color={BUS_COLOR.save} chevrons={[0.5]} />
        <SceneNode id="memory" at={AT.memory} state={nodes.memory} scale={1.15}>
          <MemoryIllustration state={nodes.memory} />
        </SceneNode>
        <SceneNode id="storage" at={AT.storage} state={nodes.storage} scale={1.15}>
          <StorageIllustration state={nodes.storage} />
        </SceneNode>
      </svg>

      {power === "off" && (
        <div className={styles.powerOff} role="status" data-testid="power-off">
          ⚡ 電源OFF
        </div>
      )}

      {/* ストレージ＝引き出しの中身（保存版）。電源を切っても表示が残る */}
      <div className={`${netStyles.nodeLabel} ${styles.partLabel}`} style={toPercent(nudge(iso(AT.storage), -4, 26))} data-part-label="storage">
        <span className="font-bold text-gray-900">ストレージ＝引き出し</span>
        <span key={stored} className={styles.storedChip} data-flash={storedFlash ? "true" : "false"} data-testid="stored-file">
          🗄 保存版 v{stored}：{DOC_TEXT[stored]}
        </span>
      </div>
      <div className={`${netStyles.nodeLabel} ${styles.partLabel}`} style={toPercent(nudge(iso(AT.memory), 26, 12))} data-part-label="memory">
        <span className="font-bold text-gray-900">メモリ＝作業机</span>
        <span className={netStyles.nodeLabelSub}>{power === "off" ? "電気が無いと保てない" : "今使うものを広げる"}</span>
      </div>
      <div className={`${netStyles.nodeLabel} ${styles.partLabel}`} style={toPercent(nudge(iso(AT.cpu), 10, 26))} data-part-label="cpu">
        <span className="font-bold text-gray-900">CPU＝頭脳</span>
        <span className={netStyles.nodeLabelSub}>計算・処理する</span>
      </div>

      {packet && (
        <div
          className={styles.packetAnchor}
          style={toPercent(PACKET_AT[packet.spot])}
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
          style={toPercent(DOC_AT[doc.spot])}
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
          <span aria-hidden className={styles.docShadow} />
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
        </div>
      )}
    </div>
  );
}
