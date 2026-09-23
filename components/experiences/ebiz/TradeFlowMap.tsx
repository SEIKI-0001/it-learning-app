import type { CSSProperties } from "react";
import styles from "./ebiz.module.css";

// 取引マップ：4つの登場人物（企業／取引先企業／個人／個人）と、必要なときだけ現れる中継役
// （📱スマホ・🌐仲介プラットフォーム）。用語を選ぶと、その取引で「誰から誰へ・何が」流れるかを
// ①②③の順に1回だけ流す。流れるものは モノ（📦 橙）・お金（💴 緑）・情報（📄 青）で色を分ける。
// 流れ終わったレーンは矢印として残るので、最終状態の図だけでも取引の形が読める。

export type TermKey = "ec" | "edi" | "fintech" | "sharing";
type Kind = "goods" | "money" | "info";
type NodeKey = "compA" | "compB" | "persA" | "persB" | "phone" | "platform";

const W = 320;
const H = 236;

const NODES: Record<NodeKey, { x: number; y: number; emo: string; label: string; via?: boolean }> = {
  compA: { x: 62, y: 38, emo: "🏢", label: "企業" },
  compB: { x: 258, y: 38, emo: "🏭", label: "取引先企業" },
  persA: { x: 62, y: 196, emo: "🙋", label: "個人" },
  persB: { x: 258, y: 196, emo: "🙆", label: "個人" },
  phone: { x: 62, y: 117, emo: "📱", label: "スマホ", via: true },
  platform: { x: 160, y: 130, emo: "🌐", label: "仲介サービス", via: true },
};

// 用語ごとの呼び名（同じ箱でも役割が変わる）
const ROLE: Record<TermKey, Partial<Record<NodeKey, string>>> = {
  ec: { compA: "ネットショップ", persA: "顧客" },
  edi: { compA: "企業A", compB: "企業B" },
  fintech: { compA: "金融サービス", persA: "利用者" },
  sharing: { persA: "借りる人", persB: "貸す人" },
};

export type FlowStep = { path: NodeKey[]; kind: Kind; icon: string; label: string; text: string };

export const FLOWS: Record<TermKey, FlowStep[]> = {
  ec: [
    { path: ["persA", "compA"], kind: "info", icon: "📄", label: "注文", text: "顧客 → ショップ：注文を送る" },
    { path: ["persA", "compA"], kind: "money", icon: "💴", label: "代金", text: "顧客 → ショップ：代金を払う" },
    { path: ["compA", "persA"], kind: "goods", icon: "📦", label: "商品", text: "ショップ → 顧客：商品が届く" },
  ],
  edi: [
    { path: ["compA", "compB"], kind: "info", icon: "📄", label: "発注", text: "企業A → 企業B：発注データ" },
    { path: ["compB", "compA"], kind: "info", icon: "📄", label: "納品", text: "企業B → 企業A：納品（出荷）データ" },
    { path: ["compB", "compA"], kind: "info", icon: "📄", label: "請求", text: "企業B → 企業A：請求データ" },
  ],
  fintech: [
    { path: ["persA", "phone"], kind: "info", icon: "👆", label: "指示", text: "利用者 → スマホ：送金・支払いを操作" },
    { path: ["phone", "compA"], kind: "money", icon: "💴", label: "送金", text: "スマホ → 金融サービス：お金が動く" },
    { path: ["compA", "phone", "persA"], kind: "info", icon: "📄", label: "完了", text: "金融サービス → 利用者：完了・残高が届く" },
  ],
  sharing: [
    { path: ["persB", "platform"], kind: "info", icon: "📄", label: "空き", text: "貸す人 → 仲介：空いている車を登録" },
    { path: ["persA", "platform", "persB"], kind: "money", icon: "💴", label: "利用料", text: "借りる人 → 仲介 → 貸す人：利用料" },
    { path: ["persB", "persA"], kind: "goods", icon: "🚗", label: "車", text: "貸す人 → 借りる人：車そのものを貸す" },
  ],
};

export const STEP_MS = 1500;
const LANE_GAP = 9;
const TRIM = 27;

// 中継ノードを通る折れ線を、ステップごとに少しずつ横にずらしたレーンにする
function lanePoints(path: NodeKey[], offset: number) {
  const pts = path.map((k) => NODES[k]);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * offset;
    const ny = (dx / len) * offset;
    let x = pts[i].x + nx;
    let y = pts[i].y + ny;
    // 端点だけ箱の外へ出す（中継ノードは真ん中を通過させる）
    if (i === 0 || i === pts.length - 1) {
      const other = i === 0 ? pts[1] : pts[pts.length - 2];
      const ux = other.x - pts[i].x;
      const uy = other.y - pts[i].y;
      const ul = Math.hypot(ux, uy) || 1;
      x += (ux / ul) * TRIM;
      y += (uy / ul) * TRIM;
    }
    out.push({ x, y });
  }
  return out;
}

