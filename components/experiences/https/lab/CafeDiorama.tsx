"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { HttpsCapsuleStop } from "../HttpsScene";
import {
  Billboard,
  Box,
  Cylinder,
  FloorShadow,
  cameraTransform,
  easeInOutCubic,
  mixCamera,
  project,
  type Camera,
  type Vec3,
} from "./Diorama3D";
import { EavesdropperStanding, UserFromBehind } from "./DioramaScene";
import type { LabSceneProps } from "./labTypes";
import { BrowserScreen, ServerLogScreen, SnifferScreen } from "./ScreenStoryScene";
import dio from "./diorama.module.css";
import styles from "./cafe.module.css";
import ss from "./screenstory.module.css";

// パターンE／F：フリーWi-Fi のカフェ（実際に盗聴が起きやすい場面）を CSS 3D で再現する。
//   あなたの席のノートPC →（電波）→ 壁のフリーWi-Fi →（インターネット）→ データセンターの Webサーバ
//   電波は周り全部へ届くので、隣の席で受信機を付けたノートPCを開く盗聴者にも同じデータが届く。
// withScreens=true（F）は、ステップの主役の「画面」を B のブラウザ／盗聴ツール／サーバログで
// ステージの下に拡大表示し、3D の中の機器から拡大図へ“虫めがねの光”を伸ばしてつなぐ。

const L: Vec3 = { x: 143, y: 240, z: 72 }; // あなたのノートPCの画面
const R: Vec3 = { x: 460, y: 8, z: 114 }; // 壁のフリーWi-Fi（アクセスポイント）
const A: Vec3 = { x: 375, y: 206, z: 64 }; // 盗聴者のノートPC
const S: Vec3 = { x: 690, y: 150, z: 122 }; // Webサーバ（ラック上面）

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
});

// 小包が通る点の列。middle → arrived はアクセスポイントを経由する。
const ROUTE: Vec3[] = [
  { x: 150, y: 266, z: 78 },
  lerp3(L, R, 0.2),
  lerp3(L, R, 0.56),
  { ...R, z: (R.z ?? 0) + 4 },
  { ...S, z: (S.z ?? 0) + 6 },
];
const ROUTE_INDEX: Record<HttpsCapsuleStop, number> = { desk: 0, out: 1, middle: 2, arrived: 4 };
const COPY_AT: Vec3 = { ...A, z: 92 };

const SHOTS: Camera[] = [
  { yaw: -14, pitch: 52, zoom: 1.45, fx: 150, fy: 262, fz: 60 },
  { yaw: -20, pitch: 55, zoom: 0.98, fx: 290, fy: 170, fz: 70 },
  { yaw: -8, pitch: 50, zoom: 1.08, fx: 350, fy: 160, fz: 80 },
  { yaw: -30, pitch: 54, zoom: 0.74, fx: 540, fy: 150, fz: 70 },
];

const LABELS: { id: string; at: Vec3; place: "above" | "below"; name: string; sub: string }[] = [
  { id: "user", at: { x: 96, y: 372, z: 0 }, place: "below", name: "あなた", sub: "カフェでログイン" },
  { id: "eve", at: { x: 372, y: 160, z: 116 }, place: "above", name: "盗聴者", sub: "隣の席で電波を受信" },
  { id: "ap", at: { x: 460, y: 8, z: 146 }, place: "above", name: "フリーWi-Fi", sub: "暗号化なしの電波" },
  { id: "web", at: { x: 690, y: 150, z: 132 }, place: "above", name: "Webサーバ", sub: "データセンター" },
];

const STATUS: Record<string, Partial<Record<string, string>>> = {
  user: { active: "入力中", sending: "送信" },
  web: { active: "受信" },
  eve: { error: "盗聴中" },
};

