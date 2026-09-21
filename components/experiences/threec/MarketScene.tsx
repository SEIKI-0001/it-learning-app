import type { CSSProperties } from "react";
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
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, laneBetween, nudge } from "../scene/IsoParts";
import styles from "./threec.module.css";

// 駅前の小さな市場。奥に駅前の人だかり（顧客）、手前左に自社のクレープ屋、右に競合カフェ。
// 各地点を調べると、見つかった事実がチップになって中央の「作戦ボード」へ飛び、
// 3つそろった瞬間に戦略案が組み上がる。

export type Spot = "customer" | "competitor" | "company";

const AT: Record<Spot, WorldPoint> = {
  customer: { x: -62, y: -62 },
  company: { x: -40, y: 72 },
  competitor: { x: 72, y: -40 },
};

const BOARD_AT: ScreenPoint = { x: 160, y: 158 };
const SLOT_OFFSET: Record<Spot, number> = { customer: -14, competitor: 0, company: 14 };

export const SPOT_META: Record<Spot, { label: string; short: string; tone: string; action: string }> = {
  customer: { label: "顧客", short: "安くて写真映え", tone: "#0EA5E9", action: "顧客を調べる" },
  competitor: { label: "競合", short: "高い・提供が遅い", tone: "#F43F5E", action: "競合を調べる" },
  company: { label: "自社", short: "安い・早い・トッピング豊富", tone: "#10B981", action: "自社を調べる" },
};

// ---------- 模型パーツ ----------

function Crowd() {
  const people = [
    { x: -10, y: 4, shirt: "#38BDF8", hair: "#2B3140" },
    { x: 4, y: -6, shirt: "#F472B6", hair: "#5A3A22" },
    { x: 12, y: 8, shirt: "#A78BFA", hair: "#2B3140" },
  ];
  const sign = isoBox({ x0: -22, x1: -19, y0: -18, y1: -15, z0: 0, z1: 30 });
  return (
    <g data-illustration="crowd">
      <polygon points={sign.left} fill="#94A3B8" />
      <polygon points={sign.right} fill="#64748B" />
      <g transform={leftFaceTransform(-30, -15, 36)}>
        <rect x={0} y={0} width={18} height={8} rx={1.5} fill="#1E3A8A" />
        <text x={9} y={5.9} textAnchor="middle" fontSize={5} fontWeight={800} fill="#FFFFFF">
          駅
        </text>
      </g>
      {people.map((p) => {
        const o = isoLocal(p.x, p.y, 0);
        return (
          <g key={`${p.x}-${p.y}`} transform={`translate(${o.x} ${o.y})`}>
            <path d="M -5 0 L -5 -14 Q -5 -19 0 -19.6 Q 5 -19 5 -14 L 5 0 Z" fill={p.shirt} />
            <circle cx={0} cy={-24} r={4.6} fill="#F6D3B8" />
            <path d="M -4.8 -24.6 A 4.8 4.8 0 0 1 4.8 -24.6 Q 0 -27 -4.8 -24.6 Z" fill={p.hair} />
            {/* スマホで写真を撮る */}
            <rect x={3} y={-17} width={3} height={4.6} rx={0.6} fill="#1F2937" />
          </g>
        );
      })}
    </g>
  );
}

