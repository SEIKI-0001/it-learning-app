"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { DOC_TEXT, type BusId, type ComputerSceneProps, type PartId, type PartState } from "./computerTypes";
import styles from "./computerdiorama.module.css";

// CPU・メモリ・ストレージの図解の「動く3D」版。Blender で作った机上のオープンフレームPC（public/models/desk-pc.glb）を
// three.js で表示し、ComputerDioramaScene（2.5D）と同じ props で動かす。
// 左から M.2 SSD（ストレージ）・メモリ2枚・CPUクーラーが基板に並び、奥のモニターに同じ文書が映る。
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる。

const MODEL_URL = "/models/desk-pc.glb";
// Blender で焼き込んだ色（木目・基板の模様）×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る
const BAKED_PC_URL = "/models/desk-pc-pc.webp";
const BAKED_ROOM_URL = "/models/desk-pc-room.webp";
/** 部屋を PC の位置から写したパノラマ（金属の映り込み用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_PC_NODES = ["Static_PC", "Part_Storage", "Part_Memory", "Part_CPU", "FanRotor"];
const NO_BAKE = /^(Sleeve|CableBlack|FanBlade|FanFrame)/;

type V3 = [number, number, number];

/** 基板の上面の高さ（配線・光の床をここに置く） */
const BOARD_Y = 0.7637;

/** 部品の中心（基板上） */
const PART_AT: Record<PartId, V3> = {
  storage: [-0.1, BOARD_Y, -0.4],
  memory: [-0.019, BOARD_Y, -0.425],
  cpu: [0.07, BOARD_Y, -0.41],
};
/** 部品の光（足元の床）の大きさ [幅, 奥行き] */
const GLOW_SIZE: Record<PartId, [number, number]> = {
  storage: [0.13, 0.07],
  memory: [0.07, 0.19],
  cpu: [0.13, 0.11],
};
/** 部品名の札を置く点（部品の手前） */
const LABEL_AT: Record<PartId, V3> = {
  storage: [-0.1, BOARD_Y, -0.375],
  memory: [-0.019, BOARD_Y, -0.33],
  cpu: [0.085, BOARD_Y, -0.33],
};
/** 文書（紙）を置く点：ストレージの上・メモリの上 */
const DOC_AT: Record<"storage" | "memory", V3> = {
  storage: [-0.1, BOARD_Y + 0.012, -0.4],
  memory: [-0.019, BOARD_Y + 0.06, -0.425],
};
/** 小包（処理の中身）の止まる点 */
const PACKET_AT: Record<PartId, V3> = {
  storage: [-0.085, BOARD_Y + 0.02, -0.37],
  memory: [-0.005, BOARD_Y + 0.05, -0.37],
  cpu: [0.05, BOARD_Y + 0.03, -0.37],
};
const T = BOARD_Y + 0.0006;
/** 基板の上の配線。ストレージ⇄メモリは読み込み（奥）と保存（手前）の2本 */
const BUS: Record<BusId, V3[]> = {
  load: [
    [-0.058, T, -0.402],
    [-0.031, T, -0.402],
  ],
  save: [
    [-0.022, T, -0.345],
    [-0.088, T, -0.345],
    [-0.088, T, -0.386],
  ],
  bus: [
    [-0.008, T, -0.4],
    [0.043, T, -0.4],
  ],
};

type Shot = { pos: V3; look: V3 };
const SHOT_PART: Record<PartId, Shot> = {
  storage: { pos: [-0.17, 1.08, -0.05], look: [-0.045, 0.79, -0.385] },
  memory: { pos: [-0.12, 1.09, -0.04], look: [-0.01, 0.79, -0.395] },
  cpu: { pos: [-0.07, 1.1, -0.04], look: [0.025, 0.8, -0.395] },
};
const SHOT_OFF: Shot = { pos: [-0.14, 1.2, 0.08], look: [0.0, 0.83, -0.47] };

const STATE_COLOR: Record<PartState, string | null> = {
  idle: null,
  sending: "#f59e0b",
  active: "#3b82f6",
  error: "#ef4444",
  disabled: null,
};

// ---------------------------------------------------------------------------

function damp(cur: number, to: number, k: number, dt: number) {
  return THREE.MathUtils.damp(cur, to, k, dt);
}

