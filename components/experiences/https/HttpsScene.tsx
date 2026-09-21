import type { CSSProperties, ReactNode } from "react";
import { CipherCapsule, type CapsuleState } from "../crypto/CipherCapsule";
import { EavesdropperIllustration } from "../crypto/CryptoPeopleIllustration";
import { NetworkHumanIllustration } from "../network/NetworkHumanIllustration";
import {
  IsoEllipse,
  NetworkSceneBase,
  PAD_RADIUS,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import { WebServerIllustration } from "../network/WebServerIllustration";
import cryptoStyles from "../crypto/crypto.module.css";
import netStyles from "../network/network.module.css";
import styles from "./https.module.css";

// あなた（左手前）→ 通信路 → Webサーバ（右奥）。通信路の奥に盗聴者が立つ。
// 通信方式（HTTP / HTTPS）で変わるのは「通信路の包み（TLSトンネル）」と「カプセルの見た目」だけ。
// 人・サーバ・盗聴者・カプセルの位置は同じにして、同じデータの見え方の差だけが目に入るようにする。

export type HttpsMode = "http" | "https";
export type HttpsNodeId = "user" | "web" | "eve";
export type HttpsCapsuleStop = "desk" | "out" | "middle" | "arrived";

const NODE_AT: Record<HttpsNodeId, WorldPoint> = {
  user: { x: -40, y: 72 },
  web: { x: 72, y: -40 },
  eve: { x: -62, y: -62 },
};

const LANE = (() => {
  const a = NODE_AT.user;
  const b = NODE_AT.web;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  return {
    from: { x: a.x + ux * PAD_RADIUS, y: a.y + uy * PAD_RADIUS },
    to: { x: b.x - ux * PAD_RADIUS, y: b.y - uy * PAD_RADIUS },
  };
})();

function along(t: number, z = 0): WorldPoint {
  return { x: LANE.from.x + (LANE.to.x - LANE.from.x) * t, y: LANE.from.y + (LANE.to.y - LANE.from.y) * t, z };
}

function nudge(p: ScreenPoint, dx: number, dy: number): ScreenPoint {
  return { x: p.x + dx, y: p.y + dy };
}

const CAPSULE_HEIGHT = 10;

const CAPSULE_AT: Record<HttpsCapsuleStop, ScreenPoint> = {
  desk: nudge(iso({ ...NODE_AT.user, z: 0 }), 10, -94),
  out: iso(along(0.1, CAPSULE_HEIGHT)),
  middle: iso(along(0.5, CAPSULE_HEIGHT)),
  arrived: nudge(iso(along(0.94, CAPSULE_HEIGHT)), 0, -2),
};

const TAP_AT = iso(along(0.5, 0));

const NODE_LABEL: Record<HttpsNodeId, { name: string; sub: string; at: ScreenPoint }> = {
  user: { name: "あなた", sub: "ログイン入力", at: nudge(iso(NODE_AT.user), 0, 26) },
  web: { name: "Webサーバ", sub: "正規の宛先", at: nudge(iso(NODE_AT.web), 0, 26) },
  eve: { name: "盗聴者", sub: "通信路を盗み見", at: nudge(iso(NODE_AT.eve), 14, -38) },
};

const STATUS_WORD: Record<HttpsNodeId, Partial<Record<NodeState, string>>> = {
  user: { active: "入力中", sending: "送信" },
  web: { active: "受信" },
  eve: { error: "盗聴中" },
};

function SceneNode({ id, state, children }: { id: HttpsNodeId; state: NodeState; children: ReactNode }) {
  const at = iso(NODE_AT[id]);
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className={netStyles.node} data-node={id} data-state={state}>
        <IsoEllipse center={{ x: 0, y: 1 }} radius={id === "eve" ? 10 : 17} className={netStyles.nodeShadow} />
        <g className={netStyles.nodeLift}>
          <g transform={id === "user" ? "scale(1.12)" : undefined}>{children}</g>
        </g>
      </g>
    </g>
  );
}

export type HttpsSceneProps = {
  mode: HttpsMode;
  nodes: Record<HttpsNodeId, NodeState>;
  laneActive: boolean;
  capsule: { stop: HttpsCapsuleStop; state: CapsuleState; tag: string; body: string; label: string };
  /** 盗聴者の画面に映っている内容（null=まだ取れていない） */
  eveSees: string | null;
  trail: string | null;
  reducedMotion: boolean;
};

