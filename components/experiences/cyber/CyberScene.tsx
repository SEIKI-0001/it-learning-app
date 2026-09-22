import type { CSSProperties } from "react";
import { DeskPersonIllustration, EavesdropperIllustration } from "../crypto/CryptoPeopleIllustration";
import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  points,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import { NetworkHumanIllustration } from "../network/NetworkHumanIllustration";
import { WebServerIllustration } from "../network/WebServerIllustration";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, laneBetween, nudge, type Lane } from "../scene/IsoParts";
import styles from "./cyber.module.css";

// 実験用の会社の模型。奥の区画（会社）に Webサーバ・DB・社員PC、外にインターネット・利用者・攻撃者。
// 攻撃ごとに「通る道（レール）」と「被害が出る場所」が変わる。名前ではなく経路で覚えるための模型。

export type CyberNodeId = "attacker" | "internet" | "web" | "db" | "user" | "staff";
export type CyberLaneId = "ai" | "iw" | "wd" | "ui" | "is" | "as" | "sw";

const AT: Record<CyberNodeId, WorldPoint> = {
  attacker: { x: -74, y: -30 },
  internet: { x: -24, y: 18 },
  web: { x: 20, y: -54 },
  db: { x: 70, y: -70 },
  user: { x: -44, y: 76 },
  staff: { x: 54, y: 32 },
};

const LANE: Record<CyberLaneId, Lane> = {
  ai: laneBetween(AT.attacker, AT.internet, 0, 20),
  iw: laneBetween(AT.internet, AT.web, 0, 24),
  wd: laneBetween(AT.web, AT.db, 0, 22),
  ui: laneBetween(AT.user, AT.internet, 0, 22),
  is: laneBetween(AT.internet, AT.staff, 0, 24),
  as: laneBetween(AT.attacker, AT.staff, 10, 22),
  sw: laneBetween(AT.staff, AT.web, 0, 24),
};

export type LaneTone = "attack" | "normal" | "leak" | "phone";
const TONE_COLOR: Record<LaneTone, string> = { attack: "#E11D48", normal: "#2F6FDB", leak: "#D97706", phone: "#9333EA" };

export type CyberStop = CyberNodeId;
const STOP_AT: Record<CyberStop, ScreenPoint> = {
  attacker: nudge(iso(AT.attacker), 0, -52),
  internet: nudge(iso(AT.internet), 0, -46),
  web: nudge(iso(AT.web), 0, -72),
  db: nudge(iso(AT.db), -6, -50),
  user: nudge(iso(AT.user), 16, -60),
  staff: nudge(iso(AT.staff), -4, -62),
};

const LABEL: Record<CyberNodeId, { name: string; at: ScreenPoint; start?: boolean }> = {
  attacker: { name: "😈 攻撃者", at: nudge(iso(AT.attacker), -34, -18) },
  internet: { name: "🌐 インターネット", at: nudge(iso(AT.internet), 0, 18) },
  web: { name: "Webサーバ", at: nudge(iso(AT.web), -30, -30) },
  db: { name: "DB", at: nudge(iso(AT.db), 0, 16) },
  user: { name: "利用者のブラウザ", at: nudge(iso(AT.user), 0, 22) },
  staff: { name: "社員PC", at: nudge(iso(AT.staff), 0, 22) },
};

// ---------- 模型パーツ ----------

/** インターネット＝台座の上の地球儀。 */
function GlobeIllustration({ state }: { state: NodeState }) {
  const base = isoBox({ x0: -8, x1: 8, y0: -8, y1: 8, z0: 0, z1: 3 });
  const c = isoLocal(0, 0, 18);
  return (
    <g data-illustration="internet">
      <polygon points={base.left} fill="#DCE3EE" />
      <polygon points={base.right} fill="#C8D2E1" />
      <polygon points={base.top} fill="#EEF2F8" />
      <line x1={0} y1={isoLocal(0, 0, 3).y} x2={c.x} y2={c.y + 10} stroke="#9AA8BD" strokeWidth={1.4} />
      <circle cx={c.x} cy={c.y} r={11} className={styles.globe} data-state={state} />
      <g fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={0.8}>
        <ellipse cx={c.x} cy={c.y} rx={4.6} ry={11} />
        <line x1={c.x - 11} y1={c.y} x2={c.x + 11} y2={c.y} />
        <path d={`M ${c.x - 9.4} ${c.y - 5.6} Q ${c.x} ${c.y - 3} ${c.x + 9.4} ${c.y - 5.6}`} />
        <path d={`M ${c.x - 9.4} ${c.y + 5.6} Q ${c.x} ${c.y + 8.2} ${c.x + 9.4} ${c.y + 5.6}`} />
      </g>
    </g>
  );
}

