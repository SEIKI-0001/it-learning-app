"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { NameChip } from "../scene/DioramaStage";
import { damp, pointOn, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, Mover, useInView, useLabelRegistry, type Shot } from "../scene3d/parts";
import { MOBILE_CAPTION, MOBILE_DEVICES, radioOn, type MobileDevice, type MobileFocus, type MobileMode, type MobileSceneProps } from "./mobileStory";
import styles from "./mobilediorama.module.css";

// モバイル通信の図解の「動く3D」版。Blender で作った街角（public/models/mobile-street.glb）を three.js で表示する。
//   奥の左＝大手キャリア（MNO）のビル。屋上に基地局のアンテナ
//   奥の右＝交換局（キャリアの局舎）。基地局のビルとは地中の光ファイバ（橙）でつながり、右へインターネットに出る
//   手前の左＝公園（スマホを持つあなた、ベンチにSIMなしのノートPC）／手前の右＝格安SIMの会社（MVNO）の店。アンテナは無い
//   道に車、奥の歩道に監視カメラ付きの街灯と、スマホを見ながら歩く人
//     5G       … 1つの基地局から、スマホ・車・カメラ・歩く人へ同時に電波が届く
//     テザリング … ノートPC →（スマホの小さな Wi-Fi）→ スマホ →（モバイル回線）→ 基地局 → 交換局
//     MVNO     … 格安SIMのスマホも、大手の基地局・交換局を通る。MVNO の店から交換局へ「借りる」帯が光る
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる（~/Blender/mobile/scene.py）。

const MODEL_URL = "/models/mobile-street.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/mobile-street.webp";
/** 空のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_Tower", "Part_Exchange", "Part_Shop"];

/** 基地局のアンテナ・各機器（~/Blender/mobile/points.json を glTF 座標にしたもの） */
const TOWER: V3 = [-0.22, 0.386, -0.27];
const DEVICE_AT: Record<MobileDevice, V3> = {
  phone: [-0.296, 0.125, 0.298],
  car: [0.238, 0.065, 0.06],
  cam: [0.12, 0.136, -0.047],
  phone2: [-0.012, 0.125, -0.028],
};
const LAPTOP: V3 = [-0.45, 0.075, 0.24];
/** 交換局の屋上 */
const CORE: V3 = [0.36, 0.175, -0.29];

/** 基地局 → ビルの壁を下りる → 地中の光ファイバ → 交換局（Blender のケーブルと同じ点） */
const BACKHAUL: V3[] = [TOWER, [-0.15, 0.25, -0.33], [-0.11, 0.012, -0.33], [0.21, 0.012, -0.33], [0.21, 0.155, -0.33], CORE];
/** 交換局 → インターネット（右の端へ） */
const NET: V3[] = [[0.51, 0.012, -0.32], [0.7, 0.012, -0.32]];
/** 格安SIMの会社 → 交換局：設備を借りる契約（地面に光る帯） */
const LEASE: V3[] = [[0.4, 0.009, 0.215], [0.4, 0.009, -0.06], [0.37, 0.009, -0.185]];

const UP_COLOR: Record<MobileMode, string> = { "5g": "#3b82f6", tether: "#f59e0b", mvno: "#10b981" };
const BEAM_COLOR: Record<MobileMode, string> = { "5g": "#60a5fa", tether: "#fbbf24", mvno: "#34d399" };

/** 5G の機器の名札の向き（歩く人と監視カメラは近いので左右に振り分ける） */
const DEVICE_PLACE: Record<MobileDevice, "right" | "left" | "below"> = { phone: "right", car: "below", cam: "right", phone2: "left" };

/** 吹き出しが指す点 */
const BUBBLE_AT: Record<MobileFocus, V3> = { tower: [-0.22, 0.4, -0.27], phone: [-0.296, 0.15, 0.3], mvno: [0.4, 0.19, 0.3] };

/** カメラは全景の1か所だけ（モードを切り替えても視線が迷わない） */
const SHOT: Shot = { pos: [0.0, 0.98, 1.2], look: [0.0, 0.06, -0.02] };
const SHOT_SQ: Shot = { pos: [0.0, 1.12, 1.12], look: [0.0, -0.02, -0.26] };

