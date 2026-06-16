import type {
  HeroDiagramGroup,
  HeroDiagramLane,
  HeroDiagramNode,
  HeroDiagramSpec,
  HeroDiagramTone,
} from "@/types/content";

type ToneStyle = {
  surface: string;
  border: string;
  text: string;
  badge: string;
  rail: string;
};

const TONE_STYLES: Record<HeroDiagramTone, ToneStyle> = {
  sky: {
    surface: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-950",
    badge: "bg-sky-600 text-white",
    rail: "bg-sky-500",
  },
  indigo: {
    surface: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-950",
    badge: "bg-indigo-600 text-white",
    rail: "bg-indigo-500",
  },
  emerald: {
    surface: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-950",
    badge: "bg-emerald-600 text-white",
    rail: "bg-emerald-500",
  },
  amber: {
    surface: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-950",
    badge: "bg-amber-500 text-amber-950",
    rail: "bg-amber-500",
  },
  rose: {
    surface: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-950",
    badge: "bg-rose-600 text-white",
    rail: "bg-rose-500",
  },
  violet: {
    surface: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-950",
    badge: "bg-violet-600 text-white",
    rail: "bg-violet-500",
  },
  slate: {
    surface: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-950",
    badge: "bg-slate-800 text-white",
    rail: "bg-slate-500",
  },
};

function tone(toneName?: HeroDiagramTone): ToneStyle {
  return TONE_STYLES[toneName ?? "indigo"];
}

export default function HeroDiagramRenderer({ spec }: { spec: HeroDiagramSpec }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-gray-200 bg-slate-50 shadow-sm">
      <div className="border-b border-white/70 bg-white px-4 py-3">
        {spec.canvasLabel && (
          <p className="text-[11px] font-extrabold uppercase text-indigo-600">
            {spec.canvasLabel}
          </p>
        )}
        <figcaption className="text-base font-extrabold leading-snug text-gray-950">
          {spec.title}
        </figcaption>
        {spec.subtitle && (
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {spec.subtitle}
          </p>
        )}
      </div>

      <div className="bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_52%,#fff7ed_100%)] p-3">
        {spec.diagramType === "flow" && <FlowHero spec={spec} />}
        {spec.diagramType === "role-map" && <RoleMapHero spec={spec} />}
        {spec.diagramType === "compare" && <CompareHero spec={spec} />}
        {spec.diagramType === "relation" && <RelationHero spec={spec} />}
        {spec.diagramType === "matrix" && <MatrixHero spec={spec} />}
        {spec.diagramType === "cycle" && <CycleHero spec={spec} />}

        {spec.insight && (
          <p className="mt-3 rounded-lg bg-white/85 px-3 py-2 text-sm font-bold leading-relaxed text-gray-800 ring-1 ring-white">
            {spec.insight}
          </p>
        )}
      </div>
    </figure>
  );
}