/** 折れ線の長さ */
function polyLength(pts: V3[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += new THREE.Vector3(...pts[i]).distanceTo(new THREE.Vector3(...pts[i - 1]));
  return len;
}

/** 折れ線上の t（0〜1）の位置 */
function pointOn(pts: V3[], t: number, out: THREE.Vector3) {
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

/** 部品の足元の光：放射グラデーションのテクスチャ（加算合成） */
function useGlowTexture() {
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

// ---------------------------------------------------------------------------

function DeskPC({ power, cpuState, nodes, doc, reducedMotion }: { power: "on" | "off"; cpuState: PartState; nodes: ComputerSceneProps["nodes"]; doc: ComputerSceneProps["doc"]; reducedMotion: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const baked = useTexture({ pc: BAKED_PC_URL, room: BAKED_ROOM_URL }, (t) => {
    for (const tex of Object.values(t)) {
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
    }
  });
  const on = power === "on";

  // 部品ごとに材質を複製（光らせても他の部品・他の模型に影響しない）
  const model = useMemo(() => {
    const root = scene.clone(true);
    const partMats: Record<PartId, THREE.MeshStandardMaterial[]> = { storage: [], memory: [], cpu: [] };
    const byName: Record<string, THREE.Object3D> = {};
    root.traverse((o) => {
      byName[o.name] = byName[o.name] ?? o;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    // 焼き込んだ色と陰影を貼る（材質の色は白にして、テクスチャの色をそのまま出す）
    const bake = (name: string, tex: THREE.Texture) =>
      byName[name]?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone();
          // 金属は焼き込みの「拡散色」が黒になるので貼らない。ケーブル・ファンは元の色のほうが自然
          if (c.metalness > 0.5 || NO_BAKE.test(c.name)) return c;
          c.map = tex;
          c.color.set("#ffffff");
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
    for (const n of BAKED_PC_NODES) bake(n, baked.pc);
    bake("Static_Room", baked.room);
    const parts: [PartId, string][] = [
      ["storage", "Part_Storage"],
      ["memory", "Part_Memory"],
      ["cpu", "Part_CPU"],
    ];
    for (const [id, name] of parts) {
      byName[name]?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        // 焼き込みで既に複製済みの材質を、光らせる対象として集める
        partMats[id].push(...((Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]));
      });
    }
    // 画面とランプは自前の材質に差し替える
    const screenMat = new THREE.MeshBasicMaterial({ color: "#000000", toneMapped: false });
    byName.Mon_Screen?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = screenMat;
    });
    const ledMat = new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false });
    byName.PowerLED?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = ledMat;
    });
    return { root, partMats, screenMat, ledMat, fan: byName.FanRotor ?? null, screen: byName.Mon_Screen ?? null };
  }, [scene, baked]);

  // モニターの画面：同じ文書（レポート）を映す。電源OFFは真っ暗
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const vanished = doc?.status === "vanished";
  const docText = doc && !vanished ? DOC_TEXT[doc.version] : "";
  useEffect(() => {
    const mat = screenMat.current;
    if (!mat) return;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 564;
    const g = c.getContext("2d")!;
    const W = c.width;
    const H = c.height;
    if (!on) {
      g.fillStyle = "#050607";
      g.fillRect(0, 0, W, H);
    } else {
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#1e3a5f");
      bg.addColorStop(1, "#3b6ea5");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      // 文書アプリの窓
      const x = 250;
      const y = 60;
      const w = 520;
      const h = 400;
      g.fillStyle = "#ffffff";
      g.fillRect(x, y, w, h);
      g.fillStyle = "#2563eb";
      g.fillRect(x, y, w, 46);
      g.fillStyle = "#ffffff";
      g.font = "bold 26px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
      g.textBaseline = "middle";
      g.fillText("レポート.docx", x + 18, y + 24);
      g.fillStyle = "#111827";
      g.font = "900 64px 'Hiragino Sans', 'Noto Sans JP', sans-serif";
      g.textAlign = "center";
      g.fillText(docText, x + w / 2, y + 190);
      g.textAlign = "left";
      g.fillStyle = "#cbd5e1";
      for (let i = 0; i < 4; i++) g.fillRect(x + 50, y + 270 + i * 30, i === 3 ? 240 : 420, 12);
      g.fillStyle = "#0f172a";
      g.fillRect(0, H - 34, W, 34);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const old = mat.map;
    mat.map = tex;
    mat.needsUpdate = true;
    old?.dispose();
  }, [on, docText]);

  // Mon_Screen は Blender の箱（UVなし）なので、画面の前に1枚板を重ねて映す
  const screenBox = useMemo(() => {
    if (!model.screen) return null;
    const box = new THREE.Box3().setFromObject(model.screen);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { w: size.x, h: size.y, pos: [center.x, center.y, box.max.z + 0.0004] as V3 };
  }, [model]);

  // useFrame で毎フレーム書き換えるものは ref 経由で持つ
  const live = useRef<typeof model | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);

  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    // CPUファン：処理中は速く、待機中はゆっくり、電源OFFで止まる
    if (m3.fan && !reducedMotion) {
      const speed = !on ? 0 : cpuState === "active" ? 22 : 5;
      m3.fan.userData.speed = damp(m3.fan.userData.speed ?? 0, speed, 2.5, dt);
      m3.fan.rotation.z -= m3.fan.userData.speed * dt;
    }
    m3.ledMat.color.set(on ? "#22c55e" : "#1f2937");
    // 働いている部品はうっすら光る
    for (const id of Object.keys(m3.partMats) as PartId[]) {
      const col = on ? STATE_COLOR[nodes[id]] : null;
      const pulse = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(t * 4);
      for (const m of m3.partMats[id]) {
        if (!m.emissive) continue;
        if (col) m.emissive.set(col);
        m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, col ? 0.08 * pulse : 0, 6, dt) });
      }
    }
  });

  return (
    <>
      <primitive object={model.root} />
      {screenBox && (
        <mesh position={screenBox.pos}>
          <planeGeometry args={[screenBox.w, screenBox.h]} />
          <meshBasicMaterial ref={screenMat} toneMapped={false} />
        </mesh>
      )}
      {on && screenBox && <pointLight position={[0, 1.07, -0.6]} intensity={0.25} distance={0.6} color="#9ec5ff" />}
    </>
  );
}

