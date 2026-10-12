"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { damp, lift, pointOn, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, Mover, useGlowTexture, useInView, useLabelRegistry, type Shot } from "../scene3d/parts";
import type { NodeState } from "./NetworkSceneBase";
import type { CapsuleKind, CapsuleStop, DnsSceneProps, LaneId, LaneState, NetworkNodeId } from "./dnsTypes";
import { DnsLookupTable } from "./DnsLookupTable";
import styles from "./dnsdiorama.module.css";
import tagStyles from "../netdev/netdev3d.module.css";

// IPアドレス・DNS の図解の「動く3D」版。Blender で作ったジオラマ（public/models/dns-net.glb）を three.js で表示する。
//   左手前＝自宅の部屋（あなたの PC と Wi-Fi ルータ）/ 真ん中＝インターネット（地球儀）
//   奥＝DNS サーバ室 / 右＝Web サーバのデータセンター
// 名前（example.com）を DNS に問い合わせて IP アドレスを受け取り、その IP を宛先に Web サーバへ向かう。
// 4本の車線（問い合わせ・応答・接続・ページ）は、同じケーブルを行き・帰りで使う（粒の向きで区別する）。
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる（~/Blender/dns/scene.py）。

const MODEL_URL = "/models/dns-net.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/dns-net.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_Router", "Part_DNS", "Part_Web"];

/** 模型の中の場所。router・internet は通り道（名札は出さない） */
type Place = NetworkNodeId | "router" | "internet";
/** 配線。air＝PC と Wi-Fi ルータの間の電波 */
type Wire = "air" | "wH" | "wD" | "wW";

/** 運ぶ物が止まる点 */
const STOP: Record<Place, V3> = {
  user: [-0.53, 0.16, 0.22],
  router: [-0.4, 0.095, 0.0],
  internet: [-0.02, 0.215, 0.14],
  dns: [-0.06, 0.06, -0.3],
  web: [0.56, 0.06, 0.115],
};
/** 名札を置く点 */
const LABEL_AT: Record<NetworkNodeId, V3> = {
  // 椅子の右（真上は PC の画面と、手前は左下の札と重なり、左はスマホ幅で切れる）
  user: [-0.55, 0.08, 0.36],
  // ラックの左（真上はスマホ幅で上端の吹き出しに隠れる）
  dns: [-0.1, 0.13, -0.36],
  web: [0.56, 0.235, 0.04],
};
const LABEL_PLACE: Record<NetworkNodeId, "above" | "left" | "right"> = { user: "right", dns: "left", web: "above" };
/** 吹き出しが指す点（あなた＝PC の画面） */
const BUBBLE_AT: Record<NetworkNodeId, V3> = {
  user: [-0.6, 0.23, 0.146],
  dns: [-0.06, 0.2, -0.335],
  web: [0.56, 0.2, 0.085],
};
/** 状態を示す足元の光 [中心, 幅, 奥行き] */
const GLOW: Record<NetworkNodeId, { at: V3; size: [number, number] }> = {
  user: { at: [-0.6, 0.0135, 0.2], size: [0.36, 0.36] },
  dns: { at: [-0.06, 0.0135, -0.37], size: [0.2, 0.2] },
  web: { at: [0.56, 0.0135, 0.03], size: [0.22, 0.22] },
};

/** 配線。Blender の模型のケーブルと同じ点（~/Blender/dns/routes.json を glTF 座標にしたもの） */
const WIRES: Record<Wire, V3[]> = {
  air: arc(STOP.user, STOP.router, 0.24),
  wH: [[-0.4, 0.067, 0.03], [-0.4, 0.0145, 0.03], [-0.4, 0.0145, 0.14], [-0.3, 0.0145, 0.14], [-0.28, 0.0065, 0.14], [-0.075, 0.0065, 0.14]],
  wD: [[-0.02, 0.0065, 0.085], [-0.02, 0.0065, -0.15], [-0.02, 0.0145, -0.17], [-0.02, 0.0145, -0.31], [-0.06, 0.0145, -0.31], [-0.06, 0.042, -0.331]],
  wW: [[0.035, 0.0065, 0.14], [0.34, 0.0065, 0.14], [0.36, 0.0145, 0.14], [0.56, 0.0145, 0.14], [0.56, 0.042, 0.089]],
};
const WIRE_ENDS: Record<Wire, [Place, Place]> = { air: ["user", "router"], wH: ["router", "internet"], wD: ["internet", "dns"], wW: ["internet", "web"] };