function NodePill({ node }: { node: HeroDiagramNode }) {
  const style = tone(node.tone);

  return (
    <div className={`rounded-lg border ${style.border} ${style.surface} p-3`}>
      {node.badge && (
        <p className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold ${style.badge}`}>
          {node.badge}
        </p>
      )}
      <p className={`text-sm font-extrabold ${style.text}`}>{node.label}</p>
      {node.caption && (
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          {node.caption}
        </p>
      )}
    </div>
  );
}

function LanePanel({ lane }: { lane: HeroDiagramLane }) {
  const style = tone(lane.tone);

  return (
    <div className={`rounded-lg border ${style.border} ${style.surface} p-3`}>
      <p className={`text-sm font-extrabold ${style.text}`}>{lane.label}</p>
      {lane.caption && (
        <p className="mt-1 text-xs font-semibold leading-relaxed text-gray-600">
          {lane.caption}
        </p>
      )}
      {lane.items && lane.items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {lane.items.map((item) => (
            <li
              key={item}
              className="rounded-md bg-white/75 px-2 py-1.5 text-xs font-semibold leading-relaxed text-gray-700 ring-1 ring-white"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupPanel({ group }: { group: HeroDiagramGroup }) {
  const style = tone(group.tone);

  return (
    <div className={`rounded-lg border ${style.border} bg-white`}>
      <div className={`rounded-t-lg ${style.surface} px-3 py-2`}>
        <p className={`text-sm font-extrabold ${style.text}`}>{group.label}</p>
        {group.caption && (
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-gray-600">
            {group.caption}
          </p>
        )}
      </div>
      <ul className="divide-y divide-gray-100">
        {group.items.map((item) => (
          <li key={item} className="px-3 py-2 text-xs font-semibold text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlowHero({ spec }: { spec: HeroDiagramSpec }) {
  const nodeById = new Map((spec.nodes ?? []).map((node) => [node.id, node]));

  return (
    <div className="space-y-3">
      {spec.nodes && spec.nodes.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {spec.nodes.map((node) => (
            <NodePill key={node.id} node={node} />
          ))}
        </div>
      )}

      {spec.steps && spec.steps.length > 0 && (
        <ol className="space-y-2">
          {spec.steps.map((step, index) => {
            const style = tone(step.tone);
            const from = step.from ? nodeById.get(step.from)?.label ?? step.from : "";
            const to = step.to ? nodeById.get(step.to)?.label ?? step.to : "";

            return (
              <li
                key={`${step.label}-${index}`}
                className="grid gap-2 rounded-lg bg-white/90 p-3 ring-1 ring-white sm:grid-cols-[2rem_minmax(0,1fr)]"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${style.badge}`}>
                  {index + 1}
                </div>
                <div>
                  {(from || to) && (
                    <p className="text-xs font-extrabold text-gray-500">
                      {from}
                      {from && to && <span aria-hidden> → </span>}
                      {to}
                    </p>
                  )}
                  <p className={`mt-0.5 text-sm font-extrabold ${style.text}`}>
                    {step.label}
                  </p>
                  {step.caption && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {step.caption}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function RoleMapHero({ spec }: { spec: HeroDiagramSpec }) {
  const lanes = spec.lanes ?? [];

  return (
    <div className="space-y-2">
      {lanes.map((lane, index) => (
        <div key={lane.id}>
          <LanePanel lane={lane} />
          {index < lanes.length - 1 && (
            <div className="flex justify-center py-1 text-sm font-extrabold text-gray-400" aria-hidden>
              ↓
            </div>
          )}
        </div>
      ))}
      {spec.links && spec.links.length > 0 && (
        <LinkList links={spec.links} nodes={spec.nodes} lanes={spec.lanes} groups={spec.groups} />
      )}
    </div>
  );
}

function CompareHero({ spec }: { spec: HeroDiagramSpec }) {
  const lanes = spec.lanes ?? [];
  const gridClass = lanes.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className={`grid grid-cols-1 gap-2 ${gridClass}`}>
      {lanes.map((lane) => (
        <LanePanel key={lane.id} lane={lane} />
      ))}
    </div>
  );
}

function RelationHero({ spec }: { spec: HeroDiagramSpec }) {
  const groups = spec.groups ?? [];
  const nodes = spec.nodes ?? [];

  if (groups.length > 0) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <GroupPanel key={group.id} group={group} />
          ))}
        </div>
        {spec.links && spec.links.length > 0 && (
          <LinkList links={spec.links} nodes={nodes} lanes={spec.lanes} groups={groups} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {spec.canvasLabel && (
        <div className="rounded-lg bg-white/90 px-3 py-3 text-center ring-1 ring-white">
          <p className="text-sm font-extrabold text-gray-950">{spec.canvasLabel}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {nodes.map((node) => (
          <NodePill key={node.id} node={node} />
        ))}
      </div>
      {spec.links && spec.links.length > 0 && (
        <LinkList links={spec.links} nodes={nodes} lanes={spec.lanes} groups={spec.groups} />
      )}
    </div>
  );
}

function MatrixHero({ spec }: { spec: HeroDiagramSpec }) {
  const matrix = spec.matrix;
  if (!matrix) return null;

  return (
    <div className="space-y-2">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${matrix.columns.length}, minmax(0, 1fr))`,
        }}
      >
        {matrix.rows.flatMap((row) =>
          matrix.columns.map((column) => {
            const cell = matrix.cells.find(
              (candidate) => candidate.row === row && candidate.column === column,
            );
            const style = tone(cell?.tone ?? "slate");

            return (
              <div
                key={`${row}-${column}`}
                className={`min-h-28 rounded-lg border ${style.border} ${style.surface} p-3`}
              >
                <p className="text-[11px] font-extrabold text-gray-500">
                  {row} / {column}
                </p>
                {cell && (
                  <>
                    <p className={`mt-1 text-sm font-extrabold ${style.text}`}>
                      {cell.label}
                    </p>
                    {cell.caption && (
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        {cell.caption}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function CycleHero({ spec }: { spec: HeroDiagramSpec }) {
  const cycle = spec.cycle;
  if (!cycle) return null;

  return (
    <div className="space-y-3">
      {cycle.center && (
        <div className="rounded-lg bg-white/90 px-3 py-3 text-center ring-1 ring-white">
          <p className="text-sm font-extrabold text-gray-950">{cycle.center}</p>
        </div>
      )}
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cycle.steps.map((step, index) => {
          const style = tone(step.tone);

          return (
            <li
              key={step.label}
              className={`rounded-lg border ${style.border} ${style.surface} p-3`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${style.badge}`}>
                  {index + 1}
                </span>
                <p className={`text-sm font-extrabold ${style.text}`}>{step.label}</p>
              </div>
              {step.caption && (
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  {step.caption}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="rounded-lg bg-white/80 px-3 py-2 text-center text-xs font-extrabold text-gray-600 ring-1 ring-white">
        最後は次のPlanへ戻り、改善を続ける
      </p>
    </div>
  );
}

function LinkList({
  links,
  nodes,
  lanes,
  groups,
}: {
  links: { from: string; to: string; label?: string }[];
  nodes?: HeroDiagramNode[];
  lanes?: HeroDiagramLane[];
  groups?: HeroDiagramGroup[];
}) {
  const names = new Map<string, string>();
  nodes?.forEach((node) => names.set(node.id, node.label));
  lanes?.forEach((lane) => names.set(lane.id, lane.label));
  groups?.forEach((group) => names.set(group.id, group.label));

  return (
    <ul className="space-y-2">
      {links.map((link, index) => (
        <li
          key={`${link.from}-${link.to}-${index}`}
          className="rounded-lg bg-white/90 px-3 py-2 text-xs font-extrabold leading-relaxed text-gray-800 ring-1 ring-white"
        >
          {names.get(link.from) ?? link.from}
          <span className="mx-1 text-indigo-500" aria-hidden>
            →
          </span>
          {names.get(link.to) ?? link.to}
          {link.label && (
            <span className="ml-1 font-semibold text-gray-600">
              {link.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
