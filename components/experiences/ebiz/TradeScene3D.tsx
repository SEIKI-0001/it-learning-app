"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { damp, pointOn, polyLength, type V3 } from "../scene3d/math";
import { CameraRig, CaptionBubble, CaptionProjector, Label, LabelProjector, useInView, useLabelRegistry, type Place, type Shot } from "../scene3d/parts";
import { FLOWS, ROLE, type FlowStep, type Kind, type NodeKey, type TermKey } from "./TradeFlowMap";
import type { TradeSceneProps } from "./TradeScene";
import styles from "./ebiz3d.module.css";

// 取引マップの「動く3D」版。Blender で作った街のジオラマ（public/models/ebiz-town.glb）を three.js で表示する。
//   左奥＝企業（事務所＋倉庫。前に配送トラック）/ 右奥＝取引先企業（工場）/ 奥の中央＝仲介サービスのデータセンター
//   手前左＝個人A の家 / 手前右＝個人B の家（車庫に車）/ 手前の中央＝広場（大きなスマホ）
// 用語を選ぶと、その取引で「誰から誰へ・何が」動くかを①②③の順に道の上を運ぶ。
//   情報＝書類（青）／お金＝硬貨（緑）／モノ＝トラック・車そのものが走る（橙）
// 通った道は色付きのまま残るので、最後の状態だけでも取引の形が読める。
// データセンター（シェアリング）とスマホ（フィンテック）は、使う取引のときだけ現れる。
// 座標は glTF（Y上・手前が +Z、単位 m）。Blender の (x, y, z) は (x, z, -y) になる（~/Blender/ebiz/scene.py）。

const MODEL_URL = "/models/ebiz-town.glb";
/** Blender で焼き込んだ色×陰影（AO）。焼き込み用のUV（TEXCOORD_0）で貼る */
const BAKED_URL = "/models/ebiz-town.webp";
/** 部屋のパノラマ（金属・ガラスの映り込み用。PC模型と共用） */
const ENV_URL = "/models/desk-pc-env.webp";
const BAKED_NODES = ["Static", "Part_CompA", "Part_CompB", "Part_HouseA", "Part_HouseB", "Part_Platform", "Part_Phone", "Part_Truck", "Part_Car"];

/** 登場人物の出入り口（敷地の、道に面したところ） */
const DOOR: Record<NodeKey, V3> = {
  compA: [-0.4, 0, -0.11],
  compB: [0.42, 0, -0.11],
  platform: [0, 0, -0.11],
  persA: [-0.44, 0, 0.12],
  persB: [0.44, 0, 0.12],
  phone: [0, 0, 0.12],
};
const BASE_NAME: Record<NodeKey, string> = { compA: "企業", compB: "取引先企業", persA: "個人", persB: "個人", phone: "スマホ", platform: "仲介サービス" };
const VIA: NodeKey[] = ["phone", "platform"];
/**
 * 名札の位置。会社・データセンターは屋上に載せる（上に浮かせるとスマホ幅で上端の吹き出しに隠れる）、
 * スマホはその上、家は手前の庭（屋根の上だと道を走る車に重なる）
 */
const TAG_AT: Record<NodeKey, V3> = {
  compA: [-0.47, 0.18, -0.33],
  compB: [0.5, 0.15, -0.33],
  platform: [0, 0.14, -0.34],
  persA: [-0.47, 0.01, 0.4],
  persB: [0.47, 0.01, 0.4],
  phone: [0, 0.17, 0.27],
};

/** 吹き出しの線が指す点（名札と重ならないよう、建物の正面の上の方） */
const BUBBLE_AT: Record<NodeKey, V3> = {
  compA: [-0.47, 0.15, -0.235],
  compB: [0.57, 0.08, -0.235],
  platform: [0, 0.1, -0.27],
  phone: [0, 0.1, 0.262],
  persA: [-0.47, 0.08, 0.22],
  persB: [0.47, 0.08, 0.22],
};
const PLACE: Record<NodeKey, Place> = { compA: "center", compB: "center", platform: "center", phone: "above", persA: "below", persB: "below" };

