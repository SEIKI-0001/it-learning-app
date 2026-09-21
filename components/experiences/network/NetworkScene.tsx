import type { ReactNode } from "react";
import { BrowserWindow } from "./BrowserWindow";
import { DataCapsule, type CapsuleKind } from "./DataCapsule";
import { DnsServerIllustration } from "./DnsServerIllustration";
import { NetworkHumanIllustration } from "./NetworkHumanIllustration";
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
} from "./NetworkSceneBase";
import { WebServerIllustration } from "./WebServerIllustration";
import styles from "./network.module.css";

// 人・DNS・Webサーバが同じ床に立つミニチュア空間。
// 構造（3ノードと3本のレール）は常に表示し、状態だけを props で切り替える。

export type NetworkNodeId = "user" | "dns" | "web";
export type LaneId = "query" | "response" | "web" | "page";
export type LaneState = "idle" | "active" | "blocked";
export type CapsuleStop =
  | "input"
  | "userOut"
  | "dnsIn"
  | "dnsOut"
  | "userIn"
  | "webOut"
  | "webIn"
  | "pageOut"
  | "pageIn"
  | "dnsBlocked";

const NODE_AT: Record<NetworkNodeId, WorldPoint> = {
  user: { x: -15, y: 72 },
  dns: { x: -62, y: -62 },
  web: { x: 72, y: -15 },
};

const LANE_OFFSET = 5.5;
const CAPSULE_HEIGHT = 18;

type Lane = { from: WorldPoint; to: WorldPoint };

function laneBetween(a: WorldPoint, b: WorldPoint, offset: number): Lane {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  // 進行方向に対して右側へ offset だけずらす（往路・復路を2車線に分ける）
  const ox = -uy * offset;
  const oy = ux * offset;
  return {
    from: { x: a.x + ux * PAD_RADIUS + ox, y: a.y + uy * PAD_RADIUS + oy },
    to: { x: b.x - ux * PAD_RADIUS + ox, y: b.y - uy * PAD_RADIUS + oy },
  };
}

const LANES: Record<LaneId, Lane> = {
  query: laneBetween(NODE_AT.user, NODE_AT.dns, LANE_OFFSET),
  // 復路は DNS → あなた の向き。同じ式で逆向きに引くと自然に反対車線になる。
  response: laneBetween(NODE_AT.dns, NODE_AT.user, LANE_OFFSET),
  web: laneBetween(NODE_AT.user, NODE_AT.web, LANE_OFFSET),
  // ページ本体は Webサーバ → あなた の反対車線で返ってくる
  page: laneBetween(NODE_AT.web, NODE_AT.user, LANE_OFFSET),
};

function along(lane: Lane, t: number, z = 0): WorldPoint {
  return {
    x: lane.from.x + (lane.to.x - lane.from.x) * t,
    y: lane.from.y + (lane.to.y - lane.from.y) * t,
    z,
  };
}

function nudge(p: ScreenPoint, dx: number, dy: number): ScreenPoint {
  return { x: p.x + dx, y: p.y + dy };
}

// カプセルは宛先ノードに重ならないよう、レール上の手前で止める。
const STOPS: Record<CapsuleStop, ScreenPoint> = {
  input: { x: iso(NODE_AT.user).x - 4, y: iso(NODE_AT.user).y - 84 },
  userOut: iso(along(LANES.query, 0.08, CAPSULE_HEIGHT)),
  dnsIn: iso(along(LANES.query, 0.7, CAPSULE_HEIGHT)),
  dnsOut: iso(along(LANES.response, 0.08, CAPSULE_HEIGHT)),
  // 人の頭に重ならないよう、復路の到着点だけ少し右へ逃がす
  userIn: nudge(iso(along(LANES.response, 0.46, CAPSULE_HEIGHT)), 14, 0),
  webOut: iso(along(LANES.web, 0.08, CAPSULE_HEIGHT)),
  webIn: iso(along(LANES.web, 0.66, CAPSULE_HEIGHT)),
  pageOut: iso(along(LANES.page, 0.08, CAPSULE_HEIGHT)),
  pageIn: iso(along(LANES.page, 0.6, CAPSULE_HEIGHT)),
  dnsBlocked: iso(along(LANES.query, 0.58, CAPSULE_HEIGHT)),
};

const LANE_NUMBER: Record<LaneId, string> = { query: "1", response: "2", web: "3", page: "4" };

const NODE_LABEL: Record<NetworkNodeId, { name: string; sub: string; at: ScreenPoint; align: "center" | "start" }> = {
  user: { name: "あなた", sub: "ブラウザ", at: { x: iso(NODE_AT.user).x, y: iso(NODE_AT.user).y + 24 }, align: "center" },
  dns: { name: "DNSサーバ", sub: "名前 → IP", at: { x: iso(NODE_AT.dns).x + 30, y: iso(NODE_AT.dns).y - 50 }, align: "start" },
  web: { name: "Webサーバ", sub: "93.184.216.34", at: { x: iso(NODE_AT.web).x, y: iso(NODE_AT.web).y + 24 }, align: "center" },
};

const STATUS_WORD: Partial<Record<NodeState, string>> = {
  active: "処理中",
  sending: "送信",
  error: "応答なし",
  disabled: "未接続",
};

