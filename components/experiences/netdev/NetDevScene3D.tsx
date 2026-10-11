"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { damp, lift, pointOn, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, Mover, useGlowTexture, useInView, useLabelRegistry, type Shot } from "../scene3d/parts";
import {
  LANE_ENDS,
  shownLabels,
  type BubbleTarget,
  type LaneTone,
  type NetDevMode,
  type NetDevSceneProps,
  type NetLaneId,
  type NetNodeId,
  type NetScreen,
  type NetToken,
  type ScreenOwner,
  type TokenKind,
} from "./netdevTypes";
import styles from "./netdev3d.module.css";

// ネットワーク機器の図解の「動く3D」版。Blender で作った会社のフロアのジオラマ（public/models/netdev-office.glb）を
// three.js で表示する。
//   左＝社内LAN（4台のPCが真ん中の集線装置へ1本ずつ。奥の壁の棚にルータ、左の壁に AP とノートPC）
//   奥の外＝インターネット（地球儀）/ 右奥＝工場（別の通信方式の機械）/ 右手前＝別棟の倉庫（途中にリピータ）
// 真ん中の集線装置は、ハブを選んだときだけハブ、それ以外はスイッチを出す（同じ配線のまま差し替え）。
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる。

const MODEL_URL = "/models/netdev-office.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/netdev-office.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_Hub", "Part_Switch", "Part_Router", "Part_AP", "Part_GW", "Part_Rep"];

/** 機器ごとの部品・ランプ（GLB のノード名） */
const DEVICE_PART: Partial<Record<NetNodeId, string>> = { router: "Part_Router", ap: "Part_AP", gateway: "Part_GW", repeater: "Part_Rep" };
const DEVICE_LED: Partial<Record<NetNodeId, string>> = { router: "LED_Router", ap: "LED_AP", gateway: "LED_GW", repeater: "LED_Rep" };

/** 運ぶ物が止まる点 */
const STOP: Record<NetNodeId, V3> = {
  // 机の上、モニターの右
  pcA: [-0.47, 0.15, -0.075],
  pcB: [0.05, 0.15, -0.075],
  pcC: [-0.47, 0.15, 0.285],
  pcD: [0.05, 0.15, 0.285],
  hub: [-0.28, 0.1, 0.12],
  router: [-0.3, 0.12, -0.19],
  internet: [-0.3, 0.07, -0.345],
  ap: [-0.815, 0.097, 0.135],
  laptop: [-0.74, 0.125, 0.04],
  repeater: [0.32, 0.075, 0.22],
  far: [0.73, 0.15, 0.285],
  gateway: [0.15, 0.105, -0.16],
  factory: [0.475, 0.13, -0.255],
};
/** 名札を置く点（機器・モニターの上） */
const LABEL_AT: Record<NetNodeId, V3> = {
  pcA: [-0.54, 0.24, -0.1],
  pcB: [-0.02, 0.24, -0.1],
  pcC: [-0.54, 0.24, 0.26],
  pcD: [-0.02, 0.24, 0.26],
  hub: [-0.28, 0.115, 0.12],
  router: [-0.355, 0.12, -0.2],
  internet: [-0.32, 0.215, -0.42],
  ap: [-0.835, 0.15, 0.135],
  laptop: [-0.76, 0.15, 0.04],
  repeater: [0.32, 0.095, 0.22],
  far: [0.66, 0.24, 0.26],
  gateway: [0.15, 0.13, -0.16],
  factory: [0.62, 0.17, -0.3],
};
/** 名札の向き（既定は上）。ルータは真上が地球儀と重なるので左に出す */
const LABEL_PLACE: Partial<Record<NetNodeId, "left" | "right" | "below">> = { router: "left" };
/** 吹き出しが指す点 */
const BUBBLE_AT: Record<BubbleTarget, V3> = {
  ...Object.fromEntries(Object.entries(LABEL_AT).map(([k, p]) => [k, lift(p, -0.035)])),
  pcB: [0.0, 0.19, -0.1],
  pcC: [-0.54, 0.19, 0.26],
  longCable: [0.1, 0.015, 0.135],
} as Record<BubbleTarget, V3>;
/** 状態を示す足元の光 [中心, 幅, 奥行き] */
const GLOW: Partial<Record<NetNodeId, { at: V3; size: [number, number] }>> = {
  pcA: { at: [-0.54, 0.0135, -0.06], size: [0.3, 0.3] },
  pcB: { at: [-0.02, 0.0135, -0.06], size: [0.3, 0.3] },
  pcC: { at: [-0.54, 0.0135, 0.3], size: [0.3, 0.3] },
  pcD: { at: [-0.02, 0.0135, 0.3], size: [0.3, 0.3] },
  hub: { at: [-0.28, 0.0135, 0.12], size: [0.2, 0.18] },
  router: { at: [-0.3, 0.0135, -0.19], size: [0.2, 0.12] },
  internet: { at: [-0.32, 0.0055, -0.42], size: [0.28, 0.28] },
  ap: { at: [-0.8, 0.0135, 0.135], size: [0.14, 0.2] },
  laptop: { at: [-0.76, 0.0135, 0.04], size: [0.16, 0.16] },
  repeater: { at: [0.32, 0.0055, 0.22], size: [0.14, 0.14] },
  far: { at: [0.66, 0.0135, 0.32], size: [0.3, 0.3] },
  gateway: { at: [0.15, 0.0135, -0.16], size: [0.16, 0.16] },
  factory: { at: [0.6, 0.0135, -0.3], size: [0.36, 0.26] },
};