// ---------------------------------------------------------------------------

function canvasFor(tether: boolean) {
  const W = 192;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = tether ? "#fff7e6" : "#111827";
  g.fillRect(0, 0, W, H);
  if (!tether) return c;
  g.fillStyle = "#92400e";
  g.font = '900 20px "Hiragino Sans", "Noto Sans JP", sans-serif';
  g.fillText("Wi-Fi", 14, 34);
  g.fillStyle = "#f59e0b";
  g.fillRect(12, 52, W - 24, 34);
  g.fillStyle = "#ffffff";
  g.font = '800 17px ui-monospace, Menlo, monospace';
  g.fillText("my-phone", 22, 75);
  return c;
}

function LaptopScreen({ mesh, tether }: { mesh: THREE.Mesh | null; tether: boolean }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(canvasFor(tether));
    tex.colorSpace = THREE.SRGBColorSpace;
    swapMap(mat, tex);
  }, [tether, mat]);
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

type LedKey = "tower" | "core" | MobileDevice;
type ModelParts = {
  root: THREE.Object3D;
  glowMats: Record<"tower" | "core" | "shop", THREE.MeshStandardMaterial[]>;
  leds: Record<LedKey, THREE.MeshBasicMaterial>;
  laptop: THREE.Mesh | null;
};

function Street({ mode, reducedMotion }: { mode: MobileMode; reducedMotion: boolean }) {
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
    const partKey: Record<string, "tower" | "core" | "shop"> = { Part_Tower: "tower", Part_Exchange: "core", Part_Shop: "shop" };
    const glowMats: ModelParts["glowMats"] = { tower: [], core: [], shop: [] };
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
          if (key) glowMats[key].push(c);
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
    }
    const led = (node: string) => {
      const m = new THREE.MeshBasicMaterial({ color: "#1f2937", toneMapped: false });
      eachMesh(node, (mesh) => (mesh.material = m));
      return m;
    };
    const leds = {
      tower: led("LED_Tower"),
      core: led("LED_Core"),
      phone: led("LED_Phone"),
      car: led("LED_Car"),
      cam: led("LED_Cam"),
      phone2: led("LED_Walker"),
    };
    let laptop: THREE.Mesh | null = null;
    eachMesh("Scr_Laptop", (m) => (laptop = m));
    return { root, glowMats, leds, laptop };
  }, [scene, baked]);

  const live = useRef<ModelParts | null>(null);
  useEffect(() => {
    live.current = model;
  }, [model]);

  useFrame((state, dt) => {
    const m3 = live.current;
    if (!m3) return;
    const t = state.clock.elapsedTime;
    const color = BEAM_COLOR[mode];
    const blink = (i: number) => (reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(t * 6 + i));
    m3.leds.tower.color.set("#ef4444").multiplyScalar(blink(0));
    m3.leds.core.color.set("#22c55e").multiplyScalar(mode === "5g" ? 0.5 : blink(1));
    MOBILE_DEVICES.forEach((d, i) => {
      const on = radioOn(mode, d.id);
      m3.leds[d.id].color.set(on ? color : "#1f2937").multiplyScalar(on ? blink(i + 2) : 1);
    });
    const glow = (key: "tower" | "core" | "shop", on: boolean, c: string, k = 0.35) => {
      for (const m of m3.glowMats[key]) {
        m.emissive.set(c);
        m.setValues({ emissiveIntensity: damp(m.emissiveIntensity, on ? k : 0, 6, dt) });
      }
    };
    glow("tower", true, color);
    glow("core", mode !== "5g", "#60a5fa");
    // 焼き込みの色が白っぽく飛ばないよう、店はうっすらだけ
    glow("shop", mode === "mvno", "#a78bfa", 0.15);
  });

  return (
    <>
      <primitive object={model.root} />
      <LaptopScreen mesh={model.laptop} tether={mode === "tether"} />
    </>
  );
}

