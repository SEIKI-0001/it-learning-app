"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import { SceneDefs } from "../scene/IsoParts";
import styles from "./labor.module.css";

// 派遣／請負の「同じオフィス」の模型。
//   ・シャツの色＝雇っている会社（作業者はどちらのモードでも 🟧派遣元／請負会社 の社員）
//   ・床の色＝誰の区画か（派遣：作業者は派遣先の職場に座る／請負：請負会社の区画に座る）
//   ・矢印の色＝指示を出している人（🟦派遣先・注文主／🟧請負会社の責任者／🟥飛び越えた直接指示）
// 矢印の経路そのものが試験知識：派遣＝派遣先→派遣社員、請負＝注文主→請負会社→社員。

export type LaborMode = "haken" | "ukeoi";
export type Scenario = LaborMode | "gisou";
type Who = "client" | "worker" | "boss" | "agency";
type ArrowId = "cmd" | "order" | "task" | "bypass";

const CLIENT: WorldPoint = { x: -60, y: 20 };
const WORKER: WorldPoint = { x: 20, y: -60 };
const BOSS: WorldPoint = { x: 40, y: 20 };
const AGENCY: WorldPoint = { x: 60, y: 60 };

const POS: Record<Who, WorldPoint> = { client: CLIENT, worker: WORKER, boss: BOSS, agency: AGENCY };

const INDIGO = "#4F46E5";
const AMBER = "#D97706";
const ROSE = "#E11D48";

type Beat = { say?: { who: Who; text: string }; move?: ArrowId; ms: number };

export const SCRIPTS: Record<Scenario, Beat[]> = {
  haken: [
    { say: { who: "client", text: "この資料を今日17時までに作ってください" }, ms: 1300 },
    { move: "cmd", ms: 1500 },
    { say: { who: "worker", text: "はい、作ります" }, ms: 1100 },
  ],
  ukeoi: [
    { say: { who: "client", text: "この成果物を金曜日までに納品してください" }, ms: 1400 },
    { move: "order", ms: 1500 },
    { say: { who: "boss", text: "Aさん、この部分から進めてください" }, ms: 1300 },
    { move: "task", ms: 1200 },
    { say: { who: "worker", text: "はい" }, ms: 900 },
  ],
  gisou: [
    { say: { who: "client", text: "この作業、先にやって！" }, ms: 1100 },
    { move: "bypass", ms: 1500 },
    { say: { who: "worker", text: "（自社の責任者を通っていない…）" }, ms: 1300 },
  ],
};

const ARROWS: Record<ArrowId, { from: Who; to: Who; color: string; lift: number; label: string }> = {
  cmd: { from: "client", to: "worker", color: INDIGO, lift: 26, label: "📣 仕事の指示" },
  order: { from: "client", to: "boss", color: INDIGO, lift: 14, label: "📦 仕事の依頼" },
  task: { from: "boss", to: "worker", color: AMBER, lift: 14, label: "📣 作業指示" },
  bypass: { from: "client", to: "worker", color: ROSE, lift: 34, label: "⚠ 直接指示" },
};

/** どの矢印を、どの見た目で出すか（通常の流れ・飛び越え・本来の経路の薄表示） */
function arrowsFor(scenario: Scenario): ArrowId[] {
  if (scenario === "haken") return ["cmd"];
  if (scenario === "ukeoi") return ["order", "task"];
  return ["order", "task", "bypass"];
}

const FIGURE_SCALE = 1.3;
const CHEST = 30;

function arc(from: Who, to: Who, lift: number) {
  const a = iso({ ...POS[from], z: CHEST });
  const b = iso({ ...POS[to], z: CHEST });
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const trim = 13;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const p0 = { x: a.x + ux * trim, y: a.y + uy * trim };
  const p2 = { x: b.x - ux * trim, y: b.y - uy * trim };
  const c = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 - lift };
  const at = (t: number): ScreenPoint => ({
    x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x,
    y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y,
  });
  // 終点での向き（矢じり用）
  const angle = (Math.atan2(p2.y - c.y, p2.x - c.x) * 180) / Math.PI;
  return { d: `M ${p0.x} ${p0.y} Q ${c.x} ${c.y} ${p2.x} ${p2.y}`, at, end: p2, angle };
}

// ---------------------------------------------------------------------------
// 登場物
// ---------------------------------------------------------------------------