/** 配線。Blender の模型のケーブルと同じ点（~/Blender/netdev/scene.py の ROUTES を glTF 座標にしたもの） */
const LANES: Record<NetLaneId, V3[]> = {
  wA: [[-0.45, 0.112, -0.1], [-0.45, 0.0145, -0.1], [-0.45, 0.0145, 0.105], [-0.33, 0.0145, 0.105]],
  wB: [[-0.11, 0.112, -0.1], [-0.11, 0.0145, -0.1], [-0.11, 0.0145, 0.06], [-0.25, 0.0145, 0.06], [-0.25, 0.0145, 0.085]],
  wC: [[-0.45, 0.112, 0.24], [-0.45, 0.0145, 0.24], [-0.45, 0.0145, 0.2], [-0.31, 0.0145, 0.2], [-0.31, 0.0145, 0.155]],
  wD: [[-0.11, 0.112, 0.24], [-0.11, 0.0145, 0.24], [-0.11, 0.0145, 0.19], [-0.25, 0.0145, 0.19], [-0.25, 0.0145, 0.155]],
  wR: [[-0.28, 0.0145, 0.085], [-0.28, 0.0145, -0.222], [-0.28, 0.082, -0.222], [-0.28, 0.084, -0.2]],
  wI: [[-0.3, 0.087, -0.215], [-0.3, 0.12, -0.228], [-0.3, 0.12, -0.252], [-0.3, 0.0065, -0.26], [-0.3, 0.0065, -0.37]],
  wAP: [[-0.848, 0.062, 0.135], [-0.848, 0.0145, 0.135], [-0.33, 0.0145, 0.135]],
  wG: [[-0.23, 0.0145, 0.105], [0.15, 0.0145, 0.105], [0.15, 0.0145, -0.13]],
  wX: [[0.15, 0.042, -0.185], [0.15, 0.0145, -0.2], [0.22, 0.0145, -0.2], [0.24, 0.0065, -0.2], [0.42, 0.0065, -0.2], [0.42, 0.0065, -0.27], [0.445, 0.042, -0.27]],
  wL: [[-0.23, 0.0145, 0.135], [0.22, 0.0145, 0.135], [0.24, 0.0065, 0.135], [0.32, 0.0065, 0.135], [0.32, 0.0365, 0.205]],
  wF: [[0.32, 0.0365, 0.235], [0.32, 0.0065, 0.3], [0.42, 0.0065, 0.3], [0.44, 0.0145, 0.3], [0.58, 0.0145, 0.3], [0.58, 0.112, 0.25]],
  air: arc(STOP.laptop, STOP.ap, 0.2),
};

