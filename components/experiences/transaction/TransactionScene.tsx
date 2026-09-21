import type { CSSProperties, ReactNode } from "react";
import {
  IsoEllipse,
  NetworkSceneBase,
  PAD_RADIUS,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  leftFaceTransform,
  rightFaceTransform,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import styles from "./transaction.module.css";

// 口座A（左）→ Transaction Engine（中央奥）→ 口座B（右）の銀行処理模型。
// 500円は「移動する金額オブジェクト」として描き、残高は各口座の札に大きく出す。
// 見せたいのは中間状態：A だけ減って B はまだ、という「片方だけ更新」の危うさ。

export type TxNodeId = "a" | "engine" | "b";
export type TxLaneId = "debit" | "credit";
export type MoneySpot = "a" | "engine" | "b";
export type MoneyState = "pending" | "settled" | "returning" | "crashed";

const NODE_AT: Record<TxNodeId, WorldPoint> = {
  a: { x: -34, y: 66 },
  engine: { x: -10, y: -10 },
  b: { x: 66, y: -34 },
};

type Lane = { from: WorldPoint; to: WorldPoint };

function laneBetween(a: WorldPoint, b: WorldPoint): Lane {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  return {
    from: { x: a.x + ux * PAD_RADIUS, y: a.y + uy * PAD_RADIUS },
    to: { x: b.x - ux * PAD_RADIUS, y: b.y - uy * PAD_RADIUS },
  };
}

const LANES: Record<TxLaneId, Lane> = {
  debit: laneBetween(NODE_AT.a, NODE_AT.engine),
  credit: laneBetween(NODE_AT.engine, NODE_AT.b),
};

function nudge(p: ScreenPoint, dx: number, dy: number): ScreenPoint {
  return { x: p.x + dx, y: p.y + dy };
}

const MONEY_AT: Record<MoneySpot, ScreenPoint> = {
  a: nudge(iso(NODE_AT.a), 0, -70),
  engine: nudge(iso(NODE_AT.engine), 0, -72),
  b: nudge(iso(NODE_AT.b), 0, -70),
};

const LANE_COLOR = "#4F46E5";

// ---------- 模型パーツ ----------

const VAULT = { W: 13, D: 13, H: 30 };
const vaultBox = isoBox({ x0: -VAULT.W, x1: VAULT.W, y0: -VAULT.D, y1: VAULT.D, z0: 0, z1: VAULT.H });

function VaultIllustration({ who, state }: { who: "A" | "B"; state: NodeState }) {
  const tint = who === "A" ? { face: "#EEF2FF", side: "#D4DBF7", ink: "#4338CA" } : { face: "#ECFDF5", side: "#CBEBDD", ink: "#047857" };
  return (
    <g data-illustration={`vault-${who}`}>
      <polygon points={vaultBox.left} fill={tint.face} />
      <polygon points={vaultBox.right} fill={tint.side} />
      <polygon points={vaultBox.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.8} />
      <g transform={leftFaceTransform(-VAULT.W, VAULT.D, VAULT.H)}>
        {/* 金庫の扉＋ダイヤル */}
        <rect x={3} y={3} width={24} height={24} rx={2.4} fill="#FFFFFF" stroke={tint.ink} strokeOpacity={0.35} strokeWidth={0.8} />
        <circle cx={15} cy={15} r={6} fill="none" stroke={tint.ink} strokeWidth={1.2} />
        <circle cx={15} cy={15} r={1.6} fill={tint.ink} />
        <line x1={15} y1={9} x2={15} y2={11} stroke={tint.ink} strokeWidth={1} />
        <text x={5} y={8.2} fontSize={4.6} fontWeight={800} fill={tint.ink}>
          {who}
        </text>
      </g>
      <g transform={rightFaceTransform(VAULT.W, VAULT.D, VAULT.H)}>
        <circle cx={22} cy={8} r={1.3} className={netStyles[`led_${state}`]} />
      </g>
    </g>
  );
}

const ENGINE = { W: 17, D: 17, H: 26 };
const engineBox = isoBox({ x0: -ENGINE.W, x1: ENGINE.W, y0: -ENGINE.D, y1: ENGINE.D, z0: 0, z1: ENGINE.H });

function EngineIllustration({ state }: { state: NodeState }) {
  return (
    <g data-illustration="tx-engine">
      <polygon points={engineBox.left} fill="#3B4458" />
      <polygon points={engineBox.right} fill="#2B3242" />
      <polygon points={engineBox.top} fill="#56607A" stroke="#6B7690" strokeWidth={0.7} />
      <g transform={leftFaceTransform(-ENGINE.W, ENGINE.D, ENGINE.H)}>
        <rect x={3} y={3} width={28} height={9} rx={1.6} fill="#1F2533" />
        <text x={5} y={9.6} fontSize={5} fontWeight={800} letterSpacing={0.5} fill="#A5B4FC" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          TX
        </text>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={19 + i * 4.2} cy={7.5} r={1.2} className={netStyles[`led_${state}`]} style={{ animationDelay: `${i * 140}ms` }} />
        ))}
        <rect x={3} y={15} width={28} height={2} rx={1} fill="#4A5367" />
        <rect x={3} y={19} width={20} height={2} rx={1} fill="#4A5367" />
      </g>
      {/* 天面の投入口 */}
      <polygon points={isoBox({ x0: -8, x1: 8, y0: -2, y1: 2, z0: ENGINE.H, z1: ENGINE.H + 0.6 }).top} fill="#1F2533" />
    </g>
  );
}

