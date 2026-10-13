"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { NameChip } from "../scene/DioramaStage";
import { damp, lift, pointOn, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, Mover, useInView, useLabelRegistry, type Shot } from "../scene3d/parts";
import { CIPHER, EveScreen, SSIDS, SsidPlate, WIFI_CAPTION, WifiDataTag, WifiListCard, ssidLock, type WifiFocus, type WifiMode, type WifiPhase, type WifiSceneProps } from "./wifiStory";
import styles from "./wifi3d.module.css";

// 無線LAN の図解の「動く3D」版。Blender で作ったジオラマ（public/models/wifi-cafe.glb）を three.js で表示する。
//   左＝駅前カフェの店内（手前の席にあなたのノートPC、奥の壁にアクセスポイントと Wi-Fi の看板）
//   右＝ガラスの外の歩道。テーブルで、受信用アンテナを立てたノートPCを開いている盗聴者
//   ① つなぐ：ノートPCの Wi-Fi 一覧で SSID を選ぶ（鍵マークの有無で暗号化を見分ける）
//   ② 送る：ID/PASS がアクセスポイントへ。電波は輪になって周り全部へ広がり、ガラスを越えて盗聴者にも届く
//   ③ 届いた先：盗聴者の画面に、暗号化なしなら ID/PASS がそのまま、WPA2/WPA3 なら暗号文だけ
//   比較：有線 … LANケーブルの中だけを通り、電波は出ない
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる（~/Blender/wifi/scene.py）。

const MODEL_URL = "/models/wifi-cafe.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/wifi-cafe.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_AP"];

/** あなたのノートPCの画面・アクセスポイント・盗聴者のノートPCの画面 */
const LAPTOP: V3 = [-0.3, 0.13, 0.117];
const AP: V3 = [-0.12, 0.172, -0.428];
const EVE: V3 = [0.42, 0.13, -0.003];

/** LANケーブル。Blender の模型のケーブルと同じ点（~/Blender/wifi/routes.json を glTF 座標にしたもの） */
const LAN: V3[] = [
  [-0.284, 0.114, 0.113],
  [-0.216, 0.114, 0.113],
  [-0.216, 0.014, 0.113],
  [-0.216, 0.014, -0.444],
  [-0.12, 0.014, -0.444],
  [-0.12, 0.158, -0.444],
];

/** 2点を結ぶ空中の弧（電波で飛ぶ小包の道） */
function arc(a: V3, b: V3, peak: number): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * (peak - Math.max(a[1], b[1])) * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return pts;
}
const TO_AP = arc(LAPTOP, AP, 0.3);
const TO_EVE = arc(LAPTOP, EVE, 0.26);
const WIRE: V3[] = [LAPTOP, ...LAN.map((p) => lift(p, 0.008)), AP];

/** 電波が届く遠さ（盗聴者のテーブルの先まで） */
const WAVE_MAX = 0.95;
const WAVE_COLOR: Record<WifiMode, string> = { open: "#f43f5e", wpa: "#10b981", wired: "#94a3b8" };
const PACKET_COLOR: Record<WifiMode, string> = { open: "#e11d48", wpa: "#059669", wired: "#3b82f6" };

/** 吹き出しが指す点 */
const BUBBLE_AT: Record<WifiFocus, V3> = { you: [-0.3, 0.2, 0.2], ap: [-0.12, 0.2, -0.43], eve: [0.42, 0.21, 0.1] };

/** カメラ。① はあなたの席に寄って Wi-Fi の一覧を、②③ は店の外まで入れた全景 */
const SHOT_WIDE: Shot = { pos: [0.02, 1.02, 1.12], look: [0.02, 0.0, -0.01] };
const SHOT_SEAT: Shot = { pos: [-0.14, 0.6, 0.78], look: [-0.2, 0.08, -0.06] };
const SHOT_WIDE_SQ: Shot = { pos: [0.02, 1.5, 0.98], look: [0.02, -0.02, -0.22] };
const SHOT_SEAT_SQ: Shot = { pos: [-0.1, 0.78, 0.76], look: [-0.16, 0.06, -0.06] };

