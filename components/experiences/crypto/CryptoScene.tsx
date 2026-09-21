import type { CSSProperties, ReactNode } from "react";
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
import netStyles from "../network/network.module.css";
import { CipherCapsule, type CapsuleState } from "./CipherCapsule";
import { DeskPersonIllustration, EavesdropperIllustration } from "./CryptoPeopleIllustration";
import { KeyToken } from "./KeyToken";
import styles from "./crypto.module.css";

// A（送信者）と B（受信者）が同じ床に向かい合うミニチュア空間。
// 通信は2本のレールに分ける：
//   ① 公開鍵レーン（奥）: B → A。事前準備で公開鍵だけが通る
//   ② 暗号文レーン（手前）: A → B。本番で暗号文が通る
// 秘密鍵はどのレーンにも乗らず、B の頭上に固定されたまま。

export type CryptoNodeId = "a" | "b" | "eve";
export type CryptoLaneId = "key" | "data";
export type CryptoLaneState = "idle" | "active" | "done";
export type PublicKeySpot = "bHome" | "aHome" | "aUse";
export type PrivateKeySpot = "bHome" | "bUse";
export type CapsuleStop = "aDesk" | "bDesk";

const NODE_AT: Record<CryptoNodeId, WorldPoint> = {
  a: { x: -40, y: 72 },
  b: { x: 72, y: -40 },
  eve: { x: -62, y: -62 },
};

// 奥(−x,−y) / 手前(+x,+y) へのずらし量。2本のレールを画面上で上下に分ける。
const LANE_OFFSET = 13;

type Lane = { from: WorldPoint; to: WorldPoint };

function laneBetween(a: WorldPoint, b: WorldPoint, towardFront: number): Lane {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const o = towardFront / Math.SQRT2;
  return {
    from: { x: a.x + ux * PAD_RADIUS + o, y: a.y + uy * PAD_RADIUS + o },
    to: { x: b.x - ux * PAD_RADIUS + o, y: b.y - uy * PAD_RADIUS + o },
  };
}

const LANES: Record<CryptoLaneId, Lane> = {
  key: laneBetween(NODE_AT.b, NODE_AT.a, -LANE_OFFSET),
  data: laneBetween(NODE_AT.a, NODE_AT.b, LANE_OFFSET),
};

const LANE_COLOR: Record<CryptoLaneId, string> = { key: "#16A37A", data: "#4F46E5" };
const LANE_CAPTION: Record<CryptoLaneId, string> = { key: "公開鍵", data: "暗号文" };

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

const KEY_HEIGHT = 30;
const CAPSULE_HEIGHT = 0;

// 公開鍵は①レーンの上空を移動する。秘密鍵は B の頭上から動かない（使うときだけ少し降りる）。
const PUBLIC_KEY_AT: Record<PublicKeySpot, ScreenPoint> = {
  bHome: iso(along(LANES.key, 0.08, KEY_HEIGHT)),
  aHome: iso(along(LANES.key, 0.92, KEY_HEIGHT)),
  aUse: nudge(iso(along(LANES.data, 0.12, CAPSULE_HEIGHT)), -20, -24),
};

const PRIVATE_KEY_AT: Record<PrivateKeySpot, ScreenPoint> = {
  bHome: nudge(iso({ ...NODE_AT.b, z: 0 }), 2, -84),
  bUse: nudge(iso(along(LANES.data, 0.88, CAPSULE_HEIGHT)), 22, -24),
};

const CAPSULE_AT: Record<CapsuleStop, ScreenPoint> = {
  aDesk: iso(along(LANES.data, 0.12, CAPSULE_HEIGHT)),
  bDesk: iso(along(LANES.data, 0.88, CAPSULE_HEIGHT)),
};

const EAVESDROP_AT = iso(along(LANES.data, 0.5, 0));

const NODE_LABEL: Record<CryptoNodeId, { name: string; sub: string; at: ScreenPoint }> = {
  a: { name: "Aさん", sub: "送信者", at: nudge(iso(NODE_AT.a), 0, 26) },
  b: { name: "Bさん", sub: "受信者", at: nudge(iso(NODE_AT.b), 0, 26) },
  eve: { name: "第三者", sub: "通信を盗み見", at: nudge(iso(NODE_AT.eve), -12, -30) },
};

const STATUS_WORD: Partial<Record<NodeState, string>> = {
  active: "操作中",
  sending: "送信",
  error: "失敗",
};

function Rail({ id, state }: { id: CryptoLaneId; state: CryptoLaneState }) {
  const a = iso(LANES[id].from);
  const b = iso(LANES[id].to);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <g
      className={`${netStyles.lane} ${styles.rail}`}
      style={{ "--lane": LANE_COLOR[id] } as CSSProperties}
      data-lane={id}
      data-state={state === "active" ? "active" : "idle"}
      data-rail-state={state}
    >
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`${netStyles.laneBed} ${styles.railBed}`} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneTrack} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneFlow} />
      {/* 進行方向の矢印（路面標示）: 色に頼らず向きを示す */}
      {[0.4, 0.55, 0.7].map((t) => (
        <path
          key={t}
          d="M -2.4 -2.6 L 1.2 0 L -2.4 2.6"
          className={`${netStyles.laneChevron} ${styles.railChevron}`}
          transform={`translate(${a.x + (b.x - a.x) * t} ${a.y + (b.y - a.y) * t}) rotate(${angle})`}
        />
      ))}
    </g>
  );
}