function LaneRail({ id, state }: { id: LaneId; state: LaneState }) {
  const a = iso(LANES[id].from);
  const b = iso(LANES[id].to);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const badge = { x: a.x + (b.x - a.x) * 0.3, y: a.y + (b.y - a.y) * 0.3 };
  return (
    <g className={`${styles.lane} ${styles[`lane_${id}`]}`} data-lane={id} data-state={state}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.laneBed} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.laneTrack} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.laneFlow} />
      {/* 進行方向の矢印（路面標示）: 色に頼らず向きを示す */}
      {[0.48, 0.62, 0.76].map((t) => (
        <path
          key={t}
          d="M -2.4 -2.6 L 1.2 0 L -2.4 2.6"
          className={styles.laneChevron}
          transform={`translate(${a.x + (b.x - a.x) * t} ${a.y + (b.y - a.y) * t}) rotate(${angle})`}
        />
      ))}
      <g transform={`translate(${badge.x} ${badge.y})`} className={styles.laneBadge}>
        <circle r={4.6} />
        <text y={1.9} textAnchor="middle" fontSize={5.4} fontWeight={700}>
          {LANE_NUMBER[id]}
        </text>
      </g>
      {state === "blocked" && (
        <g transform={`translate(${mid.x} ${mid.y})`} className={styles.laneBlock}>
          <circle r={5.2} />
          <path d="M -2.2 -2.2 L 2.2 2.2 M 2.2 -2.2 L -2.2 2.2" />
        </g>
      )}
    </g>
  );
}

function SceneNode({ id, state, children }: { id: NetworkNodeId; state: NodeState; children: ReactNode }) {
  const at = iso(NODE_AT[id]);
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className={styles.node} data-node={id} data-state={state}>
        <IsoEllipse center={{ x: 0, y: 1 }} radius={17} className={styles.nodeShadow} />
        <g className={styles.nodeLift}>{children}</g>
      </g>
    </g>
  );
}

export function NetworkScene({
  nodes,
  lanes,
  capsule,
  trail,
  outage,
  reducedMotion,
  inspectOpen,
  onInspect,
  showBrowser = false,
}: {
  nodes: Record<NetworkNodeId, NodeState>;
  lanes: Record<LaneId, LaneState>;
  capsule: { kind: CapsuleKind; tag: string; payload: string; stop: CapsuleStop } | null;
  /** 最終段: ブラウザがページを表示したウィンドウを出す */
  showBrowser?: boolean;
  trail: { id: string; kind: CapsuleKind; from: CapsuleStop; to: CapsuleStop } | null;
  outage: boolean;
  reducedMotion: boolean;
  inspectOpen: boolean;
  onInspect: () => void;
}) {
  const dnsTop = iso({ ...NODE_AT.dns, z: 66 });
  return (
    <div
      className={styles.scene}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-outage={outage ? "true" : "false"}
      data-testid="network-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="あなたのPC、DNSサーバ、Webサーバが床の上に並び、3本の通信レールで結ばれたミニチュア図"
      >
        <defs>
          <radialGradient id="net-shadow">
            <stop offset="0" stopColor="#1E2A40" stopOpacity={0.32} />
            <stop offset="1" stopColor="#1E2A40" stopOpacity={0} />
          </radialGradient>
        </defs>
        <NetworkSceneBase
          pads={(Object.keys(NODE_AT) as NetworkNodeId[]).map((id) => ({
            id,
            at: NODE_AT[id],
            state: nodes[id],
          }))}
        />
        <LaneRail id="page" state={lanes.page} />
        <LaneRail id="web" state={lanes.web} />
        <LaneRail id="response" state={lanes.response} />
        <LaneRail id="query" state={lanes.query} />

        {trail && (
          <line
            key={trail.id}
            x1={STOPS[trail.from].x}
            y1={STOPS[trail.from].y}
            x2={STOPS[trail.to].x}
            y2={STOPS[trail.to].y}
            pathLength={1}
            className={`${styles.trail} ${styles[`trail_${trail.kind}`]}`}
          />
        )}

        {/* 奥から手前の順に描く */}
        <SceneNode id="dns" state={nodes.dns}>
          <DnsServerIllustration state={nodes.dns} />
        </SceneNode>
        <SceneNode id="user" state={nodes.user}>
          <NetworkHumanIllustration state={nodes.user} />
        </SceneNode>
        <SceneNode id="web" state={nodes.web}>
          <WebServerIllustration state={nodes.web} />
        </SceneNode>

        {outage && (
          <g transform={`translate(${dnsTop.x} ${dnsTop.y})`} className={styles.alarm} data-testid="dns-alarm">
            <g className={styles.alarmPulse}>
              <path d="M 0 -8 L 8 6 L -8 6 Z" />
              <path d="M 0 -3 L 0 1.6" className={styles.alarmMark} />
              <circle cy={3.8} r={0.9} className={styles.alarmDot} />
            </g>
          </g>
        )}
      </svg>

      {(Object.keys(NODE_LABEL) as NetworkNodeId[]).map((id) => {
        const label = NODE_LABEL[id];
        const status = STATUS_WORD[nodes[id]];
        return (
          <div
            key={id}
            className={`${styles.nodeLabel} ${label.align === "start" ? styles.nodeLabelStart : ""}`}
            style={toPercent(label.at)}
            data-node-label={id}
            data-state={nodes[id]}
          >
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{label.name}</span>
              {status && <span className={styles.statusChip}>{status}</span>}
            </span>
            <span className={styles.nodeLabelSub}>{label.sub}</span>
          </div>
        );
      })}

      {outage && (
        <div className={styles.faultCallout} role="status">
          <span className="font-bold">DNSタイムアウト</span>
          <span>IPアドレスが分からない</span>
        </div>
      )}

      {showBrowser && <BrowserWindow reducedMotion={reducedMotion} />}

      {capsule && (
        <DataCapsule
          kind={capsule.kind}
          tag={capsule.tag}
          payload={capsule.payload}
          at={STOPS[capsule.stop]}
          expanded={inspectOpen}
          onToggle={onInspect}
        />
      )}
    </div>
  );
}
