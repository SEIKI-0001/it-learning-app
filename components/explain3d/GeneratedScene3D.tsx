"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { damp, pointOn, type V3 } from "@/components/experiences/scene3d/math";
import {
  CameraRig,
  CaptionBubble,
  CaptionProjector,
  Label,
  LabelProjector,
  Mover,
  useGlowTexture,
  useInView,
  useLabelRegistry,
} from "@/components/experiences/scene3d/parts";
import { DataTag } from "@/components/experiences/scene/DioramaStage";
import tagStyles from "@/components/experiences/netdev/netdev3d.module.css";
import { KIT_LEDS, KIT_SCREENS } from "@/lib/explain3d/kit";
import {
  ITEM_SCALE,
  captionAt,
  labelAt,
  movePath3D,
  overviewShot,
  stepShot,
  type ActorLayout,
  type SceneLayout,
} from "@/lib/explain3d/layout3d";
import type { ActorKind, GeneratedScene, SceneMove, SceneStep, StepTone } from "@/lib/explain3d/types";

// AI が組んだ場面の「動く3D」版。Blender で作った部品キット（public/models/explain-kit.glb）の
// 部品・場所・運ぶ物を、lib/explain3d/layout3d の置き方どおりに複製して並べる。
// 色×陰影（AO）は部品ごとに焼き込み済み（explain-kit.webp）。光と影は three.js で足す。
// 画面（Scr_*）には CanvasTexture、LED（Led_*）は状態で光らせる。座標は glTF（Y上・手前が +Z、単位 m）。

const KIT_URL = "/models/explain-kit.glb";
const BAKED_URL = "/models/explain-kit.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";

type PartState = "idle" | "active" | "error";

const ROUTE_COLOR: Record<StepTone, string> = { info: "#3b82f6", ok: "#10b981", danger: "#e11d48" };
const SECURE_COLOR = "#0d9488";
const GLOW_COLOR: Record<Exclude<PartState, "idle">, string> = { active: "#60a5fa", error: "#f43f5e" };
const SCREEN_SET = new Set<string>(KIT_SCREENS);
const LED_SET = new Set<string>(KIT_LEDS);
const JP = '"Hiragino Sans", "Noto Sans JP", sans-serif';

// ---------------------------------------------------------------------------
// 部品キットの読み込み：名前 → 複製の元（焼き込みの図を貼った状態）

function useKit() {
  const { scene } = useGLTF(KIT_URL);
  const baked = useTexture(BAKED_URL, (t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  return useMemo(() => {
    const protos = new Map<string, THREE.Object3D>();
    for (const node of scene.children) {
      const o = node.clone(true);
      const raw = node.name.startsWith("Scr_") || node.name.startsWith("Led_");
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = !node.name.startsWith("Zone_");
        mesh.receiveShadow = true;
        if (raw) return;
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c2 = (m as THREE.MeshStandardMaterial).clone();
          // 金属は焼き込みの「拡散色」が黒になるので貼らない
          if (c2.metalness <= 0.5) {
            c2.map = baked;
            c2.color.set("#ffffff");
          }
          return c2;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
      protos.set(node.name, o);
    }
    return protos;
  }, [scene, baked]);
}

type Kit = ReturnType<typeof useKit>;

function cloneOf(kit: Kit, name: string): THREE.Object3D | null {
  return kit.get(name)?.clone(true) ?? null;
}

function eachMesh(o: THREE.Object3D | null, fn: (m: THREE.Mesh) => void) {
  o?.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) fn(c as THREE.Mesh);
  });
}

// ---------------------------------------------------------------------------
// 画面：種類ごとの見た目（ブラウザ・スマホのアプリ・攻撃者の黒い端末）に、そのコマの文字を大きく出す

