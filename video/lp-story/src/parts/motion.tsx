// シーン共通の動きと部品：文字の立ち上がり、赤ペンの線・丸、背景、スマホ、カメラ。
// 動きは LP の落ち着いたトーンに合わせ、跳ねさせずに「すっと立ち上がって止まる」を基本にする。
import type { CSSProperties, ReactNode } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BODY, C, DISP } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** start から dur フレームかけて 0→1 */
export function progress(frame: number, start: number, dur: number, ease = easeOutCubic) {
  return ease(interpolate(frame, [start, start + dur], [0, 1], clamp));
}

export type Run = { t: string; color?: string };

/**
 * 1行の文字が、少しずつずれて下からぼかし明けで立ち上がる。
 * exit を渡すと、そのフレームから上へ抜けて消える。
 */
export function Rise({
  runs,
  at,
  exit,
  size,
  font = DISP,
  weight = 600,
  color = C.ink,
  stagger = 0.9,
  dur = 22,
  style,
}: {
  runs: Run[] | string;
  at: number;
  exit?: number;
  size: number;
  font?: string;
  weight?: number;
  color?: string;
  stagger?: number;
  dur?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const list = typeof runs === "string" ? [{ t: runs }] : runs;
  const out = exit === undefined ? 0 : progress(frame, exit, 14, easeInOutCubic);
  let k = 0;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.32,
        letterSpacing: "0.04em",
        color,
        whiteSpace: "nowrap",
        opacity: 1 - out,
        transform: `translateY(${-out * size * 0.25}px)`,
        filter: out > 0 ? `blur(${out * 8}px)` : undefined,
        ...style,
      }}
    >
      {list.map((run, ri) => (
        <span key={ri} style={{ color: run.color }}>
          {[...run.t].map((ch) => {
            const p = progress(frame, at + k++ * stagger, dur, easeOutExpo);
            return (
              <span
                key={k}
                style={{
                  display: "inline-block",
                  opacity: p,
                  transform: `translateY(${(1 - p) * size * 0.32}px)`,
                  filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
                }}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

/** 小見出し（STEP 1 など）。左に短い線を引いてから文字を出す */
export function Eyebrow({ text, at, color = C.ai, size = 34, exit }: { text: string; at: number; color?: string; size?: number; exit?: number }) {
  const frame = useCurrentFrame();
  const p = progress(frame, at, 18, easeOutExpo);
  const out = exit === undefined ? 0 : progress(frame, exit, 12);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: 1 - out }}>
      <div style={{ width: 56 * p, height: 3, background: color, borderRadius: 2 }} />
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: size, letterSpacing: "0.14em", color, opacity: p, transform: `translateX(${(1 - p) * -16}px)` }}>{text}</div>
    </div>
  );
}

/** 手書きの赤ペン下線（少し波打つ） */
export function PenLine({ width, at, dur = 16, color = C.shu, stroke = 9, style }: { width: number; at: number; dur?: number; color?: string; stroke?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const p = progress(frame, at, dur, easeInOutCubic);
  const h = 28;
  const d = `M4 ${h * 0.62} C ${width * 0.25} ${h * 0.35}, ${width * 0.55} ${h * 0.78}, ${width - 4} ${h * 0.42}`;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ position: "absolute", overflow: "visible", opacity: p > 0 ? 1 : 0, ...style }}>
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - p * 100} />
    </svg>
  );
}

