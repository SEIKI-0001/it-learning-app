import type { CSSProperties, ReactNode } from "react";
import styles from "./diorama.module.css";

// CSS 3D（perspective + preserve-3d）で組む本物の奥行きの部品。
// ワールド座標: x=右、y=手前、z=上（床の div の法線方向）。単位は px。
// 光は左上奥から固定で当てる想定なので、面の明るさは向きだけで決まる（カメラを回しても陰影が破綻しない）。

export type Vec3 = { x: number; y: number; z?: number };

type FaceName = "top" | "front" | "back" | "left" | "right";

/** 直方体。(x,y,z) は奥・左・下の角。faces で各面に中身（画面・LED など）を貼れる。 */
export function Box({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  color,
  className,
  faces,
  faceClass,
  style,
  omit,
  testId,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  color: string;
  className?: string;
  faces?: Partial<Record<FaceName, ReactNode>>;
  faceClass?: Partial<Record<FaceName, string>>;
  style?: CSSProperties;
  omit?: FaceName[];
  testId?: string;
}) {
  const transforms: Record<FaceName, { w: number; h: number; t: string }> = {
    top: { w, h: d, t: `translateZ(${h}px)` },
    front: { w, h, t: `translateY(${d}px) translateZ(${h}px) rotateX(-90deg)` },
    back: { w, h, t: `translateZ(${h}px) rotateX(-90deg)` },
    left: { w: d, h, t: `translateZ(${h}px) rotateZ(90deg) rotateX(-90deg)` },
    right: { w: d, h, t: `translateX(${w}px) translateZ(${h}px) rotateZ(90deg) rotateX(-90deg)` },
  };
  return (
    <div
      className={`${styles.obj} ${className ?? ""}`}
      style={{ transform: `translate3d(${x}px, ${y}px, ${z}px)`, "--c": color, ...style } as CSSProperties}
      data-testid={testId}
    >
      {(Object.keys(transforms) as FaceName[])
        .filter((name) => !omit?.includes(name))
        .map((name) => {
          const f = transforms[name];
          return (
            <div
              key={name}
              className={`${styles.face} ${faceClass?.[name] ?? ""}`}
              data-face={name}
              style={{ width: f.w, height: f.h, transform: f.t }}
            >
              {faces?.[name]}
            </div>
          );
        })}
    </div>
  );
}

/** 2点を結ぶ円柱（ケーブル・ガラス管）。帯を N 枚、軸まわりに回して並べる。
 *  from.z / to.z を渡すと傾いた円柱（空中の経路）になる。省略時は z の高さで水平。 */
