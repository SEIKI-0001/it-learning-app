"use client";

// CSS だけの紙吹雪バースト（ライブラリ不使用・マウント時に1回だけ再生）。
// 各紙片は CSS 変数で飛ぶ方向・回転・遅延・色を変え、globals.css の
// confetti-burst keyframes で放射 → 落下 → フェードする。装飾専用なので aria-hidden。

import { useMemo, type CSSProperties } from "react";

const COLORS = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#38bdf8", "#f97316"];
const PIECE_COUNT = 24;

// インデックス由来の擬似乱数(0〜1・純粋)。レンダー中に Math.random を呼ばずに
// 紙片ごとの揺らぎを作る（レンダーの純粋性ルール react-hooks/purity 対応）。
function jitter(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => {
        // 全方位に均等 + 少しの揺らぎで放射する。上方向へやや強く飛ばす。
        const angle = (i / PIECE_COUNT) * Math.PI * 2 + jitter(i, 1) * 0.5;
        const distance = 60 + jitter(i, 2) * 90;
        return {
          dx: Math.round(Math.cos(angle) * distance),
          dy: Math.round(Math.sin(angle) * distance * 0.8 - 40),
          rot: Math.round(jitter(i, 3) * 540 - 270),
          delay: Math.round(jitter(i, 4) * 150),
          color: COLORS[i % COLORS.length],
        };
      }),
    [],
  );

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
              backgroundColor: p.color,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