/** F のとき、ステップごとに拡大する画面とその持ち主（3D の中の点） */
const ZOOM: { at: Vec3; who: string; icon: string }[] = [
  { at: L, who: "あなたのPCの画面", icon: "🧑" },
  { at: L, who: "あなたのPCの画面", icon: "🧑" },
  { at: A, who: "隣の席の盗聴者の画面", icon: "😈" },
  { at: S, who: "Webサーバのログ", icon: "🗄️" },
];

type Rect = { l: number; t: number; r: number; b: number };

function pathLength(points: Vec3[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    total += Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
  }
  return total;
}

function pointOnPath(points: Vec3[], t: number): Vec3 {
  if (points.length === 1) return points[0];
  let remain = pathLength(points) * t;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
    if (remain <= seg || i === points.length - 1) return lerp3(a, b, seg ? Math.min(1, remain / seg) : 1);
    remain -= seg;
  }
  return points[points.length - 1];
}

export function CafeDiorama({
  mode,
  index,
  step,
  plain,
  cipher,
  forward,
  reducedMotion,
  withScreens,
}: LabSceneProps & { withScreens: boolean }) {
  const https = mode === "https";
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<SVGPolygonElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const size = useRef({ w: 640, h: 520, fit: 1, perspective: 1400 });
  const cam = useRef<Camera>(SHOTS[index]);
  const packet = useRef<Vec3>(ROUTE[ROUTE_INDEX[step.stop]]);
  const copy = useRef<Vec3 | null>(step.intercepted ? COPY_AT : null);
  const drag = useRef({ yaw: 0, pitch: 0 });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);

  const target = (): Camera => {
    const shot = SHOTS[index];
    return {
      ...shot,
      yaw: shot.yaw + drag.current.yaw,
      pitch: Math.max(18, Math.min(78, shot.pitch + drag.current.pitch)),
    };
  };

  const apply = () => {
    const stage = stageRef.current;
    const camera = cameraRef.current;
    if (!stage || !camera) return;
    const { fit, perspective, w: stageW, h: stageH } = size.current;
    const c = cam.current;
    camera.style.transform = cameraTransform(c, fit);
    camera.style.setProperty("--yaw", `${c.yaw}deg`);
    camera.style.setProperty("--pitch", `${c.pitch}deg`);
    const p = packet.current;
    if (packetRef.current) packetRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, ${p.z ?? 0}px)`;
    const cp = copy.current;
    if (copyRef.current) {
      copyRef.current.style.visibility = cp ? "visible" : "hidden";
      if (cp) copyRef.current.style.transform = `translate3d(${cp.x}px, ${cp.y}px, ${cp.z ?? 0}px)`;
    }

    // 画面に重ねる HTML ラベル（固定札を障害物にして、重ならない位置へずらす）
    const box = stage.getBoundingClientRect();
    const placed: Rect[] = [];
    stage.querySelectorAll<HTMLElement>("[data-obstacle]").forEach((el) => {
      const r = el.getBoundingClientRect();
      placed.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
    });
    stage.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
      const kind = el.dataset.anchor;
      const dz = Number(el.dataset.dz ?? 0);
      const base = kind === "packet" ? p : kind === "copy" ? cp : { x: Number(el.dataset.wx), y: Number(el.dataset.wy), z: Number(el.dataset.wz) };
      if (!base) {
        el.style.visibility = "hidden";
        return;
      }
      const s = project({ ...base, z: (base.z ?? 0) + dz }, c, fit, size.current, perspective);
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const place = el.dataset.place ?? "above";
      let left = s.x - w / 2;
      let top = s.y - h - 8;
      if (place === "below") top = s.y + 6;
      if (place === "right") {
        left = s.x + 14;
        top = s.y - h / 2;
      }
      if (place === "left") {
        left = s.x - w - 14;
        top = s.y - h / 2;
      }
      const clamp = (l: number, t: number): Rect => {
        const cl = Math.max(6, Math.min(stageW - w - 6, l));
        const ct = Math.max(6, Math.min(stageH - h - 6, t));
        return { l: cl, t: ct, r: cl + w, b: ct + h };
      };
      const hits = (r: Rect) => placed.some((q) => r.l < q.r + 3 && r.r > q.l - 3 && r.t < q.b + 3 && r.b > q.t - 3);
      const optional = el.dataset.optional !== undefined;
      const offscreen = s.x < -10 || s.x > stageW + 10 || s.y < -10 || s.y > stageH + 10;
      const away = place === "above" ? -1 : 1;
      const candidates = [0, 1, -1, 2, -2, 3].flatMap((k) =>
        [0, 0.6, -0.6, 1.2, -1.2].map((m) => clamp(left + m * (w + 4), top + away * k * (h + 4))),
      );
      const rect = candidates.find((r) => !hits(r));
      if ((optional && (offscreen || !rect)) || (!rect && offscreen)) {
        el.style.visibility = "hidden";
        return;
      }
      const chosen = rect ?? candidates[0];
      placed.push(chosen);
      el.style.visibility = "visible";
      el.style.transform = `translate3d(${chosen.l.toFixed(1)}px, ${chosen.t.toFixed(1)}px, 0)`;
    });

    // F：3D の中の機器から、下の拡大画面へ光の帯を伸ばす
    const panel = panelRef.current;
    const beam = beamRef.current;
    if (withScreens && panel && beam && dotRef.current) {
      const s = project(ZOOM[index].at, c, fit, size.current, perspective);
      const sx = Math.max(4, Math.min(stageW - 4, s.x));
      const sy = Math.max(4, Math.min(stageH - 4, s.y));
      const top = panel.offsetTop + 2;
      const left = panel.offsetLeft + 10;
      const right = panel.offsetLeft + panel.offsetWidth - 10;
      beam.setAttribute("points", `${sx},${sy} ${left},${top} ${right},${top}`);
      dotRef.current.setAttribute("cx", `${sx}`);
      dotRef.current.setAttribute("cy", `${sy}`);
    }
  };

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage || !wrap) return;
    const measure = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      size.current = { w, h, fit: w / 640, perspective: Math.max(900, w * 2.4) };
      stage.style.perspective = `${size.current.perspective}px`;
      apply();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    apply();
  });

  useEffect(() => {
    const fromCam = cam.current;
    const toCam = target();
    const fromIndex = ROUTE.findIndex((pt) => pt === packet.current);
    const toIndex = ROUTE_INDEX[step.stop];
    const toPacket = ROUTE[toIndex];
    const settleCopy = () => {
      copy.current = step.intercepted ? COPY_AT : null;
    };
    if (reducedMotion) {
      cam.current = toCam;
      packet.current = toPacket;
      settleCopy();
      apply();
      return;
    }
    // 前へ1段ずつ進むときだけ経路に沿って動かす（戻る・飛ばすときは瞬間移動）
    const path =
      forward && fromIndex >= 0 && toIndex > fromIndex ? ROUTE.slice(fromIndex, toIndex + 1) : [toPacket];
    const growCopy = forward && step.stop === "middle" && path.length > 1;
    if (!growCopy) settleCopy();
    const start = performance.now();
    const camMs = 1500;
    const packetMs = 900 + pathLength(path) * 2.6;
    const copyStart = 150 + packetMs * 0.7;
    const copyMs = 900;
    const total = Math.max(camMs, 150 + packetMs, growCopy ? copyStart + copyMs : 0);
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const tc = Math.min(1, elapsed / camMs);
      const tp = Math.min(1, Math.max(0, (elapsed - 150) / packetMs));
      cam.current = mixCamera(fromCam, toCam, easeInOutCubic(tc));
      packet.current = tp >= 1 ? toPacket : pointOnPath(path, easeInOutCubic(tp));
      if (growCopy) {
        // 同じ電波が盗聴者の受信機にも届く（小包が中間に来てから分かれる）
        const k = Math.min(1, Math.max(0, (elapsed - copyStart) / copyMs));
        copy.current = k <= 0 ? null : k >= 1 ? COPY_AT : lerp3(ROUTE[2], COPY_AT, easeInOutCubic(k));
      }
      apply();
      if (elapsed < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reducedMotion]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    pointer.current = { ...start, x: event.clientX, y: event.clientY };
    drag.current = {
      yaw: Math.max(-80, Math.min(80, drag.current.yaw - dx * 0.35)),
      pitch: Math.max(-35, Math.min(25, drag.current.pitch - dy * 0.25)),
    };
    cam.current = target();
    setMoved(true);
    apply();
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    setDragging(false);
  }

  function resetView() {
    drag.current = { yaw: 0, pitch: 0 };
    setMoved(false);
    const fromCam = cam.current;
    const toCam = target();
    if (reducedMotion) {
      cam.current = toCam;
      apply();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      cam.current = mixCamera(fromCam, toCam, easeInOutCubic(t));
      apply();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const capsule =
    !https || step.stop === "desk"
      ? { state: "plain", tag: https ? "入力（まだPCの中）" : "平文（HTTP）", body: plain }
      : step.stop === "arrived"
        ? { state: "decrypted", tag: "サーバで復号", body: plain }
        : { state: "encrypted", tag: "ENCRYPTED DATA", body: cipher.length > 14 ? `${cipher.slice(0, 14)}…` : cipher || "…" };
  const eveSees = step.intercepted ? (https ? cipher || "…" : plain) : null;
  const radio = index === 1 || index === 2;
  const zoom = ZOOM[index];
  const beamTone = index === 2 ? (https ? "safe" : "leak") : index === 3 ? "ok" : "you";

  return (
    <div ref={wrapRef} className={styles.wrap} data-screens={withScreens ? "true" : "false"} data-testid="cafe-scene">
      <div
        ref={stageRef}
        className={`${dio.stage} ${styles.stage}`}
        data-mode={mode}
        data-dragging={dragging ? "true" : "false"}
        data-intercepted={step.intercepted ? "true" : "false"}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={
          https
            ? "カフェの模型。あなたのノートPCからフリーWi-Fiを通ってデータセンターのWebサーバまで、緑の暗号のトンネル（TLS）がつながっている。隣の席の盗聴者も電波を受信している"
            : "カフェの模型。あなたのノートPCが出す電波は、壁のフリーWi-Fiだけでなく隣の席の盗聴者のノートPCにも届いている"
        }
      >
        <div ref={cameraRef} className={dio.camera}>
          {/* ---------- カフェの床と壁 ---------- */}
          <Box x={0} y={0} z={-18} w={600} d={380} h={18} color="#c9b39a" faceClass={{ top: styles.woodFloor }} />
          <Box
            x={0}
            y={-12}
            w={600}
            d={12}
            h={150}
            color="#f3ede4"
            faceClass={{ front: styles.cafeWall }}
            faces={{
              front: (
                <>
                  <div className={styles.menuBoard} style={{ left: 30, top: 16, width: 170, height: 46 }}>
                    <b>CAFE MENU</b>
                    <span>ブレンド 450 ／ ラテ 520</span>
                  </div>
                  <div className={dio.window} style={{ left: 250, top: 22, width: 120, height: 74 }} />
                  <div className={styles.wifiSign} style={{ left: 396, top: 78, width: 128, height: 34 }}>
                    <b>FREE Wi-Fi</b>
                    <span>SSID: CAFE_FREE ／ パスワードなし</span>
                  </div>
                </>
              ),
            }}
          />

          {/* カウンターとコーヒーマシン */}
          <FloorShadow x={18} y={40} w={220} d={50} opacity={0.25} />
          <Box x={20} y={12} w={200} d={50} h={62} color="#7a5638" faceClass={{ top: styles.counterTop }} />
          <Box x={40} y={18} w={36} d={26} h={34} z={62} color="#a3acb8" />
          <Box x={90} y={24} w={10} d={10} h={12} z={62} color="#f8fafc" />
          <Box x={106} y={24} w={10} d={10} h={12} z={62} color="#f8fafc" />

          {/* 壁のフリーWi-Fi（アクセスポイント） */}
          <Box x={440} y={0} w={40} d={14} h={12} z={108} color="#eef1f5" />
          <Box x={445} y={4} w={3} d={3} h={24} z={120} color="#475569" />
          <Box x={472} y={4} w={3} d={3} h={24} z={120} color="#475569" />

          {/* 観葉植物 */}
          <FloorShadow x={560} y={28} w={50} d={40} opacity={0.25} />
          <Box x={566} y={26} w={28} d={28} h={26} color="#b86a44" />
          <Billboard x={580} y={40} z={24} w={58} h={64}>
            <svg viewBox="0 0 58 64" className="h-full w-full" aria-hidden>
              <path d="M29 64 C 20 44, 6 40, 2 22 C 16 26, 24 38, 29 64 Z" fill="#3f8f5a" />
              <path d="M29 64 C 38 42, 52 38, 56 18 C 42 24, 32 36, 29 64 Z" fill="#4fa56b" />
              <path d="M29 64 C 26 40, 22 18, 30 2 C 36 18, 34 42, 29 64 Z" fill="#5bb879" />
            </svg>
          </Billboard>

          {/* ---------- あなたの席 ---------- */}
          <FloorShadow x={86} y={236} w={120} d={80} />
          <Box x={134} y={259} w={12} d={12} h={44} color="#3b3f47" />
          <Box x={90} y={226} w={106} d={74} h={5} z={44} color="#c89a6c" faceClass={{ top: styles.tableTop }} />
          <Box x={110} y={244} w={66} d={40} h={3} z={49} color="#cfd5dd" faceClass={{ top: dio.keyboardTop }} />
          <div className={dio.obj} style={{ transform: "translate3d(110px, 244px, 52px)" }}>
            <div className={`${dio.lid} ${styles.lid}`} data-state={step.nodes.user}>
              <div className={dio.lidScreen}>
                <div className={dio.browser} data-mode={mode}>
                  <div className={dio.browserBar}>
                    <span className={dio.browserLock}>{https ? "🔒" : "⚠︎"}</span>
                    <span>{https ? "https://" : "http://"}shop.example</span>
                  </div>
                  <div className={dio.browserBody}>
                    <p className={dio.browserTitle}>ログイン</p>
                    <div className={dio.browserField}>{plain}</div>
                    <div className={dio.browserButton} data-pressed={index >= 1 ? "true" : "false"}>
                      {index >= 1 ? "送信済み" : "送信"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Box x={180} y={284} w={9} d={9} h={10} z={49} color="#fafafa" />
          <FloorShadow x={104} y={318} w={70} d={40} opacity={0.3} />
          <Billboard x={128} y={340} w={78} h={106}>
            <UserFromBehind />
          </Billboard>

          {/* ---------- 隣の席の盗聴者 ---------- */}
          <FloorShadow x={336} y={140} w={110} d={96} />
          <Billboard x={372} y={162} w={60} h={112}>
            <EavesdropperStanding active={step.intercepted} />
          </Billboard>
          <Box x={369} y={196} w={12} d={12} h={44} color="#3b3f47" />
          <Box x={330} y={170} w={96} d={64} h={5} z={44} color="#c89a6c" faceClass={{ top: styles.tableTop }} />
          <Box x={350} y={190} w={52} d={34} h={3} z={49} color="#2f3440" />
          <div className={dio.obj} style={{ transform: "translate3d(402px, 224px, 52px) rotateZ(180deg)" }}>
            <div className={`${dio.lid} ${styles.evilLid}`} />
          </div>
          {/* USB の受信アンテナ */}
          <Box x={404} y={196} w={4} d={4} h={4} z={49} color="#111827" />
          <Box x={405} y={197} w={2} d={2} h={26} z={53} color="#111827" />
          <Box x={403} y={195} w={6} d={6} h={4} z={79} color={step.intercepted && !https ? "#e11d48" : "#475569"} />
          <Box x={410} y={210} w={9} d={9} h={10} z={49} color="#fafafa" />

          {/* 奥の席（雰囲気） */}
          <FloorShadow x={470} y={250} w={100} d={70} opacity={0.25} />
          <Box x={514} y={274} w={12} d={12} h={44} color="#3b3f47" />
          <Box x={476} y={250} w={88} d={60} h={5} z={44} color="#c89a6c" faceClass={{ top: styles.tableTop }} />
          <Box x={500} y={268} w={9} d={9} h={10} z={49} color="#fafafa" />
          <Box x={524} y={264} w={26} d={18} h={3} z={49} color="#dbeafe" />

          {/* ---------- 電波（あなたのノートPCから、周り全部へ） ---------- */}
          <Billboard x={L.x} y={L.y} z={(L.z ?? 0) - 170} w={340} h={340}>
            <div className={styles.waves} data-on={radio ? "true" : "false"} aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </Billboard>

          {/* ---------- インターネット（APからデータセンターへ） ---------- */}
          <div className={dio.group} data-flow={step.stop === "arrived" || index === 2 ? "true" : "false"} style={{ "--flow": https ? "#34d399" : "#fb7185" } as CSSProperties}>
            <Cylinder from={{ ...R, z: 112 }} to={{ ...S, z: 118 }} z={112} r={3.5} segments={8} stripClassName={dio.cableStrip} />
          </div>

          {/* ---------- TLS：あなたのブラウザからサーバまでの暗号のトンネル ---------- */}
          <div className={dio.group} data-tunnel={https ? "on" : "off"} data-testid="cafe-tunnel">
            <Cylinder from={lerp3(L, R, 0.06)} to={R} z={0} r={11} segments={14} stripClassName={dio.glassStrip} />
            <Cylinder from={{ ...R, z: 112 }} to={{ ...S, z: 118 }} z={0} r={11} segments={14} stripClassName={dio.glassStrip} />
          </div>

          {/* ---------- データセンター ---------- */}
          <Box x={620} y={70} z={-18} w={150} d={150} h={18} color="#cfd6e0" faceClass={{ top: styles.dcFloor }} />
          <FloorShadow x={652} y={124} w={120} d={70} />
          <Box
            x={655}
            y={120}
            w={70}
            d={60}
            h={116}
            color="#2a303c"
            faceClass={{ front: dio.rackFront, left: dio.rackSide }}
            faces={{
              front: (
                <div className={dio.rackBays} data-state={step.nodes.web}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className={dio.rackBay}>
                      <span className={dio.led} style={{ animationDelay: `${i * 170}ms` }} />
                      <span className={dio.led} data-alt style={{ animationDelay: `${i * 90 + 300}ms` }} />
                    </div>
                  ))}
                </div>
              ),
            }}
          />
          <Box x={730} y={132} w={30} d={48} h={80} color="#3a414f" />

          {/* ---------- 小包と、盗聴者に届いたコピー ---------- */}
          <div ref={packetRef} className={dio.obj} data-testid="cafe-packet">
            <Box
              x={-12}
              y={-8}
              w={24}
              d={16}
              h={12}
              color={capsule.state === "encrypted" ? "#0f9f76" : "#fbf4e2"}
              faceClass={{ top: dio.packetTop }}
              faces={{
                top: <span className={dio.packetIcon}>{capsule.state === "encrypted" ? "🔒" : capsule.state === "decrypted" ? "✓" : "✉"}</span>,
              }}
            />
          </div>
          <div ref={copyRef} className={dio.obj}>
            <Box x={-9} y={-6} w={18} d={12} h={9} color={https ? "#0f9f76" : "#fecdd3"} />
          </div>
        </div>

        {/* ---------- 投影した HTML ラベル（先に置いたものが優先） ---------- */}
        <div
          className={dio.anchor}
          data-anchor="packet"
          data-dz={step.stop === "desk" ? 6 : 0}
          data-place={step.stop === "desk" ? "right" : step.stop === "arrived" ? "left" : "below"}
        >
          <div className={dio.packetLabel} data-state={capsule.state} data-testid="cafe-packet-label">
            <span className={dio.packetTag}>{capsule.tag}</span>
            <span className={dio.packetBody}>{capsule.body}</span>
          </div>
        </div>

        {!withScreens && eveSees !== null && (
          <div className={dio.anchor} data-anchor="copy" data-dz={30}>
            <div className={dio.eveBubble} data-mode={mode} role="status" data-testid="cafe-eve-bubble">
              <span className={dio.eveBubbleTitle}>😈 盗聴者の画面</span>
              <span className={dio.eveBubbleBody}>{eveSees}</span>
              <span className={dio.eveBubbleVerdict}>{https ? "読めない…" : "読めた！"}</span>
            </div>
          </div>
        )}

        {https && index > 0 && (
          <div className={dio.anchor} data-anchor="world" data-wx={lerp3(R, S, 0.5).x} data-wy={lerp3(R, S, 0.5).y} data-wz={124} data-place="above">
            <span className={dio.tlsBadge}>TLS 暗号化トンネル</span>
          </div>
        )}

        {radio && (
          <div className={dio.anchor} data-anchor="world" data-wx={L.x + 40} data-wy={L.y - 60} data-wz={30} data-place="below" data-optional>
            <span className={styles.radioChip} data-mode={mode}>
              📶 電波は周り全部に届く
            </span>
          </div>
        )}

        {LABELS.filter((label) => !(label.id === "eve" && eveSees !== null && !withScreens)).map((label) => {
          const state = label.id === "ap" ? (radio ? "sending" : "idle") : step.nodes[label.id as keyof typeof step.nodes];
          const status = STATUS[label.id]?.[state];
          return (
            <div
              key={label.id}
              className={dio.anchor}
              data-anchor="world"
              data-wx={label.at.x}
              data-wy={label.at.y}
              data-wz={label.at.z}
              data-place={label.place}
              data-optional
            >
              <div className={dio.nameChip} data-state={state}>
                <b>{label.name}</b>
                {status && <span className={dio.statusChip}>{status}</span>}
                <span className={dio.nameSub}>{label.sub}</span>
              </div>
            </div>
          );
        })}

        <span className={dio.urlPlate} data-mode={mode} data-obstacle>
          {https ? "https://  🔒" : "http://  ⚠︎"}
        </span>
        <div className={dio.viewHint} data-obstacle>
          {moved ? (
            <button type="button" onClick={resetView} className={dio.resetButton}>
              視点をもどす
            </button>
          ) : (
            <span>⟲ ドラッグで回転</span>
          )}
        </div>
      </div>

      {withScreens && (
        <>
          <svg className={styles.beamLayer} aria-hidden>
            <polygon ref={beamRef} className={styles.beam} data-tone={beamTone} />
            <circle ref={dotRef} r={5} className={styles.beamDot} data-tone={beamTone} />
          </svg>
          <div ref={panelRef} className={`${ss.story} ${styles.panel}`} data-mode={mode} data-tone={beamTone} data-testid="cafe-zoom-panel">
            <section className={ss.device} data-focus="true" aria-label={zoom.who}>
              <p className={ss.deviceLabel}>
                <span aria-hidden>{zoom.icon}</span> {zoom.who}（拡大）
                {index === 2 && <span className={ss.chip} data-tone="danger">盗聴中</span>}
                {index === 3 && <span className={ss.chip} data-tone="ok">受信</span>}
              </p>
              {index <= 1 && <BrowserScreen mode={mode} index={index} plain={plain} />}
              {index === 2 && <SnifferScreen mode={mode} captured={step.intercepted} plain={plain} cipher={cipher} />}
              {index === 3 && <ServerLogScreen mode={mode} arrived plain={plain} />}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export function CafeDioramaScene(props: LabSceneProps) {
  return <CafeDiorama {...props} withScreens={false} />;
}

export function CafeScreensScene(props: LabSceneProps) {
  return <CafeDiorama {...props} withScreens />;
}
