"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp, pointOn, polyLength, type V3 } from "./math";
import styles from "./caption.module.css";

// 動く3D模型（CPU・メモリ・ストレージ／サイバー攻撃）で共通の部品。
//   - Mover … 紙・小包などを、経路に沿って滑らかに動かす入れ物
//   - CameraRig … 決めたショットへカメラをゆっくり寄せる
//   - Label / LabelProjector … ふつうの HTML の札を、毎フレーム 3D の点の画面位置へ動かす
//     （drei の Html は札ごとに別 React ルートになり unmount で壊れるため、自前で project する）
//   - CaptionBubble / CaptionProjector … いま起きていることを1つだけ伝える吹き出しと引き出し線

/** 足元の光：放射グラデーションのテクスチャ（加算合成で使う） */
export function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.55, "rgba(255,255,255,0.45)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** 画面外にある間は描画を止める（光の点滅などで電池を使わない） */
export function useInView(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

/**
 * 動く札・紙・小包の入れ物。at が変わると、今いる所から path を通って at まで滑らかに動く。
 * at が null なら隠す（start は最初に現れる位置）。
 */
export function Mover({
  at,
  start,
  path,
  speed = 0.12,
  reducedMotion,
  epoch = 0,
  objRef,
  movingRef,
  children,
}: {
  at: V3 | null;
  start?: V3;
  path?: V3[];
  speed?: number;
  reducedMotion: boolean;
  /** 変わったら、path があれば最初から動かし直す（「もう一度見る」・STEP の移動） */
  epoch?: number;
  /** 札を追従させるときに、動く入れ物を外から参照する */
  objRef?: RefObject<THREE.Group | null>;
  /** 動いている間 true（札を「動いている間だけ」出すのに使う） */
  movingRef?: RefObject<boolean>;
  children: ReactNode;
}) {
  const own = useRef<THREE.Group>(null);
  const ref = objRef ?? own;
  const anim = useRef<{ pts: V3[]; t: number; dur: number } | null>(null);
  const key = at ? at.join(",") + "|" + (path?.map((p) => p.join(",")).join(";") ?? "") + "|" + epoch : "none";
  const last = useRef<string>("");
  const lastEpoch = useRef(epoch);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (key !== last.current) {
      const replay = lastEpoch.current !== epoch;
      lastEpoch.current = epoch;
      const wasHidden = !g.visible || last.current === "" || last.current === "none" || (replay && !!path);
      last.current = key;
      if (!at) {
        g.visible = false;
        anim.current = null;
        return;
      }
      const from: V3 = wasHidden ? (start ?? path?.[0] ?? at) : [g.position.x, g.position.y, g.position.z];
      const pts: V3[] = [from, ...(path ?? []), at];
      g.visible = true;
      if (reducedMotion || !path) {
        g.position.set(...at);
        anim.current = null;
      } else {
        anim.current = { pts, t: 0, dur: Math.max(0.9, polyLength(pts) / speed) };
        g.position.set(...from);
      }
    }
    const a = anim.current;
    if (a) {
      // 一時停止から戻った直後の大きな dt で飛ばないよう、1フレームの進みを抑える
      a.t = Math.min(1, a.t + Math.min(dt, 0.05) / a.dur);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      pointOn(a.pts, e, g.position);
      if (a.t >= 1) anim.current = null;
    }
    if (movingRef) movingRef.current = !!anim.current;
  });
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}

export type Shot = { pos: V3; look: V3 };

/** ショットへカメラを滑らかに寄せる */
export function CameraRig({ shot, reducedMotion }: { shot: Shot; reducedMotion: boolean }) {
  const look = useRef(new THREE.Vector3(...shot.look));
  const first = useRef(true);
  useFrame((s, dt) => {
    const cam = s.camera;
    const k = reducedMotion || first.current ? 1000 : 2.2;
    first.current = false;
    cam.position.x = damp(cam.position.x, shot.pos[0], k, dt);
    cam.position.y = damp(cam.position.y, shot.pos[1], k, dt);
    cam.position.z = damp(cam.position.z, shot.pos[2], k, dt);
    look.current.x = damp(look.current.x, shot.look[0], k, dt);
    look.current.y = damp(look.current.y, shot.look[1], k, dt);
    look.current.z = damp(look.current.z, shot.look[2], k, dt);
    cam.lookAt(look.current);
  });
  return null;
}

export type Place = "above" | "below" | "left" | "right" | "center";
const SHIFT: Record<Place, string> = {
  above: "translate(-50%, calc(-100% - 6px))",
  below: "translate(-50%, 6px)",
  left: "translate(calc(-100% - 8px), -50%)",
  right: "translate(8px, -50%)",
  center: "translate(-50%, -50%)",
};
type Anchor = { el: HTMLElement; at: V3; follow?: RefObject<THREE.Object3D | null>; place: Place };
export type Registry = RefObject<Map<string, Anchor>>;

