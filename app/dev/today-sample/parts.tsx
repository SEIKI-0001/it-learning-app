// 3案で共有する小さな描画部品（リング・ゲージ・スパークライン）。色は呼び出し側が決める。

import { useId } from "react";

export function Ring({
  value,
  size,
  stroke,
  track,
  color,
  gradient,
  children,
  className,
}: {
  value: number;
  size: number;
  stroke: number;
  track: string;
  color?: string;
  gradient?: [string, string];
  children?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {gradient && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={gradient ? `url(#${id})` : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * clamped} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {children && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** 半円ゲージ。value は 0〜1 */
export function Gauge({
  value,
  width,
  stroke,
  track,
  gradient,
}: {
  value: number;
  width: number;
  stroke: number;
  track: string;
  gradient: [string, string];
}) {
  const id = useId();
  const r = (width - stroke) / 2;
  const h = width / 2 + stroke / 2;
  const len = Math.PI * r;
  const d = `M ${stroke / 2} ${width / 2} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${width / 2}`;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${len * value} ${len}`}
      />
    </svg>
  );
}

/** 面つきスパークライン */
export function Sparkline({
  values,
  width,
  height,
  color,
}: {
  values: number[];
  width: number;
  height: number;
  color: string;
}) {
  const id = useId();
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - ((v - min) / (max - min)) * height,
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3.5" fill={color} />
    </svg>
  );
}