/** 部品の足元の光 */
function PartGlow({ id, state, on, reducedMotion }: { id: PartId; state: PartState; on: boolean; reducedMotion: boolean }) {
  const tex = useGlowTexture();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const col = on ? STATE_COLOR[state] : null;
  useFrame((s, dt) => {
    if (!mat.current) return;
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(s.clock.elapsedTime * 4);
    if (col) mat.current.color.set(col);
    mat.current.opacity = damp(mat.current.opacity, col ? 0.45 * pulse : 0, 6, dt);
  });
  const [w, d] = GLOW_SIZE[id];
  return (
    <mesh position={[PART_AT[id][0], BOARD_Y + 0.0012, PART_AT[id][2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w * 1.3, d * 1.3]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/** 基板の上の配線。使っている配線は光り、粒が流れる */
function Trace({ id, active, tone, reducedMotion }: { id: BusId; active: boolean; tone: string; reducedMotion: boolean }) {
  const pts = BUS[id];
  const segs = useMemo(() => {
    const out: { pos: V3; len: number; rotY: number }[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = new THREE.Vector3(...pts[i - 1]);
      const b = new THREE.Vector3(...pts[i]);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      out.push({ pos: [mid.x, mid.y, mid.z], len: a.distanceTo(b) + 0.003, rotY: -Math.atan2(b.z - a.z, b.x - a.x) });
    }
    return out;
  }, [pts]);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  useFrame((s, dt) => {
    for (const m of mats.current) m.emissiveIntensity = damp(m.emissiveIntensity, active ? 2.2 : 0, 6, dt);
    const g = dots.current;
    if (!g) return;
    g.visible = active;
    if (!active) return;
    g.children.forEach((c, i) => {
      const t = reducedMotion ? (i + 0.5) / g.children.length : (s.clock.elapsedTime * 0.9 + i / g.children.length) % 1;
      const p = pointOn(pts, t, tmp.current);
      c.position.set(p.x, p.y + 0.0015, p.z);
    });
  });
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, s.rotY, 0]}>
          <boxGeometry args={[s.len, 0.0008, 0.003]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color="#c9a227"
            metalness={0.9}
            roughness={0.3}
            emissive={tone}
            emissiveIntensity={0}
          />
        </mesh>
      ))}
      <group ref={dots} visible={false}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.0028, 12, 8]} />
            <meshBasicMaterial color={tone} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * 動く札・紙・小包の入れ物。at が変わると、今いる所から path を通って at まで滑らかに動く。
 * at が null なら隠す（start は最初に現れる位置）。
 */
