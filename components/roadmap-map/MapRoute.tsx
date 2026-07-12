import type { RoadmapNode } from "./mapConfig";
import { MAP_VIEWBOX } from "./mapConfig";

type Point = { x: number; y: number };

function bezierSegment(p0: Point, p1: Point, p2: Point, p3: Point): string {
  const c1x = p1.x + (p2.x - p0.x) / 6;
  const c1y = p1.y + (p2.y - p0.y) / 6;
  const c2x = p2.x - (p3.x - p1.x) / 6;
  const c2y = p2.y - (p3.y - p1.y) / 6;
  return `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
}

function roadPoints(nodes: readonly RoadmapNode[]): Point[] {
  const points: Point[] = [];
  nodes.forEach((node, index) => {
    if (index > 0) {
      const previous = nodes[index - 1];
      const dx = node.x - previous.x;
      const dy = node.y - previous.y;
      const length = Math.hypot(dx, dy) || 1;
      const amplitude = (index % 2 === 0 ? 1 : -1) * Math.min(3.5, length * 0.12);
      points.push({
        x: (previous.x + node.x) / 2 + (-dy / length) * amplitude,
        y: (previous.y + node.y) / 2 + (dx / length) * amplitude,
      });
    }
    points.push(node);
  });
  return points;
}

function fullPath(points: readonly Point[]): string {
  const segments = points.slice(0, -1).map((_, index) =>
    bezierSegment(
      points[index - 1] ?? points[index],
      points[index],
      points[index + 1],
      points[index + 2] ?? points[index + 1],
    ),
  );
  return `M ${points[0].x} ${points[0].y} ${segments.join(" ")}`;
}

function nodeSegmentPath(points: readonly Point[], index: number): string {
  const start = index * 2;
  const first = bezierSegment(
    points[start - 1] ?? points[start],
    points[start],
    points[start + 1],
    points[start + 2],
  );
  const second = bezierSegment(
    points[start],
    points[start + 1],
    points[start + 2],
    points[start + 3] ?? points[start + 2],
  );
  return `M ${points[start].x} ${points[start].y} ${first} ${second}`;
}

export default function MapRoute({
  nodes,
  clearingKeys,
}: {
  nodes: readonly RoadmapNode[];
  clearingKeys: readonly string[];
}) {
  const points = roadPoints(nodes);
  const path = fullPath(points);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
      aria-hidden
    >
      <path d={path} fill="none" stroke="#3f2417" strokeWidth="3.4" strokeLinecap="round" opacity="0.65" />
      <path d={path} fill="none" stroke="#f8d680" strokeWidth="2.25" strokeLinecap="round" opacity="0.95" />
      {nodes.slice(0, -1).map((node, index) => {
        const traveled = node.status === "done";
        const drawing = traveled && clearingKeys.includes(nodes[index + 1]?.key ?? "");
        return (
          <path
            key={node.key}
            d={nodeSegmentPath(points, index)}
            fill="none"
            stroke={traveled ? "#e1712f" : "#5f3924"}
            strokeWidth={traveled ? 1.25 : 0.9}
            strokeLinecap="round"
            strokeOpacity={traveled ? 1 : 0.72}
            className={drawing ? "roadmap-path-draw" : undefined}
            pathLength={drawing ? 1 : undefined}
            strokeDasharray={drawing ? undefined : traveled ? "0" : "0.1 2.2"}
          />
        );
      })}
    </svg>
  );
}
