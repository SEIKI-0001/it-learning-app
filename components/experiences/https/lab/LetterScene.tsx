"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { HttpsCapsuleStop } from "../HttpsScene";
import type { LabSceneProps } from "./labTypes";
import styles from "./letter.module.css";
import Icon from "@/components/ui/Icon";

// パターンC：ハガキと封筒。
// 冒頭のたとえ（HTTP＝ハガキ／HTTPS＝封筒に入れた手紙）をそのまま街のイラストにする。
// あなたの家 → 道 → Webサーバのビル。道ばたの茂みに盗聴者が隠れ、虫めがねで荷物をのぞく。
// 配達員は道のカーブに沿って走り（rAF で経路追従）、運ぶ物だけが HTTP / HTTPS で変わる。

const W = 400;
const H = 250;

// 道（3次ベジェ）。配達員はこの上を走る。
const ROAD = { p0: { x: 84, y: 206 }, p1: { x: 150, y: 244 }, p2: { x: 246, y: 150 }, p3: { x: 318, y: 190 } };
const ROAD_D = `M ${ROAD.p0.x} ${ROAD.p0.y} C ${ROAD.p1.x} ${ROAD.p1.y}, ${ROAD.p2.x} ${ROAD.p2.y}, ${ROAD.p3.x} ${ROAD.p3.y}`;

