"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cameraTransform, easeInOutCubic, mixCamera, project, type Camera, type Vec3 } from "./Diorama3D";
import styles from "./dioramaStage.module.css";

// CSS 3D ジオラマの「舞台装置」。どのテーマの模型でも同じ仕組みで動かすための共通部品。
//   - カメラ：ステップ（shotKey）が変わるたびに shot へ寄る。ドラッグで視点を回せ、「視点をもどす」で戻る
//   - 動く物（トークン）：<DioramaToken id> を模型の中に置き、tokens[id] で位置を渡す。
//     前へ進んだときだけ path に沿って動き、戻る・飛ばすときは瞬間移動する
//   - ラベル：<DioramaLabel> は 3D の点を画面へ投影した HTML。文字を 3D 面に貼らないので、どの角度でも読める。
//     先に置いたものが優先され、重なるものはずらす（data-optional は置けなければ隠す）
//   - 重さ対策：毎フレームはレイアウトを読まない（ラベルの大きさは描画ごとに1回測る）、
//     繰り返しアニメは transform / opacity だけ、画面外では止める、reduced-motion では動かさない
// 光は左上奥から固定（Diorama3D の面の明るさ）なので、カメラを回しても陰影は破綻しない。

export type TokenSpec = {
  /** 今のステップでの位置。null なら隠す */
  at: Vec3 | null;
  /** 前へ進んだときに通る点の列（最後は at と同じ点）。省略すると at へ直線で動く */
  path?: Vec3[];
  /** 動き出すまでの待ち（ms）。問い合わせ→応答のように順番に動かすとき */
  delay?: number;
  /** 前へ進んでも動かさず、その場へ置く */
  jump?: boolean;
  /** 直前まで隠れていた物が現れるとき、ここから動き出す（例：回線から分かれるコピー） */
  start?: Vec3;
};

export type LabelPlace = "above" | "below" | "left" | "right";

type Rect = { l: number; t: number; r: number; b: number };

export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
});

export function pathLength(points: Vec3[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    total += Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
  }
  return total;
}

export function pointOnPath(points: Vec3[], t: number): Vec3 {
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

const samePoint = (a: Vec3 | null, b: Vec3 | null) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && (a.z ?? 0) === (b.z ?? 0));

