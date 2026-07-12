import type { StudyPhaseId } from "@/types/plan";
import type { RoadmapNode } from "./mapConfig";
import { MAP_VIEWBOX, ROADMAP_STATUS_LABEL } from "./mapConfig";

type NodeStatus = RoadmapNode["status"];

const nodeStyle: Record<NodeStatus, string> = {
  done: "bg-gradient-to-b from-emerald-400 to-emerald-700 text-white ring-white",
  current: "bg-gradient-to-b from-indigo-500 to-indigo-800 text-white ring-white",
  upcoming: "bg-stone-100/95 text-stone-600 ring-stone-500/50",
  goal: "bg-gradient-to-b from-amber-300 to-amber-600 text-amber-950 ring-white",
};

const labelStyle: Record<NodeStatus, string> = {
  done: "bg-emerald-50/95 text-emerald-800 ring-emerald-200",
  current: "bg-indigo-50/95 text-indigo-800 ring-indigo-200",
  upcoming: "bg-white/95 text-stone-700 ring-stone-300",
  goal: "bg-amber-50/95 text-amber-800 ring-amber-300",
};

export default function MapNodes({
  nodes,
  expectedPhaseId,
  onSelect,
}: {
  nodes: readonly RoadmapNode[];
  expectedPhaseId: StudyPhaseId | null;
  onSelect: (node: RoadmapNode) => void;
}) {
  return (
    <div className="absolute inset-0 z-20" aria-label="ロードマップのステージ">
      {nodes.map((node) => {
        const isCurrent = node.status === "current";
        const isDone = node.status === "done";
        const isGoal = node.kind === "goal";
        const goalNear = isGoal && nodes.every((item) => item.kind === "goal" || item.status !== "upcoming");
        const isExpected = !isCurrent && node.key === expectedPhaseId;
        const labelPosition =
          node.labelOffset === "left"
            ? "right-[60%]"
            : node.labelOffset === "right"
              ? "left-[60%]"
              : "left-1/2 -translate-x-1/2";

        return (
          <div
            key={node.key}
            className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2"
            style={{
              top: `${(node.y / MAP_VIEWBOX.height) * 100}%`,
              left: `${(node.x / MAP_VIEWBOX.width) * 100}%`,
            }}
          >
            {isCurrent && (
              <span className="pointer-events-none absolute bottom-[calc(100%+2px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-indigo-700 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-lg ring-1 ring-white/70 motion-safe:animate-bounce motion-reduce:animate-none">
                いまここ
              </span>
            )}
            {isExpected && (
              <span className="pointer-events-none absolute bottom-[calc(100%+2px)] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 shadow-lg ring-1 ring-amber-300">
                📍 予定ではこのあたり
              </span>
            )}
            <button
              type="button"
              onClick={() => onSelect(node)}
              className="relative grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/90"
              aria-label={`${node.place}・${node.title}（${ROADMAP_STATUS_LABEL[node.status]}）`}
            >
              {isCurrent && (
                <span className="absolute inset-0 rounded-full bg-indigo-300/70 motion-safe:animate-ping motion-reduce:animate-none" />
              )}
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-full text-lg shadow-lg ring-[3px] transition-transform active:scale-95 ${nodeStyle[node.status]} ${isCurrent ? "scale-110" : ""} ${isGoal ? "h-11 w-11 text-xl" : ""} ${goalNear ? "animate-glow-ring" : ""}`}
              >
                <span className={node.status === "upcoming" ? "opacity-55 grayscale" : ""} aria-hidden>
                  {node.emoji}
                </span>
                {!isGoal && (
                  <span
                    className={`absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-extrabold ring-1 ring-white ${
                      isDone
                        ? "bg-emerald-700 text-white"
                        : isCurrent
                          ? "bg-indigo-700 text-white"
                          : "bg-stone-700 text-white"
                    }`}
                    aria-hidden
                  >
                    {node.stage}
                  </span>
                )}
                {isDone && (
                  <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-black text-emerald-700 shadow ring-1 ring-emerald-200" aria-hidden>
                    ✓
                  </span>
                )}
              </span>
            </button>
            <span
              data-roadmap-label={node.key}
              className={`pointer-events-none absolute top-[calc(100%+2px)] z-10 max-w-[104px] whitespace-nowrap rounded-full px-2 py-0.5 text-center text-[10px] font-extrabold leading-tight shadow-md ring-1 backdrop-blur-sm ${labelPosition} ${labelStyle[node.status]}`}
            >
              {node.place}
            </span>
            {isCurrent && (
              <span
                className="pointer-events-none absolute top-[calc(100%+27px)] left-1/2 h-1.5 w-14 -translate-x-1/2 overflow-hidden rounded-full bg-white/90 shadow ring-1 ring-indigo-900/10"
                role="progressbar"
                aria-label="現在ステージの達成度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={node.progress}
              >
                <span className="block h-full rounded-full bg-indigo-700" style={{ width: `${node.progress}%` }} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