export function Cylinder({
  from,
  to,
  z,
  r,
  segments = 12,
  className,
  stripClassName,
  style,
  testId,
}: {
  from: Vec3;
  to: Vec3;
  z: number;
  r: number;
  segments?: number;
  className?: string;
  stripClassName?: string;
  style?: CSSProperties;
  testId?: string;
}) {
  const z0 = from.z ?? z;
  const z1 = to.z ?? z;
  const flat = Math.hypot(to.x - from.x, to.y - from.y);
  const length = Math.hypot(flat, z1 - z0);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  // rotateY(-e) で軸（ローカル x）を上向きに e 度起こす
  const elevation = (Math.atan2(z1 - z0, flat) * 180) / Math.PI;
  const step = 360 / segments;
  const strip = (2 * Math.PI * r) / segments + 0.8;
  return (
    <div
      className={`${styles.obj} ${className ?? ""}`}
      style={{
        transform: `translate3d(${from.x}px, ${from.y}px, ${z0}px) rotateZ(${angle}deg) rotateY(${-elevation}deg)`,
        ...style,
      }}
      data-testid={testId}
    >
      {Array.from({ length: segments }, (_, i) => {
        const a = i * step;
        // 上向きほど明るい（0=真上）。側面は中間、下面は暗い。
        const light = Math.cos((a * Math.PI) / 180);
        return (
          <div
            key={i}
            className={`${styles.strip} ${stripClassName ?? ""}`}
            data-up={light > 0.35 ? "true" : "false"}
            style={
              {
                width: length,
                height: strip,
                top: -strip / 2,
                transform: `rotateX(${a}deg) translateZ(${r}px)`,
                "--lit": `${Math.round(58 + 42 * Math.max(light, -0.4))}%`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/** 常にカメラを向く板（人物のイラスト）。(x,y,z) が足元の中心。 */
export function Billboard({
  x,
  y,
  z = 0,
  w,
  h,
  className,
  children,
}: {
  x: number;
  y: number;
  z?: number;
  w: number;
  h: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.obj} style={{ transform: `translate3d(${x}px, ${y}px, ${z}px)` }}>
      <div className={`${styles.billboard} ${className ?? ""}`} style={{ width: w, height: h, left: -w / 2, top: -h }}>
        {children}
      </div>
    </div>
  );
}

/** 床に落ちるやわらかい影（光は左上奥なので右手前へ少しずらして置く）。 */
export function FloorShadow({ x, y, w, d, opacity = 0.35 }: { x: number; y: number; w: number; d: number; opacity?: number }) {
  return (
    <div
      className={styles.shadow}
      style={{ width: w, height: d, transform: `translate3d(${x}px, ${y}px, 0.6px)`, opacity }}
    />
  );
}

/** 床に貼る平らな帯（盗聴ケーブルなど）。 */
export function FloorStrip({
  from,
  to,
  width,
  className,
  z = 0.8,
}: {
  from: Vec3;
  to: Vec3;
  width: number;
  className?: string;
  z?: number;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (
    <div
      className={`${styles.floorStrip} ${className ?? ""}`}
      style={{
        width: length,
        height: width,
        top: -width / 2,
        transform: `translate3d(${from.x}px, ${from.y}px, ${z}px) rotateZ(${angle}deg)`,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// カメラ：ワールド座標 → ステージ上の画面座標（HTML ラベルを 3D の点に貼り付けるため）
// ---------------------------------------------------------------------------

export type Camera = { yaw: number; pitch: number; zoom: number; fx: number; fy: number; fz: number };

export function cameraTransform(cam: Camera, fit: number) {
  return `scale(${(cam.zoom * fit).toFixed(4)}) rotateX(${cam.pitch.toFixed(3)}deg) rotateZ(${cam.yaw.toFixed(3)}deg) translate3d(${(-cam.fx).toFixed(2)}px, ${(-cam.fy).toFixed(2)}px, ${(-cam.fz).toFixed(2)}px)`;
}

/** CSS の変換（scale → rotateX → rotateZ → translate）と perspective を同じ順に計算する。 */
export function project(p: Vec3, cam: Camera, fit: number, size: { w: number; h: number }, perspective: number) {
  const qx = p.x - cam.fx;
  const qy = p.y - cam.fy;
  const qz = (p.z ?? 0) - cam.fz;
  const yaw = (cam.yaw * Math.PI) / 180;
  const pitch = (cam.pitch * Math.PI) / 180;
  const x1 = qx * Math.cos(yaw) - qy * Math.sin(yaw);
  const y1 = qx * Math.sin(yaw) + qy * Math.cos(yaw);
  const y2 = y1 * Math.cos(pitch) - qz * Math.sin(pitch);
  const z2 = y1 * Math.sin(pitch) + qz * Math.cos(pitch);
  const s = cam.zoom * fit;
  const k = perspective / (perspective - z2 * s);
  return { x: size.w / 2 + x1 * s * k, y: size.h / 2 + y2 * s * k };
}

export function mixCamera(a: Camera, b: Camera, t: number): Camera {
  const m = (u: number, v: number) => u + (v - u) * t;
  return {
    yaw: m(a.yaw, b.yaw),
    pitch: m(a.pitch, b.pitch),
    zoom: m(a.zoom, b.zoom),
    fx: m(a.fx, b.fx),
    fy: m(a.fy, b.fy),
    fz: m(a.fz, b.fz),
  };
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
