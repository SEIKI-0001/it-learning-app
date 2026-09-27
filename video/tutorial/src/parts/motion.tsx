// シーン共通の動きの部品：バネ、文字の跳ね出し、紙吹雪、キラキラ、背景、スマホ枠。
import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";

/** start フレームから跳ねて 0→1 になる値 */
export function usePop(start: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 160, mass: 0.7, ...config } });
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 決定的な乱数（毎フレーム同じ値になるように）
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export type Seg = { t: string; color?: string };

/** 1文字ずつ下から跳ね上がる見出し */
export function Kinetic({
  segs,
  start = 0,
  size = 96,
  stagger = 1.6,
  color = C.white,
  align = "left",
  weight = 800,
  style,
}: {
  segs: Seg[];
  start?: number;
  size?: number;
  stagger?: number;
  color?: string;
  align?: CSSProperties["textAlign"];
  weight?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let i = 0;
  return (
    <div style={{ fontFamily: FONT, fontWeight: weight, fontSize: size, lineHeight: 1.25, color, textAlign: align, letterSpacing: "0.02em", ...style }}>
      {segs.map((seg, si) =>
        seg.t === "\n" ? (
          <br key={si} />
        ) : (
          <span key={si} style={{ color: seg.color }}>
            {[...seg.t].map((ch) => {
              const k = i++;
              const p = spring({ frame: frame - start - k * stagger, fps, config: { damping: 10, stiffness: 180, mass: 0.6 } });
              return (
                <span
                  key={k}
                  style={{
                    display: "inline-block",
                    opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
                    transform: `translateY(${(1 - p) * size * 0.7}px) scale(${0.6 + p * 0.4}) rotate(${(1 - p) * -12}deg)`,
                    whiteSpace: "pre",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ),
      )}
    </div>
  );
}

/** 中心から放射状に飛ぶ紙吹雪 */
export function Confetti({ start, x, y, count = 70, spread = 900, seed = 1 }: { start: number; x: number; y: number; count?: number; spread?: number; seed?: number }) {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > 90) return null;
  const r = rng(seed);
  const colors = [C.sun, C.mint, C.brand400, "#FF7AA2", C.cyan, C.orange];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const ang = r() * Math.PI * 2;
        const speed = (0.35 + r() * 0.65) * spread;
        const rot = r() * 720;
        const w = 12 + r() * 14;
        const c = colors[i % colors.length];
        const k = t / 30;
        const ease = 1 - Math.exp(-k * 2.6);
        const px = x + Math.cos(ang) * speed * ease;
        const py = y + Math.sin(ang) * speed * ease * 0.8 + k * k * 260;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: w,
              height: w * 0.45,
              background: c,
              borderRadius: 3,
              opacity: interpolate(t, [60, 90], [1, 0], clamp),
              transform: `rotate(${rot + t * 14}deg) scaleX(${Math.cos((t + i) / 4)})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** 4点星のキラキラ */
export function Sparkle({ x, y, size, delay = 0, color = C.sun }: { x: number; y: number; size: number; delay?: number; color?: string }) {
  const frame = useCurrentFrame();
  const t = ((frame - delay) % 40) / 40;
  const s = frame < delay ? 0 : Math.sin(t * Math.PI);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ position: "absolute", left: x - size / 2, top: y - size / 2, transform: `scale(${s}) rotate(${t * 90}deg)`, opacity: s }}>
      <path d="M0,-50 C6,-8 8,-6 50,0 C8,6 6,8 0,50 C-6,8 -8,6 -50,0 C-8,-6 -6,-8 0,-50 Z" fill={color} />
    </svg>
  );
}

/** ゆっくり流れるグラデーション背景＋浮遊する光の粒 */
export function Backdrop({ from = C.brand700, to = C.brand950, dots = true, seed = 3 }: { from?: string; to?: string; dots?: boolean; seed?: number }) {
  const frame = useCurrentFrame();
  const r = rng(seed);
  const ang = 135 + Math.sin(frame / 60) * 15;
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${ang}deg, ${from}, ${to})`, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1400, height: 1400, left: -300 + Math.sin(frame / 50) * 80, top: -700, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 65%)" }} />
      {dots &&
        Array.from({ length: 26 }, (_, i) => {
          const x = r() * 1920;
          const y0 = r() * 1080;
          const s = 6 + r() * 18;
          const sp = 0.4 + r() * 1.2;
          const y = ((y0 - frame * sp) % 1180 + 1180) % 1180 - 50;
          return <div key={i} style={{ position: "absolute", left: x + Math.sin((frame + i * 20) / 30) * 20, top: y, width: s, height: s, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />;
        })}
    </div>
  );
}

/** スマホの枠。中身は 390×844 の論理サイズで描く */
export function Phone({ children, scale = 1, style }: { children: ReactNode; scale?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: 430 * scale,
        height: 884 * scale,
        borderRadius: 64 * scale,
        background: "#0B1220",
        padding: 20 * scale,
        boxShadow: "0 60px 120px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(255,255,255,0.12)",
        ...style,
      }}
    >
      <div style={{ width: 390, height: 844, transform: `scale(${scale})`, transformOrigin: "top left", borderRadius: 46, overflow: "hidden", background: C.white, position: "relative", fontFamily: FONT, color: C.ink }}>
        {children}
      </div>
    </div>
  );
}

/** シーン冒頭を覆って切り替える斜めのワイプ */
export function Wipe({ color = C.sun, color2 = C.brand500 }: { color?: string; color2?: string }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  if (p >= 1) return null;
  return (
    <>
      <div style={{ position: "absolute", inset: -200, background: color2, transform: `translateX(${p * 2600}px) skewX(-18deg)` }} />
      <div style={{ position: "absolute", inset: -200, background: color, transform: `translateX(${p * 2600 - 260}px) skewX(-18deg)`, width: 240 }} />
    </>
  );
}