// ---------------------------------------------------------------------------
// ノートPCの画面（CanvasTexture）。あなた＝Wi-Fi の一覧 → ログイン、盗聴者＝受信した中身

const JP = '"Hiragino Sans", "Noto Sans JP", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const SW = 256;
const SH = 160;

function canvas() {
  const c = document.createElement("canvas");
  c.width = SW;
  c.height = SH;
  return c;
}

function drawMine(mode: WifiMode, phase: WifiPhase) {
  const c = canvas();
  const g = c.getContext("2d")!;
  g.fillStyle = "#e0ecff";
  g.fillRect(0, 0, SW, SH);
  if (phase === "connect") {
    g.fillStyle = "#1e3a8a";
    g.font = `900 20px ${JP}`;
    g.fillText(mode === "wired" ? "有線LAN" : "Wi-Fi", 14, 28);
    SSIDS.forEach((s, i) => {
      const picked = !!s.ours && mode !== "wired";
      const y = 40 + i * 38;
      g.fillStyle = picked ? "#2f6fdb" : "rgba(255,255,255,0.9)";
      g.fillRect(12, y, SW - 24, 32);
      g.fillStyle = picked ? "#ffffff" : "#1f2937";
      g.font = `800 17px ${MONO}`;
      g.fillText(s.name, 22, y + 22);
      if (ssidLock(s, mode) === "wpa") {
        // 鍵マーク（四角＋弧）
        const x = SW - 40;
        g.fillRect(x, y + 13, 14, 11);
        g.strokeStyle = g.fillStyle;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(x + 7, y + 13, 5, Math.PI, 0);
        g.stroke();
      }
    });
    return c;
  }
  // 送る：ログイン画面
  g.fillStyle = "#1e3a8a";
  g.font = `900 19px ${JP}`;
  g.fillText("ログイン", 14, 28);
  for (const [i, [k, v]] of [
    ["ID", "tanaka"],
    ["PASS", "●●●●●●●●●"],
  ].entries()) {
    const y = 42 + i * 40;
    g.fillStyle = "#64748b";
    g.font = `800 13px ${JP}`;
    g.fillText(k, 16, y + 12);
    g.fillStyle = "#ffffff";
    g.fillRect(70, y - 4, SW - 86, 26);
    g.fillStyle = "#111827";
    g.font = `800 15px ${MONO}`;
    g.fillText(v, 78, y + 14);
  }
  g.fillStyle = "#2f6fdb";
  g.fillRect(SW - 106, SH - 34, 90, 24);
  g.fillStyle = "#ffffff";
  g.font = `900 14px ${JP}`;
  g.fillText("送信", SW - 76, SH - 17);
  return c;
}

function drawEve(mode: WifiMode, gets: boolean) {
  const c = canvas();
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, SW, SH);
  g.font = `700 14px ${MONO}`;
  g.fillStyle = "#64748b";
  g.fillText("$ capture wlan0", 12, 24);
  if (!gets) {
    g.fillStyle = "#94a3b8";
    g.fillText(mode === "wired" ? "no signal..." : "waiting...", 12, 52);
    return c;
  }
  if (mode === "wpa") {
    g.fillStyle = "#a7f3d0";
    g.font = `800 16px ${MONO}`;
    g.fillText(CIPHER.slice(0, 9), 12, 60);
    g.fillText(CIPHER.slice(9), 12, 84);
    g.fillStyle = "#34d399";
    g.font = `800 14px ${JP}`;
    g.fillText("読めない", 12, 128);
    return c;
  }
  g.fillStyle = "#e2e8f0";
  g.fillText("POST /login", 12, 52);
  g.fillStyle = "#fb7185";
  g.font = `900 18px ${MONO}`;
  g.fillText("id=tanaka", 12, 88);
  g.fillText("pass=spring123", 12, 116);
  return c;
}

function ScreenTexture({ mesh, draw }: { mesh: THREE.Mesh | null; draw: () => HTMLCanvasElement }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(draw());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    swapMap(mat, tex);
  }, [draw, mat]);
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

