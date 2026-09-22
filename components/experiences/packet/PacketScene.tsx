import type { CSSProperties } from "react";
import { DeskPersonIllustration } from "../crypto/CryptoPeopleIllustration";
import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, laneBetween, nudge, type Lane } from "../scene/IsoParts";
import styles from "./packet.module.css";

// 送信者（左）と受信者（右）の間に、3台のルータで3本の道があるネットワーク模型。
// 「HELLO WORLD」を4つのパケット（番号・宛先・データ）に分け、それぞれ別の道を通す。
// 届く順番は入れ替わる（1→3→2→4）が、受信側は番号を見て並べ直し、元のデータに戻す。

export type PacketNodeId = "sender" | "rTop" | "rMid" | "rBot" | "receiver";
export type RouteId = "top" | "mid" | "bot";

const AT: Record<PacketNodeId, WorldPoint> = {
  sender: { x: -62, y: 62 },
  rTop: { x: -40, y: -40 },
  rMid: { x: 0, y: 0 },
  rBot: { x: 40, y: 40 },
  receiver: { x: 62, y: -62 },
};

const ROUTER_OF: Record<RouteId, PacketNodeId> = { top: "rTop", mid: "rMid", bot: "rBot" };
export const ROUTE_COLOR: Record<RouteId, string> = { top: "#2F6FDB", mid: "#7C3AED", bot: "#D97706" };

const LANES: Record<RouteId, [Lane, Lane]> = {
  top: [laneBetween(AT.sender, AT.rTop, 0, 24), laneBetween(AT.rTop, AT.receiver, 0, 24)],
  mid: [laneBetween(AT.sender, AT.rMid, 0, 24), laneBetween(AT.rMid, AT.receiver, 0, 24)],
  bot: [laneBetween(AT.sender, AT.rBot, 0, 24), laneBetween(AT.rBot, AT.receiver, 0, 24)],
};

/** パケットの居場所：送信側の積み場 / 経路の途中（道・区間・進み具合）/ 受信側のトレイ（何段目か） */
export type PacketSpot =
  | { kind: "stack"; slot: number }
  | { kind: "road"; route: RouteId; leg: 0 | 1; t: number }
  | { kind: "tray"; slot: number };

function spotAt(spot: PacketSpot): ScreenPoint {
  if (spot.kind === "stack") return { x: 46, y: 34 + spot.slot * 19 };
  if (spot.kind === "tray") return { x: 256, y: 34 + spot.slot * 19 };
  return nudge(iso(along(LANES[spot.route][spot.leg], spot.t, 10)), 0, -6);
}

// ---------- 模型パーツ ----------

/** ルータ：平たい箱＋アンテナ2本。 */
function RouterIllustration({ state, color }: { state: NodeState; color: string }) {
  const b = isoBox({ x0: -12, x1: 12, y0: -9, y1: 9, z0: 0, z1: 8 });
  const a1 = isoLocal(-7, -6, 8);
  const a2 = isoLocal(7, -6, 8);
  return (
    <g data-illustration="router">
      <line x1={a1.x} y1={a1.y} x2={a1.x - 2} y2={a1.y - 12} stroke="#5B6474" strokeWidth={1.4} strokeLinecap="round" />
      <line x1={a2.x} y1={a2.y} x2={a2.x + 2} y2={a2.y - 12} stroke="#5B6474" strokeWidth={1.4} strokeLinecap="round" />
      <polygon points={b.left} fill="#F3F4F8" />
      <polygon points={b.right} fill="#D9DEE8" />
      <polygon points={b.top} fill="#FFFFFF" stroke={color} strokeOpacity={0.6} strokeWidth={1} />
      {[0, 1, 2].map((i) => {
        const p = isoLocal(-12, -3 + i * 4, 4);
        return <circle key={i} cx={p.x + 4} cy={p.y + 3} r={1} className={netStyles[`led_${state}`]} style={{ animationDelay: `${i * 150}ms` }} />;
      })}
    </g>
  );
}

// ---------- シーン ----------

export type PacketView = {
  no: number;
  data: string;
  route: RouteId;
  spot: PacketSpot;
  /** 到着した順番（受信トレイで表示） */
  arrived?: number;
};