function Stand({ kind }: { kind: "company" | "competitor" }) {
  const company = kind === "company";
  const b = company
    ? isoBox({ x0: -13, x1: 13, y0: -10, y1: 10, z0: 0, z1: 16 })
    : isoBox({ x0: -16, x1: 16, y0: -13, y1: 13, z0: 0, z1: 26 });
  const top = company ? 16 : 26;
  const y1 = company ? 10 : 13;
  const x0 = company ? -13 : -16;
  const x1 = -x0;
  const awning = points([isoLocal(x0, y1, top - 2), isoLocal(x1, y1, top - 2), isoLocal(x1, y1 + 7, top - 8), isoLocal(x0, y1 + 7, top - 8)]);
  const face = company ? "#ECFDF5" : "#FAF5F0";
  const side = company ? "#A7F3D0" : "#E7D8C9";
  const stripe = company ? "#10B981" : "#F43F5E";
  return (
    <g data-illustration={`stand-${kind}`}>
      <polygon points={b.left} fill={face} />
      <polygon points={b.right} fill={side} />
      <polygon points={b.top} fill="#FFFFFF" stroke={side} strokeWidth={0.7} />
      <g transform={leftFaceTransform(x0, y1, top)}>
        <rect x={4} y={3} width={company ? 18 : 24} height={6} rx={1.2} fill={company ? "#065F46" : "#7C2D12"} />
        <text
          x={company ? 13 : 16}
          y={7.4}
          textAnchor="middle"
          fontSize={4.2}
          fontWeight={800}
          letterSpacing={0.5}
          fill="#FFFFFF"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {company ? "CREPE" : "CAFE"}
        </text>
      </g>
      <polygon points={awning} fill={stripe} />
      {[0, 1, 2].map((i) => {
        const w = (x1 - x0) / 5;
        const xs = x0 + w * (i * 2 + 0.5);
        return (
          <polygon
            key={i}
            points={points([isoLocal(xs, y1, top - 2), isoLocal(xs + w, y1, top - 2), isoLocal(xs + w, y1 + 7, top - 8), isoLocal(xs, y1 + 7, top - 8)])}
            fill="#FFFFFF"
            opacity={0.85}
          />
        );
      })}
      {!company && (
        // 競合の目印：待ち時間の時計
        <g transform={`translate(${isoLocal(16, 0, 34).x} ${isoLocal(16, 0, 34).y})`}>
          <circle r={5} fill="#FFFFFF" stroke="#F43F5E" strokeWidth={1} />
          <path d="M 0 -3 L 0 0 L 2.4 1.4" fill="none" stroke="#F43F5E" strokeWidth={0.9} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

// ---------- シーン ----------

export type MarketSceneProps = {
  researched: Record<Spot, boolean>;
  focus: Spot | null;
  /** Cost（費用）のチップを差し込もうとした回数（0＝未実行） */
  costTries: number;
  strategy: string | null;
  onResearch: (spot: Spot) => void;
  reducedMotion: boolean;
};

const LABEL_AT: Record<Spot, ScreenPoint> = {
  customer: nudge(iso(AT.customer), -66, -34),
  company: nudge(iso(AT.company), 0, 24),
  competitor: nudge(iso(AT.competitor), 0, 24),
};

function slotPoint(spot: Spot): ScreenPoint {
  return { x: BOARD_AT.x, y: BOARD_AT.y + SLOT_OFFSET[spot] };
}

export function MarketScene({ researched, focus, costTries, strategy, onResearch, reducedMotion }: MarketSceneProps) {
  const spots: Spot[] = ["customer", "competitor", "company"];
  const count = spots.filter((s) => researched[s]).length;
  const complete = count === 3;
  const stateOf = (s: Spot): NodeState => (focus === s ? "active" : researched[s] ? "idle" : "sending");

  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-complete={complete ? "true" : "false"}
      data-testid="market-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="駅前の小さな市場。奥に駅前の学生たち（顧客）、手前左に自社のクレープ屋、右に競合のカフェ。どちらの店も同じ駅前のお客を狙っている"
      >
        <SceneDefs />
        <NetworkSceneBase pads={spots.map((id) => ({ id, at: AT[id], state: focus === id ? "active" : "idle" }))} />
        <SceneRail lane={laneBetween(AT.customer, AT.company)} id="to-company" state={focus === "company" ? "active" : "idle"} color="#10B981" chevrons={[0.5]} />
        <SceneRail lane={laneBetween(AT.customer, AT.competitor)} id="to-competitor" state={focus === "competitor" ? "active" : "idle"} color="#F43F5E" chevrons={[0.5]} />
        <SceneNode id="customer" at={AT.customer} state={stateOf("customer")} shadow={20}>
          <Crowd />
        </SceneNode>
        <SceneNode id="competitor" at={AT.competitor} state={stateOf("competitor")}>
          <Stand kind="competitor" />
        </SceneNode>
        <SceneNode id="company" at={AT.company} state={stateOf("company")} scale={1.1}>
          <Stand kind="company" />
        </SceneNode>
      </svg>

      <span className={styles.rivalry}>同じお客を取り合う</span>

      {/* 作戦ボード：3つのスロットが埋まると戦略が組み上がる */}
      <div
        className={styles.board}
        style={toPercent(BOARD_AT)}
        data-count={count}
        data-complete={complete ? "true" : "false"}
        data-testid="strategy-board"
      >
        <span className={styles.boardTitle}>{complete ? "✨ 作戦が組み上がった" : `作戦ボード ${count}/3`}</span>
        {complete && strategy ? (
          <>
            <span className={styles.boardStrategy} data-testid="strategy">
              {strategy}
            </span>
            <span className={styles.boardFrom}>
              {spots.map((s, i) => (
                <span key={s} style={{ color: SPOT_META[s].tone }}>
                  {i > 0 && <span className={styles.times}>×</span>}
                  {SPOT_META[s].label}
                </span>
              ))}
            </span>
          </>
        ) : (
          <span className={styles.boardSlots} aria-hidden>
            {spots.map((s) => (
              <span key={s} className={styles.slot} data-filled={researched[s] ? "true" : "false"} style={{ "--tone": SPOT_META[s].tone } as CSSProperties} />
            ))}
          </span>
        )}
        {costTries > 0 && (
          <span key={costTries} className={styles.reject} role="status" data-testid="cost-reject">
            ✕ Cost（費用）は3Cに入らない
          </span>
        )}
      </div>

      {/* 調べた事実のチップ：地点から作戦ボードへ飛んでいく */}
      {spots.map((s) => {
        if (!researched[s]) return null;
        const from = nudge(iso(AT[s]), 0, -40);
        const to = slotPoint(s);
        const dx = ((from.x - to.x) / SCENE_WIDTH) * 100;
        const dy = ((from.y - to.y) / SCENE_WIDTH) * 100;
        return (
          <span
            key={s}
            className={styles.fact}
            style={
              {
                ...toPercent(to),
                "--tone": SPOT_META[s].tone,
                "--from-x": `${dx}cqw`,
                "--from-y": `${dy}cqw`,
              } as CSSProperties
            }
            data-spot={s}
            data-testid={`fact-${s}`}
            hidden={complete && Boolean(strategy)}
          >
            <b>{SPOT_META[s].label}</b>
            {SPOT_META[s].short}
          </span>
        );
      })}

      {/* 調査ボタン（地点の上） */}
      {spots.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onResearch(s)}
          className={styles.probe}
          style={{ ...toPercent(LABEL_AT[s]), "--tone": SPOT_META[s].tone } as CSSProperties}
          data-researched={researched[s] ? "true" : "false"}
          data-focus={focus === s ? "true" : "false"}
          aria-pressed={focus === s}
        >
          <span className={styles.probeName}>{SPOT_META[s].label}</span>
          <span className={styles.probeAction}>{researched[s] ? "調査済 ✓" : `🔍 ${SPOT_META[s].action}`}</span>
        </button>
      ))}
    </div>
  );
}