/** 手書きの赤ペン楕円（LP ヒーローの「さわって理解」の丸と同じ表現） */
export function PenCircle({ w, h, at, dur = 20, color = C.shu, stroke = 7, style }: { w: number; h: number; at: number; dur?: number; color?: string; stroke?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const p = progress(frame, at, dur, easeInOutCubic);
  // 一周より少し長く描き、始点と終点をずらして手書きらしくする
  const rx = w / 2 - stroke;
  const ry = h / 2 - stroke;
  const cx = w / 2;
  const cy = h / 2;
  const pts: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = -Math.PI * 0.62 + (i / 64) * Math.PI * 2.12;
    const wob = 1 + 0.035 * Math.sin(i / 5);
    pts.push(`${(cx + Math.cos(a) * rx * wob).toFixed(1)},${(cy + Math.sin(a) * ry * wob - (i / 64) * ry * 0.12).toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", overflow: "visible", opacity: p > 0 ? 1 : 0, ...style }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - p * 100} />
    </svg>
  );
}

/** 明るい場面の背景：白地に淡藍のにじみ（LP の白背景と地続き） */
export function Paper() {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, background: C.white, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1800,
          height: 1800,
          left: 900 + Math.sin(frame / 90) * 60,
          top: -900 + Math.cos(frame / 110) * 40,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.wash} 0%, rgba(242,245,254,0) 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          left: -500,
          top: 500 + Math.sin(frame / 80) * 40,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(41,70,206,0.05) 0%, rgba(41,70,206,0) 60%)",
        }}
      />
    </div>
  );
}

/** 暗い場面の背景：夜の机の色。ゆっくり動く光と周辺減光 */
export function Night() {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${C.night2}, ${C.night} 70%)`, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1600,
          height: 1600,
          left: 700 + Math.sin(frame / 70) * 80,
          top: -700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(120,140,230,0.16) 0%, rgba(120,140,230,0) 60%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
    </div>
  );
}

/**
 * カメラ：中身の点 (x, y) を枠の中心 (cx, cy) に写し、scale 倍に寄る。
 * x=cx, y=cy, scale=1 のとき素通し。
 */
export function Camera({ x, y, scale, cx, cy, children, style }: { x: number; y: number; scale: number; cx: number; cy: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${cx}px, ${cy}px) scale(${scale}) translate(${-x}px, ${-y}px)` }}>{children}</div>
    </div>
  );
}

/** カメラの位置を、キーフレーム（フレーム, 値）の間でなめらかに補間する */
export function track(frame: number, keys: [number, number][]) {
  return interpolate(
    frame,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    { ...clamp, easing: easeInOutCubic },
  );
}

export const PHONE_SCREEN = { w: 390, h: 844 };
export const PHONE_BEZEL = 14;

/** スマホ（論理 390×844 の画面）。screens は重ねて表示する画面画像と不透明度 */
export function Phone({ screens, scale, children, style }: { screens: { src: string; opacity: number; y?: number }[]; scale: number; children?: ReactNode; style?: CSSProperties }) {
  const w = PHONE_SCREEN.w * scale;
  const h = PHONE_SCREEN.h * scale;
  return (
    <div
      style={{
        position: "absolute",
        width: w + PHONE_BEZEL * 2,
        height: h + PHONE_BEZEL * 2,
        borderRadius: 58 * scale,
        background: "#11162b",
        padding: PHONE_BEZEL,
        boxShadow: "0 50px 100px rgba(26,35,64,0.22), 0 12px 30px rgba(26,35,64,0.14), inset 0 0 0 2px rgba(255,255,255,0.08)",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: w, height: h, borderRadius: 46 * scale, overflow: "hidden", background: C.white }}>
        {screens.map((s, i) => (
          <Img
            key={i}
            src={staticFile(s.src)}
            style={{ position: "absolute", left: 0, top: (s.y ?? 0) * scale, width: w, height: "auto", opacity: s.opacity }}
          />
        ))}
        <div style={{ position: "absolute", left: 0, top: 0, width: PHONE_SCREEN.w, height: PHONE_SCREEN.h, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{children}</div>
      </div>
    </div>
  );
}

/** タップの波紋（画面の論理座標で置く） */
export function Tap({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -8 || t > 26) return null;
  const press = interpolate(t, [-8, 0, 6], [0, 1, 0.85], clamp);
  const ring = progress(frame, at, 22, easeOutCubic);
  return (
    <>
      <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: "50%", background: "rgba(26,35,64,0.28)", opacity: t < 8 ? press : interpolate(t, [8, 16], [0.85, 0], clamp), transform: `scale(${0.6 + press * 0.4})` }} />
      <div style={{ position: "absolute", left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: "50%", border: "3px solid rgba(41,70,206,0.6)", opacity: t < 0 ? 0 : 1 - ring, transform: `scale(${0.5 + ring})` }} />
    </>
  );
}

/** 撮影用データの注記（実画面の場面で右下に小さく） */
export function ScreenNote({ text = "実際の画面（撮影用の学習データ）", color = C.sub }: { text?: string; color?: string }) {
  return <div style={{ position: "absolute", right: 64, bottom: 40, fontFamily: BODY, fontSize: 24, color, letterSpacing: "0.04em" }}>{text}</div>;
}