function roadAt(t: number) {
  const u = 1 - t;
  const { p0, p1, p2, p3 } = ROAD;
  const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
  const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const STOP_T: Record<HttpsCapsuleStop, number> = { desk: 0, out: 0.14, middle: 0.5, arrived: 1 };

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function LetterScene({ mode, index, step, plain, cipher, forward, reducedMotion }: LabSceneProps) {
  const https = mode === "https";
  const courierRef = useRef<SVGGElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useRef(STOP_T[step.stop]);

  const place = (value: number, moving: boolean) => {
    const p = roadAt(value);
    const tilt = Math.max(-18, Math.min(18, p.angle));
    courierRef.current?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${tilt.toFixed(1)})`);
    if (itemRef.current) {
      itemRef.current.style.left = `${(p.x / W) * 100}%`;
      itemRef.current.style.top = `${((p.y - 32) / H) * 100}%`;
    }
    rootRef.current?.setAttribute("data-moving", moving ? "true" : "false");
  };

  useLayoutEffect(() => {
    place(t.current, false);
  }, []);

  useEffect(() => {
    const from = t.current;
    const to = STOP_T[step.stop];
    if (reducedMotion || !forward || from === to) {
      t.current = to;
      place(to, false);
      return;
    }
    const start = performance.now();
    // 封をする間（HTTPS の送り出し）は少し待ってから走り出す
    const delay = https && step.stop === "out" ? 900 : 150;
    const duration = 1500 + Math.abs(to - from) * 1200;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start - delay) / duration));
      t.current = from + (to - from) * ease(k);
      place(t.current, k > 0 && k < 1);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reducedMotion]);

  const item = !https ? "card" : step.stop === "desk" ? "card" : step.stop === "arrived" ? "opened" : "envelope";
  const peeking = step.intercepted;

  return (
    <div
      ref={rootRef}
      className={styles.scene}
      data-mode={mode}
      data-step={index}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="letter-scene"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={
        https
          ? "あなたの家からWebサーバのビルへ、配達員が封をした手紙を運ぶ。道ばたの茂みから盗聴者が虫めがねでのぞいている"
          : "あなたの家からWebサーバのビルへ、配達員がハガキを運ぶ。道ばたの茂みから盗聴者が虫めがねでのぞいている"
      }>
        <defs>
          <linearGradient id="lt-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fd3fb" />
            <stop offset="0.55" stopColor="#dff1fd" />
            <stop offset="1" stopColor="#fff4e0" />
          </linearGradient>
          <radialGradient id="lt-sun">
            <stop offset="0" stopColor="#fff7d1" />
            <stop offset="0.45" stopColor="#ffe28a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe28a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lt-hill-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfe3c0" />
            <stop offset="1" stopColor="#a9d8ae" />
          </linearGradient>
          <linearGradient id="lt-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9bd394" />
            <stop offset="1" stopColor="#6fb86c" />
          </linearGradient>
          <linearGradient id="lt-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6fa8e8" />
            <stop offset="0.5" stopColor="#3f7fd0" />
            <stop offset="1" stopColor="#2c5ea8" />
          </linearGradient>
          <linearGradient id="lt-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ef7d5b" />
            <stop offset="1" stopColor="#d95c3d" />
          </linearGradient>
          <filter id="lt-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* 空・太陽・雲 */}
        <rect width={W} height={H} fill="url(#lt-sky)" />
        <circle cx="336" cy="42" r="34" fill="url(#lt-sun)" />
        <circle cx="336" cy="42" r="12" fill="#fff3bf" />
        <g className={styles.cloudA}>
          <Cloud x={60} y={36} s={1} />
        </g>
        <g className={styles.cloudB}>
          <Cloud x={220} y={24} s={0.75} />
        </g>

        {/* 丘 */}
        <path d="M0 132 C 60 104, 120 118, 180 110 C 240 102, 300 92, 400 112 L 400 250 L 0 250 Z" fill="url(#lt-hill-far)" />
        <path d="M0 150 C 80 132, 150 150, 230 140 C 300 132, 350 138, 400 146 L 400 250 L 0 250 Z" fill="url(#lt-ground)" />

        {/* 道 */}
        <path d={ROAD_D} stroke="#b9a98f" strokeWidth="25" fill="none" strokeLinecap="round" opacity="0.5" transform="translate(0 3)" />
        <path d={ROAD_D} stroke="#e9dcc3" strokeWidth="24" fill="none" strokeLinecap="round" />
        <path d={ROAD_D} stroke="#ffffff" strokeWidth="1.6" strokeDasharray="7 7" fill="none" opacity="0.9" />

        {/* 木と茂み（盗聴者の隠れ場所） */}
        <ellipse cx="206" cy="176" rx="34" ry="5" fill="#2f6b3a" opacity="0.25" filter="url(#lt-soft)" />
        <rect x="222" y="124" width="7" height="42" rx="2" fill="#8a5a3b" />
        <circle cx="225" cy="116" r="22" fill="#4f9e5c" />
        <circle cx="210" cy="124" r="15" fill="#5aae66" />
        <circle cx="240" cy="126" r="14" fill="#468f52" />

        {/* 盗聴者：茂みの陰から虫めがねでのぞく */}
        <g className={styles.eve} data-peek={peeking ? "true" : "false"}>
          <g className={styles.eveBody}>
            <path d="M178 176 C 178 158, 186 150, 196 150 C 206 150, 214 158, 214 176 Z" fill="#3d4250" />
            <circle cx="196" cy="146" r="11" fill="#3d4250" />
            <ellipse cx="197" cy="148" rx="7" ry="7.5" fill="#e2b18f" />
            <path d="M189 144 C 192 139, 202 139, 205 144" stroke="#2a2e38" strokeWidth="3" fill="none" />
            <circle cx="194.5" cy="148.5" r="1.1" fill="#1b1d23" />
            <circle cx="200" cy="148.5" r="1.1" fill="#1b1d23" />
            {/* 虫めがね */}
            <g className={styles.glass}>
              <line x1="206" y1="160" x2="214" y2="168" stroke="#6b4a2f" strokeWidth="3" strokeLinecap="round" />
              <circle cx="202" cy="156" r="6.5" fill="rgba(191,227,255,0.55)" stroke="#9aa3b2" strokeWidth="2" />
            </g>
          </g>
          <text x="214" y="138" className={styles.eveMark}>{https ? "？" : "！"}</text>
        </g>
        {/* 茂み（盗聴者の手前） */}
        <ellipse cx="190" cy="172" rx="24" ry="12" fill="#57a862" />
        <ellipse cx="172" cy="175" rx="13" ry="9" fill="#4d9a58" />
        <ellipse cx="209" cy="175" rx="14" ry="9" fill="#62b36d" />

        {/* あなたの家 */}
        <g>
          <ellipse cx="58" cy="206" rx="46" ry="6" fill="#2f6b3a" opacity="0.22" filter="url(#lt-soft)" />
          <rect x="18" y="146" width="80" height="58" rx="3" fill="#fff6e6" />
          <rect x="18" y="196" width="80" height="8" fill="#ecdcc0" />
          <path d="M10 150 L 58 112 L 106 150 Z" fill="url(#lt-roof)" />
          <rect x="80" y="118" width="10" height="20" fill="#c9533a" />
          {/* 窓：PCに向かうあなた */}
          <rect x="28" y="158" width="36" height="26" rx="3" fill="#bfe3ff" stroke="#e8d7bd" strokeWidth="3" />
          <rect x="40" y="170" width="16" height="10" rx="1.5" fill="#2f3542" />
          <rect x="41.5" y="171.5" width="13" height="7" fill={step.stop === "desk" ? "#8fd0ff" : "#dbeafe"} />
          <circle cx="36" cy="172" r="4.5" fill="#e7b995" />
          <path d="M31 184 C 31 177, 41 177, 41 184 Z" fill="#3b82f6" />
          <path d="M31.5 170 C 32 165, 40 165, 40.5 170" fill="#3a2a22" />
          {/* 玄関と郵便受け */}
          <rect x="72" y="166" width="16" height="30" rx="2" fill="#8a5a3b" />
          <circle cx="84" cy="182" r="1.2" fill="#f4d58d" />
        </g>

        {/* Webサーバのビル */}
        <g>
          <ellipse cx="354" cy="202" rx="48" ry="6" fill="#2f6b3a" opacity="0.22" filter="url(#lt-soft)" />
          <rect x="318" y="84" width="72" height="116" rx="3" fill="#dfe6ef" />
          <rect x="324" y="92" width="60" height="84" rx="2" fill="url(#lt-glass)" />
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 3 }, (_, c) => (
              <rect
                key={`${r}-${c}`}
                x={328 + c * 19}
                y={96 + r * 20}
                width={15}
                height={16}
                rx={1}
                fill="#9cc5f2"
                opacity={0.35 + ((r + c) % 3) * 0.15}
              />
            )),
          )}
          <rect x="330" y="72" width="48" height="14" rx="3" fill="#2463d1" />
          <text x="354" y="82.5" textAnchor="middle" className={styles.sign}>
            Web サーバ
          </text>
          <rect x="342" y="178" width="24" height="22" rx="2" fill="#1f2937" />
          <rect x="344" y="180" width="9" height="20" fill="#374151" />
          <rect x="355" y="180" width="9" height="20" fill="#374151" />
          <circle cx="354" cy="176" r="3" fill={step.stop === "arrived" ? "#34d399" : "#94a3b8"} />
        </g>

        {/* 配達員（スクーター） */}
        <g ref={courierRef}>
          <g className={styles.courier}>
            <ellipse cx="0" cy="3" rx="16" ry="3" fill="#2f3b2a" opacity="0.25" />
            <circle cx="-10" cy="-3" r="5" fill="#1f2937" />
            <circle cx="-10" cy="-3" r="2" fill="#cbd5e1" />
            <circle cx="11" cy="-3" r="5" fill="#1f2937" />
            <circle cx="11" cy="-3" r="2" fill="#cbd5e1" />
            <path d="M-15 -8 C -12 -14, 4 -14, 8 -9 L 14 -9 L 12 -4 L -14 -4 Z" fill={https ? "#10b981" : "#f97316"} />
            <rect x="10" y="-22" width="2.5" height="14" rx="1" fill="#475569" />
            <rect x="8" y="-23" width="8" height="2.5" rx="1" fill="#475569" />
            {/* 乗っている人 */}
            <path d="M-6 -12 L -2 -24 L 4 -24 L 6 -13 Z" fill="#2463d1" />
            <path d="M3 -22 L 11 -20" stroke="#2463d1" strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="-29" r="5" fill="#e7b995" />
            <path d="M-5.5 -30 C -5 -36, 5 -36, 5.5 -30 L 8 -30 L 8 -28.5 L -5.5 -28.5 Z" fill="#1d4892" />
          </g>
        </g>
      </svg>

      {/* 名前札 */}
      <span className={styles.place} style={{ left: `${(58 / W) * 100}%`, top: `${(212 / H) * 100}%` }}>
        あなたの家
      </span>
      <span
        className={styles.place}
        data-tone={step.stop === "arrived" ? "ok" : undefined}
        style={{ right: "3%", top: `${(208 / H) * 100}%`, transform: "none" }}
        data-testid="letter-server-label"
      >
        Webサーバ{step.stop === "arrived" ? " ✓ 受信" : ""}
      </span>
      <span
        className={styles.place}
        data-tone={peeking ? "danger" : undefined}
        style={{ left: `${(176 / W) * 100}%`, top: `${(126 / H) * 100}%` }}
      >
        盗聴者
      </span>

      {/* 運んでいる物（ハガキ／封筒）。配達員の頭上について動く */}
      <div ref={itemRef} className={styles.item} data-item={item} data-testid="letter-item">
        <div className={styles.card}>
          <span className={styles.stamp} aria-hidden>
            〒
          </span>
          <span className={styles.cardTo}>宛先：shop.example</span>
          <span className={styles.cardText}>{plain}</span>
        </div>
        <div className={styles.envelope} aria-hidden={item === "card"}>
          <span className={styles.flap} />
          <span className={styles.seal}>
            <Icon name="lock" className="h-3 w-3" />
          </span>
          <span className={styles.envelopeNote}>{item === "opened" ? "開封（復号）" : "TLS で封"}</span>
        </div>
      </div>

      {/* 盗聴者の虫めがね（拡大図） */}
      {peeking && (
        <div className={styles.lens} data-mode={mode} role="status" data-testid="letter-lens">
          <span className={styles.lensTitle}>盗聴者の目</span>
          {https ? (
            <>
              <span className={styles.lensEnvelope} aria-hidden>
                <Icon name="mail" className="inline h-5 w-5" />
                <Icon name="lock" className="inline h-5 w-5" />
              </span>
              <span className={styles.lensCipher}>{cipher.slice(0, 19) || "…"}</span>
              <span className={styles.lensVerdict}>読めない…</span>
            </>
          ) : (
            <>
              <span className={styles.lensText}>{plain}</span>
              <span className={styles.lensVerdict}>読めた！</span>
            </>
          )}
        </div>
      )}

      <span className={styles.modePlate} data-mode={mode}>
        {https ? "HTTPS ＝ 封筒" : "HTTP ＝ ハガキ"}
      </span>
    </div>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff" opacity="0.92">
      <ellipse cx="0" cy="8" rx="26" ry="9" />
      <circle cx="-8" cy="2" r="10" />
      <circle cx="8" cy="-1" r="13" />
      <circle cx="21" cy="5" r="8" />
    </g>
  );
}
