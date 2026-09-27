// 派遣と請負の「三者の関係」を、同じ配置の静的な図で並べる。
//   上段＝2つの会社（契約で結ばれる対等な主体）、下段＝実際に働く人。
//   左の会社＝雇っている会社、右の会社＝仕事を頼む側。
//   違いは右上 → 下段の線だけ：派遣は「指揮命令」が通り、請負は通らない（×）。

type Mode = "haken" | "ukeoi";

const COPY: Record<
  Mode,
  {
    title: string;
    purpose: string;
    left: string;
    right: string;
    worker: string;
    contract: string;
    leftLine: string;
    rightLine: string;
  }
> = {
  haken: {
    title: "派遣",
    purpose: "目的：働く人（労働力）を提供する",
    left: "派遣元企業",
    right: "派遣先企業",
    worker: "派遣社員",
    contract: "労働者派遣契約",
    leftLine: "雇用関係",
    rightLine: "指揮命令",
  },
  ukeoi: {
    title: "請負",
    purpose: "目的：仕事の完成（成果物）を約束する",
    left: "請負会社",
    right: "発注元（注文者）",
    worker: "請負会社の作業者",
    contract: "請負契約",
    leftLine: "雇用＋指揮命令",
    rightLine: "指揮命令しない",
  },
};

function Node({ x, y, w, label, strong }: { x: number; y: number; w: number; label: string; strong?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={44}
        rx={8}
        fill={strong ? "#111827" : "#ffffff"}
        stroke="#111827"
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + 27}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={strong ? "#ffffff" : "#111827"}
      >
        {label}
      </text>
    </g>
  );
}

function Tag({ x, y, label, tone }: { x: number; y: number; label: string; tone: "gray" | "brand" | "ng" }) {
  const w = label.length * 12.5 + 14;
  const fill = tone === "brand" ? "#0868c9" : "#ffffff";
  const stroke = tone === "brand" ? "#0868c9" : tone === "ng" ? "#be123c" : "#6b7280";
  const color = tone === "brand" ? "#ffffff" : tone === "ng" ? "#be123c" : "#374151";
  return (
    <g>
      <rect x={x - w / 2} y={y - 12} width={w} height={24} rx={12} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <text x={x} y={y + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

function Diagram({ mode }: { mode: Mode }) {
  const c = COPY[mode];
  const haken = mode === "haken";
  const markerId = `labor-arrow-${mode}`;
  return (
    <svg viewBox="0 0 320 236" className="block h-auto w-full" role="img" aria-label={`${c.title}の関係図：${c.left}と${c.right}が${c.contract}を結ぶ。${c.left}と${c.worker}は${c.leftLine}。${c.right}から${c.worker}へは${c.rightLine}。`}>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#0868c9" />
        </marker>
        <marker id={`${markerId}-gray`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#6b7280" />
        </marker>
      </defs>

      {/* 上段：契約で結ばれる2社 */}
      <line x1={126} y1={34} x2={194} y2={34} stroke="#6b7280" strokeWidth={1.5} markerStart={`url(#${markerId}-gray)`} markerEnd={`url(#${markerId}-gray)`} />
      <text x={160} y={70} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="#4b5563">
        {c.contract}
      </text>
      <Node x={6} y={12} w={118} label={c.left} />
      <Node x={196} y={12} w={118} label={c.right} />

      {/* 左の線：雇っている会社 → 働く人 */}
      <line
        x1={65}
        y1={58}
        x2={124}
        y2={176}
        stroke={haken ? "#6b7280" : "#0868c9"}
        strokeWidth={haken ? 1.8 : 3}
        markerEnd={haken ? undefined : `url(#${markerId})`}
      />
      <Tag x={80} y={122} label={c.leftLine} tone={haken ? "gray" : "brand"} />

      {/* 右の線：仕事を頼む側 → 働く人（派遣は通る／請負は通らない） */}
      {haken ? (
        <>
          <line x1={255} y1={58} x2={196} y2={176} stroke="#0868c9" strokeWidth={3} markerEnd={`url(#${markerId})`} />
          <Tag x={240} y={122} label={c.rightLine} tone="brand" />
        </>
      ) : (
        <>
          <line x1={255} y1={58} x2={196} y2={176} stroke="#be123c" strokeWidth={1.8} strokeDasharray="5 5" />
          <g stroke="#be123c" strokeWidth={3} strokeLinecap="round">
            <line x1={215} y1={146} x2={231} y2={162} />
            <line x1={231} y1={146} x2={215} y2={162} />
          </g>
          <Tag x={240} y={112} label={c.rightLine} tone="ng" />
        </>
      )}

      {/* 下段：実際に働く人 */}
      <Node x={80} y={180} w={160} label={c.worker} strong />
    </svg>
  );
}

export function LaborRelationDiagram() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="labor-relation">
      {(["haken", "ukeoi"] as const).map((mode) => (
        <figure key={mode} className="rounded-xl bg-white p-3 ring-1 ring-gray-200">
          <figcaption>
            <div className="text-xl font-bold text-gray-900">{COPY[mode].title}</div>
            <div className="mt-0.5 text-sm text-gray-600">{COPY[mode].purpose}</div>
          </figcaption>
          <div className="mt-2">
            <Diagram mode={mode} />
          </div>
        </figure>
      ))}
    </div>
  );
}