/** 2点を結ぶ空中の弧（電波の道） */
function arc(a: V3, b: V3, peak: number): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * (peak - Math.max(a[1], b[1])) * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}

/** 車線ごとに通るケーブルと向き（行き＝あなたから先へ） */
const LANE_WIRES: Record<LaneId, { wires: Wire[]; back: boolean }> = {
  query: { wires: ["air", "wH", "wD"], back: false },
  response: { wires: ["air", "wH", "wD"], back: true },
  web: { wires: ["air", "wH", "wW"], back: false },
  page: { wires: ["air", "wH", "wW"], back: true },
};
/** 行き（要求）は青、帰り（応答・ページ）は緑、塞がった道は赤 */
const REQUEST = "#3b82f6";
const RESPONSE = "#10b981";
const BLOCKED = "#e11d48";

type WireTone = { color: string; back: boolean; blocked: boolean } | null;

function wireTones(lanes: Record<LaneId, LaneState>): Record<Wire, WireTone> {
  const out: Record<Wire, WireTone> = { air: null, wH: null, wD: null, wW: null };
  for (const id of Object.keys(lanes) as LaneId[]) {
    if (lanes[id] !== "active") continue;
    const { wires, back } = LANE_WIRES[id];
    for (const w of wires) out[w] = { color: back ? RESPONSE : REQUEST, back, blocked: false };
  }
  // 塞がった道は、その先だけ（DNS・Web へのケーブル）を赤く薄く。家からインターネットまでは共有なので塞がない
  if (!out.wD && (lanes.response === "blocked" || lanes.query === "blocked")) out.wD = { color: BLOCKED, back: false, blocked: true };
  if (!out.wW && (lanes.web === "blocked" || lanes.page === "blocked")) out.wW = { color: BLOCKED, back: false, blocked: true };
  return out;
}

/** 運ぶ物の道のり：止まる点ごとに、どこからどこへ行くか */
const STOP_ROUTE: Record<CapsuleStop, { route: Place[]; at?: V3 }> = {
  input: { route: ["user"] },
  userOut: { route: ["user"] },
  dnsIn: { route: ["user", "router", "internet", "dns"] },
  dnsBlocked: { route: ["user", "router", "internet"], at: [-0.02, 0.03, -0.2] },
  dnsOut: { route: ["dns"] },
  userIn: { route: ["dns", "internet", "router", "user"] },
  webOut: { route: ["user"] },
  webIn: { route: ["user", "router", "internet", "web"] },
  pageOut: { route: ["web"] },
  pageIn: { route: ["web", "internet", "router", "user"] },
};

/** 場所の並びを、配線をたどる道のりにする */
function routePath(route: Place[], end?: V3): V3[] | undefined {
  if (route.length < 2) return undefined;
  const pts: V3[] = [];
  for (let i = 1; i < route.length; i++) {
    const [a, b] = [route[i - 1], route[i]];
    const hit = (Object.entries(WIRE_ENDS) as [Wire, [Place, Place]][]).find(([, [x, y]]) => (x === a && y === b) || (x === b && y === a));
    if (!hit) continue;
    const [id, [x]] = hit;
    // 床のケーブルは少し浮かせてたどる（電波の弧はそのまま）
    const lane = WIRES[id].map((p) => (id === "air" ? p : lift(p, 0.014)));
    pts.push(...(x !== a ? [...lane].reverse() : lane));
    if (i < route.length - 1) pts.push(STOP[b]);
  }
  if (end) pts.push(end);
  return pts;
}

