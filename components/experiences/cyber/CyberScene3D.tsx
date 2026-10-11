"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { NodeState } from "../network/NetworkSceneBase";
import { damp, lift, pointOn, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, Mover, useGlowTexture, useInView, useLabelRegistry, type Shot } from "../scene3d/parts";
import { LANE_ENDS, shownNodeLabels, type CyberLaneId, type CyberNodeId, type CyberSceneProps, type LaneTone, type ScreenKind, type ScreenOwner } from "./cyberTypes";
import styles from "./cyber3d.module.css";

// サイバー攻撃の図解の「動く3D」版。Blender で作った机上のジオラマ（public/models/cyber-office.glb）を
// three.js で表示し、CyberDioramaScene（2.5D）と同じ props で動かす。
//   左奥＝攻撃者の部屋 / 左手前＝自宅の利用者 / 中央＝インターネット（地球儀）/
//   右＝会社（奥のサーバ室に Webサーバと DB、手前の執務室に社員）
// 人は手前に座り、肩越しに画面が見える向き。画面には攻撃の進み具合（罠・メール・感染…）を映す。
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる。

const MODEL_URL = "/models/cyber-office.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/cyber-office.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_Web", "Part_DB"];

/** 床の線（ネットワークの道）の高さ */
const Y = 0.0135;

/** 吹き出しが指す点 */
const NODE_AT: Record<CyberNodeId, V3> = {
  attacker: [-0.6, 0.17, -0.39],
  internet: [-0.15, 0.16, 0],
  web: [0.3, 0.2, -0.28],
  db: [0.6, 0.2, -0.28],
  user: [-0.6, 0.17, 0.18],
  staff: [0.46, 0.2, 0.14],
};
/** 名札を置く点（頭の上・機械の上） */
const LABEL_AT: Record<CyberNodeId, V3> = {
  attacker: [-0.6, 0.27, -0.22],
  internet: [-0.15, 0.205, 0],
  web: [0.3, 0.275, -0.3],
  db: [0.6, 0.275, -0.3],
  user: [-0.6, 0.27, 0.36],
  staff: [0.46, 0.27, 0.345],
};
/** 運ぶ物が止まる点 */
const STOP: Record<CyberNodeId, V3> = {
  // 人のそば（名札と重ならないよう、机の右）
  attacker: [-0.47, 0.16, -0.3],
  internet: [-0.15, 0.215, 0.0],
  // ラックの前の低い位置（上端の名札と離す）
  web: [0.3, 0.09, -0.22],
  db: [0.6, 0.09, -0.22],
  user: [-0.47, 0.16, 0.26],
  staff: [0.58, 0.17, 0.2],
};
/** 被害の札を置く点 */
const DAMAGE_AT: Record<CyberNodeId, V3> = {
  attacker: [-0.6, 0.12, -0.3],
  internet: [-0.15, 0.05, 0.08],
  web: [0.3, 0.025, -0.19],
  db: [0.6, 0.025, -0.19],
  user: [-0.6, 0.02, 0.43],
  staff: [0.46, 0.02, 0.43],
};
/** 状態を示す足元の光 [中心, 幅, 奥行き] */
const GLOW: Record<CyberNodeId, { at: V3; size: [number, number] }> = {
  attacker: { at: [-0.6, 0.0125, -0.33], size: [0.3, 0.3] },
  internet: { at: [-0.15, 0.005, 0], size: [0.26, 0.26] },
  web: { at: [0.3, 0.0165, -0.338], size: [0.17, 0.2] },
  db: { at: [0.6, 0.0165, -0.338], size: [0.17, 0.2] },
  user: { at: [-0.6, 0.0125, 0.28], size: [0.3, 0.3] },
  staff: { at: [0.46, 0.0125, 0.24], size: [0.3, 0.3] },
};

/**
 * 床の上のネットワークの道。攻撃者・利用者はインターネット（地球儀）に、会社は左の壁の入口から
 * サーバ室（Webサーバ→DB）と執務室（社員の机）へ。as（電話）だけは床でなく空中の弧。
 */
