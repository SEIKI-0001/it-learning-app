"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { damp, lift, pointOn, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, Mover, useGlowTexture, useInView, useLabelRegistry, type Shot } from "../scene3d/parts";
import type { IotFocus, IotSceneProps } from "./IotScene";
import styles from "./iot3d.module.css";

// IoT の図解の「動く3D」版。Blender で作ったジオラマ（public/models/iot-home.glb）を three.js で表示する。
//   左＝家のリビング（奥の壁にセンサー付きエアコン、右奥の棚に Wi-Fi ルータ）
//   奥＝道と電柱（光回線）/ 右＝クラウドのデータセンター（青いラックが判断するサーバ）/ 手前＝外出先の人（スマホ）
//   ① 測る：エアコンのセンサーが室温 32℃ を測る（床が赤い＝暑い）
//   ② 送る：測ったデータがルータ・電柱の回線を通ってクラウドへ
//   ③ 判断：クラウドが「暑い → 28℃まで冷やす」と決める
//   ④ 動く：指示がエアコンへ戻り、ルーバーが開いて風が出る（＝アクチュエータが動く）。床が冷えた色になる
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる（~/Blender/iot/scene.py）。

const MODEL_URL = "/models/iot-home.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/iot-home.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_Aircon", "Part_Router", "Part_Cloud"];

/** エアコンのセンサー窓・ルータ・クラウドのラック上 */
const SENSOR: V3 = [-0.434, 0.125, -0.136];
const ROUTER: V3 = [-0.27, 0.098, -0.12];
const CLOUD_TOP: V3 = [0.38, 0.225, -0.02];
/** エアコンの吹き出し口（風の出発点） */
const OUTLET: V3 = [-0.5, 0.104, -0.13];

/** 配線。Blender の模型のケーブルと同じ点（~/Blender/iot/routes.json を glTF 座標にしたもの） */
type Wire = "air" | "wIn" | "wOut" | "wDc";
const WIRES: Record<Wire, V3[]> = {
  air: arc(SENSOR, ROUTER, 0.24),
  wIn: [[-0.27, 0.072, -0.14], [-0.27, 0.072, -0.184], [-0.27, 0.172, -0.184], [-0.27, 0.172, -0.21]],
  wOut: [[-0.27, 0.172, -0.21], [-0.272, 0.28, -0.33], [0.168, 0.28, -0.33], [0.36, 0.186, -0.454]],
  wDc: [[0.36, 0.186, -0.454], [0.36, 0.172, -0.444], [0.36, 0.016, -0.444], [0.36, 0.016, -0.1], [0.38, 0.016, -0.1], [0.38, 0.042, -0.067]],
};
const WIRE_ORDER: Wire[] = ["air", "wIn", "wOut", "wDc"];

/** 2点を結ぶ空中の弧（電波の道） */
function arc(a: V3, b: V3, peak: number): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * (peak - Math.max(a[1], b[1])) * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}

/** センサー → クラウドのラックの上 までの道のり（ケーブルは少し浮かせてたどる） */
const UPLINK: V3[] = [...WIRES.air, ...WIRES.wIn.map((p) => lift(p, 0.012)), ...WIRES.wOut.map((p) => lift(p, 0.012)), ...WIRES.wDc.map((p) => lift(p, 0.012)), CLOUD_TOP];
const DOWNLINK: V3[] = [...UPLINK].reverse();

/** 行き（測ったデータ）は青、帰り（指示）は緑 */
const UP_COLOR = "#3b82f6";
const DOWN_COLOR = "#10b981";

/** 吹き出しが指す点 */
const BUBBLE_AT: Record<IotFocus, V3> = { aircon: [-0.5, 0.17, -0.14], cloud: [0.38, 0.21, -0.02] };

/** カメラ。①は家に寄って センサーを、④は指示が着いたら家に寄って 風とルーバーを見せる */
const SHOT_WIDE: Shot = { pos: [0, 1.32, 1.42], look: [0, 0.0, -0.02] };
const SHOT_HOME: Shot = { pos: [-0.4, 0.76, 0.7], look: [-0.48, 0.06, -0.06] };
const SHOT_WIDE_SQ: Shot = { pos: [0, 1.75, 1.0], look: [0, 0, -0.08] };
const SHOT_HOME_SQ: Shot = { pos: [-0.46, 0.86, 0.72], look: [-0.48, 0.04, 0.0] };

// ---------------------------------------------------------------------------
// 外出先の人のスマホの画面：家の室温（暑い→冷房中）

const JP = '"Hiragino Sans", "Noto Sans JP", sans-serif';

