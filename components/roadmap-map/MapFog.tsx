import Image from "next/image";
import type { RoadmapNode } from "./mapConfig";
import { MAP_VIEWBOX } from "./mapConfig";

export default function MapFog({
  nodes,
  clearingKeys,
}: {
  nodes: readonly RoadmapNode[];
  clearingKeys: readonly string[];
}) {
  const upcoming = nodes.filter(
    (node) => node.kind === "phase" && node.status === "upcoming",
  );
  const firstUpcomingKey = upcoming[0]?.key;
  const clearing = nodes.filter(
    (node) => node.kind === "phase" && clearingKeys.includes(node.key),
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden" aria-hidden>
      {upcoming.map((node) => (
        <FogPatch
          key={`fog-${node.key}`}
          node={node}
          opacity={node.key === firstUpcomingKey ? 0.58 : 0.86}
          priority={node.key === firstUpcomingKey}
        />
      ))}
      {clearing.map((node) => (
        <FogPatch key={`clearing-${node.key}`} node={node} className="roadmap-fog-clearing" opacity={0.86} />
      ))}
    </div>
  );
}

function FogPatch({
  node,
  opacity,
  className,
  priority = false,
}: {
  node: RoadmapNode;
  opacity: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`absolute h-[31%] w-[42%] -translate-x-1/2 -translate-y-1/2 ${className ?? ""}`}
      style={{
        left: `${(node.x / MAP_VIEWBOX.width) * 100}%`,
        top: `${(node.y / MAP_VIEWBOX.height) * 100}%`,
        opacity,
      }}
    >
      <Image
        src="/maps/roadmap/effects/fog.webp"
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 767px) 42vw, 215px"
        className="object-contain"
      />
    </div>
  );
}