/** 2点を結ぶ空中の弧（電波の道） */
function arc(a: V3, b: V3, peak: number): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * (peak - Math.max(a[1], b[1])) * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}

const TONE_COLOR: Record<LaneTone, string> = { on: "#3b82f6", warn: "#f97316", weak: "#93c5fd", alt: "#f59e0b" };
const KIND_COLOR: Record<TokenKind, string> = { frame: "#2563eb", packet: "#2563eb", copy: "#f97316", weak: "#60a5fa", signal: "#2563eb", converted: "#f59e0b" };

/** 長いケーブルで信号が弱っていく区間（x 座標）。この間で運ぶ物を小さく・薄くする */
const WEAK_FROM = -0.23;
const WEAK_TO = 0.32;

const SHOT_WIDE: Shot = { pos: [0, 1.42, 1.5], look: [0, -0.02, -0.03] };
const SHOT_SQUARE: Shot = { pos: [0, 1.8, 1.0], look: [0, 0, -0.1] };

// ---------------------------------------------------------------------------
// 画面（PC のモニター・ノートPC・工場の制御盤）。場面ごとに描き直す

const JP = '"Hiragino Sans", "Noto Sans JP", sans-serif';

function drawScreen(kind: NetScreen, owner: ScreenOwner) {
  const W = 320;
  const H = 200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const center = (text: string, y: number, size: number, color: string) => {
    g.fillStyle = color;
    g.font = `900 ${size}px ${JP}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, W / 2, y);
  };
  if (owner === "factory") {
    g.fillStyle = kind === "run" ? "#052e16" : "#0b1220";
    g.fillRect(0, 0, W, H);
    center(kind === "run" ? "受信OK" : "待機中", 100, 56, kind === "run" ? "#4ade80" : "#64748b");
    return c;
  }
  switch (kind) {
    case "idle": {
      const grd = g.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, "#1e3a8a");
      grd.addColorStop(1, "#0f766e");
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.fillRect(40, 40, 160, 110);
      g.fillStyle = "#cbd5e1";
      for (let i = 0; i < 4; i++) g.fillRect(54, 60 + i * 20, i === 3 ? 80 : 130, 9);
      break;
    }
    case "send": {
      g.fillStyle = "#eff6ff";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#2563eb";
      g.fillRect(0, 0, W, 34);
      center("送信", 112, 60, "#1d4ed8");
      break;
    }
    case "recv": {
      g.fillStyle = "#ecfdf5";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#16a34a";
      g.fillRect(0, 0, W, 34);
      center("受信", 112, 60, "#15803d");
      break;
    }
    case "drop": {
      g.fillStyle = "#fff7ed";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#f97316";
      g.fillRect(0, 0, W, 34);
      center("宛先ちがい", 112, 46, "#c2410c");
      break;
    }
    case "run":
      break;
  }
  return c;
}

function swapMap(mat: THREE.MeshBasicMaterial, tex: THREE.Texture) {
  const old = mat.map;
  mat.map = tex;
  mat.needsUpdate = true;
  old?.dispose();
}

function useScreenMaterial(kind: NetScreen, owner: ScreenOwner) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(drawScreen(kind, owner));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    swapMap(mat, tex);
  }, [kind, owner, mat]);
  return mat;
}

const SCREEN_NODE: Record<ScreenOwner, string> = { A: "Scr_A", B: "Scr_B", C: "Scr_C", D: "Scr_D", far: "Scr_Far", laptop: "Scr_Laptop", factory: "Scr_Factory" };

function ScreenFace({ mesh, kind, owner }: { mesh: THREE.Mesh | null; kind: NetScreen; owner: ScreenOwner }) {
  const mat = useScreenMaterial(kind, owner);
  useEffect(() => {
    attach(mesh, mat);
  }, [mesh, mat]);
  return null;
}

function attach(mesh: THREE.Mesh | null, mat: THREE.Material) {
  if (mesh) mesh.material = mat;
}

// ---------------------------------------------------------------------------

type ModelParts = {
  root: THREE.Object3D;
  /** 機器ごとの材質（働いている間だけ少し光らせる） */
  deviceMats: Partial<Record<NetNodeId | "hubDev" | "switchDev", THREE.MeshStandardMaterial[]>>;
  ledMats: Partial<Record<NetNodeId | "hubDev" | "switchDev", THREE.MeshBasicMaterial>>;
  globeMats: THREE.MeshStandardMaterial[];
  hubObjs: THREE.Object3D[];
  switchObjs: THREE.Object3D[];
  screens: Record<ScreenOwner, THREE.Mesh | null>;
};

const STATE_GLOW = "#60a5fa";

function setVisible(objs: THREE.Object3D[], on: boolean) {
  for (const o of objs) o.visible = on;
}

function Office({ mode, active, screens, reducedMotion }: { mode: NetDevMode | null; active: Set<NetNodeId>; screens: Record<ScreenOwner, NetScreen>; reducedMotion: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const baked = useTexture(BAKED_URL, (t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  const model = useMemo<ModelParts>(() => {
    const root = scene.clone(true);
    const byName: Record<string, THREE.Object3D> = {};
    root.traverse((o) => {
      byName[o.name] = byName[o.name] ?? o;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    const eachMesh = (name: string, fn: (m: THREE.Mesh) => void) =>
      byName[name]?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) fn(o as THREE.Mesh);
      });
    const partKey: Record<string, NetNodeId | "hubDev" | "switchDev"> = { Part_Hub: "hubDev", Part_Switch: "switchDev" };
    for (const [id, n] of Object.entries(DEVICE_PART)) partKey[n] = id as NetNodeId;
    const deviceMats: ModelParts["deviceMats"] = {};
    for (const name of BAKED_NODES) {
      eachMesh(name, (mesh) => {
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone();
          // 金属は焼き込みの「拡散色」が黒になるので貼らない
          if (c.metalness <= 0.5) {
            c.map = baked;
            c.color.set("#ffffff");
          }
          const key = partKey[name];
          if (key) (deviceMats[key] ??= []).push(c);
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
    }
    const ledMats: ModelParts["ledMats"] = {};
    const led = (key: NetNodeId | "hubDev" | "switchDev", node: string) => {
      const m = new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false });
      ledMats[key] = m;
      eachMesh(node, (mesh) => (mesh.material = m));
    };
    led("hubDev", "LED_Hub");
    led("switchDev", "LED_Switch");
    for (const [id, n] of Object.entries(DEVICE_LED)) led(id as NetNodeId, n);
    eachMesh("Lamp_Factory", (mesh) => (mesh.material = new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false })));
    // 地球儀（インターネット）は、使われている間だけ明るく光らせる
    const globeMats: THREE.MeshStandardMaterial[] = [];
    eachMesh("Net_Globe", (mesh) => {
      const c = (mesh.material as THREE.MeshStandardMaterial).clone();
      globeMats.push(c);
      mesh.material = c;
    });
    const scr = (n: string) => {
      let found: THREE.Mesh | null = null;
      eachMesh(n, (m) => (found = m));
      return found;
    };
    const screens = Object.fromEntries(Object.entries(SCREEN_NODE).map(([k, n]) => [k, scr(n)])) as ModelParts["screens"];
    const objs = (...names: string[]) => names.map((n) => byName[n]).filter(Boolean);
    return { root, deviceMats, ledMats, globeMats, hubObjs: objs("Part_Hub", "LED_Hub"), switchObjs: objs("Part_Switch", "LED_Switch"), screens };
  }, [scene, baked]);

  // ハブを選んだときだけハブ、それ以外はスイッチ（同じ台・同じ配線のまま差し替え）
  const isHub = mode === "hub";
  useEffect(() => {
    setVisible(model.hubObjs, isHub);
    setVisible(model.switchObjs, !isHub);
  }, [model, isHub]);

  const live = useRef<ModelParts | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);

  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    const keys = Object.keys(m3.ledMats) as (NetNodeId | "hubDev" | "switchDev")[];
    for (const key of keys) {
      const id: NetNodeId = key === "hubDev" || key === "switchDev" ? "hub" : key;
      const on = active.has(id);
      // ランプ：ふだんは緑でゆっくり、働いている間は速く点滅（ハブは橙）
      const blink = reducedMotion ? 1 : on ? (Math.sin(t * 14 + keys.indexOf(key)) > 0 ? 1 : 0.3) : 0.55 + 0.15 * Math.sin(t * 2);
      const base = key === "hubDev" ? "#fb923c" : key === "ap" ? "#60a5fa" : "#22c55e";
      m3.ledMats[key]!.color.set(base).multiplyScalar(blink);
      for (const m of m3.deviceMats[key] ?? []) {
        m.emissive.set(STATE_GLOW);
        m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, on ? 0.22 : 0, 6, dt) });
      }
    }
    const net = active.has("internet");
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 4);
    for (const m of m3.globeMats) m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, net ? 1.4 * pulse : 0.35, 5, dt) });
  });

  return (
    <>
      <primitive object={model.root} />
      {(Object.keys(SCREEN_NODE) as ScreenOwner[]).map((k) => (
        <ScreenFace key={k} mesh={model.screens[k]} kind={screens[k]} owner={k} />
      ))}
    </>
  );
}

/** 場所の足元の光 */
function NodeGlow({ id, on, reducedMotion }: { id: NetNodeId; on: boolean; reducedMotion: boolean }) {
  const tex = useGlowTexture();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s, dt) => {
    if (!mat.current) return;
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(s.clock.elapsedTime * 4);
    mat.current.opacity = damp(mat.current.opacity, on ? 0.45 * pulse : 0, 6, dt);
  });
  const g = GLOW[id];
  if (!g) return null;
  return (
    <mesh position={g.at} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={g.size} />
      <meshBasicMaterial ref={mat} map={tex} color={STATE_GLOW} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/** 折れ線の管（ケーブルに重ねて光らせる） */
function useTube(pts: V3[], radius: number) {
  return useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i])));
    return new THREE.TubeGeometry(path, Math.max(8, pts.length * 12), radius, 8, false);
  }, [pts, radius]);
}

/**
 * 配線。ふだんは Blender のケーブルそのもの（何も重ねない）。使われている間だけ、
 * ケーブルに光る管を重ねて粒を流す。air（電波）は管を出さず、弧に沿って粒だけ飛ばす。
 */
function Lane({ id, tone, reverse, reducedMotion }: { id: NetLaneId; tone: LaneTone | undefined; reverse: boolean; reducedMotion: boolean }) {
  const pts = LANES[id];
  const air = id === "air";
  const tube = useTube(pts, air ? 0.0015 : 0.0042);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  const color = tone ? TONE_COLOR[tone] : "#94a3b8";
  const count = air ? 6 : tone === "weak" ? 3 : 4;
  useFrame((s, dt) => {
    const m = mat.current;
    if (m) {
      m.color.set(color);
      m.emissive.set(color);
      m.opacity = damp(m.opacity, tone ? (air ? 0.35 : tone === "weak" ? 0.55 : 0.95) : 0, 6, dt);
      m.emissiveIntensity = tone === "weak" ? 0.6 : 1.4;
    }
    const g = dots.current;
    if (!g) return;
    g.visible = !!tone;
    if (!tone) return;
    const speed = air ? 0.7 : 0.5;
    g.children.forEach((c, i) => {
      if (i >= count) {
        c.visible = false;
        return;
      }
      c.visible = true;
      let t = reducedMotion ? (i + 0.5) / count : (s.clock.elapsedTime * speed + i / count) % 1;
      if (reverse) t = 1 - t;
      const p = pointOn(pts, t, tmp.current);
      c.position.set(p.x, p.y + (air ? 0 : 0.005), p.z);
      // 弱った信号は、先へ行くほど小さく
      const k = tone === "weak" ? 1 - 0.6 * THREE.MathUtils.clamp((p.x - WEAK_FROM) / (WEAK_TO - WEAK_FROM), 0, 1) : 1;
      c.scale.setScalar(k);
    });
  });
  return (
    <group data-lane={id}>
      <mesh geometry={tube} renderOrder={1}>
        <meshStandardMaterial ref={mat} color={color} roughness={0.4} emissive={color} emissiveIntensity={1.4} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={dots} visible={false}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[air ? 0.005 : 0.0055, 12, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** 電波の輪：ノートPC から AP へ向けて広がる */
function WifiRings({ on, reducedMotion }: { on: boolean; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dir = useMemo(() => {
    const a = new THREE.Vector3(...STOP.laptop);
    const b = new THREE.Vector3(...STOP.ap);
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.sub(a).normalize());
  }, []);
  useFrame((s) => {
    const g = group.current;
    if (!g) return;
    g.visible = on;
    if (!on) return;
    g.children.forEach((c, i) => {
      const t = reducedMotion ? (i + 1) / 4 : (s.clock.elapsedTime * 0.8 + i / 3) % 1;
      c.scale.setScalar(0.4 + t * 1.6);
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.7 * (1 - t);
    });
  });
  return (
    <group ref={group} position={STOP.laptop} quaternion={dir} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.022, 0.026, 32, 1, -Math.PI / 3, (Math.PI * 2) / 3]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 運ぶ物。小包（データ）・光る玉（信号）・書類（変換後） */
function Token({ kind, holder }: { kind: TokenKind; holder: RefObject<THREE.Group | null> }) {
  const ref = useRef<THREE.Group>(null);
  const flash = useRef(0);
  const prevKind = useRef(kind);
  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    if (prevKind.current !== kind) {
      prevKind.current = kind;
      flash.current = 1;
    }
    flash.current = Math.max(0, flash.current - dt * 1.6);
    if (kind === "frame" || kind === "packet" || kind === "copy") g.rotation.y = s.clock.elapsedTime * 1.5;
    let k = 1 + flash.current * 0.6;
    // 弱っていく信号：長いケーブルを進むほど小さく
    if (kind === "weak" && holder.current) {
      const x = holder.current.position.x;
      k *= 1 - 0.55 * THREE.MathUtils.clamp((x - WEAK_FROM) / (WEAK_TO - WEAK_FROM), 0, 1);
    }
    g.scale.setScalar(k);
  });
  const c = KIND_COLOR[kind];
  return (
    <group ref={ref}>
      {kind === "weak" || kind === "signal" ? (
        <mesh>
          <sphereGeometry args={[0.011, 20, 12]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={kind === "weak" ? 0.7 : 1.6} transparent opacity={kind === "weak" ? 0.75 : 1} />
        </mesh>
      ) : kind === "converted" ? (
        // 書類の束（形式が変わったことを、形の違いで見せる）
        <group rotation={[0, 0.4, 0]}>
          {[0, 1].map((i) => (
            <mesh key={i} position={[i * 0.004, i * 0.003, -i * 0.004]} castShadow>
              <boxGeometry args={[0.024, 0.002, 0.03]} />
              <meshStandardMaterial color={i ? "#fde68a" : "#fbbf24"} emissive={c} emissiveIntensity={0.5} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ) : (
        <mesh castShadow>
          <boxGeometry args={[0.022, 0.016, 0.022]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1} roughness={0.4} />
        </mesh>
      )}
    </group>
  );
}

/** 札を、on が true の間（または always）だけ見せる */
function ShowWhile({ el, on, always }: { el: RefObject<HTMLElement | null>; on: RefObject<boolean>; always: boolean }) {
  useFrame(() => {
    el.current?.style.setProperty("opacity", always || on.current ? "1" : "0");
  });
  return null;
}

function RoomEnvironment() {
  const env = useTexture(ENV_URL, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return <primitive object={env} attach="environment" />;
}

function setFov(cam: THREE.PerspectiveCamera, fov: number) {
  cam.fov = fov;
  cam.updateProjectionMatrix();
}

/** 縦長・正方形に近い枠（スマホ）では真上寄りから見る。横幅 1.8m のジオラマが左右で切れないように */
function FitView({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 43);
  }, [camera, square]);
  return <CameraRig shot={square ? SHOT_SQUARE : SHOT_WIDE} reducedMotion={reducedMotion} />;
}

/** 場所の並びを、配線をたどる道のりにする。逆向きにたどった配線は reversed に入れる（粒の向きを合わせる） */
function routePath(route: NetNodeId[]): { pts: V3[]; reversed: Set<NetLaneId>; used: Set<NetLaneId> } | null {
  if (route.length < 2) return null;
  const pts: V3[] = [];
  const reversed = new Set<NetLaneId>();
  const used = new Set<NetLaneId>();
  for (let i = 1; i < route.length; i++) {
    const [a, b] = [route[i - 1], route[i]];
    const hit = (Object.entries(LANE_ENDS) as [NetLaneId, [NetNodeId, NetNodeId]][]).find(([, [x, y]]) => (x === a && y === b) || (x === b && y === a));
    if (!hit) continue;
    const [id, [x]] = hit;
    const rev = x !== a;
    // 床のケーブルは少し浮かせてたどる（電波の弧はそのまま）
    const lane = LANES[id].map((p) => (id === "air" ? p : lift(p, 0.014)));
    pts.push(...(rev ? [...lane].reverse() : lane));
    used.add(id);
    if (rev) reversed.add(id);
    if (i < route.length - 1) pts.push(STOP[b]);
  }
  return { pts, reversed, used };
}

// ---------------------------------------------------------------------------

const NAME: Record<NetNodeId, string> = {
  pcA: "PC-A",
  pcB: "PC-B",
  pcC: "PC-C",
  pcD: "PC-D",
  hub: "スイッチ",
  router: "ルータ",
  internet: "インターネット",
  ap: "AP",
  laptop: "ノートPC",
  repeater: "リピータ",
  far: "別棟の倉庫",
  gateway: "ゲートウェイ",
  factory: "工場の機械",
};

const DEFAULT_SCREENS: Record<ScreenOwner, NetScreen> = { A: "idle", B: "idle", C: "idle", D: "idle", far: "idle", laptop: "idle", factory: "idle" };

const TOKEN_IDS = ["t1", "t2", "t3"] as const;

function TokenMover({ tok, epoch, reducedMotion, objRef, movingRef }: { tok: NetToken | undefined; epoch: number; reducedMotion: boolean; objRef: RefObject<THREE.Group | null>; movingRef: RefObject<boolean> }) {
  const end = tok ? tok.route[tok.route.length - 1] : null;
  const path = tok ? routePath(tok.route)?.pts : undefined;
  return (
    <Mover at={end ? STOP[end] : null} start={tok ? STOP[tok.route[0]] : undefined} path={path} speed={0.6} epoch={epoch} reducedMotion={reducedMotion} objRef={objRef} movingRef={movingRef}>
      {tok && <Token kind={tok.kind} holder={objRef} />}
    </Mover>
  );
}

export default function NetDevScene3D({ mode, phase, firstPhase = false, epoch = 0, paused = false, reducedMotion }: NetDevSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const objs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const moving = [useRef(false), useRef(false), useRef(false)];
  const tags = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];

  const tokens = phase?.tokens ?? [];
  const tokenOf = (id: (typeof TOKEN_IDS)[number]) => tokens.find((t) => t.id === id);
  // 粒の向き：運ぶ物が通る配線はその向き
  const reversed = new Set<NetLaneId>();
  for (const t of tokens) routePath(t.route)?.reversed.forEach((id) => reversed.add(id));
  const active = new Set(phase?.active ?? []);
  const labels = shownLabels(phase);
  const scr = { ...DEFAULT_SCREENS, ...phase?.screens };
  const name = (id: NetNodeId) => (id === "hub" && mode === "hub" ? "ハブ" : NAME[id]);

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="netdev-scene"
      data-scene="3d"
      data-mode={mode ?? "none"}
      role="img"
      aria-label="小さな会社のフロアのジオラマ（3D）。4台のPCが真ん中のスイッチ（またはハブ）に1本ずつつながり、奥の壁の棚にルータ（外の地球儀＝インターネットへの出口）、左の壁にAP（ノートPCの無線の入口）、右奥にゲートウェイと工場の機械、右手前に長いケーブルの途中のリピータと別棟の倉庫"
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible && !paused ? "always" : "never"}
        camera={{ fov: 43, near: 0.05, far: 20, position: SHOT_WIDE.pos }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          scene.environmentRotation.set(0, -Math.PI / 2, 0);
          scene.environmentIntensity = 0.9;
        }}
      >
        <color attach="background" args={["#d9dde3"]} />
        <hemisphereLight args={["#f3f6ff", "#6b5a48", 0.75]} />
        <directionalLight
          position={[-0.5, 2.6, 0.7]}
          intensity={2.0}
          color="#fff6ea"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-1}
          shadow-camera-right={1}
          shadow-camera-top={0.8}
          shadow-camera-bottom={-0.8}
          shadow-bias={-0.0004}
          shadow-normalBias={0.01}
        />
        <directionalLight position={[1.4, 1.2, 1.4]} intensity={0.45} color="#dfe8ff" />
        <RoomEnvironment />
        <FitView reducedMotion={reducedMotion} />

        <Office mode={mode} active={active} screens={scr} reducedMotion={reducedMotion} />

        {(Object.keys(GLOW) as NetNodeId[]).map((id) => (
          <NodeGlow key={id} id={id} on={active.has(id)} reducedMotion={reducedMotion} />
        ))}
        {(Object.keys(LANES) as NetLaneId[]).map((id) => (
          <Lane key={id} id={id} tone={phase?.lanes[id]} reverse={reversed.has(id)} reducedMotion={reducedMotion} />
        ))}
        <WifiRings on={!!phase?.lanes.air} reducedMotion={reducedMotion} />

        {TOKEN_IDS.map((id, i) => (
          <TokenMover key={id} tok={tokenOf(id)} epoch={epoch} reducedMotion={reducedMotion} objRef={objs[i]} movingRef={moving[i]} />
        ))}

        <LabelProjector registry={registry} />
        {/* 運ぶ物の札は、動いている間（と最初の場面・pin の場面）だけ。着いたら名札と吹き出しに任せる */}
        {TOKEN_IDS.map((id, i) => (
          <ShowWhile key={id} el={tags[i]} on={moving[i]} always={firstPhase || !!tokenOf(id)?.pin} />
        ))}
        <CaptionProjector at={phase ? BUBBLE_AT[phase.bubble.target] : null} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {/* 名札は、その場面で関わる場所にだけ出す（機器を選ぶ前は機器と外の世界の名札を地図として） */}
        {(Object.keys(LABEL_AT) as NetNodeId[])
          .filter((id) => labels.has(id))
          .map((id) => (
            <Label key={id} registry={registry} id={`name-${id}`} at={LABEL_AT[id]} place={LABEL_PLACE[id] ?? "above"}>
              <span className={styles.tag} data-node-label={id} data-on={active.has(id) ? "true" : undefined}>
                {name(id)}
              </span>
            </Label>
          ))}
        {/* MACアドレス表は右下の隅に固定（スイッチの場面では使わない倉庫の上。届く先の PC-C を隠さない） */}
        {phase?.macTable && (
          <div className={`absolute bottom-2 right-2 ${styles.macTable}`} data-testid="netdev-mac-table">
            <b>スイッチのMACアドレス表</b>
            <span className={styles.macRows}>
              {["A", "B", "C", "D"].map((pc, i) => (
                <span key={pc} data-hit={pc === "C" ? "true" : undefined}>
                  PC-{pc}→ポート{i + 1}
                </span>
              ))}
            </span>
          </div>
        )}
        {TOKEN_IDS.map((id, i) => {
          const tok = tokenOf(id);
          if (!tok?.tag) return null;
          const end = tok.route[tok.route.length - 1];
          return (
            <Label key={id} registry={registry} id={`tag-${id}`} at={[0, 0.02, 0]} follow={objs[i] as RefObject<THREE.Object3D | null>} place={end === "laptop" || end === "repeater" ? "below" : "above"}>
              <span ref={tags[i]} className={styles.payload} data-kind={tok.kind} data-testid="netdev-payload">
                {tok.tag}
              </span>
            </Label>
          );
        })}
        {/* 吹き出しは札より手前に出す */}
        <CaptionBubble caption={phase?.bubble ?? null} root={captionRoot} testId="netdev-bubble" />
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);