const PARCEL_COLOR: Record<CapsuleKind, string> = {
  input: "#64748b",
  query: "#2563eb",
  response: "#059669",
  connect: "#2563eb",
  connected: "#2563eb",
  page: "#059669",
  timeout: "#e11d48",
};

const SHOT_WIDE: Shot = { pos: [0, 1.42, 1.5], look: [0, -0.02, -0.03] };
const SHOT_SQUARE: Shot = { pos: [0, 1.8, 1.0], look: [0, 0, -0.1] };

// ---------------------------------------------------------------------------
// あなたの PC の画面：アドレス欄に名前を入れた状態 → 接続先を探している → ページが表示された状態

const JP = '"Hiragino Sans", "Noto Sans JP", sans-serif';
type ScreenKind = "typing" | "waiting" | "page";

function drawScreen(kind: ScreenKind) {
  const W = 320;
  const H = 200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  // アドレス欄
  g.fillStyle = "#e2e8f0";
  g.fillRect(0, 0, W, 46);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(14, 9, W - 28, 28, 14);
  g.fill();
  g.fillStyle = "#0f172a";
  g.font = `800 20px ${JP}`;
  g.textBaseline = "middle";
  g.fillText("example.com", 30, 24);
  g.textAlign = "center";
  if (kind === "page") {
    g.fillStyle = "#3b82f6";
    g.fillRect(24, 62, W - 48, 50);
    g.fillStyle = "#0f172a";
    g.font = `900 24px ${JP}`;
    g.fillText("Example Domain", W / 2, 136);
    g.fillStyle = "#cbd5e1";
    g.fillRect(40, 158, W - 80, 9);
    g.fillRect(40, 176, W - 140, 9);
  } else if (kind === "waiting") {
    g.fillStyle = "#be123c";
    g.font = `800 22px ${JP}`;
    g.fillText("接続先を探しています…", W / 2, 120);
  }
  return c;
}

function PcScreen({ mesh, kind }: { mesh: THREE.Mesh | null; kind: ScreenKind }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(drawScreen(kind));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    swapMap(mat, tex);
  }, [kind, mat]);
  useEffect(() => {
    attach(mesh, mat);
  }, [mesh, mat]);
  return null;
}

function swapMap(mat: THREE.MeshBasicMaterial, tex: THREE.Texture) {
  const old = mat.map;
  mat.map = tex;
  mat.needsUpdate = true;
  old?.dispose();
}

function attach(mesh: THREE.Mesh | null, mat: THREE.Material) {
  if (mesh) mesh.material = mat;
}

// ---------------------------------------------------------------------------

type LedKey = "router" | "dns" | "web" | "other";
type ModelParts = {
  root: THREE.Object3D;
  deviceMats: Partial<Record<"router" | NetworkNodeId, THREE.MeshStandardMaterial[]>>;
  ledMats: Record<LedKey, THREE.MeshBasicMaterial>;
  globeMats: THREE.MeshStandardMaterial[];
  screen: THREE.Mesh | null;
};

const STATE_GLOW = "#60a5fa";
const ERROR_GLOW = "#f43f5e";