export function HttpsScene({ mode, nodes, laneActive, capsule, eveSees, trail, reducedMotion }: HttpsSceneProps) {
  const a = iso(LANE.from);
  const b = iso(LANE.to);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const eve = iso(NODE_AT.eve);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const laneColor = mode === "https" ? "#16A37A" : "#E11D48";

  return (
    <div
      className={`${netStyles.scene} ${cryptoStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-mode={mode}
      data-testid="https-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label={
          mode === "https"
            ? "左手前のあなたから右奥のWebサーバへ、暗号のトンネルに包まれた通信路。奥の盗聴者が通信路に線をつないでいる"
            : "左手前のあなたから右奥のWebサーバへ、むき出しの通信路。奥の盗聴者が通信路に線をつないでいる"
        }
      >
        <defs>
          <radialGradient id="net-shadow">
            <stop offset="0" stopColor="#1E2A40" stopOpacity={0.32} />
            <stop offset="1" stopColor="#1E2A40" stopOpacity={0} />
          </radialGradient>
        </defs>
        <NetworkSceneBase
          pads={(["user", "web"] as const).map((id) => ({ id, at: NODE_AT[id], state: nodes[id] }))}
        />

        <SceneNode id="eve" state={nodes.eve}>
          <EavesdropperIllustration state={nodes.eve} />
        </SceneNode>

        <line
          x1={eve.x}
          y1={eve.y - 6}
          x2={TAP_AT.x}
          y2={TAP_AT.y}
          className={styles.tapLine}
          data-active={eveSees ? "true" : "false"}
        />

        <g
          className={netStyles.lane}
          style={{ "--lane": laneColor } as CSSProperties}
          data-lane="request"
          data-state={laneActive ? "active" : "idle"}
        >
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneBed} />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneTrack} />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneFlow} />
          {[0.3, 0.7].map((t) => (
            <path
              key={t}
              d="M -2.4 -2.6 L 1.2 0 L -2.4 2.6"
              className={netStyles.laneChevron}
              transform={`translate(${a.x + (b.x - a.x) * t} ${a.y + (b.y - a.y) * t}) rotate(${angle})`}
            />
          ))}
        </g>

        {/* TLS トンネル：HTTPS のときだけ通信路を包む半透明の管 */}
        <g className={styles.tunnel} data-on={mode === "https" ? "true" : "false"} data-testid="tls-tunnel">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.tunnelTube} />
          <line x1={a.x} y1={a.y - 4.5} x2={b.x} y2={b.y - 4.5} className={styles.tunnelHighlight} />
          <g transform={`translate(${mid.x + 16} ${mid.y + 16})`} className={styles.tunnelBadge}>
            <rect x={-15} y={-6} width={30} height={12} rx={6} />
            <text x={0} y={2.8} textAnchor="middle">
              TLS
            </text>
          </g>
        </g>

        {trail && (
          <line
            key={trail}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            pathLength={1}
            className={netStyles.trail}
            style={{ "--trail": laneColor } as CSSProperties}
          />
        )}

        <SceneNode id="web" state={nodes.web}>
          <WebServerIllustration state={nodes.web} />
        </SceneNode>
        <SceneNode id="user" state={nodes.user}>
          <NetworkHumanIllustration state={nodes.user} />
        </SceneNode>
      </svg>

      {(Object.keys(NODE_LABEL) as HttpsNodeId[]).map((id) => {
        const label = NODE_LABEL[id];
        const status = STATUS_WORD[id][nodes[id]];
        return (
          <div
            key={id}
            className={`${netStyles.nodeLabel} ${id === "eve" ? `${netStyles.nodeLabelStart} ${styles.eveLabel}` : ""}`}
            style={toPercent(label.at)}
            data-node-label={id}
            data-state={nodes[id]}
          >
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{label.name}</span>
              {status && <span className={netStyles.statusChip}>{status}</span>}
            </span>
            <span className={netStyles.nodeLabelSub}>{label.sub}</span>
          </div>
        );
      })}

      <span className={styles.modePlate} data-mode={mode} data-testid="https-mode-plate">
        {mode === "https" ? "https://  🔒" : "http://  ⚠︎"}
      </span>

      {eveSees !== null && (
        <div className={styles.eveScreen} data-mode={mode} role="status" data-testid="eve-screen">
          <span className={styles.eveScreenTitle}>盗聴者の画面</span>
          <span className={styles.eveScreenBody}>{eveSees}</span>
          <span className={styles.eveScreenVerdict}>{mode === "https" ? "読めない" : "読めた！"}</span>
        </div>
      )}

      <CipherCapsule
        state={capsule.state}
        at={toPercent(CAPSULE_AT[capsule.stop])}
        tag={capsule.tag}
        body={capsule.body}
        label={capsule.label}
      />
    </div>
  );
}