const KIND_TONE: Record<Kind, { stroke: string; fill: string; name: string }> = {
  goods: { stroke: "#f59e0b", fill: "#fffbeb", name: "モノ" },
  money: { stroke: "#16a34a", fill: "#f0fdf4", name: "お金" },
  info: { stroke: "#2563eb", fill: "#eff6ff", name: "情報" },
};

export function KindLegend() {
  return (
    <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-gray-600">
      {(Object.keys(KIND_TONE) as Kind[]).map((k) => (
        <span key={k} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KIND_TONE[k].stroke }} />
          {KIND_TONE[k].name}
        </span>
      ))}
    </div>
  );
}

export function kindName(kind: Kind) {
  return KIND_TONE[kind].name;
}
export function kindColor(kind: Kind) {
  return KIND_TONE[kind].stroke;
}

export function TradeFlowMap({ sel, runKey, reducedMotion }: { sel: TermKey | null; runKey: number; reducedMotion: boolean }) {
  const steps = sel ? FLOWS[sel] : [];
  const used = new Set(steps.flatMap((s) => s.path));

  return (
    <div
      className={`relative mt-3 w-full rounded-xl bg-gray-50 ring-1 ring-gray-200 ${reducedMotion ? styles.reduced : ""}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="ebiz-map"
      data-sel={sel ?? "none"}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
        <defs>
          {(Object.keys(KIND_TONE) as Kind[]).map((k) => (
            <marker key={k} id={`ebiz-arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={KIND_TONE[k].stroke} />
            </marker>
          ))}
        </defs>

        {/* 何も選んでいないときの薄い関係線 */}
        {!sel &&
          (
            [
              ["compA", "compB"],
              ["compA", "persA"],
              ["persA", "persB"],
            ] as NodeKey[][]
          ).map(([a, b]) => (
            <line key={a + b} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="#e5e7eb" strokeWidth={1.2} strokeDasharray="3 3" />
          ))}

        {/* レーン：流れと同時に引かれ、その後も矢印として残る */}
        {steps.map((s, i) => {
          const pts = lanePoints(s.path, (i - (steps.length - 1) / 2) * LANE_GAP);
          const d = pts.map((p, j) => `${j ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          return (
            <path
              key={`lane-${runKey}-${i}`}
              d={d}
              fill="none"
              stroke={KIND_TONE[s.kind].stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              markerEnd={`url(#ebiz-arrow-${s.kind})`}
              pathLength={100}
              className={reducedMotion ? undefined : styles.lane}
              style={{ animationDelay: `${i * STEP_MS}ms` }}
              data-testid="ebiz-lane"
              data-kind={s.kind}
            />
          );
        })}

        {/* 箱（関係する登場人物だけ濃く、中継役は必要なときだけ現れる） */}
        {(Object.keys(NODES) as NodeKey[]).map((k) => {
          const n = NODES[k];
          const on = used.has(k);
          if (n.via && !on) return null;
          const label = (sel && ROLE[sel][k]) || n.label;
          const w = n.via ? 14 + label.length * 10.5 : 70;
          const h = n.via ? 38 : 44;
          return (
            <g
              key={`${k}-${n.via ? runKey : ""}`}
              className={`${styles.node} ${n.via && !reducedMotion ? styles.viaIn : ""}`}
              style={{ opacity: sel && !on ? 0.35 : 1 }}
              data-testid={`ebiz-node-${k}`}
              data-on={on ? "true" : "false"}
            >
              <rect
                x={n.x - w / 2}
                y={n.y - h / 2}
                width={w}
                height={h}
                rx={10}
                fill={on ? "#eef2ff" : "#fff"}
                stroke={on ? "#6366f1" : "#e5e7eb"}
                strokeWidth={on ? 2 : 1.5}
              />
              <text x={n.x} y={n.y - 7} textAnchor="middle" dominantBaseline="central" fontSize={n.via ? 14 : 16}>
                {n.emo}
              </text>
              <text x={n.x} y={n.y + 12} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#374151">
                {label}
              </text>
            </g>
          );
        })}

        {/* 流れるもの：送り手から受け手へ1回だけ運ばれ、受け手で消える */}
        {!reducedMotion &&
          steps.map((s, i) => {
            const pts = lanePoints(s.path, (i - (steps.length - 1) / 2) * LANE_GAP);
            const mid = pts.length === 3 ? pts[1] : { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            const end = pts[pts.length - 1];
            const w = 22 + s.label.length * 10.5;
            const style = {
              "--x1": `${pts[0].x}px`,
              "--y1": `${pts[0].y}px`,
              "--xm": `${mid.x}px`,
              "--ym": `${mid.y}px`,
              "--x2": `${end.x}px`,
              "--y2": `${end.y}px`,
              animationDelay: `${i * STEP_MS}ms`,
            } as CSSProperties;
            return (
              <g key={`tok-${runKey}-${i}`} className={styles.token} style={style} aria-hidden data-testid="ebiz-token">
                <rect x={-w / 2} y={-10} width={w} height={20} rx={10} fill={KIND_TONE[s.kind].fill} stroke={KIND_TONE[s.kind].stroke} strokeWidth={1.5} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={700} fill="#1f2937">
                  {s.icon} {s.label}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