const KIND_COLOR: Record<Kind, string> = { info: "#2563eb", money: "#16a34a", goods: "#f59e0b" };
const LANE_Y = 0.0068;
const LANE_GAP = 0.024;
const TOKEN_Y = 0.035;
const SPEED = 0.32;
/** 着いてから次が動き出すまでの間（秒） */
const HOLD = 0.35;

/** データセンター・大きなスマホの足元（出てくるときはここを中心に伸びる） */
const PLATFORM_AT: V3 = [0, 0.004, -0.34];
const PHONE_AT: V3 = [0, 0.004, 0.27];

/** 乗り物：モノを運ぶ手順は、物を浮かべず車そのものを走らせる */
type Vehicle = "truck" | "car";
/** 止まっている所（模型での位置）と、そのときの向き（glTF の Y 回転。+X 向き＝0） */
const REST: Record<Vehicle, { at: V3; heading: number }> = {
  truck: { at: [-0.695, 0.004, -0.16], heading: -Math.PI / 2 },
  car: { at: [0.305, 0.004, 0.22], heading: Math.PI / 2 },
};
/** 走る道（左側通行：東向きは奥の車線、西向きは手前の車線） */
const DRIVE: Record<Vehicle, V3[]> = {
  truck: [REST.truck.at, [-0.695, 0.004, -0.06], [-0.66, 0.004, 0.02], [-0.6, 0.004, 0.035], [-0.48, 0.004, 0.035]],
  car: [REST.car.at, [0.305, 0.004, 0.07], [0.27, 0.004, 0.035], [0.2, 0.004, 0.035], [-0.53, 0.004, 0.035]],
};
function vehicleOf(term: TermKey, step: FlowStep): Vehicle | null {
  if (step.kind !== "goods") return null;
  return term === "sharing" ? "car" : "truck";
}

/** 経路：出入り口 → 道の真ん中 → 道を進む → 行き先の出入り口 */
function route(path: NodeKey[]): V3[] {
  const pts: V3[] = [];
  path.forEach((k, i) => {
    const d = DOOR[k];
    const road: V3 = [d[0], 0, 0];
    if (i > 0) pts.push(road);
    pts.push(d);
    if (i < path.length - 1) pts.push(road);
  });
  return pts.filter((p, i) => i === 0 || p.some((v, j) => Math.abs(v - pts[i - 1][j]) > 1e-4));
}

/** 経路を進行方向の左右へずらして、同じ区間を通る流れを車線に分ける */
function offsetLane(pts: V3[], offset: number): V3[] {
  return pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    return [p[0] + (-dz / len) * offset, LANE_Y, p[2] + (dx / len) * offset];
  });
}

type Leg = { step: FlowStep; vehicle: Vehicle | null; lane: V3[]; path: V3[]; dur: number };

function buildLegs(term: TermKey | null): Leg[] {
  if (!term) return [];
  const steps = FLOWS[term];
  return steps.map((step, i) => {
    const vehicle = vehicleOf(term, step);
    if (vehicle) {
      const drive = DRIVE[vehicle];
      const lane = [...drive, DOOR[step.path[step.path.length - 1]]].map((p): V3 => [p[0], LANE_Y, p[2]]);
      return { step, vehicle, lane, path: drive, dur: Math.max(1.4, polyLength(drive) / SPEED) };
    }
    const lane = offsetLane(route(step.path), (i - (steps.length - 1) / 2) * LANE_GAP);
    const path = lane.map((p): V3 => [p[0], TOKEN_Y, p[2]]);
    return { step, vehicle: null, lane, path, dur: Math.max(1.1, polyLength(path) / SPEED) };
  });
}

// ---------------------------------------------------------------------------
// 看板とスマホの画面（CanvasTexture）

const JP = '"Hiragino Sans", "Noto Sans JP", sans-serif';
const SIGN_A: Record<TermKey | "none", { text: string; color: string }> = {
  none: { text: "A CORP.", color: "#e2e8f0" },
  ec: { text: "A SHOP", color: "#fbbf24" },
  edi: { text: "A CORP.", color: "#e2e8f0" },
  fintech: { text: "A PAY", color: "#4ade80" },
  sharing: { text: "A CORP.", color: "#e2e8f0" },
};

