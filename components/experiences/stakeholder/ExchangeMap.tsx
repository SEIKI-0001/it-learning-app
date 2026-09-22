import type { CSSProperties } from "react";
import styles from "./stakeholder.module.css";

// 自社を中心にした交換関係の地図。
//   相手を選ぶ … その相手との2本のレーンだけが動く：まず 相手 → 自社（例：代金）、続いて 自社 → 相手（例：商品）
//   「全部」    … 7者から一斉に自社へ集まり、自社から一斉に返っていく。最後は14本の矢印が残る
// reduced-motion ではトークンを出さず、光ったレーン（矢印の向き）と下の文章で同じ内容を示す。

export type Holder = {
  name: string;
  emoji: string;
  give: string; // 会社 → 相手（文章）
  get: string; // 相手 → 会社（文章）
  inTok: { icon: string; label: string }; // 相手 → 会社 を流れるもの
  outTok: { icon: string; label: string }; // 会社 → 相手 を流れるもの
};

const W = 320;
const H = 300;
const C = { x: 160, y: 150 };
const R = { x: 124, y: 118 };
const NODE_R = 27;
const HUB_R = 28;
const LANE = 5;

export function holderPositions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: C.x + Math.sin(a) * R.x, y: C.y - Math.cos(a) * R.y };
  });
}

function lanes(p: { x: number; y: number }) {
  const dx = C.x - p.x;
  const dy = C.y - p.y;
  const len = Math.hypot(dx, dy);
  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y * LANE, y: u.x * LANE };
  // 相手 → 自社（内側のレーン）と 自社 → 相手（外側のレーン）
  const inbound = {
    x1: p.x + u.x * (NODE_R + 2) + n.x,
    y1: p.y + u.y * (NODE_R + 2) + n.y,
    x2: C.x - u.x * (HUB_R + 4) + n.x,
    y2: C.y - u.y * (HUB_R + 4) + n.y,
  };
  const outbound = {
    x1: C.x - u.x * (HUB_R + 2) - n.x,
    y1: C.y - u.y * (HUB_R + 2) - n.y,
    x2: p.x + u.x * (NODE_R + 4) - n.x,
    y2: p.y + u.y * (NODE_R + 4) - n.y,
  };
  return { inbound, outbound };
}

type Seg = { x1: number; y1: number; x2: number; y2: number };
const at = (s: Seg, t: number) => ({ x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t });

function Chip({
  seg,
  icon,
  label,
  tone,
  delay,
  reducedMotion,
  testId,
}: {
  seg: Seg;
  icon: string;
  label?: string;
  tone: "in" | "out";
  delay: number;
  reducedMotion: boolean;
  testId?: string;
}) {
  // 送り手の端から受け手の端まで運ばれ、受け手に吸い込まれて消える（中身は下の文章に残る）
  const from = at(seg, 0);
  const to = at(seg, 1);
  const text = label ? `${icon} ${label}` : icon;
  const w = label ? 20 + label.length * 10.5 : 18;
  const style = {
    "--x1": `${from.x}px`,
    "--y1": `${from.y}px`,
    "--x2": `${to.x}px`,
    "--y2": `${to.y}px`,
    animationDelay: `${delay}ms`,
  } as CSSProperties;
  if (reducedMotion) return null;
  return (
    <g className={styles.token} style={style} data-testid={testId} aria-hidden>
      {label ? (
        <rect x={-w / 2} y={-9} width={w} height={18} rx={9} className={tone === "in" ? styles.chipIn : styles.chipOut} />
      ) : null}
      <text textAnchor="middle" dominantBaseline="central" fontSize={label ? 10.5 : 13} className={styles.chipText}>
        {text}
      </text>
    </g>
  );
}