function Person({ shirt, clipboard }: { shirt: string; clipboard?: boolean }) {
  return (
    <g>
      <path d="M -7 0 L -7 -21 Q -7 -27 0 -28 Q 7 -27 7 -21 L 7 0 Z" fill={shirt} />
      <circle cx={0} cy={-34} r={6.4} fill="#F6D3B8" />
      <path d="M -6.6 -35 A 6.6 6.6 0 0 1 6.6 -35 Q 0 -38.5 -6.6 -35 Z" fill="#2B3140" />
      {clipboard && (
        <g transform="translate(5 -16) rotate(-8)">
          <rect x={0} y={0} width={7} height={9} rx={1} fill="#FFFFFF" stroke="#94A3B8" strokeWidth={0.7} />
          <line x1={1.5} y1={3} x2={5.5} y2={3} stroke="#94A3B8" strokeWidth={0.6} />
          <line x1={1.5} y1={5.5} x2={5.5} y2={5.5} stroke="#94A3B8" strokeWidth={0.6} />
        </g>
      )}
    </g>
  );
}

const DESK = isoBox({ x0: 6, x1: 20, y0: -10, y1: 10, z0: 11, z1: 13 });
const DESK_LEG = isoBox({ x0: 7, x1: 19, y0: 8, y1: 10, z0: 0, z1: 11 });
const PC = isoBox({ x0: 10, x1: 16, y0: -6, y1: 6, z0: 13, z1: 14 });
const PC_LID = points([isoLocal(10, 6, 14), isoLocal(10, -6, 14), isoLocal(8, -6, 24), isoLocal(8, 6, 24)]);

function WorkerAtDesk({ shirt }: { shirt: string }) {
  return (
    <g>
      <Person shirt={shirt} />
      <polygon points={DESK_LEG.left} fill="#D5DCE7" />
      <polygon points={DESK.left} fill="#E6EBF3" />
      <polygon points={DESK.right} fill="#D3DBE7" />
      <polygon points={DESK.top} fill="#FFFFFF" stroke="#D8DFEA" strokeWidth={0.7} />
      <polygon points={PC_LID} fill="#94A3B8" />
      <polygon points={PC.top} fill="#CBD5E1" />
    </g>
  );
}

const BUILDING = isoBox({ x0: -16, x1: 16, y0: -14, y1: 14, z0: 0, z1: 34 });

function AgencyBuilding() {
  return (
    <g>
      <polygon points={BUILDING.left} fill="#FDE68A" />
      <polygon points={BUILDING.right} fill="#FCD34D" />
      <polygon points={BUILDING.top} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={0.8} />
      <g transform={leftFaceTransform(-16, 14, 34)}>
        {[4, 11, 18].map((u) =>
          [6, 15, 24].map((v) => <rect key={`${u}-${v}`} x={u} y={v} width={5} height={5} rx={0.6} fill="#FFFFFF" opacity={0.85} />),
        )}
      </g>
    </g>
  );
}

function Zone({ x0, x1, y0, y1, fill, stroke }: { x0: number; x1: number; y0: number; y1: number; fill: string; stroke: string }) {
  const c = [iso({ x: x0, y: y0 }), iso({ x: x1, y: y0 }), iso({ x: x1, y: y1 }), iso({ x: x0, y: y1 })];
  return <polygon points={points(c)} fill={fill} stroke={stroke} strokeWidth={1} strokeDasharray="3 3" />;
}

function Relation({ from, to, label, both }: { from: Who; to: Who; label: string; both?: boolean }) {
  const a = iso({ ...POS[from], z: 4 });
  const b = iso({ ...POS[to], z: 4 });
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="#94A3B8"
      strokeWidth={1.4}
      strokeDasharray={both ? "4 3" : undefined}
      data-relation={label}
    />
  );
}

// ---------------------------------------------------------------------------
// シーン本体
// ---------------------------------------------------------------------------