function setVisible(o: THREE.Object3D | null, v: boolean) {
  if (o) o.visible = v;
}

// ---------------------------------------------------------------------------

type ModelParts = {
  root: THREE.Object3D;
  apMats: THREE.MeshStandardMaterial[];
  ledAp: THREE.MeshBasicMaterial;
  ledEve: THREE.MeshBasicMaterial;
  lan: THREE.Object3D | null;
  mine: THREE.Mesh | null;
  eve: THREE.Mesh | null;
};

type CafeState = { mode: WifiMode; phase: WifiPhase; arrived: boolean };

function Cafe({ s, reducedMotion }: { s: CafeState; reducedMotion: boolean }) {
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
    const apMats: THREE.MeshStandardMaterial[] = [];
    for (const name of BAKED_NODES) {
      eachMesh(name, (mesh) => {
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone();
          // 金属は焼き込みの「拡散色」が黒になるので貼らない
          if (c.metalness <= 0.5) {
            c.map = baked;
            c.color.set("#ffffff");
          }
          if (name === "Part_AP") apMats.push(c);
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
    }
    // 正面のガラス：うっすら青い透明。影は落とさない（電波の輪が越えていくのが見えるように）
    const glass = new THREE.MeshPhysicalMaterial({ color: "#cfe3f2", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
    eachMesh("Glass", (mesh) => {
      mesh.material = glass;
      mesh.castShadow = false;
    });
    const led = (node: string, color: string) => {
      const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      eachMesh(node, (mesh) => (mesh.material = m));
      return m;
    };
    let mine: THREE.Mesh | null = null;
    let eve: THREE.Mesh | null = null;
    eachMesh("Scr_Me", (m) => (mine = m));
    eachMesh("Scr_Eve", (m) => (eve = m));
    return { root, apMats, ledAp: led("LED_AP", "#22c55e"), ledEve: led("LED_Eve", "#475569"), lan: byName["Part_Lan"] ?? null, mine, eve };
  }, [scene, baked]);

  const live = useRef<ModelParts | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);
  useEffect(() => {
    setVisible(model.lan, s.mode === "wired");
  }, [model, s.mode]);

  const radio = s.mode !== "wired" && s.phase !== "connect";
  const eveGets = s.mode !== "wired" && s.phase === "arrive";
  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    const busy = s.phase !== "connect";
    // アクセスポイント：通信中は緑の点滅、届いたら点灯
    m3.ledAp.color.set("#22c55e").multiplyScalar(reducedMotion || s.arrived ? (busy ? 1 : 0.5) : busy ? (Math.sin(t * 14) > 0 ? 1 : 0.3) : 0.5);
    for (const m of m3.apMats) {
      m.emissive.set("#60a5fa");
      m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, busy ? 0.18 : 0, 6, dt) });
    }
    // 盗聴者のアンテナ：電波を拾っている間は点滅、読めたら赤・暗号文なら黄
    const eveColor = eveGets ? (s.mode === "open" ? "#ef4444" : "#facc15") : radio ? "#facc15" : "#475569";
    m3.ledEve.color.set(eveColor).multiplyScalar(radio && !eveGets && !reducedMotion ? (Math.sin(t * 12) > 0 ? 1 : 0.35) : 1);
  });

  const drawMineFn = useMemo(() => () => drawMine(s.mode, s.phase), [s.mode, s.phase]);
  const drawEveFn = useMemo(() => () => drawEve(s.mode, eveGets), [s.mode, eveGets]);

  return (
    <>
      <primitive object={model.root} />
      <ScreenTexture mesh={model.mine} draw={drawMineFn} />
      <ScreenTexture mesh={model.eve} draw={drawEveFn} />
    </>
  );
}

/**
 * 電波の輪。ノートPCを中心に、床と平行な輪が次々に広がっていく（アクセスポイントだけを狙わず、周り全部へ）。
 * 広がりきる前に、ガラスの外の盗聴者のテーブルも通り過ぎる。
 * 球で包むと模型全体が色に染まって見づらいので、輪だけにする。
 */
