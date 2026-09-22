import type { CSSProperties } from "react";
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
import styles from "./bcp.module.css";

// 企業の模型：本社ビル（左）とその奥のシステム/データ、手前に社員、右に代替拠点、右奥にバックアップ保管庫。
// 備え（バックアップ・代替拠点・連絡手順）は「模型の中に物として置かれているか」で見せる。
// 災害で本社とシステムが止まったあと、備えがあれば 社員 → 代替拠点、データ → 代替拠点 と復旧経路がつながる。

export type BcpNodeId = "hq" | "system" | "staff" | "alt" | "vault";

const AT: Record<BcpNodeId, WorldPoint> = {
  hq: { x: -52, y: 8 },
  system: { x: -34, y: -54 },
  staff: { x: -2, y: 70 },
  alt: { x: 62, y: 26 },
  vault: { x: 56, y: -56 },
};

const LANE = {
  move: laneBetween(AT.staff, AT.alt, 0, 24),
  restore: laneBetween(AT.vault, AT.alt, 0, 24),
  sync: laneBetween(AT.system, AT.vault, 0, 24),
};

const STAFF_AT: Record<"staff" | "alt" | "hq", ScreenPoint> = {
  staff: nudge(iso(AT.staff), 30, -40),
  alt: nudge(iso(AT.alt), -34, -30),
  hq: nudge(iso(AT.hq), 0, -70),
};

const DATA_AT: Record<"vault" | "alt" | "lost", ScreenPoint> = {
  vault: nudge(iso(AT.vault), 0, -50),
  alt: nudge(iso(AT.alt), 22, -58),
  lost: nudge(iso(AT.system), 0, -58),
};

// ---------- 模型パーツ ----------

function Building({ tone, broken, sign }: { tone: "hq" | "alt"; broken: boolean; sign: string }) {
  const H = tone === "hq" ? 46 : 34;
  const b = isoBox({ x0: -15, x1: 15, y0: -13, y1: 13, z0: 0, z1: H });
  const face = tone === "hq" ? "#EEF2FF" : "#ECFDF5";
  const side = tone === "hq" ? "#D4DBF7" : "#CBEBDD";
  const ink = tone === "hq" ? "#4338CA" : "#047857";
  const rows = tone === "hq" ? [8, 18, 28] : [8, 18];
  return (
    <g data-illustration={`building-${tone}`}>
      <polygon points={b.left} fill={face} />
      <polygon points={b.right} fill={side} />
      <polygon points={b.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.8} />
      <g transform={leftFaceTransform(-15, 13, H)}>
        <rect x={3} y={2} width={24} height={5} rx={1} fill={ink} />
        <text x={15} y={5.9} textAnchor="middle" fontSize={3.8} fontWeight={800} fill="#FFFFFF">
          {sign}
        </text>
        {rows.map((y) =>
          [4, 11, 18].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={5} height={6} rx={0.6} className={styles.window} data-broken={broken ? "true" : "false"} />),
        )}
        {broken && <path d="M 16 2 L 12 12 L 18 18 L 11 30 L 15 40" className={styles.crack} />}
      </g>
      <g transform={rightFaceTransform(15, 13, H)}>
        {rows.map((y) => [4, 12].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={5} height={6} rx={0.6} className={styles.window} data-broken={broken ? "true" : "false"} />))}
      </g>
    </g>
  );
}

function SystemRack({ state }: { state: NodeState }) {
  const b = isoBox({ x0: -10, x1: 10, y0: -12, y1: 12, z0: 0, z1: 34 });
  return (
    <g data-illustration="system">
      <polygon points={b.left} fill="#3B4458" />
      <polygon points={b.right} fill="#2B3242" />
      <polygon points={b.top} fill="#56607A" />
      <g transform={leftFaceTransform(-10, 12, 34)}>
        {[4, 11, 18, 25].map((y, i) => (
          <g key={y}>
            <rect x={2} y={y} width={20} height={5} rx={1} fill="#1F2533" />
            <circle cx={4.6} cy={y + 2.5} r={1} className={netStyles[`led_${state}`]} style={{ animationDelay: `${i * 120}ms` }} />
          </g>
        ))}
      </g>
    </g>
  );
}

function Vault({ present }: { present: boolean }) {
  const b = isoBox({ x0: -11, x1: 11, y0: -11, y1: 11, z0: 0, z1: 22 });
  return (
    <g data-illustration="vault" opacity={present ? 1 : 0.35}>
      <polygon points={b.left} fill="#F5F3FF" />
      <polygon points={b.right} fill="#DDD6FE" />
      <polygon points={b.top} fill="#FFFFFF" stroke="#C4B5FD" strokeWidth={0.8} strokeDasharray={present ? undefined : "2 2"} />
      <g transform={leftFaceTransform(-11, 11, 22)}>
        <rect x={3} y={3} width={16} height={16} rx={2} fill="#FFFFFF" stroke="#7C3AED" strokeOpacity={0.5} strokeWidth={0.8} />
        <text x={11} y={13} textAnchor="middle" fontSize={5.4} fontWeight={800} fill="#6D28D9">
          💾
        </text>
      </g>
    </g>
  );
}