export function useLabelRegistry(): Registry {
  return useRef(new Map<string, Anchor>());
}

/** 札（ふつうの HTML）を、毎フレーム 3D の点の画面位置へ動かす */
export function LabelProjector({ registry }: { registry: Registry }) {
  const v = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    const p = v.current;
    for (const a of registry.current.values()) {
      if (a.follow) {
        const o = a.follow.current;
        if (!o || !o.visible) {
          a.el.style.visibility = "hidden";
          continue;
        }
        o.getWorldPosition(p);
        p.x += a.at[0];
        p.y += a.at[1];
        p.z += a.at[2];
      } else {
        p.set(...a.at);
      }
      p.project(camera);
      const x = (p.x * 0.5 + 0.5) * size.width;
      const y = (-p.y * 0.5 + 0.5) * size.height;
      a.el.style.visibility = p.z > 1 ? "hidden" : "visible";
      a.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${SHIFT[a.place]}`;
    }
  });
  return null;
}

/** 3D の点（または動く物）に重ねる札 */
export function Label({ registry, id, at, follow, place = "below", children }: { registry: Registry; id: string; at: V3; follow?: RefObject<THREE.Object3D | null>; place?: Place; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [x, y, z] = at;
  useEffect(() => {
    const el = ref.current;
    const map = registry.current;
    if (!el) return;
    map.set(id, { el, at: [x, y, z], follow, place });
    return () => {
      map.delete(id);
    };
  }, [registry, id, x, y, z, follow, place]);
  return (
    <div ref={ref} className="pointer-events-none absolute left-0 top-0" style={{ visibility: "hidden", willChange: "transform" }}>
      {children}
    </div>
  );
}

export type CaptionPlace = "band" | "below" | "above";
/** 吹き出しの色。lost / danger＝失った・被害（赤）、safe＝残った（緑） */
export type CaptionTone = "lost" | "safe" | "danger";

/**
 * 吹き出しの置き場所。band＝上端の帯（横位置は指す点の真上に寄せる）、below / above＝指す点のすぐ下・上。
 * 点までは細い引き出し線でつなぐ。帯に置くと場面が変わっても縦の位置が動かず、視線が迷わない。
 */
export function CaptionProjector({ at, place, root }: { at: V3 | null; place: CaptionPlace; root: RefObject<HTMLDivElement | null> }) {
  const v = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    const el = root.current;
    const bubble = el?.querySelector<HTMLElement>("[data-cap=bubble]");
    const line = el?.querySelector<SVGLineElement>("[data-cap=line]");
    const dot = el?.querySelector<SVGCircleElement>("[data-cap=dot]");
    if (!bubble || !line || !dot) return;
    if (!at) {
      bubble.style.visibility = "hidden";
      line.style.visibility = "hidden";
      dot.style.visibility = "hidden";
      return;
    }
    const p = v.current;
    p.set(...at).project(camera);
    const x = (p.x * 0.5 + 0.5) * size.width;
    const y = (-p.y * 0.5 + 0.5) * size.height;
    const w = bubble.offsetWidth;
    const h = bubble.offsetHeight;
    const m = 8;
    const left = Math.min(Math.max(x - w / 2, m), size.width - w - m);
    const gap = 26;
    const top = Math.min(Math.max(place === "band" ? m : place === "below" ? y + gap : y - gap - h, m), size.height - h - m);
    bubble.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    bubble.style.visibility = "visible";
    const ex = Math.min(Math.max(x, left + 12), left + w - 12);
    const ey = top + h / 2 < y ? top + h : top;
    line.setAttribute("x1", ex.toFixed(1));
    line.setAttribute("y1", ey.toFixed(1));
    line.setAttribute("x2", x.toFixed(1));
    line.setAttribute("y2", y.toFixed(1));
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    line.style.visibility = "visible";
    dot.style.visibility = "visible";
  });
  return null;
}

export function CaptionBubble({
  caption,
  root,
  testId,
}: {
  caption: { text: string; tone?: CaptionTone; target: string } | null;
  root: RefObject<HTMLDivElement | null>;
  testId: string;
}) {
  return (
    <div ref={root} className="absolute inset-0">
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <line data-cap="line" className={styles.captionLine} data-tone={caption?.tone} style={{ visibility: "hidden" }} />
        <circle data-cap="dot" r={3.5} className={styles.captionDot} data-tone={caption?.tone} style={{ visibility: "hidden" }} />
      </svg>
      <div data-cap="bubble" className="absolute left-0 top-0 max-w-[78%]" style={{ visibility: "hidden" }}>
        {caption && (
          <p key={caption.text} className={styles.caption} data-tone={caption.tone} data-target={caption.target} data-testid={testId} role="status">
            {caption.text}
          </p>
        )}
      </div>
    </div>
  );
}