function Mover({
  at,
  start,
  path,
  speed = 0.12,
  reducedMotion,
  objRef,
  children,
}: {
  at: V3 | null;
  start?: V3;
  path?: V3[];
  speed?: number;
  reducedMotion: boolean;
  /** 札を追従させるときに、動く入れ物を外から参照する */
  objRef?: RefObject<THREE.Group | null>;
  children: ReactNode;
}) {
  const own = useRef<THREE.Group>(null);
  const ref = objRef ?? own;
  const anim = useRef<{ pts: V3[]; t: number; dur: number } | null>(null);
  const key = at ? at.join(",") + "|" + (path?.map((p) => p.join(",")).join(";") ?? "") : "none";
  const last = useRef<string>("");
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (key !== last.current) {
      const wasHidden = !g.visible || last.current === "" || last.current === "none";
      last.current = key;
      if (!at) {
        g.visible = false;
        anim.current = null;
        return;
      }
      const from: V3 = wasHidden ? (start ?? at) : [g.position.x, g.position.y, g.position.z];
      const pts: V3[] = [from, ...(path ?? []), at];
      g.visible = true;
      if (reducedMotion) {
        g.position.set(...at);
        anim.current = null;
      } else {
        anim.current = { pts, t: 0, dur: Math.max(0.35, polyLength(pts) / speed) };
        g.position.set(...from);
      }
    }
    const a = anim.current;
    if (a) {
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
      pointOn(a.pts, e, g.position);
      if (a.t >= 1) anim.current = null;
    }
  });
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}

/** 紙（文書）：白い紙2枚。印は保存済み=緑 / 未保存=赤 */
function PaperMesh({ stamp }: { stamp?: "ok" | "danger" }) {
  return (
    <group>
      <mesh position={[0.002, 0.0006, 0.002]} rotation={[-Math.PI / 2, 0, 0.12]} castShadow>
        <planeGeometry args={[0.026, 0.034]} />
        <meshStandardMaterial color="#e8eaed" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.0014, 0]} rotation={[-Math.PI / 2, 0, -0.05]} castShadow>
        <planeGeometry args={[0.026, 0.034]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.001 + (i === 3 ? -0.004 : 0), 0.0016, -0.01 + i * 0.006]} rotation={[-Math.PI / 2, 0, -0.05]}>
          <planeGeometry args={[i === 3 ? 0.01 : 0.018, 0.0018]} />
          <meshBasicMaterial color="#94a3b8" />
        </mesh>
      ))}
      {stamp && (
        <mesh position={[0.007, 0.0018, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.0045, 24]} />
          <meshBasicMaterial color={stamp === "ok" ? "#10b981" : "#e11d48"} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** 小包（処理の中身）：光る小箱 */
function ParcelMesh() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.012, 0.009, 0.012]} />
      <meshStandardMaterial color="#60a5fa" emissive="#2563eb" emissiveIntensity={1.2} roughness={0.4} />
    </mesh>
  );
}