function SceneNode({ id, state, children }: { id: TxNodeId; state: NodeState; children: ReactNode }) {
  const at = iso(NODE_AT[id]);
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className={netStyles.node} data-node={id} data-state={state}>
        <IsoEllipse center={{ x: 0, y: 1 }} radius={18} className={netStyles.nodeShadow} />
        <g className={netStyles.nodeLift}>
          <g transform="scale(1.2)">{children}</g>
        </g>
      </g>
    </g>
  );
}

function Rail({ id, state, reverse }: { id: TxLaneId; state: "idle" | "active"; reverse: boolean }) {
  const lane = LANES[id];
  const a = iso(reverse ? lane.to : lane.from);
  const b = iso(reverse ? lane.from : lane.to);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <g
      className={netStyles.lane}
      style={{ "--lane": reverse ? "#E11D48" : LANE_COLOR } as CSSProperties}
      data-lane={id}
      data-state={state}
    >
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneBed} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneTrack} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={netStyles.laneFlow} />
      <path
        d="M -2.4 -2.6 L 1.2 0 L -2.4 2.6"
        className={netStyles.laneChevron}
        transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${angle})`}
      />
    </g>
  );
}

// ---------- シーン ----------

export type AccountView = {
  balance: number;
  /** 開始前から変わったが、まだ確定していない */
  pending: boolean;
  locked: boolean;
  settled: boolean;
};

export type TransactionSceneProps = {
  nodes: Record<TxNodeId, NodeState>;
  accounts: { a: AccountView; b: AccountView };
  lanes: Record<TxLaneId, "idle" | "active">;
  /** 巻き戻し中はレールの向きを逆に見せる */
  reverse: boolean;
  money: { spot: MoneySpot; state: MoneyState } | null;
  alert: { tone: "warn" | "crash" | "ok"; title: string; body: string } | null;
  reducedMotion: boolean;
};

const ACCOUNT_LABEL_AT: Record<"a" | "b", ScreenPoint> = {
  a: nudge(iso(NODE_AT.a), 0, 22),
  b: nudge(iso(NODE_AT.b), 0, 22),
};

export function TransactionScene({ nodes, accounts, lanes, reverse, money, alert, reducedMotion }: TransactionSceneProps) {
  const engineLabel = nudge(iso(NODE_AT.engine), 32, -60);
  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="tx-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="左に口座Aの金庫、中央奥にトランザクションエンジン、右に口座Bの金庫が並ぶ銀行処理の模型"
      >
        <defs>
          <radialGradient id="net-shadow">
            <stop offset="0" stopColor="#1E2A40" stopOpacity={0.32} />
            <stop offset="1" stopColor="#1E2A40" stopOpacity={0} />
          </radialGradient>
        </defs>
        <NetworkSceneBase pads={(Object.keys(NODE_AT) as TxNodeId[]).map((id) => ({ id, at: NODE_AT[id], state: nodes[id] }))} />
        <SceneNode id="engine" state={nodes.engine}>
          <EngineIllustration state={nodes.engine} />
        </SceneNode>
        <Rail id="debit" state={lanes.debit} reverse={reverse} />
        <Rail id="credit" state={lanes.credit} reverse={reverse} />
        <SceneNode id="a" state={nodes.a}>
          <VaultIllustration who="A" state={nodes.a} />
        </SceneNode>
        <SceneNode id="b" state={nodes.b}>
          <VaultIllustration who="B" state={nodes.b} />
        </SceneNode>
      </svg>

      <div className={`${netStyles.nodeLabel} ${netStyles.nodeLabelStart}`} style={toPercent(engineLabel)} data-state={nodes.engine}>
        <span className="font-bold text-gray-900">Transaction Engine</span>
        <span className={netStyles.nodeLabelSub}>まとめて確定／取消</span>
      </div>

      {(["a", "b"] as const).map((id) => {
        const acc = accounts[id];
        return (
          <div
            key={id}
            className={styles.balance}
            style={toPercent(ACCOUNT_LABEL_AT[id])}
            data-account={id}
            data-pending={acc.pending ? "true" : "false"}
            data-settled={acc.settled ? "true" : "false"}
            data-testid={`balance-${id}`}
          >
            <span className={styles.balanceHead}>
              口座{id.toUpperCase()}
              {acc.locked && (
                <span className={styles.lockChip} data-testid={`lock-${id}`}>
                  🔒 ロック中
                </span>
              )}
            </span>
            {/* key で値が変わった瞬間だけ光らせる */}
            <span key={acc.balance} className={styles.balanceValue}>
              {acc.balance.toLocaleString()}円
            </span>
            {acc.pending && <span className={styles.balanceNote}>未確定</span>}
            {acc.settled && <span className={`${styles.balanceNote} ${styles.balanceNoteOk}`}>確定</span>}
          </div>
        );
      })}

      {alert && (
        <div className={styles.alert} data-tone={alert.tone} role="status" data-testid="tx-alert">
          <span className={styles.alertTitle}>{alert.title}</span>
          <span>{alert.body}</span>
        </div>
      )}

      {money && (
        <div
          className={styles.moneyAnchor}
          style={toPercent(MONEY_AT[money.spot])}
          data-spot={money.spot}
          data-money-state={money.state}
          data-testid="money"
          role="img"
          aria-label={`500円（${money.state === "settled" ? "確定" : money.state === "crashed" ? "障害で停止" : money.state === "returning" ? "巻き戻し" : "未確定"}）`}
        >
          <span aria-hidden className={styles.moneyShadow} />
          <span className={styles.money}>
            <span aria-hidden className={styles.coin} />
            ¥500
          </span>
        </div>
      )}
    </div>
  );
}