/** データベース＝3段の円柱。流出すると上段が開いて書類が飛び出す。 */
function DatabaseIllustration({ state }: { state: NodeState }) {
  const rx = 12;
  const ry = 5;
  const tiers = [0, 11, 22];
  return (
    <g data-illustration="db">
      {tiers.map((z, i) => {
        const bottom = isoLocal(0, 0, z).y;
        const top = isoLocal(0, 0, z + 10).y;
        return (
          <g key={z}>
            <path d={`M ${-rx} ${top} L ${-rx} ${bottom} A ${rx} ${ry} 0 0 0 ${rx} ${bottom} L ${rx} ${top} Z`} fill={i === 2 ? "#60A5FA" : "#93C5FD"} />
            <ellipse cx={0} cy={top} rx={rx} ry={ry} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={0.7} />
          </g>
        );
      })}
      <circle cx={8} cy={isoLocal(0, 0, 5).y} r={1.2} className={netStyles[`led_${state}`]} />
    </g>
  );
}

// ---------- シーン ----------

export type CyberSceneProps = {
  nodes: Record<CyberNodeId, NodeState>;
  lanes: Partial<Record<CyberLaneId, LaneTone | "blocked">>;
  /** 移動するもの（命令文・罠・メール・データ…） */
  payload: { stop: CyberStop; tone: LaneTone; text: string } | null;
  /** 大量アクセス（DDoS）の粒を流すレーン */
  flood: CyberLaneId[];
  damage: { at: CyberNodeId; text: string }[];
  reducedMotion: boolean;
};

const COMPANY = [
  { x: 0, y: -86 },
  { x: 86, y: -86 },
  { x: 86, y: 52 },
  { x: 0, y: 52 },
];

export function CyberScene({ nodes, lanes, payload, flood, damage, reducedMotion }: CyberSceneProps) {
  return (
    <div className={`${netStyles.scene} ${styles.scene}`} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="cyber-scene">
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="実験用の会社の模型。右奥の会社の区画にWebサーバ・データベース・社員PC、外にインターネット・利用者のブラウザ・攻撃者がいる"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(Object.keys(AT) as CyberNodeId[]).map((id) => ({ id, at: AT[id], state: nodes[id] }))}>
          <polygon points={points(COMPANY.map((p) => iso(p)))} className={styles.company} />
        </NetworkSceneBase>
        {(Object.keys(LANE) as CyberLaneId[]).map((id) => {
          const tone = lanes[id];
          if (!tone && (id === "as" || id === "sw")) return null;
          return (
            <SceneRail
              key={id}
              lane={LANE[id]}
              id={id}
              state={!tone ? "idle" : tone === "blocked" ? "blocked" : "active"}
              color={tone && tone !== "blocked" ? TONE_COLOR[tone] : "#B3C0D3"}
              chevrons={[0.5]}
            />
          );
        })}
        {flood.map((id) =>
          [0, 1, 2, 3, 4].map((k) => {
            const p = iso(along(LANE[id], 0.1 + k * 0.2, 4));
            return <circle key={`${id}-${k}`} cx={p.x} cy={p.y} r={2.4} className={styles.floodDot} style={{ "--k": k } as CSSProperties} data-flood={id} />;
          }),
        )}
        <SceneNode id="db" at={AT.db} state={nodes.db} scale={1.05}>
          <DatabaseIllustration state={nodes.db} />
        </SceneNode>
        <SceneNode id="web" at={AT.web} state={nodes.web} scale={0.78}>
          <WebServerIllustration state={nodes.web} />
        </SceneNode>
        <SceneNode id="attacker" at={AT.attacker} state={nodes.attacker} shadow={10} scale={1.15}>
          <EavesdropperIllustration state={nodes.attacker} />
        </SceneNode>
        <SceneNode id="internet" at={AT.internet} state={nodes.internet}>
          <GlobeIllustration state={nodes.internet} />
        </SceneNode>
        <SceneNode id="staff" at={AT.staff} state={nodes.staff} scale={0.82}>
          <DeskPersonIllustration who="B" state={nodes.staff} />
        </SceneNode>
        <SceneNode id="user" at={AT.user} state={nodes.user} scale={0.82}>
          <NetworkHumanIllustration state={nodes.user} />
        </SceneNode>
      </svg>

      <span className={styles.companyTag}>
        🏢 実験用の会社
      </span>

      {(Object.keys(LABEL) as CyberNodeId[]).map((id) => (
        <span
          key={id}
          className={styles.label}
          style={toPercent(LABEL[id].at)}
          data-node-label={id}
          data-state={nodes[id]}
        >
          {LABEL[id].name}
        </span>
      ))}

      {damage.map((d) => (
        <span key={d.at} className={styles.damage} style={toPercent(nudge(STOP_AT[d.at], 0, d.at === "web" ? 24 : 16))} data-damage={d.at} data-testid={`damage-${d.at}`}>
          💥 {d.text}
        </span>
      ))}

      {payload && (
        <div className={styles.payloadAnchor} style={toPercent(STOP_AT[payload.stop])} data-stop={payload.stop} data-tone={payload.tone} data-testid="cyber-payload">
          <span aria-hidden className={styles.payloadShadow} />
          <span className={styles.payload} style={{ "--tone": TONE_COLOR[payload.tone] } as CSSProperties}>
            {payload.text}
          </span>
        </div>
      )}
    </div>
  );
}