function drawScreen(kind: ActorKind, text: string | null, state: PartState) {
  const W = 320;
  const H = kind === "phone" ? 560 : 200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const dark = kind === "attacker";
  g.fillStyle = dark ? "#0b1320" : "#ffffff";
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (kind === "phone") {
    g.fillStyle = state === "error" ? "#e11d48" : "#2563eb";
    g.fillRect(0, 0, W, 90);
  } else if (!dark) {
    g.fillStyle = "#e2e8f0";
    g.fillRect(0, 0, W, 42);
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.roundRect(14, 8, W - 28, 26, 13);
    g.fill();
  }
  if (text) {
    g.fillStyle = dark ? "#4ade80" : state === "error" ? "#be123c" : "#0f172a";
    const size = kind === "phone" ? 44 : 30;
    g.font = `900 ${size}px ${JP}`;
    // 長い文は2行に分ける
    const chars = [...text];
    const per = kind === "phone" ? 6 : 9;
    const lines = chars.length > per ? [chars.slice(0, Math.ceil(chars.length / 2)).join(""), chars.slice(Math.ceil(chars.length / 2)).join("")] : [text];
    const cy = kind === "phone" ? H / 2 + 20 : H / 2 + 18;
    lines.forEach((l, i) => g.fillText(l, W / 2, cy + (i - (lines.length - 1) / 2) * size * 1.2));
  } else if (!dark) {
    g.fillStyle = "#cbd5e1";
    const top = kind === "phone" ? 130 : 66;
    for (let i = 0; i < 4; i++) g.fillRect(40, top + i * (kind === "phone" ? 60 : 30), W - 80 - (i % 2) * 60, kind === "phone" ? 22 : 12);
  }
  return c;
}

function swapMap(mat: THREE.MeshBasicMaterial, tex: THREE.Texture) {
  const old = mat.map;
  mat.map = tex;
  mat.needsUpdate = true;
  old?.dispose();
}

function attach(mesh: THREE.Mesh, mat: THREE.Material) {
  mesh.material = mat;
}

function setFov(cam: THREE.PerspectiveCamera, fov: number) {
  cam.fov = fov;
  cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------------------
// 置く物1つ（部品＋画面＋LED）と、足もとの光

function Actor({ kit, actor, state, screenText, reducedMotion }: { kit: Kit; actor: ActorLayout; state: PartState; screenText: string | null; reducedMotion: boolean }) {
  const parts = useMemo(() => {
    const root = new THREE.Group();
    const body = cloneOf(kit, `Kit_${actor.kind}`);
    if (body) root.add(body);
    let screen: THREE.Mesh | null = null;
    if (SCREEN_SET.has(actor.kind)) {
      const s = cloneOf(kit, `Scr_${actor.kind}`);
      if (s) {
        root.add(s);
        eachMesh(s, (m) => (screen = m));
      }
    }
    const led = new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false });
    if (LED_SET.has(actor.kind)) {
      const l = cloneOf(kit, `Led_${actor.kind}`);
      if (l) {
        root.add(l);
        eachMesh(l, (m) => (m.material = led));
      }
    }
    return { root, screen: screen as THREE.Mesh | null, led };
  }, [kit, actor.kind]);

  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    if (!parts.screen) return;
    const tex = new THREE.CanvasTexture(drawScreen(actor.kind, screenText, state));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    swapMap(screenMat, tex);
    attach(parts.screen, screenMat);
  }, [parts.screen, screenMat, actor.kind, screenText, state]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const blink = reducedMotion ? 1 : state === "idle" ? 0.85 + 0.15 * Math.sin(t * 1.5) : Math.sin(t * 14) > 0 ? 1 : 0.25;
    parts.led.color.set(state === "error" ? "#ef4444" : state === "active" ? "#4ade80" : "#16a34a").multiplyScalar(blink);
  });

  return (
    <group position={actor.pos} scale={actor.scale} data-actor={actor.id}>
      <primitive object={parts.root} />
    </group>
  );
}