function drawSign(text: string, color: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f2937";
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${Math.round(h * 0.56)}px ${JP}`;
  g.fillText(text, w / 2, h / 2 + 2);
  return c;
}

type PhoneState = "send" | "busy" | "done";
function drawPhone(state: PhoneState) {
  const W = 120;
  const H = 224;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = state === "done" ? "#dcfce7" : "#eff6ff";
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.fillStyle = "#475569";
  g.font = `800 15px ${JP}`;
  g.fillText(state === "done" ? "送金完了" : "送金", W / 2, 46);
  g.fillStyle = "#0f172a";
  g.font = `900 30px ${JP}`;
  g.fillText("¥3,000", W / 2, 98);
  if (state === "done") {
    g.fillStyle = "#15803d";
    g.font = `800 13px ${JP}`;
    g.fillText("残高 ¥12,000", W / 2, 140);
  } else {
    g.fillStyle = state === "busy" ? "#94a3b8" : "#2563eb";
    g.beginPath();
    g.roundRect(18, 156, W - 36, 34, 17);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `800 15px ${JP}`;
    g.fillText(state === "busy" ? "処理中…" : "送る", W / 2, 179);
  }
  return c;
}

/** 画面・看板の面は Blender の UV そのまま（glTF は V が下向き）なので flipY しない */
function useCanvasMaterial(mesh: THREE.Mesh | null, draw: () => HTMLCanvasElement, deps: string) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => {
    const tex = new THREE.CanvasTexture(draw());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.flipY = false;
    swapMap(mat, tex);
    // draw は deps の文字列で決まる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, mat]);
  useEffect(() => {
    attach(mesh, mat);
  }, [mesh, mat]);
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

function Screens({ model, sel, phone }: { model: ModelParts; sel: TermKey | null; phone: PhoneState }) {
  const a = SIGN_A[sel ?? "none"];
  useCanvasMaterial(model.signA, () => drawSign(a.text, a.color, 256, 62), `${a.text}|${a.color}`);
  useCanvasMaterial(model.signB, () => drawSign("B CORP.", "#e2e8f0", 256, 60), "b");
  useCanvasMaterial(model.phone, () => drawPhone(phone), phone);
  return null;
}

// ---------------------------------------------------------------------------

type ModelParts = {
  root: THREE.Object3D;
  vehicles: Record<Vehicle, THREE.Object3D | null>;
  platform: THREE.Object3D | null;
  phoneStand: THREE.Object3D | null;
  signA: THREE.Mesh | null;
  signB: THREE.Mesh | null;
  phone: THREE.Mesh | null;
};

function useTown(): ModelParts {
  const { scene } = useGLTF(MODEL_URL);
  const baked = useTexture(BAKED_URL, (t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  return useMemo<ModelParts>(() => {
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
    for (const name of BAKED_NODES) {
      eachMesh(name, (mesh) => {
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const c = (m as THREE.MeshStandardMaterial).clone();
          // 金属は焼き込みの「拡散色」が黒になるので貼らない
          if (c.metalness <= 0.5) {
            c.map = baked;
            c.color.set("#ffffff");
          }
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
    }
    // 動かす・拡大する部品は、軸（足元の中心）に置いた入れ物で包んで、入れ物の方を動かす。
    // 圧縮（meshopt の量子化）で部品の node に位置・拡大が入っているので、部品そのものの transform は触らない
    root.updateMatrixWorld(true);
    const pivot = (names: string[], at: V3) => {
      const g = new THREE.Group();
      g.position.set(...at);
      root.add(g);
      for (const n of names) {
        const o = byName[n];
        if (!o) continue;
        g.attach(o);
      }
      return g;
    };
    let signA: THREE.Mesh | null = null;
    let signB: THREE.Mesh | null = null;
    let phone: THREE.Mesh | null = null;
    eachMesh("Scr_SignA", (m) => (signA = m));
    eachMesh("Scr_SignB", (m) => (signB = m));
    eachMesh("Scr_Phone", (m) => (phone = m));
    return {
      root,
      vehicles: { truck: pivot(["Part_Truck"], REST.truck.at), car: pivot(["Part_Car"], REST.car.at) },
      platform: pivot(["Part_Platform"], PLATFORM_AT),
      phoneStand: pivot(["Part_Phone", "Scr_Phone"], PHONE_AT),
      signA,
      signB,
      phone,
    };
  }, [scene, baked]);
}

function place(o: THREE.Object3D, p: THREE.Vector3 | V3, rotY: number) {
  if (Array.isArray(p)) o.position.set(...p);
  else o.position.copy(p);
  o.rotation.y = rotY;
}
function setScale(o: THREE.Object3D, s: number) {
  o.scale.setScalar(Math.max(s, 0.0001));
  o.visible = s > 0.01;
}

/** 折れ線の帯（道の上に描く流れの色）。drawRange で、運んでいる物の後ろだけ伸ばす */
function ribbon(pts: V3[], width: number, samples = 96) {
  const pos: number[] = [];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pointOn(pts, t, tmp);
    pointOn(pts, Math.min(1, t + 0.002), tmp2);
    if (i === samples) pointOn(pts, t - 0.002, tmp2).sub(tmp).negate().add(tmp);
    const dx = tmp2.x - tmp.x;
    const dz = tmp2.z - tmp.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2);
    const nz = (dx / len) * (width / 2);
    pos.push(tmp.x + nx, tmp.y, tmp.z + nz, tmp.x - nx, tmp.y, tmp.z - nz);
  }
  const idx: number[] = [];
  for (let i = 0; i < samples; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.setDrawRange(0, 0);
  return g;
}

/** 運ぶ物：情報＝書類、お金＝硬貨 */
function Token({ kind }: { kind: Kind }) {
  return (
    <group scale={1.6}>
      <TokenShape kind={kind} />
    </group>
  );
}

function TokenShape({ kind }: { kind: Kind }) {
  if (kind === "money") {
    return (
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.004, 28]} />
        <meshStandardMaterial color="#f5b301" metalness={0.65} roughness={0.28} emissive="#a16207" emissiveIntensity={0.25} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.024, 0.032, 0.003]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} emissive="#ffffff" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 0.0115, 0.0017]}>
        <planeGeometry args={[0.024, 0.009]} />
        <meshBasicMaterial color={KIND_COLOR.info} toneMapped={false} />
      </mesh>
      {[-0.002, -0.007, -0.012].map((y) => (
        <mesh key={y} position={[-0.002, y, 0.0017]}>
          <planeGeometry args={[0.016, 0.0018]} />
          <meshBasicMaterial color="#94a3b8" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 取引の流れ（①②③）を順に再生する。物が着いたら少し置いて次を出す。
 * 進みは React の state でなく ref で持ち、変わり目だけ onStep で知らせる（札・スマホの画面の切替）。
 */
function Flow({
  model,
  legs,
  playKey,
  reducedMotion,
  tokens,
  follow,
  onStep,
}: {
  model: ModelParts;
  legs: Leg[];
  playKey: string;
  reducedMotion: boolean;
  tokens: RefObject<(THREE.Group | null)[]>;
  /** いま動いている物（書類・硬貨・乗り物）。運ぶ物の札がこれに付いていく */
  follow: RefObject<THREE.Object3D | null>;
  onStep: (i: number) => void;
}) {
  const ribbons = useMemo(() => legs.map((l) => ribbon(l.lane, l.vehicle ? 0.018 : 0.014)), [legs]);
  useEffect(() => () => ribbons.forEach((g) => g.dispose()), [ribbons]);
  const prog = useRef({ key: "", i: 0, t: 0, told: -1 });
  const tmp = useRef(new THREE.Vector3());
  const ahead = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const p = prog.current;
    if (p.key !== playKey) {
      p.key = playKey;
      p.i = reducedMotion ? legs.length : 0;
      p.t = 0;
      p.told = -1;
    }
    if (p.i < legs.length) {
      p.t += Math.min(dt, 0.05) / legs[p.i].dur;
      if (p.t >= 1 + HOLD / legs[p.i].dur) {
        p.i += 1;
        p.t = 0;
      }
    }
    if (p.told !== p.i) {
      p.told = p.i;
      onStep(p.i);
    }
    const ease = (t: number) => {
      const x = Math.min(1, t);
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    };
    // 乗り物：使わない取引・まだの手順では止まっている所へ
    setTarget(follow, null);
    for (const v of ["truck", "car"] as Vehicle[]) {
      const o = model.vehicles[v];
      if (o) place(o, REST[v].at, 0);
    }
    legs.forEach((leg, j) => {
      const done = j < p.i;
      const now = j === p.i;
      const e = done ? 1 : now ? ease(p.t) : 0;
      const g = ribbons[j];
      g.setDrawRange(0, Math.floor(e * (g.index!.count / 6)) * 6);
      const tok = tokens.current[j] ?? null;
      if (leg.vehicle) {
        if (tok) tok.visible = false;
        const o = model.vehicles[leg.vehicle];
        if (!o) return;
        if (now) setTarget(follow, o);
        const pos = pointOn(leg.path, e, tmp.current);
        pointOn(leg.path, Math.min(1, e + 0.02), ahead.current);
        if (e >= 0.98) pointOn(leg.path, e - 0.02, ahead.current).sub(pos).negate().add(pos);
        const dx = ahead.current.x - pos.x;
        const dz = ahead.current.z - pos.z;
        const heading = e > 0 && Math.hypot(dx, dz) > 1e-5 ? Math.atan2(-dz, dx) : REST[leg.vehicle].heading;
        place(o, pos, heading - REST[leg.vehicle].heading);
        return;
      }
      if (!tok) return;
      if (now) setTarget(follow, tok);
      tok.visible = done || now;
      if (!tok.visible) return;
      pointOn(leg.path, e, tok.position);
      if (!reducedMotion && now && p.t < 1) tok.position.y += Math.sin(p.t * Math.PI) * 0.025;
    });
  });

  return (
    <>
      {legs.map((leg, j) => (
        <mesh key={`${playKey}-${j}`} geometry={ribbons[j]} renderOrder={1}>
          <meshBasicMaterial color={KIND_COLOR[leg.step.kind]} transparent opacity={0.8} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/** データセンター・スマホは使う取引のときだけ出す（下から伸びるように拡大） */
function NodeStates({ model, used, reducedMotion }: { model: ModelParts; used: Set<NodeKey>; reducedMotion: boolean }) {
  const first = useRef(true);
  useFrame((_, dt) => {
    const k = reducedMotion || first.current ? 1000 : 6;
    first.current = false;
    if (model.platform) setScale(model.platform, damp(model.platform.scale.x, used.has("platform") ? 1 : 0, k, dt));
    if (model.phoneStand) setScale(model.phoneStand, damp(model.phoneStand.scale.x, used.has("phone") ? 1 : 0, k, dt));
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

const SHOT_WIDE: Shot = { pos: [0, 1.22, 1.38], look: [0, 0.02, 0.0] };
const SHOT_SQ: Shot = { pos: [0, 1.72, 0.98], look: [0, 0, -0.1] };

/** 縦長・正方形に近い枠（スマホ）では真上寄りから見る。横幅 1.7m のジオラマが左右で切れないように */
function FitView({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const square = size.width / size.height < 1.4;
  useEffect(() => {
    setFov(camera as THREE.PerspectiveCamera, square ? 44 : 40);
  }, [camera, square]);
  return <CameraRig shot={square ? SHOT_SQ : SHOT_WIDE} reducedMotion={reducedMotion} />;
}

function Town({
  sel,
  playKey,
  legs,
  used,
  phone,
  reducedMotion,
  tokens,
  follow,
  onStep,
}: {
  sel: TermKey | null;
  playKey: string;
  legs: Leg[];
  used: Set<NodeKey>;
  phone: PhoneState;
  reducedMotion: boolean;
  tokens: RefObject<(THREE.Group | null)[]>;
  follow: RefObject<THREE.Object3D | null>;
  onStep: (i: number) => void;
}) {
  const model = useTown();
  return (
    <>
      <primitive object={model.root} />
      <Screens model={model} sel={sel} phone={phone} />
      <NodeStates model={model} used={used} reducedMotion={reducedMotion} />
      <Flow model={model} legs={legs} playKey={playKey} reducedMotion={reducedMotion} tokens={tokens} follow={follow} onStep={onStep} />
    </>
  );
}

// ---------------------------------------------------------------------------

export default function TradeScene3D({ sel, runKey, reducedMotion, caption = null }: TradeSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useInView(wrap);
  const registry = useLabelRegistry();
  const captionRoot = useRef<HTMLDivElement>(null);
  const tokens = useRef<(THREE.Group | null)[]>([]);
  const follow = useRef<THREE.Object3D | null>(null);

  const playKey = `${sel ?? "none"}-${runKey}`;
  const legs = useMemo(() => buildLegs(sel), [sel]);
  const used = useMemo(() => new Set(legs.flatMap((l) => l.step.path)), [legs]);
  const [stepAt, setStepAt] = useState<{ key: string; i: number }>({ key: "", i: 0 });
  const step = stepAt.key === playKey ? stepAt.i : reducedMotion ? legs.length : 0;
  const moving = !reducedMotion && step < legs.length ? step : -1;
  const movingLeg = moving >= 0 ? legs[moving] : null;
  const phone: PhoneState = sel !== "fintech" ? "send" : step >= 3 ? "done" : step >= 1 ? "busy" : "send";
  const name = (k: NodeKey) => (sel && ROLE[sel][k]) || BASE_NAME[k];
  const shown = (Object.keys(DOOR) as NodeKey[]).filter((k) => (sel ? used.has(k) : !VIA.includes(k)));

  return (
    <div
      ref={wrap}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#d9dde3] sm:aspect-[16/11]"
      data-testid="ebiz-map"
      data-scene="3d"
      data-sel={sel ?? "none"}
      data-step={String(step)}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="img"
      aria-label="街の模型（3D）。左奥に企業、右奥に取引先企業の工場、手前に個人の家が2軒。用語を選ぶと、情報（書類）・お金（硬貨）・モノ（トラックや車）が道の上を順に運ばれる"
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 40, near: 0.05, far: 20, position: SHOT_WIDE.pos }}
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
          position={[-0.6, 2.4, 0.9]}
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

        <Town
          sel={sel}
          playKey={playKey}
          legs={legs}
          used={used}
          phone={phone}
          reducedMotion={reducedMotion}
          tokens={tokens}
          follow={follow}
          onStep={(i) => setStepAt({ key: playKey, i })}
        />
        {[0, 1, 2].map((j) => (
          <group key={j} ref={(g) => setToken(tokens, j, g)} visible={false}>
            {legs[j] && !legs[j].vehicle && <Token kind={legs[j].step.kind} />}
          </group>
        ))}

        <LabelProjector registry={registry} />
        <CaptionProjector at={caption ? (caption.focus ? BUBBLE_AT[caption.focus] : [0, 0.01, 0]) : null} place="band" root={captionRoot} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        {shown.map((k) => (
          <Label key={k} registry={registry} id={`node-${k}`} at={TAG_AT[k]} place={PLACE[k]}>
            <span className={styles.tag} data-testid={`ebiz-tag-${k}`}>
              {name(k)}
            </span>
          </Label>
        ))}
        {/* 運んでいる間だけ、運ぶ物の札を付ける（札は常に1枚） */}
        {movingLeg && (
          <Label
            key={`${playKey}-${moving}`}
            registry={registry}
            id="payload"
            at={movingLeg.vehicle ? [0, 0.075, 0] : [0, 0.03, 0]}
            follow={follow}
            place="above"
          >
            <span className={styles.payload} data-kind={movingLeg.step.kind} data-testid="ebiz-payload">
              {"①②③"[moving]}
              {movingLeg.step.label}
            </span>
          </Label>
        )}
        <CaptionBubble
          caption={caption ? { id: caption.id, text: caption.text, tone: caption.tone === "danger" ? "danger" : caption.tone === "ok" ? "safe" : undefined, target: caption.focus ?? "town" } : null}
          root={captionRoot}
          testId="ebiz-map-caption"
        />
      </div>
    </div>
  );
}

function setToken(ref: RefObject<(THREE.Group | null)[]>, j: number, g: THREE.Group | null) {
  ref.current[j] = g;
}

function setTarget(ref: RefObject<THREE.Object3D | null>, o: THREE.Object3D | null) {
  (ref as { current: THREE.Object3D | null }).current = o;
}

useGLTF.preload(MODEL_URL);
useTexture.preload([BAKED_URL, ENV_URL]);
