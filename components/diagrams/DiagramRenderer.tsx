import type {
  BalanceDiagram,
  CardsDiagram,
  ComparisonDiagram,
  DiagramSpec,
  FlowDiagram,
  LayerDiagram,
  MechanismFlowDiagram,
  MatrixDiagram,
  RelationshipDiagram,
  RoleMapDiagram,
  TableRelationDiagram,
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
    case "matrix":
      return <MatrixView spec={spec} />;
    case "layers":
      return <LayerView spec={spec} />;
    case "relationship":
      return <RelationshipView spec={spec} />;
    case "mechanismFlow":
      return <MechanismFlowView spec={spec} />;
    case "roleMap":
      return <RoleMapView spec={spec} />;
    case "tableRelation":
      return <TableRelationView spec={spec} />;
    case "balance":
      return <BalanceView spec={spec} />;
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

/** matrix: 2軸で整理する。SWOTなど「どのマスか」が大事な概念向け。 */
function MatrixView({ spec }: { spec: MatrixDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      <div className="space-y-3">
        {spec.rows.map((row) => (
          <div key={row}>
            <p className="mb-1.5 text-xs font-bold text-gray-500">{row}</p>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${spec.columns.length}, minmax(0, 1fr))`,
              }}
            >
              {spec.columns.map((column) => {
                const cell = spec.cells.find(
                  (candidate) =>
                    candidate.row === row && candidate.column === column,
                );
                return (
                  <div
                    key={`${row}-${column}`}
                    className="min-h-28 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100"
                  >
                    <p className="text-[11px] font-bold text-gray-500">
                      {column}
                    </p>
                    {cell ? (
                      <>
                        <p className="mt-1 text-sm font-extrabold text-gray-800">
                          {cell.emoji && (
                            <span className="mr-1" aria-hidden>
                              {cell.emoji}
                            </span>
                          )}
                          {cell.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          {cell.body}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-gray-400">-</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}

/** layers: 上下の積み重なりを見せる。OSやクラウドの責任範囲向け。 */
function LayerView({ spec }: { spec: LayerDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      <ol className="space-y-2">
        {spec.layers.map((layer, i) => (
          <li key={i}>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <p className="text-sm font-extrabold text-gray-800">
                {layer.emoji && (
                  <span className="mr-1.5" aria-hidden>
                    {layer.emoji}
                  </span>
                )}
                {layer.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {layer.body}
              </p>
            </div>
            {i < spec.layers.length - 1 && (
              <div className="flex justify-center py-1 text-gray-300" aria-hidden>
                ↓
              </div>
            )}
          </li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

/** relationship: ノードとリンクで「何が何を参照するか」を見せる。 */
function RelationshipView({ spec }: { spec: RelationshipDiagram }) {
  const nodeById = new Map(spec.nodes.map((node) => [node.id, node]));

  return (
    <DiagramFrame title={spec.title}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {spec.nodes.map((node) => (
          <div
            key={node.id}
            className="rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-100"
          >
            <p className="text-sm font-extrabold text-gray-800">
              {node.emoji && (
                <span className="mr-1.5" aria-hidden>
                  {node.emoji}
                </span>
              )}
              {node.label}
            </p>
            {node.body && (
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {node.body}
              </p>
            )}
          </div>
        ))}
      </div>
      {spec.links.length > 0 && (
        <ul className="mt-3 space-y-2">
          {spec.links.map((link, i) => (
            <li
              key={`${link.from}-${link.to}-${i}`}
              className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold leading-relaxed text-indigo-800"
            >
              {nodeById.get(link.from)?.label ?? link.from}
              <span aria-hidden> → </span>
              {nodeById.get(link.to)?.label ?? link.to}
              {link.label && (
                <span className="ml-1 font-medium text-indigo-900/70">
                  {link.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </DiagramFrame>
  );
}

/** mechanismFlow: 登場要素の役割と、情報・作業の流れを同時に見せる。 */
function MechanismFlowView({ spec }: { spec: MechanismFlowDiagram }) {
  const actorById = new Map(spec.actors.map((actor) => [actor.id, actor]));

  return (
    <DiagramFrame title={spec.title}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {spec.actors.map((actor) => (
          <div
            key={actor.id}
            className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200"
          >
            <p className="text-sm font-extrabold text-slate-900">
              {actor.label}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-600">
              {actor.role}
            </p>
            {actor.detail && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {actor.detail}
              </p>
            )}
          </div>
        ))}
      </div>
      <ol className="mt-4 space-y-2.5">
        {spec.steps.map((step, i) => (
          <li
            key={`${step.from}-${step.to}-${i}`}
            className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-100"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                {i + 1}
              </span>
              <span>{actorById.get(step.from)?.label ?? step.from}</span>
              <span aria-hidden>→</span>
              <span>{actorById.get(step.to)?.label ?? step.to}</span>
            </div>
            <p className="mt-2 text-sm font-extrabold text-indigo-950">
              {step.label}
            </p>
            {step.body && (
              <p className="mt-1 text-xs leading-relaxed text-indigo-900/75">
                {step.body}
              </p>
            )}
          </li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

/** roleMap: 似た用語の担当範囲と、受け渡しの境界を見せる。 */
function RoleMapView({ spec }: { spec: RoleMapDiagram }) {
  const roleById = new Map(spec.roles.map((role) => [role.id, role]));

  return (
    <DiagramFrame title={spec.title}>
      <div className="grid grid-cols-1 gap-2">
        {spec.roles.map((role) => (
          <div
            key={role.id}
            className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200"
          >
            <p className="text-sm font-extrabold text-gray-900">
              {role.label}
            </p>
            <p className="mt-1 text-xs font-bold text-gray-600">
              {role.responsibility}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {role.handles.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-gray-700 ring-1 ring-gray-200"
                >
                  {item}
                </span>
              ))}
            </div>
            {role.notFor && (
              <p className="mt-2 text-xs leading-relaxed text-rose-700">
                違う: {role.notFor}
              </p>
            )}
          </div>
        ))}
      </div>
      {spec.handoffs && spec.handoffs.length > 0 && (
        <ol className="mt-3 space-y-2">
          {spec.handoffs.map((handoff, i) => (
            <li
              key={`${handoff.from}-${handoff.to}-${i}`}
              className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-900 ring-1 ring-emerald-100"
            >
              {roleById.get(handoff.from)?.label ?? handoff.from}
              <span aria-hidden> → </span>
              {roleById.get(handoff.to)?.label ?? handoff.to}
              <span className="ml-1 font-medium text-emerald-900/75">
                {handoff.label}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DiagramFrame>
  );
}

/** tableRelation: 表の列、主キー、外部キー、参照先をまとめて見せる。 */
function TableRelationView({ spec }: { spec: TableRelationDiagram }) {
  const tableById = new Map(spec.tables.map((table) => [table.id, table]));

  return (
    <DiagramFrame title={spec.title}>
      <div className="grid grid-cols-1 gap-3">
        {spec.tables.map((table) => (
          <div
            key={table.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <div className="bg-gray-900 px-3 py-2 text-white">
              <p className="text-sm font-extrabold">{table.name}</p>
              {table.caption && (
                <p className="mt-0.5 text-xs text-white/70">{table.caption}</p>
              )}
            </div>
            <ul className="divide-y divide-gray-100">
              {table.columns.map((column) => (
                <li
                  key={column.name}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-gray-800">
                    {column.name}
                  </span>
                  <span
                    className={
                      column.keyType === "primary"
                        ? "rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-extrabold text-indigo-700"
                        : column.keyType === "foreign"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700"
                          : "rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500"
                    }
                  >
                    {column.keyType === "primary"
                      ? "主キー"
                      : column.keyType === "foreign"
                        ? "外部キー"
                        : "項目"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {spec.relations.map((relation, i) => (
          <li
            key={`${relation.fromTable}-${relation.fromColumn}-${i}`}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-900 ring-1 ring-emerald-100"
          >
            {tableById.get(relation.fromTable)?.name ?? relation.fromTable}.
            {relation.fromColumn}
            <span aria-hidden> → </span>
            {tableById.get(relation.toTable)?.name ?? relation.toTable}.
            {relation.toColumn}
            {relation.label && (
              <span className="ml-1 font-medium text-emerald-900/75">
                {relation.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </DiagramFrame>
  );
}

/** balance: 3要素が互いに影響する関係を見せる。 */
function BalanceView({ spec }: { spec: BalanceDiagram }) {
  return (
    <DiagramFrame title={spec.title}>
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-100">
        <p className="text-sm font-extrabold text-amber-950">{spec.center}</p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {spec.factors.map((factor) => (
          <div
            key={factor.label}
            className="rounded-xl bg-white p-3 ring-1 ring-gray-200"
          >
            <p className="text-sm font-extrabold text-gray-900">
              {factor.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              {factor.body}
            </p>
            {factor.ifOverdone && (
              <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold leading-relaxed text-rose-700">
                偏ると: {factor.ifOverdone}
              </p>
            )}
          </div>
        ))}
      </div>
      {spec.tradeoffs && spec.tradeoffs.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {spec.tradeoffs.map((tradeoff) => (
            <li
              key={tradeoff}
              className="text-xs font-semibold leading-relaxed text-gray-600"
            >
              <span className="text-amber-500" aria-hidden>
                ↔
              </span>{" "}
              {tradeoff}
            </li>
          ))}
        </ul>
      )}
    </DiagramFrame>
  );
}