function Glow({ actor, state, reducedMotion }: { actor: ActorLayout; state: PartState; reducedMotion: boolean }) {
  const tex = useGlowTexture();
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s, dt) => {
    const m = mat.current;
    if (!m) return;
    if (state !== "idle") m.color.set(GLOW_COLOR[state]);
    const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(s.clock.elapsedTime * 4);
    m.opacity = damp(m.opacity, state === "idle" ? 0 : 0.5 * pulse, 6, dt);
  });
  const size = Math.max(0.16, Math.max(actor.depth, actor.height * 0.6) * 1.5);
  return (
    <mesh position={[actor.pos[0], actor.pos[1] + 0.002, actor.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

function Zones({ kit, layout }: { kit: Kit; layout: SceneLayout }) {
  const objs = useMemo(() => layout.zones.map((z) => ({ z, o: cloneOf(kit, `Zone_${z.place}`) })), [kit, layout.zones]);
  const depth = Math.max(...layout.zones.map((z) => z.d));
  return (
    <>
      {/* 場所の床をまとめて載せる台（机上のジオラマの土台） */}
      <mesh position={[0, -0.016, 0]} receiveShadow>
        <boxGeometry args={[layout.width + 0.08, 0.03, depth + 0.08]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.7} />
      </mesh>
      {/* 圧縮（meshopt の量子化）で部品の node に位置・拡大が入っているので、部品そのものの transform は触らず group で動かす */}
      {objs.map(({ z, o }) => o && (
        <group key={z.place} position={[z.x, 0, 0]}>
          <primitive object={o} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 動きの道（光る管と流れる粒）と、運ぶ物

function useTube(pts: V3[], radius: number) {
  return useMemo(() => {
    if (pts.length < 2) return null;
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i])));
    return new THREE.TubeGeometry(path, Math.max(8, pts.length * 12), radius, 8, false);
  }, [pts, radius]);
}

function Route({ pts, color, reducedMotion }: { pts: V3[]; color: string; reducedMotion: boolean }) {
  const lane = useMemo(() => pts.map((p) => [p[0], p[1] - 0.02, p[2]] as V3), [pts]);
  const tube = useTube(lane, 0.004);
  const dots = useRef<THREE.Group>(null);
  const tmp = useRef(new THREE.Vector3());
  useFrame((s) => {
    const g = dots.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const t = reducedMotion ? (i + 0.5) / 4 : (s.clock.elapsedTime * 0.45 + i / 4) % 1;
      const p = pointOn(lane, t, tmp.current);
      c.position.set(p.x, p.y + 0.005, p.z);
    });
  });
  if (!tube) return null;
  return (
    <group>
      <mesh geometry={tube} renderOrder={1}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} roughness={0.4} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <group ref={dots}>
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.006, 12, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function CarryItem({ kit, move }: { kit: Kit; move: SceneMove }) {
  const ref = useRef<THREE.Group>(null);
  const obj = useMemo(() => {
    const g = new THREE.Group();
    const item = cloneOf(kit, `Item_${move.item}`);
    if (item) g.add(item);
    if (move.locked) {
      const lock = cloneOf(kit, "Item_lock");
      if (lock) {
        lock.position.set(0.012, 0.022, 0.012);
        g.add(lock);
      }
    }
    return g;
  }, [kit, move.item, move.locked]);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 1.2) * 0.5;
  });
  return (
    <group ref={ref} scale={ITEM_SCALE} position={[0, -0.02, 0]}>
      <primitive object={obj} />
    </group>
  );
}

// ---------------------------------------------------------------------------

function RoomEnvironment() {
  const env = useTexture(ENV_URL, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return <primitive object={env} attach="environment" />;
}

/** 縦長・正方形に近い枠（スマホ）では真上寄りから見る */
function FitCamera({ step, layout, overview, reducedMotion }: { step: SceneStep; layout: SceneLayout; overview: boolean; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 40);
  }, [camera, square]);
  const shot = overview ? overviewShot(layout, square) : stepShot(step, layout, square);
  return <CameraRig shot={shot} reducedMotion={reducedMotion} />;
}

/** 運ぶ物の札は、進む向きの後ろ側に出す（行き先の名札・画面の端と重ならないように） */
function carryPlace(move: SceneMove, layout: SceneLayout): "left" | "right" {
  const from = layout.actors.find((a) => a.id === move.from);
  const to = layout.actors.find((a) => a.id === move.to);
  return from && to && to.pos[0] >= from.pos[0] ? "left" : "right";
}

/** 枠の幅が狭い（スマホ）か。狭いと全体の場面で名札が重なるので、出す名札を絞る */
function useNarrow(ref: RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 480));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return narrow;
}

/** スマホ幅では模型が小さく写るので、持ち上げた名札をさらに上へ（隣の名札と重ならないように） */
function narrowLift(at: V3, a: ActorLayout, narrow: boolean): V3 {
  return narrow && a.labelLift > 0 ? [at[0], at[1] + 0.07, at[2]] : at;
}

const stateOf = (step: SceneStep, id: string): PartState => (step.alert.includes(id) ? "error" : step.active.includes(id) ? "active" : "idle");