/** 折れ線の管 */
function useTube(pts: V3[], radius: number) {
  return useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i])));
    return new THREE.TubeGeometry(path, Math.max(8, pts.length * 12), radius, 8, false);
  }, [pts, radius]);
}

/**
 * 光る道（電波・光ファイバ・借りる帯で共通）。on のあいだだけ管が光り、粒が向きに沿って流れる。
 * back で流れを逆向きにする（スマホ → 基地局のような上り）。
 */
function Lane({ pts, on, color, radius, dot, back = false, speed = 0.55, reducedMotion }: { pts: V3[]; on: boolean; color: string; radius: number; dot: number; back?: boolean; speed?: number; reducedMotion: boolean }) {
  const tube = useTube(pts, radius);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  useFrame((s, dt) => {
    const m = mat.current;
    if (m) {
      m.color.set(color);
      m.emissive.set(color);
      m.opacity = damp(m.opacity, on ? 0.75 : 0, 6, dt);
    }
    const g = dots.current;
    if (!g) return;
    g.visible = on;
    if (!on) return;
    g.children.forEach((c, i) => {
      let t = reducedMotion ? (i + 0.5) / g.children.length : (s.clock.elapsedTime * speed + i / g.children.length) % 1;
      if (back) t = 1 - t;
      c.position.copy(pointOn(pts, t, tmp.current));
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(color);
    });
  });
  return (
    <group>
      <mesh geometry={tube} renderOrder={1}>
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.3} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={dots} visible={false}>
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[dot, 12, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** テザリング：スマホを中心に広がる小さな Wi-Fi の輪（基地局の電波より狭い） */
function Hotspot({ on, reducedMotion }: { on: boolean; reducedMotion: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    const grp = g.current;
    if (!grp) return;
    grp.visible = on;
    if (!on) return;
    grp.children.forEach((c, i) => {
      const t = reducedMotion ? (i + 1) / 3 : (st.clock.elapsedTime * 0.5 + i / 2) % 1;
      c.scale.setScalar(0.01 + t * 0.2);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
    });
  });
  return (
    <group ref={g} position={[DEVICE_AT.phone[0], DEVICE_AT.phone[1] - 0.01, DEVICE_AT.phone[2]]} visible={false}>
      {Array.from({ length: 2 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <ringGeometry args={[0.95, 1, 64]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** 運ぶデータの小包 */
function Parcel({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[0.026, 0.019, 0.026]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** 着いたら少し置いて、また最初から運ぶ（データは流れ続けるもの） */
function Repeat({ moving, onAgain, reducedMotion }: { moving: RefObject<boolean>; onAgain: () => void; reducedMotion: boolean }) {
  const was = useRef(false);
  const wait = useRef<number | null>(null);
  useFrame((_, dt) => {
    const now = !!moving.current;
    if (was.current && !now && !reducedMotion) wait.current = 1.4;
    was.current = now;
    if (wait.current !== null) {
      wait.current -= dt;
      if (wait.current <= 0) {
        wait.current = null;
        onAgain();
      }
    }
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

/** 縦長・正方形に近い枠（スマホ）では真上寄りから見る。横幅 1.4m のジオラマが左右で切れないように */
function FitView({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 43);
  }, [camera, square]);
  return <CameraRig shot={square ? SHOT_SQ : SHOT} reducedMotion={reducedMotion} />;
}

// ---------------------------------------------------------------------------

export default function MobileScene3D({ mode, reducedMotion }: MobileSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const moving = useRef(false);
  const [round, setRound] = useState(0);

  const is5g = mode === "5g";
  const tether = mode === "tether";
  const mvno = mode === "mvno";
  const cap = MOBILE_CAPTION[mode];
  const color = BEAM_COLOR[mode];
  // テザリング・MVNO のデータの道：（ノートPC →）スマホ → 基地局 → 光ファイバ → 交換局
  const route: V3[] = useMemo(() => (tether ? [LAPTOP, DEVICE_AT.phone, ...BACKHAUL] : [DEVICE_AT.phone, ...BACKHAUL]), [tether]);
  const parcel = is5g ? null : { at: CORE, start: route[0], path: reducedMotion ? undefined : route.slice(1, -1) };

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="mobile-scene"
      data-scene="3d"
      data-mode={mode}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="img"
      aria-label="街角の模型（3D）。奥のビルの屋上に大手キャリアの基地局、その右に交換局。手前の公園にスマホを持つ人とベンチのノートPC、右手前に基地局を持たない格安SIMの会社。道に車、街灯に監視カメラ"
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 43, near: 0.05, far: 20, position: SHOT.pos }}
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
        <FitView reducedMotion={reducedMotion} />

        <Street mode={mode} reducedMotion={reducedMotion} />
        {/* 基地局からの電波（5G は全部、ほかはあなたのスマホだけ。スマホからの上りは逆向き） */}
        {MOBILE_DEVICES.map((d) => (
          <Lane key={d.id} pts={[TOWER, DEVICE_AT[d.id]]} on={radioOn(mode, d.id)} color={color} radius={0.0024} dot={0.006} back={!is5g} speed={is5g ? 0.7 : 0.55} reducedMotion={reducedMotion} />
        ))}
        <Lane pts={[LAPTOP, DEVICE_AT.phone]} on={tether} color="#f59e0b" radius={0.0014} dot={0.0045} speed={0.9} reducedMotion={reducedMotion} />
        <Lane pts={BACKHAUL.slice(1, -1)} on={!is5g} color="#fb923c" radius={0.0036} dot={0.005} reducedMotion={reducedMotion} />
        <Lane pts={NET} on={!is5g} color="#fb923c" radius={0.0036} dot={0.005} reducedMotion={reducedMotion} />
        <Lane pts={LEASE} on={mvno} color="#8b5cf6" radius={0.006} dot={0.007} speed={0.4} reducedMotion={reducedMotion} />
        <Hotspot on={tether} reducedMotion={reducedMotion} />

        <Mover at={parcel?.at ?? null} start={parcel?.start} path={parcel?.path} speed={0.4} epoch={round} reducedMotion={reducedMotion} movingRef={moving}>
          {parcel && <Parcel color={UP_COLOR[mode]} />}
        </Mover>
        <Repeat moving={moving} onAgain={() => setRound((r) => r + 1)} reducedMotion={reducedMotion} />

        <LabelProjector registry={registry} />
        <CaptionProjector at={BUBBLE_AT[cap.focus]} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        <Label registry={registry} id="tower" at={[-0.2, 0.36, -0.27]} place="right">
          <NameChip name="基地局" tone="info" />
        </Label>
        {!is5g && (
          <Label registry={registry} id="core" at={[0.36, 0.17, -0.29]} place="above">
            <NameChip name="交換局" />
          </Label>
        )}
        {is5g &&
          MOBILE_DEVICES.map((d) => (
            <Label key={d.id} registry={registry} id={`dev-${d.id}`} at={DEVICE_AT[d.id]} place={DEVICE_PLACE[d.id]}>
              <NameChip name={d.name} tone="info" />
            </Label>
          ))}
        {tether && (
          <>
            <Label registry={registry} id="laptop" at={[-0.45, 0.04, 0.27]} place="below">
              <div data-testid="mobile-tether">
                <NameChip name="ノートPC" status="SIMなし" tone="info" />
              </div>
            </Label>
            <Label registry={registry} id="phone" at={[-0.27, 0.13, 0.3]} place="right">
              <span data-testid="mobile-hotspot">
                <NameChip name="スマホ" status="親機" tone="warn" />
              </span>
            </Label>
          </>
        )}
        {mvno && (
          <>
            <Label registry={registry} id="sim" at={[-0.27, 0.13, 0.3]} place="right">
              <span className={styles.sim} data-testid="mobile-sim">
                格安SIM（MVNO）
              </span>
            </Label>
            <Label registry={registry} id="shop" at={[0.4, 0.2, 0.3]} place="above">
              <NameChip name="格安SIMの会社" status="基地局なし" tone="warn" />
            </Label>
          </>
        )}
        <CaptionBubble caption={{ id: mode, text: cap.text, target: cap.focus }} root={captionRoot} testId="mobile-scene-caption" />
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);