function SceneNode({ id, state, children }: { id: CryptoNodeId; state: NodeState; children: ReactNode }) {
  const at = iso(NODE_AT[id]);
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className={netStyles.node} data-node={id} data-state={state}>
        <IsoEllipse center={{ x: 0, y: 1 }} radius={id === "eve" ? 10 : 17} className={netStyles.nodeShadow} />
        <g className={netStyles.nodeLift}>
          <g transform={id === "eve" ? undefined : "scale(1.12)"}>{children}</g>
        </g>
      </g>
    </g>
  );
}

export type CryptoSceneProps = {
  nodes: Record<CryptoNodeId, NodeState>;
  lanes: Record<CryptoLaneId, CryptoLaneState>;
  publicKey: PublicKeySpot;
  privateKey: PrivateKeySpot;
  capsule: { state: CapsuleState; stop: CapsuleStop } | null;
  trail: { id: string; lane: CryptoLaneId } | null;
  /** 第三者が暗号文のコピーを取った状態 */
  intercepted: boolean;
  reducedMotion: boolean;
};

export function CryptoScene({
  nodes,
  lanes,
  publicKey,
  privateKey,
  capsule,
  trail,
  intercepted,
  reducedMotion,
}: CryptoSceneProps) {
  const pk = PUBLIC_KEY_AT[publicKey];
  const sk = PRIVATE_KEY_AT[privateKey];
  const eve = iso(NODE_AT.eve);
  const trailFrom = trail ? iso(along(LANES[trail.lane], 0.06, trail.lane === "key" ? KEY_HEIGHT : CAPSULE_HEIGHT)) : null;
  const trailTo = trail ? iso(along(LANES[trail.lane], 0.94, trail.lane === "key" ? KEY_HEIGHT : CAPSULE_HEIGHT)) : null;

  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="crypto-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="左にAさん、右にBさんがデスクで向かい合い、奥の①公開鍵レーンと手前の②暗号文レーンで結ばれたミニチュア図。奥の中央に第三者が立つ"
      >
        <defs>
          <radialGradient id="net-shadow">
            <stop offset="0" stopColor="#1E2A40" stopOpacity={0.32} />
            <stop offset="1" stopColor="#1E2A40" stopOpacity={0} />
          </radialGradient>
        </defs>
        <NetworkSceneBase
          pads={(["a", "b"] as const).map((id) => ({ id, at: NODE_AT[id], state: nodes[id] }))}
        />

        {/* 奥から手前の順に描く */}
        <SceneNode id="eve" state={nodes.eve}>
          <EavesdropperIllustration state={nodes.eve} />
        </SceneNode>

        {/* 盗聴の引き込み線（第三者 → 暗号文レーン） */}
        <line
          x1={eve.x}
          y1={eve.y - 6}
          x2={EAVESDROP_AT.x}
          y2={EAVESDROP_AT.y}
          className={styles.tapLine}
          data-active={intercepted ? "true" : "false"}
        />

        <Rail id="key" state={lanes.key} />
        <Rail id="data" state={lanes.data} />

        {trail && trailFrom && trailTo && (
          <line
            key={trail.id}
            x1={trailFrom.x}
            y1={trailFrom.y}
            x2={trailTo.x}
            y2={trailTo.y}
            pathLength={1}
            className={netStyles.trail}
            style={{ "--trail": LANE_COLOR[trail.lane] } as CSSProperties}
          />
        )}

        <SceneNode id="a" state={nodes.a}>
          <DeskPersonIllustration who="A" state={nodes.a} />
        </SceneNode>
        <SceneNode id="b" state={nodes.b}>
          <DeskPersonIllustration who="B" state={nodes.b} />
        </SceneNode>

      </svg>

      {(Object.keys(NODE_LABEL) as CryptoNodeId[]).map((id) => {
        const label = NODE_LABEL[id];
        const status = STATUS_WORD[nodes[id]];
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

      {(["key", "data"] as const).map((id) => {
        const a = iso(LANES[id].from);
        const b = iso(LANES[id].to);
        const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (id === "key" ? -11 : 18) };
        return (
          <span
            key={id}
            className={styles.railCaption}
            style={{ ...toPercent(at), "--lane": LANE_COLOR[id] } as CSSProperties}
            data-rail-caption={id}
            data-state={lanes[id]}
          >
            {id === "key" ? "①" : "②"} {LANE_CAPTION[id]}
            <span aria-hidden>{id === "key" ? " ◀" : " ▶"}</span>
          </span>
        );
      })}

      {intercepted && (
        <div className={styles.eveCallout} role="status" data-testid="eve-callout">
          <CipherCapsule state="failed" label="第三者が取った暗号文のコピー" />
          <ul className={styles.eveFacts}>
            <li>暗号文は見える</li>
            <li>公開鍵では開かない</li>
            <li>秘密鍵を持っていない</li>
          </ul>
        </div>
      )}

      <KeyToken
        kind="private"
        at={toPercent(sk)}
        spot={privateKey}
        caption={privateKey === "bHome" ? "Bだけが保持" : undefined}
        emphasis={privateKey === "bUse"}
      />
      <KeyToken kind="public" at={toPercent(pk)} spot={publicKey} emphasis={publicKey === "aUse"} />

      {capsule && (
        <CipherCapsule
          state={capsule.state}
          at={toPercent(CAPSULE_AT[capsule.stop])}
          label={
            capsule.state === "encrypted"
              ? "暗号化されたメッセージ"
              : capsule.state === "decrypted"
                ? "復号されたメッセージ：会議は10時"
                : "平文のメッセージ：会議は10時"
          }
        />
      )}
    </div>
  );
}