export default function GeneratedScene3D({
  scene,
  layout,
  index,
  forward,
  reducedMotion,
}: {
  scene: GeneratedScene;
  layout: SceneLayout;
  index: number;
  forward: boolean;
  reducedMotion: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const narrow = useNarrow(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const carryRef = useRef<THREE.Group>(null);
  const step = scene.steps[index];
  const path = step.move ? movePath3D(step.move, layout) : [];
  const end = path.length ? path[path.length - 1] : null;
  const routeColor = step.move?.locked ? SECURE_COLOR : ROUTE_COLOR[step.tone];
  const focus = captionAt(step, layout);
  const screenActor = step.screen ? layout.actors.find((a) => a.id === step.screen?.actor) : null;
  const names = scene.actors.map((a) => a.name).join("・");

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="explain-scene"
      data-scene="3d"
      data-step={index}
      role="img"
      aria-label={`${scene.title}の模型（3D）。${layout.zones.length}つの場所に${names}が置かれている`}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 40, near: 0.05, far: 30, position: overviewShot(layout, false).pos }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl, scene: s }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          s.environmentRotation.set(0, -Math.PI / 2, 0);
          s.environmentIntensity = 0.9;
        }}
      >
        <color attach="background" args={["#d9dde3"]} />
        <hemisphereLight args={["#f3f6ff", "#6b5a48", 0.75]} />
        <directionalLight
          position={[-0.6, 2.8, 0.9]}
          intensity={2.0}
          color="#fff6ea"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-1.5}
          shadow-camera-right={1.5}
          shadow-camera-top={0.9}
          shadow-camera-bottom={-0.9}
          shadow-bias={-0.0004}
          shadow-normalBias={0.01}
        />
        <directionalLight position={[1.4, 1.2, 1.4]} intensity={0.45} color="#dfe8ff" />
        <RoomEnvironment />
        <FitCamera step={step} layout={layout} overview={index === 0} reducedMotion={reducedMotion} />

        <SceneContents layout={layout} step={step} reducedMotion={reducedMotion} />
        {path.length > 1 && <Route key={`r${index}`} pts={path} color={routeColor} reducedMotion={reducedMotion} />}
        {step.move && (
          <Mover at={end} start={path[0]} path={forward ? path.slice(1, -1) : undefined} speed={0.45} reducedMotion={reducedMotion} epoch={index} objRef={carryRef}>
            <CarryWithKit move={step.move} />
          </Mover>
        )}

        <LabelProjector registry={registry} />
        <CaptionProjector at={focus} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {layout.actors.map((a) => {
          const state = stateOf(step, a.id);
          const involved = state !== "idle" || step.move?.from === a.id || step.move?.to === a.id;
          // 最初のコマは全員の名前（スマホ幅では重なるので関わる物だけ）、あとはそのコマで関わる物だけ
          if ((index > 0 || narrow) && !involved) return null;
          return (
            <Label key={a.id} registry={registry} id={`name-${a.id}`} at={narrowLift(labelAt(a), a, narrow)} place="above">
              <span className={tagStyles.tag} data-actor-label={a.id} data-state={state}>
                {a.name}
              </span>
            </Label>
          );
        })}
        {step.move && (
          <Label registry={registry} id="carry" at={[0, 0.05, 0]} follow={carryRef as RefObject<THREE.Object3D | null>} place={carryPlace(step.move, layout)}>
            <div data-testid="explain-carry">
              <DataTag tag={step.move.tag} body={step.move.body} tone={step.move.locked ? "secure" : step.tone === "danger" ? "danger" : step.tone === "ok" ? "ok" : "info"} />
            </div>
          </Label>
        )}
        {/* 模型の画面は小さいので、文字は右下の隅にも大きく出す */}
        {step.screen && screenActor && (
          <div className="absolute bottom-2 right-2 max-w-[48%] rounded-lg bg-white/95 px-3 py-2 shadow-lg ring-1 ring-black/5" data-testid="explain-screen">
            <p className="text-[10px] font-bold text-gray-500">{screenActor.name}の画面</p>
            <p className="text-sm font-bold text-gray-900">{step.screen.text}</p>
          </div>
        )}
        <CaptionBubble
          caption={{ id: index, text: step.caption, tone: step.tone === "danger" ? "danger" : step.tone === "ok" ? "safe" : undefined, target: "step" }}
          root={captionRoot}
          testId="explain-caption"
        />
      </div>
    </div>
  );
}

/** Canvas の中で部品キットを読む部分（Suspense の中に置く） */
function SceneContents({ layout, step, reducedMotion }: { layout: SceneLayout; step: SceneStep; reducedMotion: boolean }) {
  const kit = useKit();
  return (
    <>
      <Zones kit={kit} layout={layout} />
      {layout.actors.map((a) => {
        const state = stateOf(step, a.id);
        return (
          <group key={a.id}>
            <Glow actor={a} state={state} reducedMotion={reducedMotion} />
            <Actor kit={kit} actor={a} state={state} screenText={step.screen?.actor === a.id ? step.screen.text : null} reducedMotion={reducedMotion} />
          </group>
        );
      })}
    </>
  );
}

function CarryWithKit({ move }: { move: SceneMove }) {
  const kit = useKit();
  return <CarryItem kit={kit} move={move} />;
}

useGLTF.preload(KIT_URL);
useTexture.preload([BAKED_URL, ENV_URL]);