export type PacketSceneProps = {
  nodes: Record<PacketNodeId, NodeState>;
  routes: Partial<Record<RouteId, "active">>;
  /** 分割前のひとかたまりのデータ（null=もう分割した） */
  whole: string | null;
  packets: PacketView[];
  trayMode: "arrival" | "sorted" | null;
  restored: string | null;
  reducedMotion: boolean;
};

const show = (s: string) => s.replace(/ /g, "␣");

export function PacketScene({ nodes, routes, whole, packets, trayMode, restored, reducedMotion }: PacketSceneProps) {
  return (
    <div className={`${netStyles.scene} ${styles.scene}`} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="packet-scene">
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="左手前に送信者、右奥に受信者。間に3台のルータがあり、上・中・下の3本の経路でつながっている"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(Object.keys(AT) as PacketNodeId[]).map((id) => ({ id, at: AT[id], state: nodes[id] }))} />
        {(Object.keys(LANES) as RouteId[]).map((r) =>
          LANES[r].map((lane, i) => <SceneRail key={`${r}-${i}`} lane={lane} id={`${r}-${i}`} state={routes[r] ?? "idle"} color={ROUTE_COLOR[r]} chevrons={[0.5]} />),
        )}
        {(["rTop", "rMid", "rBot"] as const).map((id) => (
          <SceneNode key={id} id={id} at={AT[id]} state={nodes[id]} shadow={14}>
            <RouterIllustration state={nodes[id]} color={ROUTE_COLOR[id === "rTop" ? "top" : id === "rMid" ? "mid" : "bot"]} />
          </SceneNode>
        ))}
        <SceneNode id="receiver" at={AT.receiver} state={nodes.receiver}>
          <DeskPersonIllustration who="B" state={nodes.receiver} />
        </SceneNode>
        <SceneNode id="sender" at={AT.sender} state={nodes.sender}>
          <DeskPersonIllustration who="A" state={nodes.sender} />
        </SceneNode>
      </svg>

      <span className={styles.nodeTag} style={toPercent(nudge(iso(AT.sender), 0, 22))}>
        送信者
      </span>
      <span className={styles.nodeTag} style={toPercent(nudge(iso(AT.receiver), 0, 22))}>
        受信者（宛先 B）
      </span>
      {(Object.keys(ROUTER_OF) as RouteId[]).map((r) => (
        <span key={r} className={styles.routerTag} style={{ ...toPercent(nudge(iso(AT[ROUTER_OF[r]]), 0, 14)), "--route": ROUTE_COLOR[r] } as CSSProperties}>
          ルータ
        </span>
      ))}

      {trayMode && (
        <span className={styles.trayHead} data-mode={trayMode} data-testid="tray-head">
          {trayMode === "arrival" ? "届いた順" : "番号順に並べ直し"}
        </span>
      )}

      {whole && (
        <div className={styles.whole} style={toPercent(nudge(iso(AT.sender), 10, -76))} data-testid="packet-whole">
          <span className={styles.wholeTag}>送るデータ</span>
          <span className={styles.wholeBody}>{whole}</span>
        </div>
      )}

      {packets.map((p) => (
        <div
          key={p.no}
          className={styles.packetAnchor}
          style={{ ...toPercent(spotAt(p.spot)), "--route": ROUTE_COLOR[p.route] } as CSSProperties}
          data-packet={p.no}
          data-spot={p.spot.kind}
          data-slot={p.spot.kind === "road" ? undefined : p.spot.slot}
          data-testid={`packet-${p.no}`}
          role="img"
          aria-label={`パケット${p.no}番：宛先B、データ「${p.data}」${p.arrived ? `、${p.arrived}番目に到着` : ""}`}
        >
          <span className={styles.packet}>
            <span className={styles.pNo}>#{p.no}</span>
            <span className={styles.pTo}>→B</span>
            <span className={styles.pData}>{show(p.data)}</span>
          </span>
          {p.arrived && trayMode === "arrival" && <span className={styles.arrived}>着{p.arrived}</span>}
        </div>
      ))}

      {restored && (
        <div className={styles.restored} role="status" data-testid="packet-restored">
          <span>復元</span>
          {restored}
        </div>
      )}
    </div>
  );
}