function Waves({ on, color, reducedMotion }: { on: boolean; color: string; reducedMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  const tint = useRef(new THREE.Color(color));
  useEffect(() => {
    tint.current.set(color);
  }, [color]);
  useFrame((st) => {
    const grp = g.current;
    if (!grp) return;
    grp.visible = on;
    if (!on) return;
    const n = grp.children.length;
    grp.children.forEach((c, i) => {
      // 動きを減らす設定では、広がった途中の輪を止めて見せる
      const t = reducedMotion ? (i + 1) / (n + 1) : (st.clock.elapsedTime * 0.3 + i / n) % 1;
      c.scale.setScalar(0.03 + t * WAVE_MAX);
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.color.copy(tint.current);
      m.opacity = 0.85 * Math.min(t * 6, 1) * (1 - t * t);
    });
  });
  return (
    <group ref={g} position={LAPTOP} visible={false}>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[0.982, 1, 128]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** 折れ線の管（LANケーブルに重ねて光らせる） */
function useTube(pts: V3[], radius: number) {
  return useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i])));
    return new THREE.TubeGeometry(path, Math.max(8, pts.length * 12), radius, 8, false);
  }, [pts, radius]);
}

/** 有線のとき、データが通っている間だけケーブルを光らせて粒を流す */
function LanGlow({ on, reducedMotion }: { on: boolean; reducedMotion: boolean }) {
  const tube = useTube(LAN, 0.0036);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  useFrame((s, dt) => {
    if (mat.current) mat.current.opacity = damp(mat.current.opacity, on ? 0.9 : 0, 6, dt);
    const g = dots.current;
    if (!g) return;
    g.visible = on;
    if (!on) return;
    g.children.forEach((c, i) => {
      const t = reducedMotion ? (i + 0.5) / g.children.length : (s.clock.elapsedTime * 0.45 + i / g.children.length) % 1;
      c.position.copy(pointOn(LAN, t, tmp.current));
    });
  });
  return (
    <group>
      <mesh geometry={tube} renderOrder={1}>
        <meshStandardMaterial ref={mat} color="#60a5fa" emissive="#3b82f6" emissiveIntensity={1.3} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={dots} visible={false}>
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.0055, 12, 8]} />
            <meshBasicMaterial color="#93c5fd" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** 運ぶ物：ID/PASS の小包。暗号化ありは緑に鍵の帯、なしは赤 */
