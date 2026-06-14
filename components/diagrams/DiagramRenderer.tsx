import type {
  CardsDiagram,
  ComparisonDiagram,
  DiagramSpec,
  FlowDiagram,
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