export function ExchangeMap({
  holders,
  sel,
  runKey,
  reducedMotion,
  onSelect,
}: {
  holders: Holder[];
  sel: number | "all" | null;
  runKey: number;
  reducedMotion: boolean;
  onSelect: (i: number) => void;
}) {
  const pos = holderPositions(holders.length);
  const all = sel === "all";
  // 自社側の受け取り→お返しまでの時間（全部モードは一斉に集まってから一斉に返す）
  const outDelay = all ? 1500 : 1350;

  return (
    <div
      className={`relative mx-auto mt-5 w-full max-w-[340px] ${reducedMotion ? styles.reduced : ""}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="stakeholder-map"
      data-sel={sel === null ? "none" : String(sel)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <marker id="sh-arrow-in" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#10b981" />
          </marker>
          <marker id="sh-arrow-out" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#4f46e5" />
          </marker>
        </defs>

        {/* 交換のレーン（選ばれていないものは淡い点線のまま） */}
        {pos.map((p, i) => {
          const { inbound, outbound } = lanes(p);
          const on = all || sel === i;
          return (
            <g key={i} data-testid={`stakeholder-lane-${i}`} data-on={on ? "true" : "false"}>
              <line
                {...inbound}
                stroke={on ? "#10b981" : "#e5e7eb"}
                strokeWidth={on ? 2 : 1.2}
                strokeDasharray={on ? undefined : "3 3"}
                markerEnd={on ? "url(#sh-arrow-in)" : undefined}
                className={on && !reducedMotion ? styles.draw : undefined}
                style={{ animationDelay: "0ms" }}
              />
              <line
                {...outbound}
                stroke={on ? "#4f46e5" : "#e5e7eb"}
                strokeWidth={on ? 2 : 1.2}
                strokeDasharray={on ? undefined : "3 3"}
                markerEnd={on ? "url(#sh-arrow-out)" : undefined}
                className={on && !reducedMotion ? styles.draw : undefined}
                style={{ animationDelay: `${outDelay}ms` }}
              />
            </g>
          );
        })}

        {/* 自社 */}
        <g key={`hub-${runKey}`} className={all && !reducedMotion ? styles.hubGather : undefined}>
          <circle cx={C.x} cy={C.y} r={HUB_R} fill="#4f46e5" stroke="#e0e7ff" strokeWidth={5} />
          <text x={C.x} y={C.y - 7} textAnchor="middle" dominantBaseline="central" fontSize={15}>
            🏢
          </text>
          <text x={C.x} y={C.y + 12} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="#fff">
            自社
          </text>
        </g>

        {/* 流れるもの：key に runKey を入れ、選び直すたびに最初から流す */}
        {sel !== null &&
          pos.map((p, i) => {
            if (!all && sel !== i) return null;
            const { inbound, outbound } = lanes(p);
            const h = holders[i];
            return (
              <g key={`tok-${runKey}-${i}`}>
                <Chip
                  seg={inbound}
                  icon={h.inTok.icon}
                  label={all ? undefined : h.inTok.label}
                  tone="in"
                  delay={all ? i * 60 : 0}
                  reducedMotion={reducedMotion}
                  testId={all ? undefined : "stakeholder-token-in"}
                />
                <Chip
                  seg={outbound}
                  icon={h.outTok.icon}
                  label={all ? undefined : h.outTok.label}
                  tone="out"
                  delay={outDelay + (all ? i * 60 : 0)}
                  reducedMotion={reducedMotion}
                  testId={all ? undefined : "stakeholder-token-out"}
                />
              </g>
            );
          })}
      </svg>

      {holders.map((h, i) => {
        const on = sel === i;
        const lit = on || all;
        return (
          <button
            key={h.name}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={on}
            style={{ left: `${(pos[i].x / W) * 100}%`, top: `${(pos[i].y / H) * 100}%` }}
            className={`absolute z-10 flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center ring-2 transition active:scale-95 ${
              on
                ? "bg-emerald-500 text-white ring-emerald-500"
                : lit
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-400"
                  : "bg-white text-emerald-800 ring-emerald-200"
            }`}
          >
            <span className="text-base leading-none">{h.emoji}</span>
            <span className="mt-0.5 whitespace-nowrap text-[9px] font-bold leading-tight">{h.name}</span>
          </button>
        );
      })}
    </div>
  );
}