function Parcel({ color, sealed, size = 1 }: { color: string; sealed: boolean; size?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  return (
    <group ref={ref} scale={size}>
      <mesh castShadow>
        <boxGeometry args={[0.034, 0.024, 0.034]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
      {sealed && (
        <mesh>
          <boxGeometry args={[0.036, 0.007, 0.036]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      )}
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

/** 縦長・正方形に近い枠（スマホ）では真上寄りから見る。横幅 1.4m のジオラマが左右で切れないように */
function FitView({ seat, reducedMotion }: { seat: boolean; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 43);
  }, [camera, square]);
  const shot = seat ? (square ? SHOT_SEAT_SQ : SHOT_SEAT) : square ? SHOT_WIDE_SQ : SHOT_WIDE;
  return <CameraRig shot={shot} reducedMotion={reducedMotion} />;
}

// ---------------------------------------------------------------------------

export default function WifiScene3D({ mode, phase, forward, reducedMotion }: WifiSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const parcelRef = useRef<THREE.Group>(null);

  const wireless = mode !== "wired";
  const sending = phase === "send";
  const arrived = phase === "arrive";
  const radio = wireless && phase !== "connect";
  // 戻る・飛ばす・動きを減らす設定のときは、小包を瞬間移動させる
  const instant = !forward || reducedMotion;
  const route = wireless ? TO_AP : WIRE;
  const parcel = phase === "connect" ? null : { at: AP, start: LAPTOP, path: sending && !instant ? route.slice(1, -1) : undefined };
  const copy = radio ? { at: EVE, start: LAPTOP, path: sending && !instant ? TO_EVE.slice(1, -1) : undefined } : null;
  const cap = WIFI_CAPTION[mode][phase];
  const color = PACKET_COLOR[mode];

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="wifi-scene"
      data-scene="3d"
      data-mode={mode}
      data-phase={phase}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="img"
      aria-label={
        wireless
          ? "駅前カフェの模型（3D）。手前の席のノートPCから出た電波が、奥の壁のアクセスポイントだけでなく、ガラスを越えて店の外のテーブルにいる盗聴者のノートPCまで届く"
          : "駅前カフェの模型（3D）。ノートPCと奥の壁のアクセスポイントがLANケーブルでつながり、データはケーブルの中だけを通る"
      }
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
          shadow-camera-left={-0.9}
          shadow-camera-right={0.9}
          shadow-camera-top={0.7}
          shadow-camera-bottom={-0.7}
          shadow-bias={-0.0004}
          shadow-normalBias={0.01}
        />
        <directionalLight position={[1.4, 1.2, 1.4]} intensity={0.45} color="#dfe8ff" />
        <RoomEnvironment />
        <FitView seat={phase === "connect"} reducedMotion={reducedMotion} />

        <Cafe s={{ mode, phase, arrived }} reducedMotion={reducedMotion} />
        <Waves on={radio} color={WAVE_COLOR[mode]} reducedMotion={reducedMotion} />
        <LanGlow on={!wireless && sending} reducedMotion={reducedMotion} />

        <Mover at={parcel?.at ?? null} start={parcel?.start} path={parcel?.path} speed={0.26} reducedMotion={reducedMotion} objRef={parcelRef}>
          {parcel && <Parcel color={color} sealed={mode === "wpa"} />}
        </Mover>
        {/* 同じ電波を盗聴者も受け取る（もう1つの小包） */}
        <Mover at={copy?.at ?? null} start={copy?.start} path={copy?.path} speed={0.32} reducedMotion={reducedMotion}>
          {copy && <Parcel color={color} sealed={mode === "wpa"} size={0.8} />}
        </Mover>

        <LabelProjector registry={registry} />
        <CaptionProjector at={BUBBLE_AT[cap.focus]} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {phase === "connect" && (
          <Label registry={registry} id="list" at={[-0.24, 0.16, 0.1]} place="right">
            <WifiListCard mode={mode} />
          </Label>
        )}
        {parcel && (
          <Label registry={registry} id="packet" at={[0, 0.02, 0]} follow={parcelRef as RefObject<THREE.Object3D | null>} place={sending ? "below" : "right"}>
            <span data-testid="wifi-packet" data-sealed={mode === "wpa" ? "true" : "false"}>
              <WifiDataTag mode={mode} />
            </span>
          </Label>
        )}
        {/* 盗聴者に届いたもの。上は吹き出しの帯と重なるので、足もと（ベンチの手前）に出す */}
        {arrived && (
          <Label registry={registry} id="eve" at={[0.42, 0.03, 0.1]} place="below">
            <EveScreen mode={mode} />
          </Label>
        )}
        <Label registry={registry} id="you" at={[-0.3, 0.2, 0.26]} place="left">
          <NameChip name="あなた" tone={sending ? "info" : "ok"} />
        </Label>
        {phase !== "connect" && (
          <Label registry={registry} id="ap" at={[-0.16, 0.2, -0.43]} place="left">
            <NameChip name="アクセスポイント" />
          </Label>
        )}
        {sending && wireless && (
          <Label registry={registry} id="eveName" at={[0.42, 0.0, 0.17]} place="below">
            <NameChip name="盗聴者" tone="danger" />
          </Label>
        )}
        <span className={`absolute bottom-2 left-2 ${styles.corner}`}>
          <SsidPlate mode={mode} />
        </span>
        <CaptionBubble
          caption={{ id: `${mode}-${phase}`, text: cap.text, tone: cap.tone === "danger" ? "danger" : cap.tone === "ok" ? "safe" : undefined, target: cap.focus }}
          root={captionRoot}
          testId="wifi-scene-caption"
        />
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);