const LANES: Record<CyberLaneId, V3[]> = {
  ai: [
    [-0.48, Y, -0.37],
    [-0.3, Y, -0.37],
    [-0.2, Y, -0.06],
  ],
  ui: [
    [-0.48, Y, 0.21],
    [-0.3, Y, 0.21],
    [-0.2, Y, 0.06],
  ],
  iw: [
    [-0.075, Y, -0.025],
    [0.17, Y, -0.025],
    [0.17, Y, -0.2],
    [0.3, Y, -0.2],
    [0.3, Y, -0.275],
  ],
  wd: [
    [0.3, Y, -0.24],
    [0.6, Y, -0.24],
    [0.6, Y, -0.275],
  ],
  is: [
    [-0.075, Y, 0.025],
    [0.2, Y, 0.025],
    [0.2, Y, 0.12],
    [0.35, Y, 0.12],
  ],
  sw: [
    [0.4, Y, 0.11],
    [0.4, Y, -0.21],
    [0.32, Y, -0.21],
  ],
  as: arc([-0.56, 0.24, -0.25], [0.556, 0.17, 0.188], 0.42),
};

/** 2点を結ぶ空中の弧（電話の声が飛ぶ道） */
function arc(a: V3, b: V3, peak: number): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * (peak - Math.max(a[1], b[1])) * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}

/** 大量アクセス（DDoS）に使われる、世界中の乗っ取られた機器（台座のふち） */
const BOTS: V3[] = [
  [-0.3, 0.004, -0.5],
  [-0.08, 0.004, -0.47],
  [0.02, 0.004, -0.3],
  [-0.32, 0.004, 0.48],
  [-0.06, 0.004, 0.44],
  [0.03, 0.004, 0.28],
];
const GLOBE_AT: V3 = [-0.15, 0.119, 0];

/**
 * カメラは1か所だけ（場面ごとに動かすと視線が迷うため）。机の手前・斜め上から全体を見下ろす。
 * スマホ（4:3 の枠）は横幅が足りないので、真上寄りから見下ろして奥行きで縦を埋める。
 */
const SHOT_WIDE: Shot = { pos: [0, 1.22, 1.3], look: [0, 0.0, 0.0] };
const SHOT_SQUARE: Shot = { pos: [0, 1.78, 0.98], look: [0, 0.0, -0.13] };

const TONE_COLOR: Record<LaneTone, string> = { attack: "#ef4444", normal: "#3b82f6", leak: "#f59e0b", phone: "#a855f7" };
const STATE_COLOR: Record<NodeState, string | null> = {
  idle: null,
  sending: "#f59e0b",
  active: "#3b82f6",
  error: "#ef4444",
  disabled: null,
};

// ---------------------------------------------------------------------------
// 画面（ノートPC・モニター）に映す絵

const JP = "'Hiragino Sans', 'Noto Sans JP', sans-serif";

