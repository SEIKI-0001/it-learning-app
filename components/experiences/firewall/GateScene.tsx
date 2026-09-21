import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  leftFaceTransform,
  points,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import { WebServerIllustration } from "../network/WebServerIllustration";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, laneBetween, nudge } from "../scene/IsoParts";
import styles from "./firewall.module.css";

// Internet → Firewall → WAF → Webアプリ を1本の道路に並べた模型。
// FW と WAF は道路をまたぐ「門」。通信（パケット）は宛先ポートと中身の2区画を持ち、
// FW ではポート側、WAF では中身側だけが光る＝「見るものが違う」ことを形で示す。

export type GateId = "fw" | "waf";
export type PacketStop = "src" | "fw" | "waf" | "app";
export type Inspect = "port" | "body" | null;

const ROAD_X = 4;
const AT = {
  internet: { x: ROAD_X, y: 74 },
  fw: { x: ROAD_X, y: 30 },
  waf: { x: ROAD_X, y: -14 },
  app: { x: ROAD_X, y: -64 },
} satisfies Record<string, WorldPoint>;

const ROAD = laneBetween(AT.internet, AT.app, 0, 22);

const PACKET_Z = 10;
const PACKET_AT: Record<PacketStop, ScreenPoint> = {
  src: iso({ x: ROAD_X, y: 62, z: PACKET_Z + 6 }),
  fw: iso({ x: ROAD_X, y: 48, z: PACKET_Z }),
  waf: iso({ x: ROAD_X, y: 6, z: PACKET_Z }),
  app: iso({ x: ROAD_X, y: -38, z: PACKET_Z }),
};

// ---------- 模型パーツ ----------

function GlobeIllustration() {
  const c = isoLocal(0, 0, 26);
  return (
    <g data-illustration="internet">
      <polygon points={isoBox({ x0: -5, x1: 5, y0: -5, y1: 5, z0: 0, z1: 3 }).left} fill="#CBD4E1" />
      <polygon points={isoBox({ x0: -5, x1: 5, y0: -5, y1: 5, z0: 0, z1: 3 }).right} fill="#B8C3D4" />
      <polygon points={isoBox({ x0: -5, x1: 5, y0: -5, y1: 5, z0: 0, z1: 3 }).top} fill="#E3E8F0" />
      <line x1={0} y1={-3} x2={c.x} y2={c.y + 10} stroke="#AEB9CA" strokeWidth={2} />
      <circle cx={c.x} cy={c.y} r={13} fill="url(#fw-globe)" stroke="#5B8DEF" strokeWidth={0.8} />
      <g fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={0.8}>
        <ellipse cx={c.x} cy={c.y} rx={5.5} ry={13} />
        <line x1={c.x - 13} y1={c.y} x2={c.x + 13} y2={c.y} />
        <path d={`M ${c.x - 11} ${c.y - 6.5} Q ${c.x} ${c.y - 4} ${c.x + 11} ${c.y - 6.5}`} />
        <path d={`M ${c.x - 11} ${c.y + 6.5} Q ${c.x} ${c.y + 9} ${c.x + 11} ${c.y + 6.5}`} />
      </g>
    </g>
  );
}

const GATE_HALF = 18;
const GATE_H = 30;

/** 道路をまたぐ門。FW=通行ゲート（盾マーク）、WAF=検査アーチ（スキャン光）。 */
function GateIllustration({ kind, state }: { kind: GateId; state: NodeState }) {
  const tone =
    kind === "fw"
      ? { face: "#E0E7FF", side: "#C7D2FE", top: "#EEF2FF", ink: "#4338CA", name: "FIREWALL" }
      : { face: "#D1FAE5", side: "#A7F3D0", top: "#ECFDF5", ink: "#047857", name: "WAF" };
  const pillar = (x0: number) => isoBox({ x0, x1: x0 + 6, y0: -3, y1: 3, z0: 0, z1: GATE_H - 6 });
  const left = pillar(-GATE_HALF);
  const right = pillar(GATE_HALF - 6);
  const lintel = isoBox({ x0: -GATE_HALF, x1: GATE_HALF, y0: -3, y1: 3, z0: GATE_H - 6, z1: GATE_H });
  const opening = points([
    isoLocal(-GATE_HALF + 6, 0, 1),
    isoLocal(GATE_HALF - 6, 0, 1),
    isoLocal(GATE_HALF - 6, 0, GATE_H - 6),
    isoLocal(-GATE_HALF + 6, 0, GATE_H - 6),
  ]);
  const bar = isoBox({ x0: -GATE_HALF + 6, x1: GATE_HALF - 6, y0: -1.2, y1: 1.2, z0: 9, z1: 12 });
  return (
    <g data-illustration={`gate-${kind}`}>
      {/* 門の開口部：WAF はスキャン光、FW は薄い格子 */}
      <polygon
        points={opening}
        className={kind === "waf" ? styles.scanBeam : styles.fwField}
        data-state={state}
      />
      {[left, right].map((p, i) => (
        <g key={i}>
          <polygon points={p.left} fill={tone.face} />
          <polygon points={p.right} fill={tone.side} />
          <polygon points={p.top} fill={tone.top} />
        </g>
      ))}
      <polygon points={lintel.left} fill={tone.face} stroke={tone.side} strokeWidth={0.5} />
      <polygon points={lintel.right} fill={tone.side} />
      <polygon points={lintel.top} fill={tone.top} stroke={tone.side} strokeWidth={0.5} />
      <g transform={leftFaceTransform(-GATE_HALF, 3, GATE_H)}>
        <text
          x={GATE_HALF}
          y={4.6}
          textAnchor="middle"
          fontSize={4}
          fontWeight={800}
          letterSpacing={0.6}
          fill={tone.ink}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {tone.name}
        </text>
      </g>
      {/* 遮断したときに下りるバー */}
      <g className={styles.gateBar} data-down={state === "error" ? "true" : "false"}>
        <polygon points={bar.left} fill="#F43F5E" />
        <polygon points={bar.right} fill="#BE123C" />
        <polygon points={bar.top} fill="#FDA4AF" />
      </g>
    </g>
  );
}

