import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  leftFaceTransform,
  points,
  rightFaceTransform,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, laneBetween, nudge } from "../scene/IsoParts";
import styles from "./api.module.css";

// App（左手前）・API（奥の受付カウンター）・天気サービス（右、ガラスケースの中）の3点。
// 通常ルートは App → API → サービス → API → App。
// 「直接アクセス」を試すと、App からサービスへ一直線に向かうが、ガラスケースに阻まれる。

export type ApiNodeId = "app" | "api" | "svc";
export type ApiStop = "app" | "apiIn" | "svc" | "apiOut" | "appBack" | "wall";
export type ApiLaneId = "req1" | "req2" | "res1" | "res2" | "direct";

const AT: Record<ApiNodeId, WorldPoint> = {
  app: { x: -52, y: 56 },
  api: { x: -40, y: -40 },
  svc: { x: 58, y: -46 },
};

const LANE: Record<ApiLaneId, ReturnType<typeof laneBetween>> = {
  req1: laneBetween(AT.app, AT.api, 5),
  req2: laneBetween(AT.api, AT.svc, 5, 30),
  res1: laneBetween(AT.svc, AT.api, 5, 30),
  res2: laneBetween(AT.api, AT.app, 5),
  direct: laneBetween(AT.app, AT.svc, 0, 30),
};

const CAP_Z = 14;
const STOP_AT: Record<ApiStop, ScreenPoint> = {
  app: nudge(iso({ ...AT.app, z: 0 }), 22, -64),
  apiIn: iso(along(LANE.req1, 0.8, CAP_Z)),
  svc: iso(along(LANE.req2, 0.72, CAP_Z)),
  apiOut: iso(along(LANE.res1, 0.78, CAP_Z)),
  appBack: iso(along(LANE.res2, 0.72, CAP_Z)),
  wall: iso(along(LANE.direct, 0.9, CAP_Z)),
};

// ---------- 模型パーツ ----------

/** スマホ（天気アプリ）。画面は右側面（サービス側を向く面）。 */
function PhoneIllustration({ state }: { state: NodeState }) {
  const stand = isoBox({ x0: -9, x1: 9, y0: -9, y1: 9, z0: 0, z1: 4 });
  const slab = isoBox({ x0: -2, x1: 2, y0: -11, y1: 11, z0: 4, z1: 44 });
  return (
    <g data-illustration="phone">
      <polygon points={stand.left} fill="#DCE3EE" />
      <polygon points={stand.right} fill="#C8D2E1" />
      <polygon points={stand.top} fill="#EEF2F8" />
      <polygon points={slab.left} fill="#2B3242" />
      <polygon points={slab.top} fill="#3B4458" />
      <polygon points={slab.right} fill="#1F2533" />
      <g transform={rightFaceTransform(2, 11, 44)}>
        <rect x={2} y={3} width={18} height={34} rx={2} className={styles.phoneScreen} data-state={state} />
        <circle cx={11} cy={14} r={4} fill="#FCD34D" opacity={0.9} />
        <rect x={6} y={22} width={10} height={2.2} rx={1} fill="#FFFFFF" opacity={0.8} />
        <rect x={7.5} y={26} width={7} height={1.6} rx={0.8} fill="#FFFFFF" opacity={0.5} />
      </g>
    </g>
  );
}

/** API＝受付カウンター。窓口（開口）と「API」の看板だけが外に見える。 */
function CounterIllustration({ state }: { state: NodeState }) {
  const base = isoBox({ x0: -16, x1: 16, y0: -12, y1: 12, z0: 0, z1: 16 });
  const posts = [
    isoBox({ x0: -16, x1: -13, y0: -12, y1: -9, z0: 16, z1: 38 }),
    isoBox({ x0: 13, x1: 16, y0: -12, y1: -9, z0: 16, z1: 38 }),
  ];
  const sign = isoBox({ x0: -16, x1: 16, y0: -12, y1: 12, z0: 38, z1: 44 });
  return (
    <g data-illustration="api-counter">
      <polygon points={base.left} fill="#ECFDF5" />
      <polygon points={base.right} fill="#C7EEDD" />
      <polygon points={base.top} fill="#FFFFFF" stroke="#A7F3D0" strokeWidth={0.7} />
      {posts.map((p, i) => (
        <g key={i}>
          <polygon points={p.left} fill="#A7F3D0" />
          <polygon points={p.right} fill="#6EE7B7" />
        </g>
      ))}
      <polygon points={sign.left} fill="#059669" />
      <polygon points={sign.right} fill="#047857" />
      <polygon points={sign.top} fill="#10B981" />
      <g transform={leftFaceTransform(-16, 12, 44)}>
        <text x={16} y={4.9} textAnchor="middle" fontSize={4.6} fontWeight={800} letterSpacing={0.8} fill="#FFFFFF" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          API
        </text>
      </g>
      <g transform={leftFaceTransform(-16, 12, 16)}>
        {/* 受付窓口 */}
        <rect x={9} y={3} width={14} height={7} rx={1.4} fill="#065F46" opacity={0.85} />
        <circle cx={27} cy={6.5} r={1.3} className={netStyles[`led_${state}`]} />
      </g>
    </g>
  );
}