function drawScreen(kind: ScreenKind): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 200;
  const g = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const bar = (color: string, title: string) => {
    g.fillStyle = color;
    g.fillRect(0, 0, W, 30);
    g.fillStyle = "#ffffff";
    g.font = `bold 17px ${JP}`;
    g.textBaseline = "middle";
    g.fillText(title, 12, 16);
  };
  const lines = (x: number, y: number, n: number, color: string, w = 200) => {
    g.fillStyle = color;
    for (let i = 0; i < n; i++) g.fillRect(x, y + i * 20, i === n - 1 ? w * 0.6 : w, 9);
  };
  const center = (text: string, y: number, size: number, color: string) => {
    g.fillStyle = color;
    g.font = `900 ${size}px ${JP}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, W / 2, y);
    g.textAlign = "left";
  };
  switch (kind) {
    case "code":
    case "loot": {
      g.fillStyle = "#0b0f14";
      g.fillRect(0, 0, W, H);
      g.font = "bold 16px monospace";
      g.textBaseline = "top";
      if (kind === "code") {
        g.fillStyle = "#4ade80";
        ["$ attack --target", "> sending...", "> ' OR 1=1 --", "> <script>…", "_"].forEach((t, i) => g.fillText(t, 14, 18 + i * 34));
      } else {
        g.fillStyle = "#fbbf24";
        g.fillText("盗んだデータ", 14, 14);
        g.fillStyle = "#e5e7eb";
        ["ID  名前   パスワード", "001 佐藤  ******", "002 鈴木  ******", "003 高橋  ******"].forEach((t, i) => g.fillText(t, 14, 54 + i * 34));
      }
      break;
    }
    case "browser":
    case "board": {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, W, H);
      bar("#2563eb", kind === "board" ? "みんなの掲示板" : "ネットショップ");
      if (kind === "board") {
        for (let i = 0; i < 3; i++) {
          g.fillStyle = "#e5e7eb";
          g.fillRect(14, 44 + i * 50, W - 28, 40);
          lines(24, 52 + i * 50, 2, "#94a3b8", 180);
        }
      } else {
        g.fillStyle = "#dbeafe";
        g.fillRect(14, 44, 120, 80);
        lines(150, 50, 4, "#94a3b8", 150);
        g.fillStyle = "#f59e0b";
        g.fillRect(14, 140, 120, 34);
      }
      break;
    }
    case "down": {
      g.fillStyle = "#f3f4f6";
      g.fillRect(0, 0, W, H);
      bar("#6b7280", "ネットショップ");
      center("×", 92, 64, "#ef4444");
      center("つながりません", 158, 26, "#374151");
      break;
    }
    case "trap": {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, W, H);
      bar("#2563eb", "みんなの掲示板");
      g.fillStyle = "rgba(239,68,68,0.92)";
      g.fillRect(24, 50, W - 48, 120);
      center("罠のスクリプトが", 92, 22, "#ffffff");
      center("動いた", 130, 30, "#ffffff");
      break;
    }
    case "work": {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, W, H);
      bar("#16a34a", "売上表.xlsx");
      g.strokeStyle = "#cbd5e1";
      g.lineWidth = 2;
      for (let i = 0; i <= 5; i++) {
        g.beginPath();
        g.moveTo(10, 40 + i * 30);
        g.lineTo(W - 10, 40 + i * 30);
        g.stroke();
      }
      for (let j = 0; j <= 4; j++) {
        g.beginPath();
        g.moveTo(10 + j * 75, 40);
        g.lineTo(10 + j * 75, 190);
        g.stroke();
      }
      break;
    }
    case "mail": {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, W, H);
      bar("#0f766e", "メール");
      g.fillStyle = "#111827";
      g.font = `bold 20px ${JP}`;
      g.textBaseline = "top";
      g.fillText("件名：請求書の件", 16, 44);
      g.fillStyle = "#6b7280";
      g.font = `16px ${JP}`;
      g.fillText("差出人：取引先 経理部", 16, 76);
      g.fillStyle = "#fef3c7";
      g.fillRect(16, 118, 160, 50);
      g.strokeStyle = "#f59e0b";
      g.strokeRect(16, 118, 160, 50);
      g.fillStyle = "#92400e";
      g.font = `bold 18px ${JP}`;
      g.fillText("請求書.zip", 30, 133);
      break;
    }
    case "virus": {
      g.fillStyle = "#7f1d1d";
      g.fillRect(0, 0, W, H);
      center("!", 70, 70, "#fecaca");
      center("ウイルスに感染", 150, 28, "#ffffff");
      break;
    }
  }
  return c;
}

function swapMap(mat: THREE.MeshBasicMaterial, tex: THREE.Texture) {
  const old = mat.map;
  mat.map = tex;
  mat.needsUpdate = true;
  old?.dispose();
}

/** 画面1枚。kind が変わるたびに絵を描き直す */
function useScreenMaterial(kind: ScreenKind) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(drawScreen(kind));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    swapMap(mat, tex);
  }, [kind, mat]);
  return mat;
}

// ---------------------------------------------------------------------------

type ModelParts = {
  root: THREE.Object3D;
  rackMats: Record<"web" | "db", THREE.MeshStandardMaterial[]>;
  ledMats: Record<"web" | "db", THREE.MeshBasicMaterial>;
  globeMats: THREE.MeshStandardMaterial[];
  screens: Record<ScreenOwner, THREE.Mesh | null>;
};

/** 画面の板に、描いた画面の材質を貼る */
function attachScreens(meshes: ModelParts["screens"], mats: Record<ScreenOwner, THREE.Material>) {
  for (const k of Object.keys(mats) as ScreenOwner[]) {
    const mesh = meshes[k];
    if (mesh) mesh.material = mats[k];
  }
}

function Office({ nodes, screens, reducedMotion }: { nodes: CyberSceneProps["nodes"]; screens: Record<ScreenOwner, ScreenKind>; reducedMotion: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  const baked = useTexture(BAKED_URL, (t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  // 部品ごとに材質を複製（光らせても他に影響しない）
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
    const rackMats: ModelParts["rackMats"] = { web: [], db: [] };
    for (const name of BAKED_NODES) {
      eachMesh(name, (mesh) => {
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone();
          // 金属は焼き込みの「拡散色」が黒になるので貼らない
          if (c.metalness <= 0.5) {
            c.map = baked;
            c.color.set("#ffffff");
          }
          if (name === "Part_Web") rackMats.web.push(c);
          if (name === "Part_DB") rackMats.db.push(c);
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
    }
    const ledMats = { web: new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false }), db: new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false }) };
    eachMesh("LED_Web", (m) => (m.material = ledMats.web));
    eachMesh("LED_DB", (m) => (m.material = ledMats.db));
    // 地球儀（インターネット）は、使われている間だけ明るく光らせる
    const globeMats: THREE.MeshStandardMaterial[] = [];
    eachMesh("Net_Globe", (mesh) => {
      const c = (mesh.material as THREE.MeshStandardMaterial).clone();
      globeMats.push(c);
      mesh.material = c;
    });
    eachMesh("Glass", (mesh) => {
      mesh.material = new THREE.MeshStandardMaterial({ color: "#dbeafe", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });
      mesh.castShadow = false;
    });
    eachMesh("Lamp", (mesh) => (mesh.material = new THREE.MeshBasicMaterial({ color: "#ff4d42", toneMapped: false })));
    const scr = (n: string) => {
      let found: THREE.Mesh | null = null;
      eachMesh(n, (m) => (found = m));
      return found;
    };
    return { root, rackMats, ledMats, globeMats, screens: { attacker: scr("Scr_Attacker"), user: scr("Scr_User"), staff: scr("Scr_Staff") } };
  }, [scene, baked]);

  const scrAttacker = useScreenMaterial(screens.attacker);
  const scrUser = useScreenMaterial(screens.user);
  const scrStaff = useScreenMaterial(screens.staff);
  useEffect(() => {
    attachScreens(model.screens, { attacker: scrAttacker, user: scrUser, staff: scrStaff });
  }, [model, scrAttacker, scrUser, scrStaff]);

  // useFrame で毎フレーム書き換えるものは ref 経由で持つ
  const live = useRef<ModelParts | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);

  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    for (const id of ["web", "db"] as const) {
      const st = nodes[id];
      // ランプ：ふだんは緑、働いている間は青、止まった・やられたら赤く点滅
      const blink = reducedMotion ? 1 : st === "error" ? (Math.sin(t * 10) > 0 ? 1 : 0.25) : 0.7 + 0.3 * Math.sin(t * 3);
      const base = st === "error" ? "#ef4444" : st === "idle" ? "#22c55e" : "#60a5fa";
      m3.ledMats[id].color.set(base).multiplyScalar(blink);
      const col = STATE_COLOR[st];
      for (const m of m3.rackMats[id]) {
        if (col) m.emissive.set(col);
        m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, col ? 0.18 : 0, 6, dt) });
      }
    }
    const net = nodes.internet !== "idle";
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 4);
    for (const m of m3.globeMats) m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, net ? 1.4 * pulse : 0.35, 5, dt) });
  });

  return <primitive object={model.root} />;
}

/** 場所の足元の光（状態の色） */
function NodeGlow({ id, state, reducedMotion }: { id: CyberNodeId; state: NodeState; reducedMotion: boolean }) {
  const tex = useGlowTexture();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const col = STATE_COLOR[state];
  useFrame((s, dt) => {
    if (!mat.current) return;
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(s.clock.elapsedTime * (state === "error" ? 8 : 4));
    if (col) mat.current.color.set(col);
    mat.current.opacity = damp(mat.current.opacity, col ? 0.5 * pulse : 0, 6, dt);
  });
  const g = GLOW[id];
  return (
    <mesh position={g.at} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={g.size} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/** 折れ線を細い帯（箱）の並びにする */
function useSegments(pts: V3[], width: number) {
  return useMemo(() => {
    const out: { pos: V3; len: number; quat: THREE.Quaternion }[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = new THREE.Vector3(...pts[i - 1]);
      const b = new THREE.Vector3(...pts[i]);
      const dir = b.clone().sub(a);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
      out.push({ pos: [mid.x, mid.y, mid.z], len: dir.length() + width, quat });
    }
    return out;
  }, [pts, width]);
}

/**
 * ネットワークの道。ふだんは目立たない灰色の線で、使われている間だけ色が付いて粒が流れる。
 * blocked＝つながらない（赤い×）。flood＝大量アクセスで粒がびっしり流れる。
 */
function Lane({ id, state, flood, reverse, reducedMotion }: { id: CyberLaneId; state: LaneTone | "blocked" | undefined; flood: boolean; reverse: boolean; reducedMotion: boolean }) {
  const pts = LANES[id];
  const air = id === "as";
  const width = air ? 0.003 : 0.006;
  const segs = useSegments(pts, width);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  const active = !!state && state !== "blocked";
  const color = state === "blocked" ? "#7f1d1d" : state ? TONE_COLOR[state] : "#94a3b8";
  const count = flood ? 14 : 4;
  useFrame((s, dt) => {
    for (const m of mats.current) {
      m.color.set(color);
      m.emissive.set(color);
      m.emissiveIntensity = damp(m.emissiveIntensity, active ? 1.6 : 0, 6, dt);
      m.opacity = damp(m.opacity, air ? (active ? 0.9 : 0) : active || state === "blocked" ? 1 : 0.55, 6, dt);
    }
    const g = dots.current;
    if (!g) return;
    g.visible = active;
    if (!active) return;
    const speed = flood ? 1.4 : 0.55;
    g.children.forEach((c, i) => {
      if (i >= count) {
        c.visible = false;
        return;
      }
      c.visible = true;
      let t = reducedMotion ? (i + 0.5) / count : (s.clock.elapsedTime * speed + i / count) % 1;
      if (reverse) t = 1 - t;
      const p = pointOn(pts, t, tmp.current);
      c.position.set(p.x, p.y + 0.004, p.z);
    });
  });
  const mid = useMemo(() => pointOn(pts, 0.5, new THREE.Vector3()), [pts]);
  return (
    <group data-lane={id}>
      {segs.map((s, i) => (
        <mesh key={i} position={s.pos} quaternion={s.quat} renderOrder={1}>
          <boxGeometry args={[s.len, air ? width : 0.0012, width]} />
          <meshStandardMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color="#94a3b8"
            roughness={0.5}
            emissive="#000000"
            emissiveIntensity={0}
            transparent
            opacity={air ? 0 : 0.55}
            depthWrite={!air}
          />
        </mesh>
      ))}
      <group ref={dots} visible={false}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[flood ? 0.0045 : 0.006, 12, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {state === "blocked" && (
        <group position={[mid.x, mid.y + 0.02, mid.z]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.05, 0.008, 0.009]} />
            <meshBasicMaterial color="#ef4444" toneMapped={false} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[0.05, 0.008, 0.009]} />
            <meshBasicMaterial color="#ef4444" toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** DDoS：世界中の乗っ取られた機器（小さな端末）から地球儀へ、赤い粒が一斉に飛ぶ */
function Botnet({ on, reducedMotion }: { on: boolean; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dots = useRef<THREE.Group>(null);
  const scale = useRef(0);
  const tmp = useRef(new THREE.Vector3());
  const paths = useMemo(() => BOTS.map((b): V3[] => [lift(b, 0.03), [(b[0] + GLOBE_AT[0]) / 2, 0.16, (b[2] + GLOBE_AT[2]) / 2], GLOBE_AT]), []);
  useFrame((s, dt) => {
    const g = group.current;
    if (!g) return;
    scale.current = damp(scale.current, on ? 1 : 0, 6, dt);
    g.visible = scale.current > 0.02;
    g.children.forEach((c) => {
      // 遠くからでも機器と分かる大きさ（1.35倍）で、出てくるときだけ膨らませる
      if (c !== dots.current) c.scale.setScalar(scale.current * 1.35);
    });
    const d = dots.current;
    if (!d) return;
    d.visible = on;
    d.children.forEach((c, i) => {
      const path = paths[i % paths.length];
      const k = Math.floor(i / paths.length);
      const t = reducedMotion ? 0.3 + k * 0.3 : (s.clock.elapsedTime * 1.1 + k / 3 + i * 0.13) % 1;
      pointOn(path, t, tmp.current);
      c.position.copy(tmp.current);
    });
  });
  return (
    <group ref={group} visible={false}>
      {BOTS.map((b, i) => (
        <group key={i} position={b}>
          {/* 小さなノートPC：本体と、赤く光る画面 */}
          <mesh position={[0, 0.002, 0]} castShadow>
            <boxGeometry args={[0.045, 0.004, 0.032]} />
            <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.017, -0.017]} rotation={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.045, 0.03, 0.002]} />
            <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.017, -0.0155]} rotation={[-0.3, 0, 0]}>
            <planeGeometry args={[0.039, 0.024]} />
            <meshBasicMaterial color="#ef4444" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <group ref={dots}>
        {Array.from({ length: BOTS.length * 3 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.0045, 10, 6]} />
            <meshBasicMaterial color="#ef4444" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** 運ぶ物：光る小箱（攻撃＝赤、データ＝橙、ふつう＝青、電話＝紫） */
function Token({ tone }: { tone: LaneTone }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  const c = TONE_COLOR[tone];
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.022, 0.016, 0.022]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1} roughness={0.4} />
    </mesh>
  );
}

/** 札を、on が true の間（または always）だけ見せる */
function ShowWhile({ el, on, always }: { el: RefObject<HTMLElement | null>; on: RefObject<boolean>; always: boolean }) {
  useFrame(() => {
    const e = el.current;
    e?.style.setProperty("opacity", always || on.current ? "1" : "0");
  });
  return null;
}

/** 部屋のパノラマを映り込み（scene.environment）に使う */
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

/** 縦長・正方形の枠（スマホ）では画角を広げて真上寄りから見る。横幅 1.72m のジオラマが左右で切れないように */
function FitView({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 43);
  }, [camera, square]);
  return <CameraRig shot={square ? SHOT_SQUARE : SHOT_WIDE} reducedMotion={reducedMotion} />;
}

type Route = { pts: V3[]; reversed: Set<CyberLaneId>; used: Set<CyberLaneId> };

/**
 * いま使われている道（無ければどの道でも）をたどって、from から to までの道のりを返す。
 * reversed は道の向き（LANES の並び）と逆にたどる道。粒の流れる向きもこれに合わせる。
 */
function routeBetween(from: CyberNodeId, to: CyberNodeId, lanes: CyberSceneProps["lanes"]): Route | null {
  if (from === to) return null;
  const search = (usable: (id: CyberLaneId) => boolean) => {
    const prev = new Map<CyberNodeId, { node: CyberNodeId; lane: CyberLaneId; reverse: boolean }>();
    const queue: CyberNodeId[] = [from];
    const seen = new Set<CyberNodeId>([from]);
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === to) break;
      for (const [id, [a, b]] of Object.entries(LANE_ENDS) as [CyberLaneId, [CyberNodeId, CyberNodeId]][]) {
        if (!usable(id)) continue;
        const next = a === cur ? b : b === cur ? a : null;
        if (!next || seen.has(next)) continue;
        seen.add(next);
        prev.set(next, { node: cur, lane: id, reverse: b === cur });
        queue.push(next);
      }
    }
    if (!seen.has(to)) return null;
    const legs: V3[][] = [];
    const reversed = new Set<CyberLaneId>();
    const used = new Set<CyberLaneId>();
    for (let n = to; n !== from; ) {
      const step = prev.get(n)!;
      // 床の道は少し浮かせてたどる（空中の弧はそのまま）
      const pts = LANES[step.lane].map((p) => (step.lane === "as" ? p : lift(p, 0.02)));
      legs.unshift(step.reverse ? [...pts].reverse() : pts);
      used.add(step.lane);
      if (step.reverse) reversed.add(step.lane);
      n = step.node;
    }
    return { pts: legs.flat(), reversed, used };
  };
  return search((id) => !!lanes[id] && lanes[id] !== "blocked") ?? search(() => true);
}

// ---------------------------------------------------------------------------

const NAME: Record<CyberNodeId, string> = {
  attacker: "攻撃者",
  internet: "インターネット",
  web: "Webサーバ",
  db: "DB",
  user: "利用者",
  staff: "社員",
};

const DEFAULT_SCREENS: Record<ScreenOwner, ScreenKind> = { attacker: "code", user: "browser", staff: "work" };

export default function CyberScene3D({ nodes, lanes, payload, flood, damage, reducedMotion, bubble = null, screens, from = null, epoch = 0, paused = false }: CyberSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const tokenObj = useRef<THREE.Group>(null);
  const tokenMoving = useRef(false);
  const payloadTag = useRef<HTMLSpanElement>(null);

  const stop = payload?.stop ?? null;
  const start = from ?? "attacker";
  const route = stop ? routeBetween(start, stop, lanes) : null;
  const path = route?.pts;
  // 粒の向き：運ぶ物が通る道はその向き、それ以外は道の向きどおり（データが漏れる道だけ逆）
  const reverse = (id: CyberLaneId) => (route?.used.has(id) ? route.reversed.has(id) : lanes[id] === "leak");
  const shownLabels = shownNodeLabels({ nodes, damage, bubble });
  const scr = { ...DEFAULT_SCREENS, ...screens };

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="cyber-scene"
      data-scene="3d"
      role="img"
      aria-label="机の上の会社のジオラマ（3D）。左奥に攻撃者の部屋、左手前に自宅の利用者、中央にインターネット（地球儀）、右に会社（奥のサーバ室にWebサーバとデータベース、手前の執務室に社員）。床の線がネットワークの道"
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

        <Office nodes={nodes} screens={scr} reducedMotion={reducedMotion} />

        {(Object.keys(GLOW) as CyberNodeId[]).map((id) => (
          <NodeGlow key={id} id={id} state={nodes[id]} reducedMotion={reducedMotion} />
        ))}
        {(Object.keys(LANES) as CyberLaneId[]).map((id) => (
          <Lane key={id} id={id} state={lanes[id]} flood={flood.includes(id)} reverse={reverse(id)} reducedMotion={reducedMotion} />
        ))}
        <Botnet on={flood.length > 0} reducedMotion={reducedMotion} />

        <Mover at={stop ? STOP[stop] : null} start={STOP[start]} path={path} speed={0.6} epoch={epoch} reducedMotion={reducedMotion} objRef={tokenObj} movingRef={tokenMoving}>
          {payload && <Token tone={payload.tone} />}
        </Mover>

        <LabelProjector registry={registry} />
        {/* 運ぶ物の札は、動いている間（と最初に現れた場面）だけ。着いたら行き先の名札と吹き出しに任せる */}
        <ShowWhile el={payloadTag} on={tokenMoving} always={!from} />
        <CaptionProjector at={bubble ? NODE_AT[bubble.target] : null} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {/* 名札は、その場面で関わる場所にだけ出す（攻撃を選ぶ前は地図として全部） */}
        {(Object.keys(LABEL_AT) as CyberNodeId[])
          .filter((id) => shownLabels.has(id))
          .map((id) => (
            <Label key={id} registry={registry} id={`name-${id}`} at={LABEL_AT[id]} place="above">
              <span className={styles.tag} data-node-label={id} data-state={nodes[id]}>
                {NAME[id]}
              </span>
            </Label>
          ))}
        {damage.map((d) => (
          <Label key={`dmg-${d.at}`} registry={registry} id={`dmg-${d.at}`} at={DAMAGE_AT[d.at]} place="center">
            <span className={styles.damage} data-damage={d.at} data-testid={`damage-${d.at}`}>
              {d.text}
            </span>
          </Label>
        ))}
        {payload && (
          <Label registry={registry} id="payload" at={[0, 0.018, 0]} follow={tokenObj as RefObject<THREE.Object3D | null>} place={stop === "attacker" || stop === "user" ? "below" : "above"}>
            <span ref={payloadTag} className={styles.payload} data-tone={payload.tone} data-stop={payload.stop} data-testid="cyber-payload">
              {payload.text}
            </span>
          </Label>
        )}
        {/* 吹き出しは札より手前に出す */}
        <CaptionBubble caption={bubble} root={captionRoot} testId="cyber-bubble" />
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);