export function OfficeScene({
  mode,
  scenario,
  reducedMotion,
  active,
}: {
  mode: LaborMode;
  /** 再生する流れ。親は key を変えてマウントし直すと頭から再生される */
  scenario: Scenario;
  reducedMotion: boolean;
  /** 見えているときだけ再生を進める */
  active: boolean;
}) {
  const script = SCRIPTS[scenario];
  const [step, setStep] = useState(0);
  const capsule = useRef<SVGGElement>(null);
  // reduced-motion は最初から結果（全部の矢印が出た状態）を見せる
  const beat = reducedMotion ? script.length : step;
  const done = beat >= script.length;

  useEffect(() => {
    if (done || !active) return;
    const t = window.setTimeout(() => setStep((b) => b + 1), script[beat].ms);
    return () => window.clearTimeout(t);
  }, [beat, done, active, script]);

  // 指示カプセルを矢印に沿って動かす
  const moving = !done ? script[beat].move : undefined;
  useEffect(() => {
    const el = capsule.current;
    if (!moving || !el) return;
    const spec = ARROWS[moving];
    const path = arc(spec.from, spec.to, spec.lift);
    const ms = script[beat].ms * 0.85;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const p = path.at(eased);
      el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moving, beat, script]);

  // 各矢印の状態：まだ／描いている途中／出た／（偽装時の）本来の経路
  const arrowState = (id: ArrowId): "off" | "drawing" | "on" | "ghost" => {
    if (scenario === "gisou" && id !== "bypass") return "ghost";
    const idx = script.findIndex((b) => b.move === id);
    if (idx < 0 || beat < idx) return "off";
    if (beat === idx) return "drawing";
    return "on";
  };

  const say = !done ? script[beat].say : undefined;
  const haken = mode === "haken";
  const shownArrows = arrowsFor(scenario);

  const names: { who: Who; label: string; sub: string; tone: "indigo" | "amber" }[] = haken
    ? [
        { who: "client", label: "派遣先の担当者", sub: "仕事の指示を出す", tone: "indigo" },
        { who: "worker", label: "派遣社員", sub: "派遣元に雇用", tone: "amber" },
        { who: "agency", label: "派遣元会社", sub: "社外", tone: "amber" },
      ]
    : [
        { who: "client", label: "注文主", sub: "完成を依頼する", tone: "indigo" },
        { who: "worker", label: "請負会社の社員", sub: "請負会社に雇用", tone: "amber" },
        { who: "boss", label: "請負会社の責任者", sub: "社員に指示する", tone: "amber" },
      ];

  const nodes: { who: Who; depth: number }[] = (haken ? (["client", "worker", "agency"] as Who[]) : (["client", "worker", "boss"] as Who[]))
    .map((who) => ({ who, depth: POS[who].x + POS[who].y }))
    .sort((a, b) => a.depth - b.depth);

  const label = haken
    ? "派遣のオフィス。派遣元会社が派遣社員を雇用し、派遣元と派遣先が派遣契約を結ぶ。仕事の指示は派遣先の担当者から派遣社員へ直接出る。"
    : scenario === "gisou"
      ? "請負のオフィス。注文主が、請負会社の責任者を飛び越えて、請負会社の社員へ直接指示を出している。"
      : "請負のオフィス。注文主は請負会社の責任者へ仕事の完成を依頼し、作業指示は責任者から自社の社員へ出る。注文主から社員への直接の矢印はない。";

  return (
    <div
      className={styles.scene}
      data-testid="office-scene"
      data-mode={mode}
      data-scenario={scenario}
      data-done={done ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <svg viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={label}>
        <SceneDefs />
        <NetworkSceneBase pads={[]}>
          {haken ? (
            <Zone x0={-82} x1={36} y0={-82} y1={36} fill="rgba(99,102,241,0.09)" stroke="#A5B4FC" />
          ) : (
            <>
              <Zone x0={-82} x1={-14} y0={-30} y1={62} fill="rgba(99,102,241,0.09)" stroke="#A5B4FC" />
              <Zone x0={0} x1={80} y0={-82} y1={44} fill="rgba(245,158,11,0.12)" stroke="#FCD34D" />
            </>
          )}
        </NetworkSceneBase>

        {/* 契約・雇用の関係（流れではないので灰色の細線） */}
        {haken && (
          <g>
            <Relation from="agency" to="worker" label="雇用" />
            <Relation from="agency" to="client" label="派遣契約" both />
          </g>
        )}

        {nodes.map(({ who }) => {
          const p = iso(POS[who]);
          const speaking = say?.who === who;
          return (
            <g key={who} transform={`translate(${p.x} ${p.y})`}>
              <g className={styles.figure} data-who={who} data-speaking={speaking ? "true" : "false"}>
                <ellipse cx={0} cy={1} rx={18} ry={9} fill="url(#net-shadow)" />
                <g transform={`scale(${who === "agency" ? 1.1 : FIGURE_SCALE})`}>
                  {who === "client" && <Person shirt="#6366F1" />}
                  {who === "worker" && <WorkerAtDesk shirt="#F59E0B" />}
                  {who === "boss" && <Person shirt="#F59E0B" clipboard />}
                  {who === "agency" && <AgencyBuilding />}
                </g>
              </g>
            </g>
          );
        })}

        {/* 指示の矢印 */}
        {shownArrows.map((id) => {
          const spec = ARROWS[id];
          const path = arc(spec.from, spec.to, spec.lift);
          const state = arrowState(id);
          const color = state === "ghost" ? "#94A3B8" : spec.color;
          return (
            <g key={id} className={styles.arrow} data-arrow={id} data-state={state} style={{ "--arrow": color } as CSSProperties}>
              <path d={path.d} pathLength={1} className={styles.arrowLine} />
              <path
                d="M -5 -3.6 L 1.5 0 L -5 3.6 Z"
                className={styles.arrowHead}
                transform={`translate(${path.end.x.toFixed(1)} ${path.end.y.toFixed(1)}) rotate(${path.angle.toFixed(1)})`}
              />
            </g>
          );
        })}

        {/* 指示カプセル */}
        {moving && (
          <g ref={capsule} key={`cap-${beat}`} data-testid="instruction-capsule" transform={`translate(-100 -100)`}>
            <rect x={-10} y={-7} width={20} height={14} rx={7} fill={ARROWS[moving].color} stroke="#FFFFFF" strokeWidth={1.5} />
            <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={8}>
              {moving === "order" ? "📦" : "📣"}
            </text>
          </g>
        )}
      </svg>

      {/* 床の色の凡例（床の上に置くと人や矢印と重なるので隅にまとめる） */}
      <div className={styles.legend} data-testid="zone-legend">
        {(haken
          ? [{ label: "派遣先の職場", zone: INDIGO }]
          : [
              { label: "注文主の会社", zone: INDIGO },
              { label: "請負会社の区画", zone: AMBER },
            ]
        ).map((z) => (
          <span key={z.label} className={styles.legendItem} style={{ "--zone": z.zone } as CSSProperties}>
            <i />
            {z.label}
          </span>
        ))}
      </div>

      {/* 名札 */}
      {names.map((n) => (
        <span key={n.who} className={styles.nameTag} data-tone={n.tone} style={toPercent(iso(POS[n.who]))} data-testid={`name-${n.who}`}>
          <b>{n.label}</b>
          <span>{n.sub}</span>
        </span>
      ))}

      {/* 関係のラベル */}
      {haken && (
        <>
          <span className={styles.relTag} style={toPercent(nudgeX(towards(AGENCY, WORKER, 0.36), 34))}>
            雇用
          </span>
          <span className={styles.relTag} style={toPercent(nudgeX(towards(AGENCY, CLIENT, 0.36), -40))}>
            ⇄ 派遣契約
          </span>
        </>
      )}

      {/* 矢印のラベル（出たものだけ） */}
      {shownArrows.map((id) => {
        const state = arrowState(id);
        // 本来の経路（点線）には札を付けない＝赤い直接指示だけを読ませる
        if (state === "off" || state === "drawing" || state === "ghost") return null;
        const spec = ARROWS[id];
        const path = arc(spec.from, spec.to, spec.lift);
        return (
          <span
            key={id}
            className={styles.arrowTag}
            data-state={state}
            style={{ ...toPercent(path.at(0.5)), "--arrow": spec.color } as CSSProperties}
            data-testid={`arrow-tag-${id}`}
          >
            {spec.label}
          </span>
        );
      })}

      {/* 吹き出し */}
      {say && (
        <span
          key={beat}
          className={styles.bubble}
          data-who={say.who}
          style={toPercent(iso({ ...POS[say.who], z: 58 }))}
          data-testid="speech"
        >
          {say.text}
        </span>
      )}
    </div>
  );
}

function towards(a: WorldPoint, b: WorldPoint, t: number): ScreenPoint {
  return iso({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: 4 });
}

function nudgeX(p: ScreenPoint, dx: number): ScreenPoint {
  return { x: p.x + dx, y: p.y };
}