function drawPhone(cooled: boolean) {
  const W = 120;
  const H = 210;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = cooled ? "#dbeafe" : "#ffe4e6";
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.fillStyle = "#475569";
  g.font = `800 16px ${JP}`;
  g.fillText("リビング", W / 2, 46);
  g.fillStyle = cooled ? "#1d4ed8" : "#be123c";
  g.font = `900 40px ${JP}`;
  g.fillText(cooled ? "28℃" : "32℃", W / 2, 110);
  g.font = `800 17px ${JP}`;
  g.fillText(cooled ? "冷房中" : "暑い", W / 2, 150);
  return c;
}

function PhoneScreen({ mesh, cooled }: { mesh: THREE.Mesh | null; cooled: boolean }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(drawPhone(cooled));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    swapMap(mat, tex);
  }, [cooled, mat]);
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

function setRotX(o: THREE.Object3D, x: number) {
  o.rotation.x = x;
}

// ---------------------------------------------------------------------------

type LedKey = "sensor" | "aircon" | "router" | "cloud" | "other";
type ModelParts = {
  root: THREE.Object3D;
  deviceMats: Partial<Record<"aircon" | "router" | "cloud", THREE.MeshStandardMaterial[]>>;
  ledMats: Record<LedKey, THREE.MeshBasicMaterial>;
  louver: THREE.Object3D | null;
  phone: THREE.Mesh | null;
};

const STATE_GLOW = "#60a5fa";

type HomeState = { phase: IotSceneProps["phase"]; moving: boolean; arrived: boolean; cooled: boolean };

function Home({ s, reducedMotion }: { s: HomeState; reducedMotion: boolean }) {
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
    const partKey: Record<string, "aircon" | "router" | "cloud"> = { Part_Aircon: "aircon", Part_Router: "router", Part_Cloud: "cloud" };
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
    const led = (node: string, color: string) => {
      const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      eachMesh(node, (mesh) => (mesh.material = m));
      return m;
    };
    const ledMats = {
      sensor: led("LED_Sensor", "#ef4444"),
      aircon: led("LED_Aircon", "#22c55e"),
      router: led("LED_Router", "#22c55e"),
      cloud: led("LED_Cloud", "#22c55e"),
      other: led("LED_Other", "#22c55e"),
    };
    let phone: THREE.Mesh | null = null;
    eachMesh("Scr_Phone", (m) => (phone = m));
    return { root, deviceMats, ledMats, louver: byName["Part_Louver"] ?? null, phone };
  }, [scene, baked]);

  const live = useRef<ModelParts | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);

  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    const blink = (on: boolean, i: number) => (reducedMotion ? 1 : on ? (Math.sin(t * 14 + i) > 0 ? 1 : 0.3) : 0.55 + 0.15 * Math.sin(t * 2 + i));
    const measuring = s.phase === 0;
    const sending = s.moving;
    const judging = s.phase === 2 || (s.phase === 1 && s.arrived);
    // センサー：測っている間だけ赤く点滅。運転ランプは冷房中だけ緑
    m3.ledMats.sensor.color.set("#ef4444").multiplyScalar(measuring ? (reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(t * 6)) : 0.12);
    m3.ledMats.aircon.color.set("#22c55e").multiplyScalar(s.cooled ? 1 : 0.1);
    m3.ledMats.router.color.set("#22c55e").multiplyScalar(blink(sending, 0));
    m3.ledMats.cloud.color.set("#22c55e").multiplyScalar(blink(judging, 1));
    m3.ledMats.other.color.set("#22c55e").multiplyScalar(blink(false, 3));
    const glow = (key: "aircon" | "router" | "cloud", on: boolean) => {
      for (const m of m3.deviceMats[key] ?? []) {
        m.emissive.set(STATE_GLOW);
        m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, on ? 0.22 : 0, 6, dt) });
      }
    };
    glow("aircon", measuring || s.cooled);
    glow("router", sending);
    glow("cloud", judging);
    // ルーバー：冷房が動くと下へ開く（奥の辺が軸）
    if (m3.louver) setRotX(m3.louver, damp(m3.louver.rotation.x, s.cooled ? 0.95 : 0, reducedMotion ? 1000 : 3, dt));
  });

  return (
    <>
      <primitive object={model.root} />
      <PhoneScreen mesh={model.phone} cooled={s.cooled} />
    </>
  );
}

