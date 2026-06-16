import type {
  BreakevenDiagram,
  CardsDiagram,
  ComparisonDiagram,
  CycleDiagram,
  DiagramSpec,
  FlowDiagram,
  NestedDiagram,
  QuadrantDiagram,
  RelationDiagram,
} from "@/types/content";

// ============================================================================
// 図解レンダラ。DiagramSpec（構造化データ）を受け取り、type ごとに描画する。
// 状態を持たない純粋な表示コンポーネントなので Server Component として動く。
// AI は図解を生成せず「どの DiagramSpec を出すか」を選ぶだけ、という方針の描画担当。
// ============================================================================

export default function DiagramRenderer({ spec }: { spec: DiagramSpec }) {
  switch (spec.type) {
    case "cards":
      return <CardsView spec={spec} />;
    case "comparison":
      return <ComparisonView spec={spec} />;
    case "flow":
      return <FlowView spec={spec} />;
    case "quadrant":
      return <QuadrantView spec={spec} />;
    case "cycle":
      return <CycleView spec={spec} />;
    case "nested":
      return <NestedView spec={spec} />;
    case "relation":
      return <RelationView spec={spec} />;
    case "breakeven":
      return <BreakevenView spec={spec} />;
    default: {
      // 将来 type が増えたときに描画漏れを型レベルで検知する。
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}

/** 図解の枠（タイトル＋中身） */
function DiagramFrame({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="rounded-2xl border border-gray-200 bg-white p-4">
      {title && (
        <figcaption className="mb-3 text-sm font-bold text-gray-700">
          {title}
        </figcaption>
      )}
      {children}
    </figure>
  );
}

/** cards: 並べたカードで概念を見せる */
function CardsView({ spec }: { spec: CardsDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      <ul className="grid grid-cols-1 gap-2.5">
        {spec.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl bg-gray-50 px-3 py-3"
          >
            {item.emoji && (
              <span className="text-2xl leading-none" aria-hidden>
                {item.emoji}
              </span>
            )}
            <div>
              <p className="text-sm font-bold text-gray-800">{item.title}</p>
              <p className="mt-0.5 text-sm text-gray-600">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </DiagramFrame>
  );
}

/** comparison: 表で比較する。headers[0] は項目名列の見出し、以降が各 cell に対応。 */
function ComparisonView({ spec }: { spec: ComparisonDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {spec.headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-gray-200 px-2.5 py-2 text-left font-bold text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, ri) => (
              <tr key={ri}>
                <th
                  scope="row"
                  className="border-b border-gray-100 px-2.5 py-2 text-left font-semibold text-gray-800"
                >
                  {row.label}
                </th>
                {row.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-gray-100 px-2.5 py-2 text-gray-600"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DiagramFrame>
  );
}

/** flow: 順番に流れる図解。横/縦で矢印の向きを変える。 */
function FlowView({ spec }: { spec: FlowDiagram }) {
  const horizontal = spec.direction !== "vertical"; // 既定は横並び
  return (
    <DiagramFrame title={spec.title}>
      <ol
        className={
          horizontal
            ? "flex flex-wrap items-stretch gap-2"
            : "flex flex-col gap-2"
        }
      >
        {spec.steps.map((step, i) => (
          <li
            key={i}
            className={horizontal ? "flex items-center gap-2" : ""}
          >
            <div className="rounded-xl bg-indigo-50 px-3 py-2">
              <p className="text-sm font-bold text-indigo-700">{step.label}</p>
              {step.description && (
                <p className="mt-0.5 text-xs text-indigo-900/70">
                  {step.description}
                </p>
              )}
            </div>
            {i < spec.steps.length - 1 && (
              <span
                className="select-none text-indigo-300"
                aria-hidden
              >
                {horizontal ? "→" : "↓"}
              </span>
            )}
          </li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

/** quadrant: 2×2 マトリクス。軸ラベル付きで4象限を見せる（例: SWOT）。 */
function QuadrantView({ spec }: { spec: QuadrantDiagram }) {
  const [xL, xR] = spec.xLabels ?? ["", ""];
  const [yT, yB] = spec.yLabels ?? ["", ""];
  // セルの配色（色だけに頼らずタイトル/絵文字でも区別できるようにする）
  const tones = [
    "bg-emerald-50 ring-emerald-200",
    "bg-rose-50 ring-rose-200",
    "bg-sky-50 ring-sky-200",
    "bg-amber-50 ring-amber-200",
  ];
  return (
    <DiagramFrame title={spec.title}>
      <div className="grid grid-cols-[1.25rem_1fr_1fr] gap-1.5">
        {/* 列ラベル */}
        <span aria-hidden />
        <span className="px-1 text-center text-[11px] font-bold text-gray-500">
          {xL}
        </span>
        <span className="px-1 text-center text-[11px] font-bold text-gray-500">
          {xR}
        </span>
        {/* 1段目（上） */}
        <span className="flex items-center justify-center text-center text-[10px] font-bold leading-tight text-gray-500 [writing-mode:vertical-rl]">
          {yT}
        </span>
        {spec.cells.slice(0, 2).map((c, i) => (
          <QuadrantCell key={i} cell={c} tone={tones[i]} />
        ))}
        {/* 2段目（下） */}
        <span className="flex items-center justify-center text-center text-[10px] font-bold leading-tight text-gray-500 [writing-mode:vertical-rl]">
          {yB}
        </span>
        {spec.cells.slice(2, 4).map((c, i) => (
          <QuadrantCell key={i + 2} cell={c} tone={tones[i + 2]} />
        ))}
      </div>
    </DiagramFrame>
  );
}

function QuadrantCell({
  cell,
  tone,
}: {
  cell: QuadrantDiagram["cells"][number];
  tone: string;
}) {
  return (
    <div className={`rounded-xl px-2.5 py-2.5 ring-1 ${tone}`}>
      <p className="text-xs font-bold text-gray-800">
        {cell.emoji && <span aria-hidden>{cell.emoji} </span>}
        {cell.title}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-gray-600">
        {cell.body}
      </p>
    </div>
  );
}

/** cycle: 循環。ステップを並べ、最後に先頭へ戻ることを示す（例: PDCA）。 */
function CycleView({ spec }: { spec: CycleDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      <ol className="flex flex-wrap items-stretch gap-2">
        {spec.steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-50 px-3 py-2">
              <p className="text-sm font-bold text-indigo-700">{step.label}</p>
              {step.description && (
                <p className="mt-0.5 text-xs text-indigo-900/70">
                  {step.description}
                </p>
              )}
            </div>
            <span className="select-none text-indigo-300" aria-hidden>
              →
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
        <span aria-hidden>↺</span>
        {spec.loopLabel ?? "くりかえして改善する"}
      </p>
    </DiagramFrame>
  );
}

/** nested: 入れ子（包含）。外側が内側を含むことを示す（例: AI ⊃ 機械学習 ⊃ 生成AI）。 */
function NestedView({ spec }: { spec: NestedDiagram }) {
  const tones = [
    "bg-indigo-50 ring-indigo-200",
    "bg-violet-50 ring-violet-200",
    "bg-fuchsia-50 ring-fuchsia-200",
    "bg-pink-50 ring-pink-200",
  ];
  function render(index: number): React.ReactNode {
    if (index >= spec.layers.length) return null;
    const layer = spec.layers[index];
    const tone = tones[index % tones.length];
    return (
      <div className={`rounded-2xl p-3 ring-1 ${tone}`}>
        <p className="text-sm font-bold text-gray-800">{layer.label}</p>
        {layer.body && (
          <p className="mt-0.5 text-xs text-gray-600">{layer.body}</p>
        )}
        {index + 1 < spec.layers.length && (
          <div className="mt-2.5">{render(index + 1)}</div>
        )}
      </div>
    );
  }
  return <DiagramFrame title={spec.title}>{render(0)}</DiagramFrame>;
}

/** relation: 中心と要素の関係。中心を要素が取り囲む構図（例: 3C 分析）。 */
function RelationView({ spec }: { spec: RelationDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      {spec.center && (
        <div className="mx-auto mb-2 w-fit rounded-full bg-indigo-600 px-4 py-2 text-center">
          <p className="text-sm font-bold text-white">{spec.center.label}</p>
          {spec.center.body && (
            <p className="text-[11px] text-indigo-100">{spec.center.body}</p>
          )}
        </div>
      )}
      {spec.center && (
        <p className="mb-2 text-center text-indigo-300" aria-hidden>
          ↕
        </p>
      )}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {spec.nodes.map((node, i) => (
          <li
            key={i}
            className="rounded-xl bg-gray-50 px-3 py-2.5 text-center ring-1 ring-gray-200"
          >
            <p className="text-sm font-bold text-gray-800">
              {node.emoji && <span aria-hidden>{node.emoji} </span>}
              {node.label}
            </p>
            {node.body && (
              <p className="mt-0.5 text-[11px] leading-snug text-gray-600">
                {node.body}
              </p>
            )}
          </li>
        ))}
      </ul>
    </DiagramFrame>
  );
}

/** breakeven: 損益分岐点。売上高線と総費用線の交点で利益/損失が分かれることを示す。 */
function BreakevenView({ spec }: { spec: BreakevenDiagram }) {
  const l = spec.labels ?? {};
  const revenue = l.revenue ?? "売上高";
  const cost = l.cost ?? "総費用";
  const fixed = l.fixed ?? "固定費";
  const point = l.point ?? "損益分岐点";
  const profit = l.profit ?? "利益";
  const loss = l.loss ?? "損失";
  // 320×220 の固定座標系。レイアウトは原点(40,180)から右上方向。
  // 売上線: (40,180)→(300,30)。総費用線: (40,120)→(300,70)。交点 ≈ (150,113)。
  return (
    <DiagramFrame title={spec.title}>
      <svg
        viewBox="0 0 320 220"
        className="h-auto w-full"
        role="img"
        aria-label={`${revenue}線と${cost}線が交わる点が${point}。それより右で${profit}、左で${loss}。`}
      >
        {/* 損失/利益の領域 */}
        <rect x="40" y="30" width="110" height="150" fill="#fef2f2" />
        <rect x="150" y="30" width="150" height="150" fill="#ecfdf5" />
        {/* 軸 */}
        <line x1="40" y1="30" x2="40" y2="180" stroke="#9ca3af" strokeWidth="1.5" />
        <line x1="40" y1="180" x2="300" y2="180" stroke="#9ca3af" strokeWidth="1.5" />
        <text x="36" y="24" textAnchor="end" fontSize="10" fill="#6b7280">
          金額
        </text>
        <text x="300" y="196" textAnchor="end" fontSize="10" fill="#6b7280">
          売上数量
        </text>
        {/* 固定費（水平線） */}
        <line
          x1="40"
          y1="120"
          x2="300"
          y2="120"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        {/* 総費用線 */}
        <line x1="40" y1="120" x2="300" y2="70" stroke="#6366f1" strokeWidth="2.5" />
        {/* 売上高線 */}
        <line x1="40" y1="180" x2="300" y2="30" stroke="#10b981" strokeWidth="2.5" />
        {/* 損益分岐点 */}
        <line
          x1="150"
          y1="113"
          x2="150"
          y2="180"
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle cx="150" cy="113" r="4" fill="#374151" />
        {/* ラベル */}
        <text x="304" y="34" fontSize="11" fontWeight="bold" fill="#059669">
          {revenue}
        </text>
        <text x="304" y="72" fontSize="11" fontWeight="bold" fill="#4f46e5">
          {cost}
        </text>
        <text x="44" y="116" fontSize="10" fill="#b45309">
          {fixed}
        </text>
        <text x="95" y="170" textAnchor="middle" fontSize="11" fill="#b91c1c">
          {loss}
        </text>
        <text x="225" y="170" textAnchor="middle" fontSize="11" fill="#047857">
          {profit}
        </text>
        <text x="150" y="195" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">
          {point}
        </text>
      </svg>
    </DiagramFrame>
  );
}