function Network({ nodes, routerOn, netOn, screen, reducedMotion }: { nodes: Record<NetworkNodeId, NodeState>; routerOn: boolean; netOn: boolean; screen: ScreenKind; reducedMotion: boolean }) {
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
    const partKey: Record<string, "router" | NetworkNodeId> = { Part_Router: "router", Part_DNS: "dns", Part_Web: "web" };
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
    const led = (node: string) => {
      const m = new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false });
      eachMesh(node, (mesh) => (mesh.material = m));
      return m;
    };
    const ledMats = { router: led("LED_Router"), dns: led("LED_DNS"), web: led("LED_Web"), other: led("LED_Other") };
    // 地球儀（インターネット）は、使われている間だけ明るく光らせる
    const globeMats: THREE.MeshStandardMaterial[] = [];
    eachMesh("Net_Globe", (mesh) => {
      const c = (mesh.material as THREE.MeshStandardMaterial).clone();
      globeMats.push(c);
      mesh.material = c;
    });
    let screenMesh: THREE.Mesh | null = null;
    eachMesh("Scr_PC", (m) => (screenMesh = m));
    return { root, deviceMats, ledMats, globeMats, screen: screenMesh };
  }, [scene, baked]);

  const live = useRef<ModelParts | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);

  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    const working = (s: NodeState) => s === "active" || s === "sending";
    const blink = (on: boolean, i: number) => (reducedMotion ? 1 : on ? (Math.sin(t * 14 + i) > 0 ? 1 : 0.3) : 0.55 + 0.15 * Math.sin(t * 2 + i));
    // ランプ：ふだんは緑でゆっくり、働いている間は速く点滅。止まった DNS は赤、未接続の Web は消える
    m3.ledMats.router.color.set("#22c55e").multiplyScalar(blink(routerOn, 0));
    m3.ledMats.dns.color.set(nodes.dns === "error" ? "#ef4444" : "#22c55e").multiplyScalar(nodes.dns === "error" ? (reducedMotion ? 1 : Math.sin(t * 5) > 0 ? 1 : 0.25) : blink(working(nodes.dns), 1));
    m3.ledMats.web.color.set("#22c55e").multiplyScalar(nodes.web === "disabled" ? 0.08 : blink(working(nodes.web), 2));
    m3.ledMats.other.color.set("#22c55e").multiplyScalar(nodes.web === "disabled" ? 0.08 : blink(false, 3));
    const glow = (key: "router" | NetworkNodeId, on: boolean, color: string) => {
      for (const m of m3.deviceMats[key] ?? []) {
        m.emissive.set(color);
        m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, on ? 0.22 : 0, 6, dt) });
      }
    };
    glow("router", routerOn, STATE_GLOW);
    glow("dns", working(nodes.dns) || nodes.dns === "error", nodes.dns === "error" ? ERROR_GLOW : STATE_GLOW);
    glow("web", working(nodes.web), STATE_GLOW);
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 4);
    for (const m of m3.globeMats) m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, netOn ? 1.4 * pulse : 0.35, 5, dt) });
  });

  return (
    <>
      <primitive object={model.root} />
      <PcScreen mesh={model.screen} kind={screen} />
    </>
  );
}