/** リビングの床の色：暑い＝赤、冷えた＝青。加算でなく半透明で重ねる */
function RoomHeat({ cooled, reducedMotion }: { cooled: boolean; reducedMotion: boolean }) {
  const tex = useGlowTexture();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const hot = useRef(new THREE.Color("#f43f5e"));
  const cool = useRef(new THREE.Color("#38bdf8"));
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const k = reducedMotion ? 1000 : 1.4;
    m.color.lerp(cooled ? cool.current : hot.current, 1 - Math.exp(-k * dt));
    m.opacity = damp(m.opacity, cooled ? 0.6 : 0.42, 4, dt);
  });
  return (
    <mesh position={[-0.5, 0.0135, 0.1]} rotation={[-Math.PI / 2, 0, 0]} data-testid="iot-heat">
      <planeGeometry args={[0.62, 0.6]} />
      <meshBasicMaterial ref={mat} map={tex} color="#f43f5e" transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** エアコンの風：吹き出し口から手前下へ流れる粒 */
function Wind({ on, reducedMotion }: { on: boolean; reducedMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  const lanes = useMemo<V3[][]>(
    () =>
      [-0.05, -0.017, 0.017, 0.05].map((dx) => [
        [OUTLET[0] + dx, OUTLET[1], OUTLET[2]],
        [OUTLET[0] + dx * 1.3, OUTLET[1] - 0.025, OUTLET[2] + 0.09],
        [OUTLET[0] + dx * 1.6, OUTLET[1] - 0.06, OUTLET[2] + 0.2],
        [OUTLET[0] + dx * 1.9, OUTLET[1] - 0.085, OUTLET[2] + 0.3],
      ]),
    [],
  );
  useFrame((s) => {
    const grp = g.current;
    if (!grp) return;
    grp.visible = on;
    if (!on) return;
    grp.children.forEach((c, i) => {
      const lane = lanes[i % lanes.length];
      const t = reducedMotion ? 0.25 + 0.5 * ((i / lanes.length) % 1) : (s.clock.elapsedTime * 0.45 + i * 0.37) % 1;
      pointOn(lane, t, tmp.current);
      c.position.copy(tmp.current);
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = reducedMotion ? 0.7 : Math.sin(t * Math.PI) * 0.9;
    });
  });
  return (
    <group ref={g} visible={false}>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} scale={[1.2, 0.6, 2.6]}>
          <sphereGeometry args={[0.008, 10, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
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
 * 配線。ふだんは Blender のケーブルそのもの。運んでいる間だけ光る管を重ねて、向きに合わせて粒を流す。
 * air（電波）は管を細く薄くし、弧に沿って粒だけ飛ばす。
 */
function WireLane({ id, tone, reducedMotion }: { id: Wire; tone: { color: string; back: boolean } | null; reducedMotion: boolean }) {
  const pts = WIRES[id];
  const air = id === "air";
  const tube = useTube(pts, air ? 0.0015 : 0.0042);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  const color = tone?.color ?? "#94a3b8";
  const count = air ? 5 : 4;
  useFrame((s, dt) => {
    const m = mat.current;
    if (m) {
      m.color.set(color);
      m.emissive.set(color);
      m.opacity = damp(m.opacity, tone ? (air ? 0.35 : 0.95) : 0, 6, dt);
    }
    const g = dots.current;
    if (!g) return;
    g.visible = !!tone;
    if (!tone) return;
    g.children.forEach((c, i) => {
      if (i >= count) {
        c.visible = false;
        return;
      }
      c.visible = true;
      let t = reducedMotion ? (i + 0.5) / count : (s.clock.elapsedTime * (air ? 0.7 : 0.5) + i / count) % 1;
      if (tone.back) t = 1 - t;
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
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[air ? 0.005 : 0.0055, 12, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** 運ぶ物：測ったデータ（青い小包）・指示（緑の小包） */
function Parcel({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[0.024, 0.018, 0.024]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** 運び終わったら知らせる（札を「動いている間だけ」出し、着いたら行き先の札に切り替える） */
function ArrivalWatch({ moving, onArrive }: { moving: RefObject<boolean>; onArrive: () => void }) {
  const was = useRef(false);
  useFrame(() => {
    const now = !!moving.current;
    if (was.current && !now) onArrive();
    was.current = now;
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

/** 縦長・正方形に近い枠（スマホ）では真上寄りから見る。横幅 1.7m のジオラマが左右で切れないように */
function FitView({ home, reducedMotion }: { home: boolean; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 43);
  }, [camera, square]);
  const shot = home ? (square ? SHOT_HOME_SQ : SHOT_HOME) : square ? SHOT_WIDE_SQ : SHOT_WIDE;
  return <CameraRig shot={shot} reducedMotion={reducedMotion} />;
}

// ---------------------------------------------------------------------------

export default function IotScene3D({ phase, forward, reducedMotion, caption = null }: IotSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const parcelRef = useRef<THREE.Group>(null);
  const moving = useRef(false);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);

  const carrying = phase === 1 || phase === 3;
  // 戻る・飛ばす・動きを減らす設定のときは、運ぶ物を瞬間移動させる（＝最初から着いた扱い）
  const instant = !forward || reducedMotion;
  const arrived = !carrying || instant || arrivedAt === phase;
  const cooled = phase === 3 && arrived;
  const movingNow = carrying && !arrived;

  // 運ぶ物：②は測ったデータ（センサー → クラウド）、③はクラウドに置いたまま、④は指示（クラウド → エアコン）
  const parcel = phase === 1 ? { color: UP_COLOR, at: CLOUD_TOP, start: SENSOR, path: instant ? undefined : UPLINK } : phase === 2 ? { color: UP_COLOR, at: CLOUD_TOP } : phase === 3 && !cooled ? { color: DOWN_COLOR, at: SENSOR, start: CLOUD_TOP, path: instant ? undefined : DOWNLINK } : null;
  const tone = movingNow ? { color: phase === 1 ? UP_COLOR : DOWN_COLOR, back: phase === 3 } : null;
  const home = phase === 0 || cooled;

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="iot-scene"
      data-scene="3d"
      data-phase={String(phase)}
      data-cooled={cooled ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="img"
      aria-label="家のリビングの模型（3D）。奥の壁のエアコンにはセンサーが付いていて、棚のWi-Fiルータから電柱の光回線を通って、右のクラウド（データセンター）につながっている。手前には外出先でスマホを見る人"
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
        <FitView home={home} reducedMotion={reducedMotion} />

        <Home s={{ phase, moving: movingNow, arrived, cooled }} reducedMotion={reducedMotion} />
        <RoomHeat cooled={cooled} reducedMotion={reducedMotion} />
        <Wind on={cooled} reducedMotion={reducedMotion} />
        {WIRE_ORDER.map((id) => (
          <WireLane key={id} id={id} tone={tone} reducedMotion={reducedMotion} />
        ))}

        <Mover at={parcel?.at ?? null} start={parcel?.start} path={parcel?.path} speed={0.75} reducedMotion={reducedMotion} objRef={parcelRef} movingRef={moving}>
          {parcel && <Parcel color={parcel.color} />}
        </Mover>
        <ArrivalWatch moving={moving} onArrive={() => setArrivedAt(phase)} />

        <LabelProjector registry={registry} />
        <CaptionProjector at={caption ? BUBBLE_AT[caption.focus] : null} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {/* ① センサー（測る役） */}
        {phase === 0 && (
          <Label registry={registry} id="sensor" at={[-0.42, 0.11, -0.12]} place="below">
            <span className={styles.role} data-tone="danger" data-testid="iot-role-sensor">
              <span>センサー＝測る</span>
              <b>室温 32℃</b>
            </span>
          </Label>
        )}
        {/* 運んでいる間だけ、運ぶ物の札を付ける */}
        {movingNow && (
          <Label registry={registry} id="parcel" at={[0, 0.022, 0]} follow={parcelRef as RefObject<THREE.Object3D | null>} place="above">
            <span className={styles.payload} data-kind={phase === 3 ? "down" : "up"} data-testid="iot-payload">
              {phase === 1 ? "データ 32℃" : "指示 冷房ON 28℃"}
            </span>
          </Label>
        )}
        {((phase === 1 && arrived) || phase === 2) && (
          <Label registry={registry} id="cloud" at={[0.38, 0.235, -0.02]} place="right">
            <span className={styles.tag}>クラウド</span>
          </Label>
        )}
        {/* ④ アクチュエータ（動く役）。センサーと対にして、測る部品と動かす部品の違いを見せる */}
        {cooled && (
          <Label registry={registry} id="actuator" at={[-0.6, 0.11, -0.12]} place="left">
            <span className={styles.role} data-tone="ok" data-testid="iot-role-actuator">
              <span>アクチュエータ＝動かす</span>
              <b>風を送る</b>
            </span>
          </Label>
        )}
        {/* 室温は模型の床の色だけだと読み取りにくいので、左下の隅に数字で */}
        <span className={`absolute bottom-2 left-2 ${styles.temp}`} data-cooled={cooled ? "true" : "false"} data-testid="iot-temp">
          室温<b>{cooled ? "28℃" : "32℃"}</b>
        </span>
        <CaptionBubble
          caption={caption ? { id: caption.id, text: caption.text, tone: caption.tone === "danger" ? "danger" : caption.tone === "ok" ? "safe" : undefined, target: caption.focus } : null}
          root={captionRoot}
          testId="iot-scene-caption"
        />
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);