/** 模型の中で動く物（小包・鍵・書類など）。位置は DioramaStage の tokens[id] が決める。 */
export function DioramaToken({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.token} ${className ?? ""}`} data-token={id} style={{ visibility: "hidden" }}>
      {children}
    </div>
  );
}

/** 3D の点（at）か動く物（token）に貼り付ける HTML ラベル。 */
export function DioramaLabel({
  at,
  token,
  place = "above",
  dz = 0,
  optional = false,
  interactive = false,
  children,
  testId,
}: {
  at?: Vec3;
  token?: string;
  place?: LabelPlace;
  /** 点からの持ち上げ（ワールドの z） */
  dz?: number;
  /** 置き場所がなければ隠してよい（名札など）。主役の説明は false のまま */
  optional?: boolean;
  /** 中にボタンを置く（押せるようにし、ドラッグの開始点にしない） */
  interactive?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className={styles.anchor}
      style={interactive ? { pointerEvents: "auto" } : undefined}
      data-no-drag={interactive ? "" : undefined}
      data-anchor={token ? `token:${token}` : "world"}
      data-wx={at?.x}
      data-wy={at?.y}
      data-wz={at?.z ?? 0}
      data-dz={dz}
      data-place={place}
      data-optional={optional ? "" : undefined}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

/** 3D の機器に付ける名札。状態（入力中・停止など）は小さなチップで添える。 */
export function NameChip({
  name,
  sub,
  status,
  tone = "info",
}: {
  name: ReactNode;
  sub?: ReactNode;
  status?: ReactNode;
  tone?: "info" | "ok" | "danger" | "warn" | "muted";
}) {
  return (
    <div className={styles.nameChip} data-tone={tone}>
      <b>{name}</b>
      {status && <span className={styles.statusChip}>{status}</span>}
      {sub && <span className={styles.nameSub}>{sub}</span>}
    </div>
  );
}

/** 動く物に添える中身の札（平文・暗号文・値など）。 */
export function DataTag({
  tag,
  body,
  tone = "plain",
  label,
}: {
  tag: ReactNode;
  body?: ReactNode;
  tone?: "plain" | "secure" | "ok" | "danger" | "info";
  label?: string;
}) {
  return (
    <div className={styles.dataTag} data-tone={tone} role={label ? "img" : undefined} aria-label={label}>
      <span className={styles.dataTagHead}>{tag}</span>
      {body !== undefined && <span className={styles.dataTagBody}>{body}</span>}
    </div>
  );
}

/** 起きた結果を短く言い切る吹き出し（「読めた！」「到達できない」など）。 */
export function Callout({
  title,
  body,
  verdict,
  tone = "danger",
  testId,
  role,
}: {
  title?: ReactNode;
  body?: ReactNode;
  verdict?: ReactNode;
  tone?: "danger" | "ok" | "muted" | "info";
  testId?: string;
  role?: string;
}) {
  return (
    <div className={styles.callout} data-tone={tone} data-testid={testId} role={role}>
      {title && <span className={styles.calloutTitle}>{title}</span>}
      {body && <span className={styles.calloutBody}>{body}</span>}
      {verdict && <span className={styles.calloutVerdict}>{verdict}</span>}
    </div>
  );
}

/** 経路や範囲に付ける丸いバッジ（「TLS 暗号化トンネル」「VPN」など）。 */
export function Badge({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "danger" | "info" | "warn" | "muted" }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}

export function DioramaStage({
  shot,
  shotKey,
  forward,
  reducedMotion,
  tokens = {},
  world,
  labels,
  corner,
  testId,
  ariaLabel,
  aspect = "20 / 16",
  aspectMobile = "1 / 1",
  baseWidth = 640,
  dataAttrs,
  className,
  pitchRange = [18, 78],
  onFrame,
  after,
}: {
  /** 今のステップのカメラ */
  shot: Camera;
  /** これが変わるとカメラ・トークンが動く（例：`${mode}-${index}`） */
  shotKey: string | number;
  forward: boolean;
  reducedMotion: boolean;
  tokens?: Record<string, TokenSpec>;
  /** 模型（Box / Cylinder / Billboard / DioramaToken など） */
  world: ReactNode;
  /** 投影ラベル（DioramaLabel）。先に書いたものほど優先 */
  labels?: ReactNode;
  /** 右上の固定札（URL・モードなど）。ラベルはここを避ける */
  corner?: ReactNode;
  testId?: string;
  ariaLabel: string;
  aspect?: string;
  /** 幅 480px 以下での縦横比 */
  aspectMobile?: string;
  /** 模型を組んだ基準の幅。ステージの幅 / baseWidth で拡大縮小する */
  baseWidth?: number;
  dataAttrs?: Record<`data-${string}`, string>;
  className?: string;
  pitchRange?: [number, number];
  /** 毎回の描画の最後に呼ぶ（投影した点に何かを重ねたいとき） */
  onFrame?: (ctx: { project: (p: Vec3) => { x: number; y: number }; width: number; height: number }) => void;
  /** ステージの下に置くもの */
  after?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const size = useRef({ w: baseWidth, h: baseWidth * 0.8, fit: 1, perspective: 1400 });
  const drag = useRef({ yaw: 0, pitch: 0 });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const [visible, setVisible] = useState(true);

  const withDrag = (s: Camera): Camera => ({
    ...s,
    yaw: s.yaw + drag.current.yaw,
    pitch: Math.max(pitchRange[0], Math.min(pitchRange[1], s.pitch + drag.current.pitch)),
  });

  const cam = useRef<Camera>(shot);
  // 最新の props を毎フレームの処理から読むための控え（描画のたびに、他の effect より先に更新する）
  const latest = useRef({ shot, tokens, onFrame });
  useLayoutEffect(() => {
    latest.current = { shot, tokens, onFrame };
  });
  const pos = useRef<Record<string, Vec3 | null>>(
    Object.fromEntries(Object.entries(tokens).map(([id, t]) => [id, t.at])),
  );

  type Anchor = { el: HTMLElement; w: number; h: number; shown: boolean | null };
  const layout = useRef<{
    anchors: Anchor[];
    obstacles: Rect[];
    billboards: HTMLElement[];
    tokens: Map<string, HTMLElement>;
  }>({ anchors: [], obstacles: [], billboards: [], tokens: new Map() });

  const measureLayout = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const box = stage.getBoundingClientRect();
    layout.current = {
      anchors: Array.from(stage.querySelectorAll<HTMLElement>("[data-anchor]")).map((el) => ({
        el,
        w: el.offsetWidth,
        h: el.offsetHeight,
        shown: null,
      })),
      obstacles: Array.from(stage.querySelectorAll<HTMLElement>("[data-obstacle]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top };
      }),
      billboards: Array.from(stage.querySelectorAll<HTMLElement>("[data-billboard]")),
      tokens: new Map(
        Array.from(stage.querySelectorAll<HTMLElement>("[data-token]")).map((el) => [el.dataset.token ?? "", el]),
      ),
    };
  };

  const apply = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    const { fit, perspective, w: stageW, h: stageH } = size.current;
    const c = cam.current;
    camera.style.transform = cameraTransform(c, fit);
    // 人物などの板はカメラの回転を打ち消してこちらを向ける（CSS 変数だと全要素のスタイル再計算が走るので直接書く）
    const face = `rotateZ(${(-c.yaw).toFixed(3)}deg) rotateX(${(-c.pitch).toFixed(3)}deg)`;
    for (const el of layout.current.billboards) el.style.transform = face;
    for (const [id, el] of layout.current.tokens) {
      const p = pos.current[id];
      el.style.visibility = p ? "visible" : "hidden";
      if (p) el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, ${(p.z ?? 0).toFixed(2)}px)`;
    }

    const toScreen = (p: Vec3) => project(p, c, fit, size.current, perspective);
    const placed: Rect[] = [...layout.current.obstacles];
    const show = (a: Anchor, on: boolean) => {
      if (a.shown === on) return;
      a.shown = on;
      a.el.style.visibility = on ? "visible" : "hidden";
    };
    for (const a of layout.current.anchors) {
      const el = a.el;
      const kind = el.dataset.anchor ?? "world";
      const dz = Number(el.dataset.dz ?? 0);
      const base = kind.startsWith("token:")
        ? pos.current[kind.slice(6)]
        : { x: Number(el.dataset.wx), y: Number(el.dataset.wy), z: Number(el.dataset.wz) };
      if (!base) {
        show(a, false);
        continue;
      }
      const s = toScreen({ ...base, z: (base.z ?? 0) + dz });
      const { w, h } = a;
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
      let rect: Rect | undefined;
      search: for (const k of [0, 1, -1, 2, -2, 3]) {
        for (const m of [0, 0.6, -0.6, 1.2, -1.2]) {
          const r = clamp(left + m * (w + 4), top + away * k * (h + 4));
          if (!hits(r)) {
            rect = r;
            break search;
          }
        }
      }
      if ((optional && (offscreen || !rect)) || (!rect && offscreen)) {
        show(a, false);
        continue;
      }
      const chosen = rect ?? clamp(left, top);
      placed.push(chosen);
      show(a, true);
      el.style.transform = `translate3d(${chosen.l.toFixed(1)}px, ${chosen.t.toFixed(1)}px, 0)`;
    }
    latest.current.onFrame?.({ project: toScreen, width: stageW, height: stageH });
  };

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!stage || !wrap) return;
    const measure = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      size.current = { w, h, fit: w / baseWidth, perspective: Math.max(900, w * 2.4) };
      stage.style.perspective = `${size.current.perspective}px`;
      measureLayout();
      apply();
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseWidth]);

  // 中身（ラベルの文言など）が変わるたびに測り直して置き直す
  useLayoutEffect(() => {
    measureLayout();
    apply();
  });

  // 画面外にいる間は、点滅・電波などの繰り返しアニメーションを止める
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(stage);
    return () => io.disconnect();
  }, []);

  // ステップが同じでも行き先が変わったら動かす（例：応答待ち → タイムアウト）
  const tokenSig = Object.entries(tokens)
    .map(([id, t]) => `${id}:${t.at ? `${t.at.x},${t.at.y},${t.at.z ?? 0}` : "-"}`)
    .join("|");

  useEffect(() => {
    const fromCam = cam.current;
    const toCam = withDrag(latest.current.shot);
    const specs = latest.current.tokens;
    const posMap = pos.current;
    const settle = () => {
      for (const [id, t] of Object.entries(specs)) posMap[id] = t.at;
    };
    if (reducedMotion) {
      cam.current = toCam;
      settle();
      apply();
      return;
    }
    // 前へ進んだときだけ経路に沿って動かす（戻る・飛ばすときは瞬間移動）
    const moves = Object.entries(specs).map(([id, t]) => {
      const from = posMap[id] ?? (t.start && t.at ? t.start : null);
      const to = t.at;
      const travel = forward && !t.jump && from && to && !samePoint(from, to);
      const path = travel ? (t.path && t.path.length > 0 ? [from, ...t.path] : [from, to]) : null;
      if (!travel) posMap[id] = to;
      else posMap[id] = from;
      const delay = 150 + (t.delay ?? 0);
      const ms = path ? 900 + pathLength(path) * 2.6 : 0;
      return { id, to, path, delay, ms };
    });
    // 動かない物（現れる・消える・瞬間移動）は、次のフレームを待たずにすぐ置く
    apply();
    const camMs = 1500;
    const total = Math.max(camMs, ...moves.map((m) => (m.path ? m.delay + m.ms : 0)));
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      cam.current = mixCamera(fromCam, toCam, easeInOutCubic(Math.min(1, elapsed / camMs)));
      for (const m of moves) {
        if (!m.path) continue;
        const t = Math.min(1, Math.max(0, (elapsed - m.delay) / m.ms));
        posMap[m.id] = t >= 1 ? m.to : pointOnPath(m.path, easeInOutCubic(t));
      }
      apply();
      if (elapsed < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // 途中で次のステップへ移ったときは、動いていた物を行き先に置いてから次を始める
      for (const m of moves) posMap[m.id] = m.to;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotKey, reducedMotion, tokenSig]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, select, [data-no-drag]")) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
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
    cam.current = withDrag(latest.current.shot);
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
    const toCam = withDrag(latest.current.shot);
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

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={stageRef}
        className={`${styles.stage} ${className ?? ""}`}
        style={{ "--aspect": aspect, "--aspect-mobile": aspectMobile } as CSSProperties}
        data-testid={testId}
        data-dragging={dragging ? "true" : "false"}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-paused={visible ? "false" : "true"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={ariaLabel}
        {...dataAttrs}
      >
        <div ref={cameraRef} className={styles.camera}>
          {world}
        </div>
        {labels}
        {corner && (
          <div className={styles.corner} data-obstacle>
            {corner}
          </div>
        )}
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
      {after}
    </div>
  );
}