/** 社員3人（小さな人形）。 */
function StaffGroup({ state }: { state: NodeState }) {
  const people = [
    { x: -10, y: 4, c: "#3D7BE0" },
    { x: 2, y: -6, c: "#10B981" },
    { x: 8, y: 8, c: "#F59E0B" },
  ];
  return (
    <g data-illustration="staff" data-state={state}>
      {people.map((p, i) => {
        const at = isoLocal(p.x, p.y, 0);
        return (
          <g key={i} transform={`translate(${at.x} ${at.y})`}>
            <path d="M -5 0 L -5 -14 Q -5 -18 0 -18 Q 5 -18 5 -14 L 5 0 Z" fill={p.c} />
            <circle cx={0} cy={-22} r={4.4} fill="#F6D3B8" />
            <path d="M -4.5 -23 A 4.6 4.6 0 0 1 4.5 -23 Q 0 -25.5 -4.5 -23 Z" fill="#2B3140" />
          </g>
        );
      })}
    </g>
  );
}

// ---------- シーン ----------

export type BcpSceneProps = {
  nodes: Record<BcpNodeId, NodeState>;
  prep: { backup: boolean; site: boolean; contact: boolean };
  disaster: boolean;
  lanes: Partial<Record<keyof typeof LANE, "active" | "blocked">>;
  staffToken: { at: keyof typeof STAFF_AT; text: string; tone: "ok" | "ng" | "idle" };
  dataToken: { at: keyof typeof DATA_AT; text: string; tone: "ok" | "ng" | "idle" } | null;
  shake: boolean;
  reducedMotion: boolean;
};

export function BcpScene({ nodes, prep, disaster, lanes, staffToken, dataToken, shake, reducedMotion }: BcpSceneProps) {
  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-disaster={disaster ? "true" : "false"}
      data-testid="bcp-scene"
    >
      <div className={styles.world} data-shake={shake ? "true" : "false"}>
        <svg
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label="企業の模型。左に本社ビル、その奥にシステムとデータ、手前に社員、右に代替拠点、右奥にバックアップ保管庫"
        >
          <SceneDefs />
          <NetworkSceneBase pads={(Object.keys(AT) as BcpNodeId[]).map((id) => ({ id, at: AT[id], state: nodes[id] }))} />
          <SceneRail lane={LANE.sync} id="sync" state={prep.backup ? (disaster ? "idle" : "active") : "blocked"} color="#7C3AED" chevrons={[0.5]} />
          <SceneRail lane={LANE.restore} id="restore" state={lanes.restore ?? "idle"} color="#7C3AED" chevrons={[0.5]} />
          <SceneRail lane={LANE.move} id="move" state={lanes.move ?? "idle"} color="#059669" chevrons={[0.5]} />
          <SceneNode id="system" at={AT.system} state={nodes.system}>
            <SystemRack state={nodes.system} />
          </SceneNode>
          <SceneNode id="vault" at={AT.vault} state={nodes.vault}>
            <Vault present={prep.backup} />
          </SceneNode>
          <SceneNode id="hq" at={AT.hq} state={nodes.hq}>
            <Building tone="hq" broken={disaster} sign="本社" />
          </SceneNode>
          <SceneNode id="alt" at={AT.alt} state={nodes.alt}>
            <g opacity={prep.site ? 1 : 0.35}>
              <Building tone="alt" broken={false} sign="代替" />
            </g>
          </SceneNode>
          <SceneNode id="staff" at={AT.staff} state={nodes.staff}>
            <StaffGroup state={nodes.staff} />
          </SceneNode>
        </svg>
      </div>

      <span className={styles.label} style={toPercent(nudge(iso(AT.hq), -42, 6))} data-state={nodes.hq}>
        本社{disaster && <b className={styles.ng}>立入禁止</b>}
      </span>
      <span className={styles.label} style={toPercent(nudge(iso(AT.system), 40, -22))} data-state={nodes.system}>
        システム/データ{disaster && <b className={styles.ng}>停止</b>}
      </span>
      <span className={styles.label} style={toPercent(nudge(iso(AT.vault), 0, 18))} data-present={prep.backup ? "true" : "false"} data-testid="bcp-vault-label">
        バックアップ{prep.backup ? "" : "（なし）"}
      </span>
      <span className={styles.label} style={toPercent(nudge(iso(AT.alt), 0, 20))} data-present={prep.site ? "true" : "false"} data-testid="bcp-alt-label">
        代替拠点{prep.site ? "" : "（なし）"}
      </span>
      <span className={styles.label} style={toPercent(nudge(iso(AT.staff), 0, 16))} data-present={prep.contact ? "true" : "false"}>
        社員{prep.contact ? " 📞連絡網あり" : ""}
      </span>

      {disaster && (
        <span className={styles.quake} role="status">
          🌋 大地震
        </span>
      )}

      <span className={styles.token} style={{ ...toPercent(STAFF_AT[staffToken.at]) } as CSSProperties} data-tone={staffToken.tone} data-at={staffToken.at} data-testid="bcp-staff-token">
        {staffToken.text}
      </span>
      {dataToken && (
        <span className={`${styles.token} ${styles.dataToken}`} style={toPercent(DATA_AT[dataToken.at])} data-tone={dataToken.tone} data-at={dataToken.at} data-testid="bcp-data-token">
          {dataToken.text}
        </span>
      )}
    </div>
  );
}