/** 場所の足元の光（止まった所は赤） */
function NodeGlow({ id, state, reducedMotion }: { id: NetworkNodeId; state: NodeState; reducedMotion: boolean }) {
  const tex = useGlowTexture();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const on = state === "active" || state === "sending" || state === "error";
  const color = state === "error" ? ERROR_GLOW : STATE_GLOW;
  useFrame((s, dt) => {
    const m = mat.current;
    if (!m) return;
    m.color.set(color);
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(s.clock.elapsedTime * 4);
    m.opacity = damp(m.opacity, on ? 0.45 * pulse : 0, 6, dt);
  });
  const g = GLOW[id];
  return (
    <mesh position={g.at} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={g.size} />
      <meshBasicMaterial ref={mat} map={tex} color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
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
 * 配線。ふだんは Blender のケーブルそのもの。使われている間だけ光る管を重ねて、向きに合わせて粒を流す。
 * 塞がった道は赤く薄く（粒は流さない）。air（電波）は管を出さず、弧に沿って粒だけ飛ばす。
 */
function WireLane({ id, tone, reducedMotion }: { id: Wire; tone: WireTone; reducedMotion: boolean }) {
  const pts = WIRES[id];
  const air = id === "air";
  const tube = useTube(pts, air ? 0.0015 : 0.0045);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  const color = tone?.color ?? "#94a3b8";
  const flowing = !!tone && !tone.blocked;
  const count = air ? 6 : 4;
  useFrame((s, dt) => {
    const m = mat.current;
    if (m) {
      m.color.set(color);
      m.emissive.set(color);
      m.opacity = damp(m.opacity, tone ? (air ? (tone.blocked ? 0 : 0.35) : tone.blocked ? 0.5 : 0.95) : 0, 6, dt);
      m.emissiveIntensity = tone?.blocked ? 0.5 : 1.4;
    }
    const g = dots.current;
    if (!g) return;
    g.visible = flowing;
    if (!flowing) return;
    g.children.forEach((c, i) => {
      if (i >= count) {
        c.visible = false;
        return;
      }
      c.visible = true;
      let t = reducedMotion ? (i + 0.5) / count : (s.clock.elapsedTime * (air ? 0.7 : 0.5) + i / count) % 1;
      if (tone?.back) t = 1 - t;
      const p = pointOn(pts, t, tmp.current);
      c.position.set(p.x, p.y + (air ? 0 : 0.005), p.z);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(color);
    });
  });
  return (
    <group>
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

/** 運ぶ物：データの小包。種類が変わったら一瞬大きくして気づかせる */
function Parcel({ kind }: { kind: CapsuleKind }) {
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
    g.rotation.y = s.clock.elapsedTime * 1.5;
    g.scale.setScalar(1 + flash.current * 0.6);
  });
  const c = PARCEL_COLOR[kind];
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[0.024, 0.018, 0.024]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1} roughness={0.4} />
      </mesh>
    </group>
  );
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

// ---------------------------------------------------------------------------

/** データの札の向き。吹き出しが指す物（着いた先）を隠さないよう、横へずらす */
function capsulePlace(stop: CapsuleStop | null, lookup: boolean) {
  if (stop === "webIn") return "left" as const;
  // 名札（左）と吹き出し（上）を避けて下へ
  if (lookup) return "below" as const;
  if (stop === "dnsBlocked") return "below" as const;
  return "right" as const;
}

const NAME: Record<NetworkNodeId, string> = { user: "あなた", dns: "DNSサーバ", web: "Webサーバ" };
// 状態の小札は「止まっている」ときだけ（処理中・送信は動きと吹き出しで分かる）
const STATUS_WORD: Partial<Record<NodeState, string>> = { error: "応答なし", disabled: "未接続" };

export default function DnsScene3D({ nodes, lanes, capsule, showBrowser = false, outage, reducedMotion, inspectOpen, onInspect, forward, caption = null, lookup = null }: DnsSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const parcelRef = useRef<THREE.Group>(null);
  const moving = useRef(false);

  const tones = wireTones(lanes);
  const stop = capsule?.stop ?? null;
  const leg = stop ? STOP_ROUTE[stop] : null;
  const end = leg ? (leg.at ?? STOP[leg.route[leg.route.length - 1]]) : null;
  // 戻る・飛ばすときは小包を瞬間移動させる（道のりを渡さない）
  const path = leg && forward ? routePath(leg.route, leg.at) : undefined;
  const dnsDown = nodes.dns === "error";
  // IPアドレスが分かるのは DNS の応答を受け取ってから
  const knowsIp = showBrowser || (!!stop && !["input", "userOut", "dnsIn", "dnsBlocked"].includes(stop));
  const screen: ScreenKind = showBrowser ? "page" : dnsDown ? "waiting" : "typing";
  const routerOn = !!tones.air && !tones.air.blocked;
  const netOn = routerOn;
  // 名札はその場面で関わる物だけ（待機中の物は名前を出さない）
  const involved = (Object.keys(NAME) as NetworkNodeId[]).filter((id) => nodes[id] !== "idle");

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="network-scene"
      data-scene="3d"
      data-outage={outage ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="img"
      aria-label="自宅の部屋のPCとWi-Fiルータ、真ん中の地球儀（インターネット）、奥のDNSサーバ室、右のWebサーバのデータセンターが並ぶジオラマ（3D）。ケーブルでつながっている"
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
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

        <Network nodes={nodes} routerOn={routerOn} netOn={netOn} screen={screen} reducedMotion={reducedMotion} />

        {(Object.keys(GLOW) as NetworkNodeId[]).map((id) => (
          <NodeGlow key={id} id={id} state={nodes[id]} reducedMotion={reducedMotion} />
        ))}
        {(Object.keys(WIRES) as Wire[]).map((id) => (
          <WireLane key={id} id={id} tone={tones[id]} reducedMotion={reducedMotion} />
        ))}

        <Mover at={end} start={leg ? STOP[leg.route[0]] : undefined} path={path} speed={0.7} reducedMotion={reducedMotion} objRef={parcelRef} movingRef={moving}>
          {capsule && <Parcel kind={capsule.kind} />}
        </Mover>

        <LabelProjector registry={registry} />
        <CaptionProjector at={caption ? BUBBLE_AT[caption.focus] : null} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {involved.map((id) => (
          <Label key={id} registry={registry} id={`name-${id}`} at={LABEL_AT[id]} place={LABEL_PLACE[id]}>
            <span className={tagStyles.tag} data-node-label={id} data-state={nodes[id]}>
              {NAME[id]}
              {STATUS_WORD[nodes[id]] && <span className="ml-1 text-rose-200">{STATUS_WORD[nodes[id]]}</span>}
            </span>
          </Label>
        ))}
        {/* 流れているデータの札。押すと中身を見られる */}
        {capsule && (
          <Label registry={registry} id="capsule" at={[0, 0.025, 0]} follow={parcelRef as RefObject<THREE.Object3D | null>} place={capsulePlace(stop, !!lookup)}>
            <button
              type="button"
              onClick={onInspect}
              aria-expanded={inspectOpen}
              aria-label="流れているデータの中身を見る"
              className={`pointer-events-auto ${styles.capsule}`}
              data-capsule-kind={capsule.kind}
            >
              <span className={styles.capsuleTag}>{capsule.tag}</span>
              <span className={styles.capsulePayload}>{capsule.payload}</span>
            </button>
          </Label>
        )}
        {/* DNSの対応表。ラックの横はスマホ幅で吹き出しと重なり右へはみ出すので、空いている右下の隅に出す */}
        {lookup && (
          <div className="absolute bottom-2 right-2">
            <DnsLookupTable state={lookup} />
          </div>
        )}
        {/* 模型の PC の画面は小さいので、表示されたページは右下の隅に大きく出す */}
        {showBrowser && (
          <div className="absolute bottom-2 right-2 w-[44%] max-w-[220px] overflow-hidden rounded-lg shadow-lg" data-testid="browser-window" role="img" aria-label="ブラウザに example.com のページが表示された画面">
            <div className={styles.browser}>
              <div className={styles.browserBar}>
                <span className={styles.dots} aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.url}>example.com</span>
              </div>
              <div className={styles.page}>
                <span className={styles.hero} />
                <b>Example Domain</b>
                <span className={styles.line} />
                <span className={`${styles.line} ${styles.short}`} />
              </div>
            </div>
          </div>
        )}
        {/* 名前と IP の対応札。ページを出す場面は、ブラウザの窓とスマホ幅で重なるので隠す */}
        {!showBrowser && (
          <span className={`absolute bottom-2 left-2 ${styles.plate}`} data-outage={dnsDown ? "true" : "false"}>
            {dnsDown ? "DNS 停止中" : knowsIp ? "example.com → 93.184.216.34" : "example.com → ?"}
          </span>
        )}
        <CaptionBubble
          caption={caption ? { id: caption.id, text: caption.text, tone: caption.tone === "danger" ? "danger" : undefined, target: caption.focus } : null}
          root={captionRoot}
          testId="network-scene-caption"
        />
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);
