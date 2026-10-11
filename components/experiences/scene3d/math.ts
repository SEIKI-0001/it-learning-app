import * as THREE from "three";

// 動く3D模型（three.js）で共通に使う座標の計算。座標は glTF（Y上・手前が +Z、単位 m）。

export type V3 = [number, number, number];

export function damp(cur: number, to: number, k: number, dt: number) {
  return THREE.MathUtils.damp(cur, to, k, dt);
}

/** 折れ線の長さ */
export function polyLength(pts: V3[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += new THREE.Vector3(...pts[i]).distanceTo(new THREE.Vector3(...pts[i - 1]));
  return len;
}

/** 折れ線上の t（0〜1）の位置 */
export function pointOn(pts: V3[], t: number, out: THREE.Vector3) {
  if (pts.length === 1) return out.set(...pts[0]);
  const total = polyLength(pts);
  let d = THREE.MathUtils.clamp(t, 0, 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = new THREE.Vector3(...pts[i - 1]);
    const b = new THREE.Vector3(...pts[i]);
    const seg = a.distanceTo(b);
    if (d <= seg || i === pts.length - 1) return out.copy(a).lerp(b, seg ? Math.min(d / seg, 1) : 1);
    d -= seg;
  }
  return out.set(...pts[pts.length - 1]);
}

export const lift = (p: V3, dy: number): V3 => [p[0], p[1] + dy, p[2]];