/** 部屋のパノラマを映り込み（scene.environment）に使う */
function RoomEnvironment() {
  const env = useTexture(ENV_URL, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return <primitive object={env} attach="environment" />;
}

/** ショットへカメラを滑らかに寄せる */
function CameraRig({ shot, reducedMotion }: { shot: Shot; reducedMotion: boolean }) {
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

type Place = "above" | "below" | "left" | "right" | "center";
const SHIFT: Record<Place, string> = {
  above: "translate(-50%, calc(-100% - 6px))",
  below: "translate(-50%, 6px)",
  left: "translate(calc(-100% - 8px), -50%)",
  right: "translate(8px, -50%)",
  center: "translate(-50%, -50%)",
};
type Anchor = { el: HTMLElement; at: V3; follow?: RefObject<THREE.Object3D | null>; place: Place };
type Registry = RefObject<Map<string, Anchor>>;

/** 札（ふつうの HTML）を、毎フレーム 3D の点の画面位置へ動かす */
function LabelProjector({ registry }: { registry: Registry }) {
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
function Label({ registry, id, at, follow, place = "below", children }: { registry: Registry; id: string; at: V3; follow?: RefObject<THREE.Object3D | null>; place?: Place; children: ReactNode }) {
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

// ---------------------------------------------------------------------------

export default function ComputerScene3D({ nodes, lanes, stored, storedFlash, doc, packet, power, reducedMotion }: ComputerSceneProps & { forward?: boolean }) {
  const on = power === "on";
  const vanished = doc?.status === "vanished";
  const safeOff = vanished && !!doc && stored === doc.version;
  const focus: PartId = packet?.spot ?? (doc?.spot === "memory" ? (lanes.save === "active" ? "storage" : "memory") : "storage");
  const shot = on ? SHOT_PART[focus] : SHOT_OFF;

  // 画面外では描画を止める（ファンの回転などで電池を使わない）
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const registry = useRef(new Map<string, Anchor>());
  const docObj = useRef<THREE.Group>(null);
  const packetObj = useRef<THREE.Group>(null);

  const lift = (p: V3, dy: number): V3 => [p[0], p[1] + dy, p[2]];
  const docAt: V3 | null = doc?.spot === "memory" && !vanished ? DOC_AT.memory : null;
  const docPath = doc?.spot === "memory" ? [...BUS.load.map((p) => lift(p, 0.04))] : undefined;
  const packetPath = packet ? BUS[packet.kind].map((p) => lift(p, 0.02)) : undefined;
  const docLabelAt: V3 | null = doc ? (doc.spot === "memory" ? lift(DOC_AT.memory, 0.012) : lift(DOC_AT.storage, 0.012)) : null;
  // メモリへ運ばれる写しには札も付いていく（消えた・ストレージ上は止まった点に出す）
  const docFollow = !!docAt;
  const tone = (id: BusId) => (id === "save" ? "#10b981" : "#3b82f6");

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="computer-scene"
      data-power={power}
      data-scene="3d"
      role="img"
      aria-label="机の上のオープンフレームPC（3D）。マザーボードの上に、左からストレージ（M.2 SSD＝引き出し）、メモリ（作業机）、CPU（クーラーの下＝頭脳）が並び、金色の配線でつながっている。奥のモニターに同じ文書が映る"
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 38, near: 0.02, far: 20, position: shot.pos }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          // 色を濁らせずに明るさだけ整える（ACES は彩度が飛び、AgX は全体がくすむ）
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          // パノラマの正面（Blender の +Y＝奥）を three の -Z に合わせる
          scene.environmentRotation.set(0, -Math.PI / 2, 0);
          scene.environmentIntensity = 1.1;
        }}
      >
        <color attach="background" args={["#d9dde3"]} />
        <hemisphereLight args={["#f3f6ff", "#6b5a48", 0.7]} />
        <directionalLight
          position={[-1.2, 2.2, 0.9]}
          intensity={2.2}
          color="#fff6ea"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-0.6}
          shadow-camera-right={0.6}
          shadow-camera-top={0.6}
          shadow-camera-bottom={-0.6}
          shadow-bias={-0.0004}
          shadow-normalBias={0.01}
        />
        <directionalLight position={[1.2, 1.4, 1.2]} intensity={0.5} color="#dfe8ff" />
        <RoomEnvironment />

        <DeskPC power={power} cpuState={nodes.cpu} nodes={nodes} doc={doc} reducedMotion={reducedMotion} />

        {(Object.keys(PART_AT) as PartId[]).map((id) => (
          <PartGlow key={id} id={id} state={nodes[id]} on={on} reducedMotion={reducedMotion} />
        ))}
        {(Object.keys(BUS) as BusId[]).map((id) => (
          <Trace key={id} id={id} active={on && lanes[id] === "active"} tone={tone(id)} reducedMotion={reducedMotion} />
        ))}

        {/* ストレージの保存版（いつもここに残る） */}
        <group position={DOC_AT.storage}>
          <PaperMesh stamp={stored === 2 ? "ok" : undefined} />
        </group>
        {/* メモリへ読み込んだ写し */}
        <Mover at={docAt} start={DOC_AT.storage} path={docPath} reducedMotion={reducedMotion} objRef={docObj}>
          <PaperMesh stamp={doc?.status === "saved" ? "ok" : doc?.status === "dirty" ? "danger" : undefined} />
        </Mover>
        <Mover at={packet ? PACKET_AT[packet.spot] : null} path={packetPath} reducedMotion={reducedMotion} objRef={packetObj}>
          <ParcelMesh />
        </Mover>

        <CameraRig shot={shot} reducedMotion={reducedMotion} />
        <LabelProjector registry={registry} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        {/* ---------- 札 ---------- */}
        {!on && (
          <Label registry={registry} id="power" at={[0, 0.95, -0.78]} place="center">
            <span className={styles.powerOff} role="status" data-testid="power-off">
              電源OFF
            </span>
          </Label>
        )}

        {doc && docLabelAt && (
          <Label registry={registry} id="doc" at={docFollow ? [0, 0.012, 0] : docLabelAt} follow={docFollow ? docObj : undefined} place="above">
            <div
              className={styles.docAnchor}
              data-spot={doc.spot}
              data-status={doc.status}
              data-version={doc.version}
              data-testid="work-doc"
              role="img"
              aria-label={vanished ? "メモリ上の文書は電源OFFで消えた" : `${doc.spot === "memory" ? "メモリ上" : "ストレージ上"}の文書 v${doc.version}（${DOC_TEXT[doc.version]}）`}
            >
              {safeOff ? (
                <span className={styles.ghost} data-safe="true">
                  <span className={styles.ghostTitle}>メモリは空に</span>
                  <span className={styles.ghostBody}>
                    v{doc.version}（{DOC_TEXT[doc.version]}）はストレージに保存済み
                  </span>
                </span>
              ) : vanished ? (
                <span className={styles.ghost}>
                  <span className={styles.ghostTitle}>消えた</span>
                  <span className={styles.ghostBody}>
                    v{doc.version}：{DOC_TEXT[doc.version]}
                  </span>
                </span>
              ) : (
                <span className={styles.doc}>
                  <span className={styles.docHead}>
                    レポート <span className={styles.docVer}>v{doc.version}</span>
                  </span>
                  <span key={doc.version} className={styles.docBody}>
                    {DOC_TEXT[doc.version]}
                  </span>
                  {doc.status === "dirty" && <span className={styles.docBadge}>未保存</span>}
                  {doc.status === "saved" && <span className={`${styles.docBadge} ${styles.docBadgeOk}`}>保存済み</span>}
                </span>
              )}
            </div>
          </Label>
        )}

        <Label registry={registry} id="storage" at={LABEL_AT.storage} place="below">
          <div className={styles.part} data-part-label="storage" data-state={nodes.storage}>
            <b>ストレージ</b>＝引き出し
            <span key={stored} className={styles.storedChip} data-flash={storedFlash ? "true" : "false"} data-testid="stored-file">
              保存版 v{stored}
              <br />
              {DOC_TEXT[stored]}
            </span>
          </div>
        </Label>
        <Label registry={registry} id="memory" at={LABEL_AT.memory} place="below">
          <div className={styles.part} data-part-label="memory" data-state={nodes.memory}>
            <b>メモリ</b>＝作業机
          </div>
        </Label>
        <Label registry={registry} id="cpu" at={LABEL_AT.cpu} place="below">
          <div className={styles.part} data-part-label="cpu" data-state={nodes.cpu}>
            <b>CPU</b>＝頭脳
          </div>
        </Label>
        {packet && (
          <Label registry={registry} id="packet" at={[0, -0.012, 0]} follow={packetObj} place="below">
            <span className={styles.packet} data-kind={packet.kind} data-spot={packet.spot} data-testid="bus-packet">
              {packet.text}
            </span>
          </Label>
        )}
      </div>

    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_PC_URL, BAKED_ROOM_URL, ENV_URL]);