// ---------- シーン ----------

export type GateVerdict = { state: "pass" | "block"; text: string } | null;

export type GateSceneProps = {
  sender: string;
  packet: { stop: PacketStop; port: string; body: string; inspect: Inspect; blocked: boolean; kind: "normal" | "attack" };
  gates: Record<GateId, { state: NodeState; verdict: GateVerdict }>;
  appState: NodeState;
  roadState: "idle" | "active" | "blocked";
  reducedMotion: boolean;
};

const LABEL_AT = {
  internet: nudge(iso(AT.internet), -34, 20),
  fw: nudge(iso(AT.fw), 34, 16),
  waf: nudge(iso(AT.waf), -104, -66),
  app: nudge(iso(AT.app), 44, 8),
};

export function GateScene({ sender, packet, gates, appState, roadState, reducedMotion }: GateSceneProps) {
  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="gate-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="手前のインターネットから奥のWebアプリへ1本の道路。途中にファイアウォールの門とWAFの検査アーチが順に立っている"
      >
        <SceneDefs />
        <defs>
          <radialGradient id="fw-globe" cx="0.35" cy="0.3">
            <stop offset="0" stopColor="#DBEAFE" />
            <stop offset="0.6" stopColor="#6FA0F2" />
            <stop offset="1" stopColor="#3F6FD1" />
          </radialGradient>
        </defs>
        <NetworkSceneBase
          pads={[
            { id: "internet", at: AT.internet, state: "idle" },
            { id: "app", at: AT.app, state: appState },
          ]}
        />
        <SceneRail lane={ROAD} id="road" state={roadState} color="#4F46E5" chevrons={[0.12, 0.5, 0.86]} />
        {/* 奥から手前の順に描く */}
        <SceneNode id="app" at={AT.app} state={appState}>
          <WebServerIllustration state={appState} />
        </SceneNode>
        <SceneNode id="waf" at={AT.waf} state={gates.waf.state} shadow={20}>
          <GateIllustration kind="waf" state={gates.waf.state} />
        </SceneNode>
        <SceneNode id="fw" at={AT.fw} state={gates.fw.state} shadow={20}>
          <GateIllustration kind="fw" state={gates.fw.state} />
        </SceneNode>
        <SceneNode id="internet" at={AT.internet} state="idle" shadow={12}>
          <GlobeIllustration />
        </SceneNode>
      </svg>

      <div className={netStyles.nodeLabel} style={toPercent(LABEL_AT.internet)} data-node-label="internet">
        <span className="font-bold text-gray-900">インターネット</span>
        <span className={netStyles.nodeLabelSub}>送信元：{sender}</span>
      </div>
      {(["fw", "waf"] as const).map((id) => {
        const verdict = gates[id].verdict;
        return (
          <div
            key={id}
            className={`${netStyles.nodeLabel} ${netStyles.nodeLabelStart} ${styles.gateLabel}`}
            style={toPercent(LABEL_AT[id])}
            data-gate-label={id}
            data-verdict={verdict?.state ?? "none"}
          >
            <span className="font-bold text-gray-900">{id === "fw" ? "ファイアウォール" : "WAF"}</span>
            <span className={styles.looksAt} data-looks={id === "fw" ? "port" : "body"}>
              見る：{id === "fw" ? "IP・ポート" : "通信の中身"}
            </span>
            {verdict && (
              <span className={styles.verdict} data-state={verdict.state} data-testid={`verdict-${id}`}>
                {verdict.state === "pass" ? "✅" : "⛔"} {verdict.text}
              </span>
            )}
          </div>
        );
      })}
      <div className={`${netStyles.nodeLabel} ${styles.appLabel}`} style={toPercent(LABEL_AT.app)} data-node-label="app">
        <span className="font-bold text-gray-900">Webアプリ</span>
        <span className={netStyles.nodeLabelSub}>
          {appState === "active" ? "✅ 正常に到達" : "守る対象"}
        </span>
      </div>

      <div
        className={styles.packetAnchor}
        style={toPercent(PACKET_AT[packet.stop])}
        data-stop={packet.stop}
        data-blocked={packet.blocked ? "true" : "false"}
        data-kind={packet.kind}
        data-testid="packet"
      >
        <span aria-hidden className={styles.packetShadow} />
        <span className={styles.packet} data-inspect={packet.inspect ?? "none"}>
          <span className={styles.packetPort} data-lit={packet.inspect === "port" ? "true" : "false"}>
            <span className={styles.packetKey}>ポート</span>
            {packet.port}
          </span>
          <span className={styles.packetBody} data-lit={packet.inspect === "body" ? "true" : "false"}>
            <span className={styles.packetKey}>中身</span>
            {packet.body}
          </span>
          {packet.blocked && (
            <span className={styles.packetStop} aria-label="遮断">
              ⛔
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