/** 天気サービス＝ガラスケースの中のサーバとDB。外からは中に手を入れられない。 */
function ServiceIllustration({ state, breach }: { state: NodeState; breach: boolean }) {
  const rack = isoBox({ x0: -12, x1: 2, y0: -10, y1: 8, z0: 0, z1: 36 });
  const db = { c: isoLocal(12, 6, 0), top: isoLocal(12, 6, 18) };
  const glass = isoBox({ x0: -24, x1: 24, y0: -22, y1: 22, z0: 0, z1: 46 });
  const port = points([isoLocal(-24, -6, 10), isoLocal(-24, 6, 10), isoLocal(-24, 6, 22), isoLocal(-24, -6, 22)]);
  return (
    <g data-illustration="service">
      <polygon points={rack.left} fill="#F6F7FA" />
      <polygon points={rack.right} fill="#DCE2EC" />
      <polygon points={rack.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.7} />
      <g transform={leftFaceTransform(-12, 8, 36)}>
        {[5, 12, 19, 26].map((y, i) => (
          <g key={y}>
            <rect x={2} y={y} width={16} height={5} rx={1} fill="#E9EDF4" stroke="#D2D9E5" strokeWidth={0.5} />
            <circle cx={4.6} cy={y + 2.5} r={1} className={netStyles[`led_${state}`]} style={{ animationDelay: `${i * 120}ms` }} />
          </g>
        ))}
      </g>
      {/* DB（円柱） */}
      <path d={`M ${db.c.x - 8} ${db.top.y} L ${db.c.x - 8} ${db.c.y} A 8 3.6 0 0 0 ${db.c.x + 8} ${db.c.y} L ${db.c.x + 8} ${db.top.y} Z`} fill="#93C5FD" />
      <ellipse cx={db.c.x} cy={db.top.y} rx={8} ry={3.6} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={0.7} />
      {/* ガラスケース（正面2面だけ描けば奥は透けて見える） */}
      <g className={styles.glass} data-breach={breach ? "true" : "false"}>
        <polygon points={glass.left} />
        <polygon points={glass.right} />
        <polygon points={glass.top} />
      </g>
      {/* API とつながる唯一の差し込み口（奥の面） */}
      <polygon points={port} className={styles.port} />
    </g>
  );
}

// ---------- シーン ----------

export type ApiSceneProps = {
  nodes: Record<ApiNodeId, NodeState>;
  lanes: Partial<Record<ApiLaneId, "active" | "blocked">>;
  capsule: { stop: ApiStop; kind: "request" | "response" | "blocked"; tag: string; payload: string } | null;
  screen: string | null;
  bypass: boolean;
  reducedMotion: boolean;
};

const LANE_COLOR: Record<ApiLaneId, string> = {
  req1: "#2F6FDB",
  req2: "#2F6FDB",
  res1: "#2F8F63",
  res2: "#2F8F63",
  direct: "#E11D48",
};

export function ApiScene({ nodes, lanes, capsule, screen, bypass, reducedMotion }: ApiSceneProps) {
  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-bypass={bypass ? "true" : "false"}
      data-testid="api-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="左手前に天気アプリのスマホ、奥にAPIの受付カウンター、右にガラスケースに入った天気サービス。アプリとサービスはAPIを通してつながっている"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(Object.keys(AT) as ApiNodeId[]).map((id) => ({ id, at: AT[id], state: nodes[id] }))} />
        {bypass && <SceneRail lane={LANE.direct} id="direct" state="blocked" color={LANE_COLOR.direct} chevrons={[0.5]} />}
        {(["req1", "req2", "res1", "res2"] as const).map((id) => (
          <SceneRail key={id} lane={LANE[id]} id={id} state={lanes[id] ?? "idle"} color={LANE_COLOR[id]} chevrons={[0.55]} />
        ))}
        <SceneNode id="api" at={AT.api} state={nodes.api}>
          <CounterIllustration state={nodes.api} />
        </SceneNode>
        <SceneNode id="svc" at={AT.svc} state={nodes.svc} shadow={24}>
          <ServiceIllustration state={nodes.svc} breach={bypass} />
        </SceneNode>
        <SceneNode id="app" at={AT.app} state={nodes.app}>
          <PhoneIllustration state={nodes.app} />
        </SceneNode>
      </svg>

      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.app), 0, 22))} data-node-label="app">
        <span className="font-bold text-gray-900">天気アプリ</span>
        <span className={netStyles.nodeLabelSub}>あなた側（App）</span>
      </div>
      <div className={`${netStyles.nodeLabel} ${netStyles.nodeLabelStart}`} style={toPercent(nudge(iso(AT.api), 26, -54))} data-node-label="api">
        <span className="font-bold text-gray-900">天気API</span>
        <span className={netStyles.nodeLabelSub}>決められた入口</span>
      </div>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.svc), 0, 30))} data-node-label="svc">
        <span className="font-bold text-gray-900">天気サービス</span>
        <span className={netStyles.nodeLabelSub}>内部（外から見えない）</span>
      </div>

      {screen && (
        <div className={styles.screen} role="status" data-testid="app-screen">
          <span className={styles.screenTitle}>📱 天気アプリ</span>
          <span className={styles.screenBody}>{screen}</span>
        </div>
      )}

      {bypass && (
        <div className={styles.denied} role="status" data-testid="bypass-denied">
          ⛔ 内部には直接入れない
          <span>入口は API だけ</span>
        </div>
      )}

      {capsule && (
        <div
          className={netStyles.capsuleAnchor}
          style={toPercent(STOP_AT[capsule.stop])}
          data-capsule-kind={capsule.kind === "request" ? "query" : capsule.kind === "response" ? "response" : "timeout"}
          data-stop={capsule.stop}
          data-testid="api-capsule"
        >
          <span aria-hidden className={netStyles.capsuleShadow} />
          <span className={`${netStyles.capsule} ${styles.capsuleStatic}`}>
            <span aria-hidden className={netStyles.capsuleCore} />
            <span className="flex min-w-0 flex-col items-start leading-none">
              <span className={netStyles.capsuleTag}>{capsule.tag}</span>
              <span className={netStyles.capsulePayload}>{capsule.payload}</span>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
