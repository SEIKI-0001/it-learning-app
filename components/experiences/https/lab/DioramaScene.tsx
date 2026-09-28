"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { HttpsCapsuleStop } from "../HttpsScene";
import {
  Billboard,
  Box,
  Cylinder,
  FloorShadow,
  FloorStrip,
  cameraTransform,
  easeInOutCubic,
  mixCamera,
  project,
  type Camera,
  type Vec3,
} from "./Diorama3D";
import type { LabSceneProps } from "./labTypes";
import styles from "./diorama.module.css";

// パターンA：リアル 3D ジオラマ。
// 部屋の模型（奥の壁・床・机）に、あなたのノートPC → ケーブル → サーバラック、途中に盗聴者の机。
// ステップごとにカメラが主役へ寄り、ドラッグで視点を回せる。文字は 3D に貼らず、
// ワールド座標を画面へ投影した HTML ラベルに載せる（どの角度・ズームでも読める）。

const FLOOR = { w: 600, d: 380, t: 18 };
const CABLE = { from: { x: 212, y: 270 }, to: { x: 470, y: 142 }, z: 5, r: 4.5 };
const CABLE_ANGLE = (Math.atan2(CABLE.to.y - CABLE.from.y, CABLE.to.x - CABLE.from.x) * 180) / Math.PI;

function along(t: number, z: number): Vec3 {
  return {
    x: CABLE.from.x + (CABLE.to.x - CABLE.from.x) * t,
    y: CABLE.from.y + (CABLE.to.y - CABLE.from.y) * t,
    z,
  };
}

const TAP = along(0.5, 0);
const PACKET_AT: Record<HttpsCapsuleStop, Vec3> = {
  desk: { x: 176, y: 292, z: 46 },
  out: along(0.1, 11),
  middle: along(0.5, 11),
  arrived: along(0.9, 11),
};

/** ステップごとのカメラ（主役へ寄る） */
const SHOTS: Camera[] = [
  { yaw: -14, pitch: 52, zoom: 1.6, fx: 150, fy: 270, fz: 40 },
  { yaw: -24, pitch: 55, zoom: 1.15, fx: 250, fy: 225, fz: 30 },
  { yaw: -8, pitch: 50, zoom: 1.2, fx: 345, fy: 145, fz: 50 },
  { yaw: -26, pitch: 54, zoom: 1.0, fx: 380, fy: 170, fz: 50 },
];

// 名前札は足元の下に出す（上は小包や吹き出しのために空けておく）
const LABELS: { id: string; at: Vec3; place: "above" | "below"; name: string; sub: string }[] = [
  { id: "user", at: { x: 40, y: 372, z: 0 }, place: "below", name: "あなた", sub: "ログイン入力" },
  { id: "web", at: { x: 507, y: 126, z: 138 }, place: "above", name: "Webサーバ", sub: "正規の宛先" },
  { id: "eve", at: { x: 254, y: 98, z: 124 }, place: "above", name: "盗聴者", sub: "通信路を盗み見" },
];

const STATUS: Record<string, Partial<Record<string, string>>> = {
  user: { active: "入力中", sending: "送信" },
  web: { active: "受信" },
  eve: { error: "盗聴中" },
};

type Drag = { yaw: number; pitch: number };
type Rect = { l: number; t: number; r: number; b: number };

export function DioramaScene({ mode, index, step, plain, cipher, forward, reducedMotion }: LabSceneProps) {
  const https = mode === "https";
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 640, h: 460, fit: 1, perspective: 1400 });
  const cam = useRef<Camera>(SHOTS[index]);
  const packet = useRef<Vec3>(PACKET_AT[step.stop]);
  const drag = useRef<Drag>({ yaw: 0, pitch: 0 });
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

  // カメラ・小包・ラベルを同じフレームで書き換える（React の再描画を挟まない）
  const apply = () => {
    const stage = stageRef.current;
    const camera = cameraRef.current;
    if (!stage || !camera) return;
    const { fit, perspective } = size.current;
    const c = cam.current;
    camera.style.transform = cameraTransform(c, fit);
    camera.style.setProperty("--yaw", `${c.yaw}deg`);
    camera.style.setProperty("--pitch", `${c.pitch}deg`);
    const p = packet.current;
    if (packetRef.current) {
      packetRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, ${p.z ?? 0}px) rotateZ(${CABLE_ANGLE}deg)`;
    }
    const { w: stageW, h: stageH } = size.current;
    // 固定の札（URL・操作ヒント）を障害物として先に置き、ラベルは重ならない位置へずらす
    const box = stage.getBoundingClientRect();
    const placed: Rect[] = [];
    stage.querySelectorAll<HTMLElement>("[data-obstacle]").forEach((el) => {
      const r = el.getBoundingClientRect();
      placed.push({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });
    });
    stage.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
      const follow = el.dataset.anchor === "packet";
      const at: Vec3 = follow
        ? { x: p.x, y: p.y, z: (p.z ?? 0) + Number(el.dataset.dz ?? 0) }
        : { x: Number(el.dataset.wx), y: Number(el.dataset.wy), z: Number(el.dataset.wz) };
      const s = project(at, c, fit, size.current, perspective);
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
      const clamp = (l: number, t: number): Rect => {
        const cl = Math.max(6, Math.min(stageW - w - 6, l));
        const ct = Math.max(6, Math.min(stageH - h - 6, t));
        return { l: cl, t: ct, r: cl + w, b: ct + h };
      };
      const hits = (r: Rect) => placed.some((q) => r.l < q.r + 3 && r.r > q.l - 3 && r.t < q.b + 3 && r.b > q.t - 3);
      const optional = el.dataset.optional !== undefined;
      // 画面の外にいる物の名前札は出さない
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
  };

  // ステージの幅に合わせて縮尺と遠近を決める
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
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
    return () => ro.disconnect();
  }, []);

  // ラベルの中身が変わったら位置を付け直す
  useLayoutEffect(() => {
    apply();
  });

  // ステップが変わったらカメラと小包をなめらかに移す
  useEffect(() => {
    const fromCam = cam.current;
    const toCam = target();
    const fromPacket = packet.current;
    const toPacket = PACKET_AT[step.stop];
    if (reducedMotion) {
      cam.current = toCam;
      packet.current = toPacket;
      apply();
      return;
    }
    const jumpPacket = !forward;
    const start = performance.now();
    const camMs = 1500;
    const packetMs = 1700;
    let raf = 0;
    const tick = (now: number) => {
      const tc = Math.min(1, (now - start) / camMs);
      const tp = Math.min(1, Math.max(0, (now - start - 150) / packetMs));
      cam.current = mixCamera(fromCam, toCam, easeInOutCubic(tc));
      if (jumpPacket) {
        packet.current = toPacket;
      } else {
        const e = easeInOutCubic(tp);
        // 机から通信路へ降りるときは弧を描く
        const lift = step.stop === "out" ? Math.sin(e * Math.PI) * 30 : Math.sin(e * Math.PI) * 6;
        packet.current = {
          x: fromPacket.x + (toPacket.x - fromPacket.x) * e,
          y: fromPacket.y + (toPacket.y - fromPacket.y) * e,
          z: (fromPacket.z ?? 0) + ((toPacket.z ?? 0) - (fromPacket.z ?? 0)) * e + lift,
        };
      }
      apply();
      if (tc < 1 || (!jumpPacket && tp < 1)) raf = requestAnimationFrame(tick);
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
  const flowing = step.laneActive;

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-mode={mode}
      data-dragging={dragging ? "true" : "false"}
      data-intercepted={step.intercepted ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="diorama-scene"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={
        https
          ? "部屋の模型。あなたのノートPCからWebサーバへのケーブルが、緑のガラスのトンネル（TLS）に包まれている。奥の盗聴者がケーブルに線をつないでいる"
          : "部屋の模型。あなたのノートPCからWebサーバへのケーブルがむき出しで、奥の盗聴者がケーブルに線をつないでいる"
      }
    >
      <div ref={cameraRef} className={styles.camera}>
        {/* 床スラブと奥の壁 */}
        <Box x={0} y={0} z={-FLOOR.t} w={FLOOR.w} d={FLOOR.d} h={FLOOR.t} color="#d8dee8" faceClass={{ top: styles.floorTop }} />
        <Box
          x={0}
          y={-12}
          w={FLOOR.w}
          d={12}
          h={120}
          color="#eef1f6"
          faceClass={{ front: styles.wallFront }}
          faces={{
            front: (
              <>
                <div className={styles.window} style={{ left: 60, top: 18, width: 130, height: 70 }} />
                <div className={styles.window} style={{ left: 330, top: 18, width: 130, height: 70 }} />
              </>
            ),
          }}
        />

        {/* 観葉植物 */}
        <FloorShadow x={20} y={40} w={60} d={44} opacity={0.25} />
        <Box x={28} y={34} w={30} d={30} h={26} color="#c46f45" />
        <Billboard x={43} y={50} z={24} w={58} h={64}>
          <svg viewBox="0 0 58 64" className="h-full w-full" aria-hidden>
            <path d="M29 64 C 20 44, 6 40, 2 22 C 16 26, 24 38, 29 64 Z" fill="#3f8f5a" />
            <path d="M29 64 C 38 42, 52 38, 56 18 C 42 24, 32 36, 29 64 Z" fill="#4fa56b" />
            <path d="M29 64 C 26 40, 22 18, 30 2 C 36 18, 34 42, 29 64 Z" fill="#5bb879" />
          </svg>
        </Billboard>

        {/* ---------- あなた：机とノートPC ---------- */}
        <FloorShadow x={48} y={236} w={190} d={100} />
        <Box x={50} y={228} w={165} d={84} h={34} color="#b4865a" faceClass={{ top: styles.woodTop }} />
        <Box
          x={96}
          y={246}
          w={104}
          d={56}
          h={4}
          z={34}
          color="#cfd5dd"
          faceClass={{ top: styles.keyboardTop }}
        />
        <div className={styles.obj} style={{ transform: "translate3d(96px, 246px, 38px)" }}>
          <div className={styles.lid} data-state={step.nodes.user}>
            <div className={styles.lidScreen}>
              <div className={styles.browser} data-mode={mode}>
                <div className={styles.browserBar}>
                  <span className={styles.browserLock}>{https ? "🔒" : "⚠︎"}</span>
                  <span>{https ? "https://" : "http://"}shop.example/login</span>
                </div>
                <div className={styles.browserBody}>
                  <p className={styles.browserTitle}>ログイン</p>
                  <div className={styles.browserField}>{plain}</div>
                  <div className={styles.browserButton} data-pressed={index >= 1 ? "true" : "false"}>
                    {index >= 1 ? "送信済み" : "送信"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <FloorShadow x={70} y={330} w={70} d={40} opacity={0.3} />
        <Billboard x={96} y={352} w={82} h={112}>
          <UserFromBehind />
        </Billboard>

        {/* ---------- 通信路：ケーブル＋TLSのガラス管 ---------- */}
        <div
          className={styles.group}
          data-flow={flowing ? "true" : "false"}
          style={{ "--flow": https ? "#34d399" : "#fb7185" } as CSSProperties}
        >
          <Cylinder
            from={CABLE.from}
            to={CABLE.to}
            z={CABLE.z}
            r={CABLE.r}
            segments={10}
            stripClassName={styles.cableStrip}
            testId="diorama-cable"
          />
        </div>
        {/* 不透明度は preserve-3d の親に付けると平面化されるので、帯ごとに付ける */}
        <div className={styles.group} data-tunnel={https ? "on" : "off"} data-testid="diorama-tunnel">
          <Cylinder
            from={along(-0.02, 0)}
            to={along(1.0, 0)}
            z={CABLE.z + 5}
            r={17}
            segments={18}
            stripClassName={styles.glassStrip}
          />
        </div>

        {/* 盗聴クリップと、盗聴者の机へ伸びる線 */}
        <Box x={TAP.x - 7} y={TAP.y - 7} w={14} d={14} h={16} color={step.intercepted && !https ? "#e11d48" : "#7b8190"} />
        <FloorStrip from={TAP} to={{ x: 336, y: 94 }} width={2.4} className={styles.tapWire} />

        {/* ---------- 盗聴者の机 ---------- */}
        <FloorShadow x={270} y={46} w={140} d={62} />
        <Box x={272} y={40} w={122} d={54} h={30} color="#4a4f5d" />
        <Box x={326} y={60} w={10} d={8} h={14} z={30} color="#2b2f38" />
        <Box
          x={288}
          y={62}
          w={92}
          d={5}
          h={58}
          z={40}
          color="#1f232b"
          faceClass={{ front: styles.monitorFace }}
          faces={{
            front: (
              <div className={styles.terminal} data-mode={mode} data-on={eveSees ? "true" : "false"}>
                <p>$ sniff eth0</p>
                {eveSees ? (
                  <>
                    <p className={styles.termDim}>{https ? "TLS 443 app-data" : "HTTP 80 POST /login"}</p>
                    <p className={styles.termHit}>{https ? cipher.slice(0, 19) || "…" : plain}</p>
                  </>
                ) : (
                  <p className={styles.termDim}>listening…▍</p>
                )}
              </div>
            ),
          }}
        />
        <FloorShadow x={232} y={90} w={54} d={30} opacity={0.3} />
        <Billboard x={254} y={98} w={62} h={118}>
          <EavesdropperStanding active={step.intercepted} />
        </Billboard>

        {/* ---------- Webサーバ：ラック ---------- */}
        <FloorShadow x={468} y={98} w={124} d={74} />
        <Box
          x={472}
          y={96}
          w={70}
          d={62}
          h={132}
          color="#2a303c"
          faceClass={{ front: styles.rackFront, left: styles.rackSide }}
          faces={{
            front: (
              <div className={styles.rackBays} data-state={step.nodes.web}>
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className={styles.rackBay}>
                    <span className={styles.led} style={{ animationDelay: `${i * 170}ms` }} />
                    <span className={styles.led} data-alt style={{ animationDelay: `${i * 90 + 300}ms` }} />
                  </div>
                ))}
              </div>
            ),
          }}
        />
        <Box x={546} y={112} w={40} d={46} h={46} color="#3a414f" />

        {/* ---------- データの小包 ---------- */}
        <div ref={packetRef} className={styles.obj} data-testid="diorama-packet">
          <Box
            x={-16}
            y={-11}
            w={32}
            d={22}
            h={16}
            color={capsule.state === "encrypted" ? "#0f9f76" : "#fbf4e2"}
            className={styles.packet}
            faceClass={{ top: styles.packetTop }}
            faces={{
              top: <span className={styles.packetIcon}>{capsule.state === "encrypted" ? "🔒" : capsule.state === "decrypted" ? "✓" : "✉"}</span>,
            }}
          />
        </div>
      </div>

      {/* ---------- 投影した HTML ラベル（先に置いたものが優先） ---------- */}
      <div className={styles.anchor} data-anchor="packet" data-dz={step.stop === "desk" ? 8 : 0} data-place={step.stop === "desk" ? "right" : "below"}>
        <div className={styles.packetLabel} data-state={capsule.state} data-testid="diorama-packet-label">
          <span className={styles.packetTag}>{capsule.tag}</span>
          <span className={styles.packetBody}>{capsule.body}</span>
        </div>
      </div>

      {https && index > 0 && (
        <div className={styles.anchor} data-anchor="world" data-wx={along(0.72, 0).x} data-wy={along(0.72, 0).y} data-wz={34} data-place="above">
          <span className={styles.tlsBadge}>TLS 暗号化トンネル</span>
        </div>
      )}

      {eveSees !== null && (
        <div className={styles.anchor} data-anchor="world" data-wx={334} data-wy={64} data-wz={104}>
          <div className={styles.eveBubble} data-mode={mode} role="status" data-testid="diorama-eve-bubble">
            <span className={styles.eveBubbleTitle}>😈 盗聴者の画面</span>
            <span className={styles.eveBubbleBody}>{eveSees}</span>
            <span className={styles.eveBubbleVerdict}>{https ? "読めない…" : "読めた！"}</span>
          </div>
        </div>
      )}

      {LABELS.filter((label) => !(label.id === "eve" && eveSees !== null)).map((label) => {
        const state = step.nodes[label.id as keyof typeof step.nodes];
        const status = STATUS[label.id][state];
        return (
          <div
            key={label.id}
            className={styles.anchor}
            data-anchor="world"
            data-wx={label.at.x}
            data-wy={label.at.y}
            data-wz={label.at.z}
            data-place={label.place}
            data-optional
          >
            <div className={styles.nameChip} data-state={state}>
              <b>{label.name}</b>
              {status && <span className={styles.statusChip}>{status}</span>}
              <span className={styles.nameSub}>{label.sub}</span>
            </div>
          </div>
        );
      })}

      <span className={styles.urlPlate} data-mode={mode} data-obstacle>
        {https ? "https://  🔒" : "http://  ⚠︎"}
      </span>
      <div className={styles.viewHint} data-obstacle>
        {moved ? (
          <button type="button" onClick={resetView} className={styles.resetButton}>
            視点をもどす
          </button>
        ) : (
          <span>⟲ ドラッグで回転</span>
        )}
      </div>
    </div>
  );
}

/** 後ろから見た、椅子に座ってノートPCに向かう人 */
function UserFromBehind() {
  return (
    <svg viewBox="0 0 82 112" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dio-hoodie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f86e8" />
          <stop offset="1" stopColor="#2c5fc4" />
        </linearGradient>
        <radialGradient id="dio-hair" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#5a4033" />
          <stop offset="1" stopColor="#2e2019" />
        </radialGradient>
      </defs>
      {/* 椅子の脚 */}
      <rect x="38" y="90" width="6" height="14" rx="2" fill="#3a3f4b" />
      <ellipse cx="41" cy="106" rx="20" ry="5" fill="#2c313c" />
      {/* 体（肩〜背中） */}
      <path d="M12 74 C 12 54, 22 44, 41 44 C 60 44, 70 54, 70 74 L 70 86 L 12 86 Z" fill="url(#dio-hoodie)" />
      <path d="M30 46 C 34 54, 48 54, 52 46" stroke="#2350a8" strokeWidth="2" fill="none" />
      {/* 椅子の背もたれ（体の手前） */}
      <rect x="18" y="62" width="46" height="32" rx="9" fill="#343a46" />
      <rect x="22" y="66" width="38" height="4" rx="2" fill="#4a5160" />
      {/* 首と頭（後頭部） */}
      <rect x="35" y="36" width="12" height="10" rx="4" fill="#e7b995" />
      <ellipse cx="25.5" cy="28" rx="3" ry="4.5" fill="#e7b995" />
      <ellipse cx="56.5" cy="28" rx="3" ry="4.5" fill="#e7b995" />
      <ellipse cx="41" cy="24" rx="15.5" ry="17" fill="url(#dio-hair)" />
      <path d="M30 12 C 36 8, 46 8, 52 12" stroke="#6b4c3d" strokeWidth="1.6" fill="none" opacity="0.7" />
    </svg>
  );
}

/** 立ってモニターを見張る盗聴者（フード＋ヘッドホン） */
function EavesdropperStanding({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 62 118" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="dio-eve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b5160" />
          <stop offset="1" stopColor="#2a2e38" />
        </linearGradient>
      </defs>
      {/* 脚 */}
      <rect x="20" y="78" width="9" height="34" rx="3" fill="#232733" />
      <rect x="33" y="78" width="9" height="34" rx="3" fill="#232733" />
      <ellipse cx="24" cy="113" rx="7" ry="3" fill="#15171d" />
      <ellipse cx="38" cy="113" rx="7" ry="3" fill="#15171d" />
      {/* 胴（パーカー） */}
      <path d="M12 50 C 12 38, 20 32, 31 32 C 42 32, 50 38, 50 50 L 52 84 L 10 84 Z" fill="url(#dio-eve)" />
      {/* 腕組み */}
      <path d="M14 58 C 22 66, 40 66, 48 58 L 48 66 C 40 72, 22 72, 14 66 Z" fill="#3a3f4c" />
      {/* フード＋顔 */}
      <path d="M13 26 C 13 10, 22 3, 31 3 C 40 3, 49 10, 49 26 C 49 36, 42 42, 31 42 C 20 42, 13 36, 13 26 Z" fill="#3d4250" />
      <ellipse cx="31" cy="26" rx="11" ry="12" fill="#e2b18f" />
      <path d="M20 22 C 24 14, 38 14, 42 22 L 42 18 C 38 10, 24 10, 20 18 Z" fill="#2a2e38" />
      {/* 目（盗聴中は光る） */}
      <ellipse cx="26.5" cy="26" rx="1.8" ry={active ? 1.2 : 1.8} fill="#1b1d23" />
      <ellipse cx="35.5" cy="26" rx="1.8" ry={active ? 1.2 : 1.8} fill="#1b1d23" />
      <path d="M27 34 C 30 35.5, 32 35.5, 35 34" stroke="#9a6a50" strokeWidth="1.3" fill="none" />
      {/* ヘッドホン */}
      <path d="M16 24 C 16 10, 46 10, 46 24" stroke="#121419" strokeWidth="3" fill="none" />
      <rect x="11.5" y="21" width="7" height="12" rx="3" fill="#121419" />
      <rect x="43.5" y="21" width="7" height="12" rx="3" fill="#121419" />
      <circle cx="15" cy="27" r="1.4" fill={active ? "#f43f5e" : "#6b7280"} />
    </svg>
  );
}
