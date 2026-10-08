"use client";

import type { CSSProperties, ReactNode } from "react";
import type { HttpsCapsuleStop } from "../HttpsScene";
import type { LabSceneProps } from "./labTypes";
import styles from "./isocafe.module.css";
import { InlineIcon } from "@/components/ui/Pictogram";

// パターンD：現行の 2.5D（アイソメトリック SVG）の見せ方のまま、舞台と描き込みをアップグレード。
// 舞台はフリーWi-Fi のカフェ：あなたの席 →（電波）→ 壁のフリーWi-Fi →（インターネット）→ 右上のデータセンター。
// 隣の席の盗聴者は、同じ電波を受信機付きのノートPCで拾う。
// 面ごとの陰影・床に落ちるやわらかい影・窓からの光・広がる電波の輪で、平面の図より「場所」に見せる。

const W = 400;
const H = 300;
const O = { x: 175, y: 112 };

type Pt = { x: number; y: number };

/** ワールド座標（x=右奥へ、y=左手前へ、z=上）→ SVG 座標 */
function P(x: number, y: number, z = 0): Pt {
  return { x: O.x + (x - y) * 0.866, y: O.y + (x + y) * 0.5 - z };
}

function pts(list: Pt[]) {
  return list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

const pct = (p: Pt): CSSProperties => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` });
const mix = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** 直方体（見える3面：上・手前左 y=y1・手前右 x=x1） */
function IsoBox({
  x0,
  x1,
  y0,
  y1,
  z0 = 0,
  z1,
  top,
  left,
  right,
  stroke,
}: {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0?: number;
  z1: number;
  top: string;
  left: string;
  right: string;
  stroke?: string;
}) {
  return (
    <g>
      <polygon points={pts([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)])} fill={left} />
      <polygon points={pts([P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)])} fill={right} />
      <polygon
        points={pts([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)])}
        fill={top}
        stroke={stroke}
        strokeWidth={stroke ? 0.5 : undefined}
      />
    </g>
  );
}

/** 床に置いた円（アイソメでは楕円） */
function isoCircle(c: Pt, r: number) {
  return { cx: c.x, cy: c.y, rx: r * 1.2247, ry: r * 0.7071 };
}

/** y=一定の面（手前左向き）に貼る：u=+x 方向、v=下 */
function onYPlane(x: number, y: number, z: number, children: ReactNode) {
  const o = P(x, y, z);
  return <g transform={`matrix(0.866 0.5 0 1 ${o.x.toFixed(2)} ${o.y.toFixed(2)})`}>{children}</g>;
}

/** x=一定の面（手前右向き）に貼る：u=-y 方向、v=下 */
function onXPlane(x: number, y: number, z: number, children: ReactNode) {
  const o = P(x, y, z);
  return <g transform={`matrix(0.866 -0.5 0 1 ${o.x.toFixed(2)} ${o.y.toFixed(2)})`}>{children}</g>;
}

function RoundTable({ at, r = 17, children }: { at: { x: number; y: number }; r?: number; children?: ReactNode }) {
  const top = P(at.x, at.y, 26);
  const foot = P(at.x, at.y, 0);
  return (
    <g>
      <ellipse {...isoCircle(foot, r * 0.9)} fill="#3b2a1d" opacity={0.22} filter="url(#ic-blur)" />
      <rect x={foot.x - 1.6} y={top.y} width={3.2} height={foot.y - top.y} fill="#3f444e" />
      <ellipse {...isoCircle(foot, 6)} fill="#3f444e" />
      <ellipse {...isoCircle({ x: top.x, y: top.y + 2 }, r)} fill="#9c7048" />
      <ellipse {...isoCircle(top, r)} fill="url(#ic-table)" />
      {children}
    </g>
  );
}

// 主要な点
const LAPTOP = P(61, 112, 38);
const ROUTER = P(120, 0, 44);
const EVE_PC = P(128, 84, 36);
const DC = { x: 342, y: 58 };
const RACK_TOP = { x: DC.x, y: DC.y - 30 };

const PACKET_AT: Record<HttpsCapsuleStop, Pt> = {
  desk: { x: LAPTOP.x + 4, y: LAPTOP.y - 18 },
  out: mix(LAPTOP, ROUTER, 0.3),
  middle: mix(LAPTOP, ROUTER, 0.62),
  arrived: { x: RACK_TOP.x, y: RACK_TOP.y - 6 },
};

export function IsoCafeScene({ mode, index, step, plain, cipher, reducedMotion }: LabSceneProps) {
  const https = mode === "https";
  const radio = index === 1 || index === 2;
  const tone = https ? "#10b981" : "#f43f5e";
  const packetState =
    !https || step.stop === "desk" ? "plain" : step.stop === "arrived" ? "decrypted" : "encrypted";
  const packetTag =
    packetState === "plain" ? (https ? "入力（まだPCの中）" : "平文（HTTP）") : packetState === "decrypted" ? "サーバで復号" : "ENCRYPTED DATA";
  const packetBody =
    packetState === "encrypted" ? (cipher.length > 14 ? `${cipher.slice(0, 14)}…` : cipher || "…") : plain;
  const eveSees = step.intercepted ? (https ? cipher || "…" : plain) : null;
  const packet = PACKET_AT[step.stop];

  // 床と壁の角
  const f = { a: P(0, 0), b: P(180, 0), c: P(180, 170), d: P(0, 170) };
  const wallH = 64;
  const up = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y - h });
  const down = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y + h });

  return (
    <div
      className={styles.scene}
      data-mode={mode}
      data-step={index}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      style={{ "--tone": tone } as CSSProperties}
      data-testid="isocafe-scene"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label={
          https
            ? "カフェの模型。あなたのノートPCからフリーWi-Fiを通り、右上のデータセンターまで緑の暗号のトンネルが続く。隣の席の盗聴者も電波を受け取っている"
            : "カフェの模型。あなたのノートPCの電波は壁のフリーWi-Fiだけでなく、隣の席の盗聴者にも届いている"
        }
      >
        <defs>
          <linearGradient id="ic-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f7fb" />
            <stop offset="1" stopColor="#e3e8f0" />
          </linearGradient>
          <linearGradient id="ic-floor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9b58b" />
            <stop offset="1" stopColor="#c49a6c" />
          </linearGradient>
          <linearGradient id="ic-wall-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7f1e7" />
            <stop offset="1" stopColor="#eadfcd" />
          </linearGradient>
          <linearGradient id="ic-wall-r" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf7f0" />
            <stop offset="1" stopColor="#f0e6d6" />
          </linearGradient>
          <linearGradient id="ic-table" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e2bb90" />
            <stop offset="1" stopColor="#c89a6c" />
          </linearGradient>
          <linearGradient id="ic-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fc0ef" />
            <stop offset="1" stopColor="#e3f1fc" />
          </linearGradient>
          <linearGradient id="ic-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff8e1" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff8e1" stopOpacity="0" />
          </linearGradient>
          <filter id="ic-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <filter id="ic-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#ic-bg)" />

        {/* ---------- 床（木の床・厚み付き） ---------- */}
        <polygon points={pts([f.d, f.c, down(f.c, 8), down(f.d, 8)])} fill="#8f6a47" />
        <polygon points={pts([f.c, f.b, down(f.b, 8), down(f.c, 8)])} fill="#7a5a3c" />
        <polygon points={pts([f.a, f.b, f.c, f.d])} fill="url(#ic-floor)" />
        <g stroke="#a47a52" strokeWidth={0.5} opacity={0.55}>
          {Array.from({ length: 16 }, (_, i) => {
            const y = 10 + i * 10;
            const a = P(0, y);
            const b = P(180, y);
            return <line key={y} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>

        {/* ---------- 壁 ---------- */}
        <polygon points={pts([f.a, f.d, up(f.d, wallH), up(f.a, wallH)])} fill="url(#ic-wall-l)" />
        <polygon points={pts([f.a, f.b, up(f.b, wallH), up(f.a, wallH)])} fill="url(#ic-wall-r)" />
        <polygon points={pts([up(f.d, wallH), up(f.a, wallH), up(f.b, wallH), up(f.b, wallH + 3), up(f.a, wallH + 3), up(f.d, wallH + 3)])} fill="#d8c8b0" />
        {/* 幅木 */}
        <polygon points={pts([f.a, f.d, up(f.d, 4), up(f.a, 4)])} fill="#d3bfa1" />
        <polygon points={pts([f.a, f.b, up(f.b, 4), up(f.a, 4)])} fill="#dccab0" />

        {/* 窓（右の壁）と、床に落ちる光 */}
        {onYPlane(18, 0, 54, (
          <g>
            <rect x={0} y={0} width={56} height={32} rx={1.5} fill="#ffffff" />
            <rect x={2.5} y={2.5} width={51} height={27} fill="url(#ic-sky)" />
            <rect x={27} y={2.5} width={2} height={27} fill="#ffffff" />
            <path d="M6 22 L 14 14 L 20 20 L 26 12 L 26 29.5 L 6 29.5 Z" fill="#b9d7f2" opacity={0.7} />
          </g>
        ))}
        <polygon points={pts([P(18, 0, 22), P(74, 0, 22), P(92, 62, 0), P(36, 62, 0)])} fill="url(#ic-light)" />

        {/* メニューボード（左の壁） */}
        {onXPlane(0, 128, 56, (
          <g>
            <rect x={0} y={0} width={62} height={24} rx={1.5} fill="#8a6a4a" />
            <rect x={2} y={2} width={58} height={20} fill="#2f3a33" />
            <text x={31} y={10} textAnchor="middle" className={styles.chalkTitle}>
              CAFE MENU
            </text>
            <text x={31} y={17.5} textAnchor="middle" className={styles.chalkText}>
              ブレンド 450 ／ ラテ 520
            </text>
          </g>
        ))}

        {/* フリーWi-Fi の案内（右の壁） */}
        {onYPlane(96, 0, 32, (
          <g>
            <rect x={0} y={0} width={46} height={13} rx={2} fill="#ffffff" stroke="#2563eb" strokeWidth={0.9} />
            <text x={23} y={6} textAnchor="middle" className={styles.signTitle}>
              FREE Wi-Fi
            </text>
            <text x={23} y={10.5} textAnchor="middle" className={styles.signText}>
              CAFE_FREE ／ パスワードなし
            </text>
          </g>
        ))}

        {/* ---------- カウンター ---------- */}
        <polygon points={pts([P(24, 20), P(24, 104), P(34, 104), P(34, 20)])} fill="#3b2a1d" opacity={0.18} filter="url(#ic-blur)" />
        <IsoBox x0={0} x1={24} y0={18} y1={104} z1={30} top="#efe9df" left="#8a5f3e" right="#6f4c31" />
        <IsoBox x0={4} x1={18} y0={70} y1={86} z0={30} z1={45} top="#dfe4ea" left="#b4bcc7" right="#98a2b0" />
        <IsoBox x0={6} x1={12} y0={40} y1={46} z0={30} z1={35} top="#ffffff" left="#e5e7eb" right="#d1d5db" />
        <IsoBox x0={6} x1={12} y0={50} y1={56} z0={30} z1={35} top="#ffffff" left="#e5e7eb" right="#d1d5db" />

        {/* 観葉植物 */}
        <g>
          <ellipse {...isoCircle(P(165, 14), 9)} fill="#3b2a1d" opacity={0.2} filter="url(#ic-blur)" />
          <IsoBox x0={158} x1={172} y0={8} y1={22} z1={14} top="#8a4d31" left="#c46f45" right="#a95a37" />
          {(() => {
            const b = P(165, 15, 14);
            return (
              <g transform={`translate(${b.x} ${b.y})`}>
                <path d="M0 0 C -6 -10, -14 -12, -16 -22 C -8 -20, -3 -12, 0 0 Z" fill="#3f8f5a" />
                <path d="M0 0 C 6 -12, 14 -14, 16 -24 C 8 -20, 3 -12, 0 0 Z" fill="#4fa56b" />
                <path d="M0 0 C -2 -12, -2 -22, 1 -30 C 4 -22, 3 -12, 0 0 Z" fill="#5bb879" />
              </g>
            );
          })()}
        </g>

        {/* ---------- 壁のフリーWi-Fi（アクセスポイント）とインターネットへの線 ---------- */}
        <path
          d={`M ${ROUTER.x} ${ROUTER.y - 4} L ${ROUTER.x} ${ROUTER.y - 22} C ${ROUTER.x + 4} ${ROUTER.y - 56}, ${DC.x - 36} ${DC.y + 6}, ${RACK_TOP.x - 6} ${RACK_TOP.y + 8}`}
          className={styles.internet}
          data-active={step.stop === "arrived" || index === 2 ? "true" : "false"}
        />
        <g className={styles.router} data-active={radio ? "true" : "false"}>
          {onYPlane(110, 0, 48, (
            <g>
              <rect x={0} y={0} width={20} height={7} rx={1.5} fill="#f1f4f8" stroke="#c5ceda" strokeWidth={0.5} />
              <circle cx={16} cy={3.5} r={1.1} className={styles.routerLed} />
            </g>
          ))}
          <line x1={ROUTER.x - 6} y1={ROUTER.y - 4} x2={ROUTER.x - 7} y2={ROUTER.y - 16} stroke="#475569" strokeWidth={1.4} strokeLinecap="round" />
          <line x1={ROUTER.x + 6} y1={ROUTER.y + 2} x2={ROUTER.x + 7} y2={ROUTER.y - 10} stroke="#475569" strokeWidth={1.4} strokeLinecap="round" />
        </g>

        {/* ---------- データセンター（右上に浮かぶ島） ---------- */}
        <g>
          {(() => {
            const cx = DC.x;
            const cy = DC.y;
            const hw = 44;
            const hh = 25;
            const top = [
              { x: cx, y: cy - hh },
              { x: cx + hw, y: cy },
              { x: cx, y: cy + hh },
              { x: cx - hw, y: cy },
            ];
            return (
              <>
                <ellipse cx={cx} cy={cy + hh + 12} rx={hw * 0.9} ry={8} fill="#1e2a40" opacity={0.12} filter="url(#ic-blur)" />
                <polygon points={pts([top[3], top[2], down(top[2], 6), down(top[3], 6)])} fill="#b7c2d1" />
                <polygon points={pts([top[2], top[1], down(top[1], 6), down(top[2], 6)])} fill="#a3afc0" />
                <polygon points={pts(top)} fill="#e6ebf2" stroke="#cfd7e3" strokeWidth={0.6} />
              </>
            );
          })()}
          {/* ラック（島ローカルの箱を、島の中心に合わせて描く） */}
          <g transform={`translate(${DC.x - O.x} ${DC.y - O.y + 4})`}>
            <IsoBox x0={-10} x1={10} y0={-10} y1={10} z1={34} top="#4a5363" left="#2a303c" right="#1f242d" />
            {onYPlane(-9, 10, 32, (
              <g>
                {Array.from({ length: 6 }, (_, i) => (
                  <g key={i}>
                    <rect x={1} y={2 + i * 5} width={16} height={3.6} rx={0.5} fill="#3b4453" />
                    <circle
                      cx={15}
                      cy={3.8 + i * 5}
                      r={0.8}
                      className={styles.rackLed}
                      style={{ animationDelay: `${i * 160}ms` }}
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        </g>

        {/* ---------- 隣の席の盗聴者（奥なので先に描く） ---------- */}
        {(() => {
          const seat = P(130, 62);
          return (
            <g transform={`translate(${seat.x} ${seat.y})`} className={styles.eve} data-active={step.intercepted ? "true" : "false"}>
              <ellipse cx={0} cy={1} rx={11} ry={4} fill="#1e2a40" opacity={0.2} filter="url(#ic-blur)" />
              <rect x={-6} y={-16} width={4} height={16} rx={1.5} fill="#232733" />
              <rect x={2} y={-16} width={4} height={16} rx={1.5} fill="#232733" />
              <path d="M-11 -18 C -11 -30, -6 -35, 0 -35 C 6 -35, 11 -30, 11 -18 L 12 -12 L -12 -12 Z" fill="#3d4250" />
              <path d="M-8 -40 C -8 -50, -4 -54, 0 -54 C 4 -54, 8 -50, 8 -40 C 8 -35, 4 -32, 0 -32 C -4 -32, -8 -35, -8 -40 Z" fill="#3d4250" />
              <ellipse cx={0} cy={-41} rx={5.4} ry={6} fill="#e2b18f" />
              <path d="M-5.6 -44 C -3 -48, 3 -48, 5.6 -44 L 5.6 -46 C 3 -51, -3 -51, -5.6 -46 Z" fill="#2a2e38" />
              <circle cx={-2.2} cy={-41} r={0.8} fill="#1b1d23" />
              <circle cx={2.2} cy={-41} r={0.8} fill="#1b1d23" />
              <path d="M-7 -42 C -7 -50, 7 -50, 7 -42" stroke="#121419" strokeWidth={1.6} fill="none" />
              <rect x={-9} y={-44} width={3} height={6} rx={1.2} fill="#121419" />
              <rect x={6} y={-44} width={3} height={6} rx={1.2} fill="#121419" />
              <circle cx={-7.5} cy={-41} r={0.8} className={styles.eveLed} />
            </g>
          );
        })()}
        <RoundTable at={{ x: 128, y: 86 }}>
          {/* 盗聴者のノートPC（こちらには背面）と受信アンテナ */}
          <IsoBox x0={120} x1={138} y0={80} y1={92} z0={26} z1={27.5} top="#2f3440" left="#1f232b" right="#191c23" />
          {onYPlane(120, 80, 40, (
            <g>
              <rect x={0} y={0} width={18} height={12.5} rx={1} fill="#353b47" />
              <circle cx={9} cy={6} r={2} fill="#4b5263" />
            </g>
          ))}
          <line x1={EVE_PC.x + 12} y1={EVE_PC.y + 6} x2={EVE_PC.x + 12} y2={EVE_PC.y - 8} stroke="#111827" strokeWidth={1.4} strokeLinecap="round" />
          <circle cx={EVE_PC.x + 12} cy={EVE_PC.y - 9} r={1.8} className={styles.antennaTip} />
          <IsoBox x0={140} x1={145} y0={92} y1={97} z0={26} z1={31} top="#ffffff" left="#e5e7eb" right="#d1d5db" />
        </RoundTable>

        {/* ---------- 奥の席（雰囲気） ---------- */}
        <RoundTable at={{ x: 150, y: 142 }}>
          <IsoBox x0={144} x1={149} y0={136} y1={141} z0={26} z1={31} top="#ffffff" left="#e5e7eb" right="#d1d5db" />
          <IsoBox x0={152} x1={164} y0={140} y1={148} z0={26} z1={27.5} top="#dbeafe" left="#bfdbfe" right="#93c5fd" />
        </RoundTable>

        {/* ---------- あなたの席 ---------- */}
        <RoundTable at={{ x: 61, y: 118 }} r={18}>
          <IsoBox x0={52} x1={72} y0={110} y1={124} z0={26} z1={27.5} top="#d6dce4" left="#b8c0cb" right="#a3acb8" />
          {onYPlane(52, 110, 42, (
            <g>
              <rect x={0} y={0} width={20} height={14.5} rx={1} fill="#2a2f39" />
              <rect x={1} y={1} width={18} height={12.5} fill="#ffffff" />
              <rect x={1} y={1} width={18} height={2.4} fill={https ? "#d1fae5" : "#ffe4e6"} />
              <text x={2} y={2.9} className={styles.screenUrl} data-mode={mode}>
                {https ? "https://" : "http://"}
              </text>
              <rect x={3} y={5.5} width={14} height={2.6} rx={0.4} fill="#ffffff" stroke="#9db8ea" strokeWidth={0.35} />
              <text x={3.6} y={7.4} className={styles.screenField}>
                {plain.slice(0, 16)}
              </text>
              <rect x={3} y={9.5} width={14} height={2.4} rx={0.4} fill={index >= 1 ? "#16a37a" : "#2463d1"} />
            </g>
          ))}
          <IsoBox x0={74} x1={79} y0={118} y1={123} z0={26} z1={31} top="#ffffff" left="#e5e7eb" right="#d1d5db" />
        </RoundTable>
        {(() => {
          const seat = P(64, 140);
          return (
            <g transform={`translate(${seat.x} ${seat.y})`}>
              <ellipse cx={0} cy={1} rx={12} ry={4} fill="#1e2a40" opacity={0.22} filter="url(#ic-blur)" />
              <rect x={-1.5} y={-12} width={3} height={12} fill="#3a3f4b" />
              <ellipse cx={0} cy={0} rx={8} ry={2.4} fill="#2c313c" />
              <path d="M-11 -26 C -11 -36, -6 -40, 0 -40 C 6 -40, 11 -36, 11 -26 L 11 -18 L -11 -18 Z" fill="#3b82f6" />
              <rect x={-9} y={-26} width={18} height={14} rx={4} fill="#343a46" />
              <rect x={-2.5} y={-44} width={5} height={5} rx={2} fill="#e7b995" />
              <ellipse cx={0} cy={-48} rx={6.8} ry={7.4} fill="#3a2a22" />
            </g>
          );
        })()}

        {/* ---------- 電波：あなたのノートPCから、周り全部へ ---------- */}
        <g className={styles.waves} data-on={radio ? "true" : "false"}>
          {[0, 1, 2].map((i) => (
            <ellipse
              key={i}
              {...isoCircle(LAPTOP, 118)}
              className={styles.wave}
              style={{ animationDelay: `${i * 0.8}s` }}
            />
          ))}
        </g>

        {/* ---------- TLS：あなたのブラウザからサーバまでの暗号のトンネル ---------- */}
        <g className={styles.tunnel} data-on={https ? "true" : "false"} data-testid="isocafe-tunnel">
          <path
            d={`M ${LAPTOP.x} ${LAPTOP.y - 4} L ${ROUTER.x} ${ROUTER.y - 4} L ${ROUTER.x} ${ROUTER.y - 22} C ${ROUTER.x + 4} ${ROUTER.y - 56}, ${DC.x - 36} ${DC.y + 6}, ${RACK_TOP.x - 6} ${RACK_TOP.y + 8}`}
            className={styles.tunnelTube}
          />
          <path
            d={`M ${LAPTOP.x} ${LAPTOP.y - 7} L ${ROUTER.x} ${ROUTER.y - 7} L ${ROUTER.x - 3} ${ROUTER.y - 22} C ${ROUTER.x + 1} ${ROUTER.y - 58}, ${DC.x - 38} ${DC.y + 3}, ${RACK_TOP.x - 8} ${RACK_TOP.y + 5}`}
            className={styles.tunnelShine}
          />
        </g>

        {/* 盗聴者の受信機へ届く電波（コピー） */}
        {step.intercepted && (
          <line
            x1={PACKET_AT.middle.x}
            y1={PACKET_AT.middle.y}
            x2={EVE_PC.x + 12}
            y2={EVE_PC.y - 9}
            className={styles.copyLine}
          />
        )}

        {/* 小包の光 */}
        <circle
          cx={packet.x}
          cy={packet.y}
          r={7}
          className={styles.packetGlow}
          data-state={packetState}
          filter="url(#ic-glow)"
        />
      </svg>

      {/* ---------- HTML ラベル ---------- */}
      <span className={styles.chip} style={pct({ x: P(64, 140).x, y: P(64, 140).y + 6 })} data-state={step.nodes.user}>
        あなた
        {step.nodes.user === "active" && <i>入力中</i>}
        {step.nodes.user === "sending" && <i>送信</i>}
      </span>
      <span className={styles.chip} style={pct({ x: P(130, 62).x + 6, y: P(130, 62).y + 6 })} data-state={step.nodes.eve}>
        盗聴者（隣の席）
        {step.intercepted && <i>盗聴中</i>}
      </span>
      <span className={`${styles.chip} ${styles.chipAbove}`} style={pct({ x: ROUTER.x - 36, y: ROUTER.y - 12 })} data-state={radio ? "sending" : "idle"}>
        フリーWi-Fi
      </span>
      <span className={styles.chip} style={pct({ x: DC.x, y: DC.y + 34 })} data-state={step.nodes.web}>
        Webサーバ
        {step.nodes.web === "active" && <i>受信</i>}
      </span>
      <span className={styles.caption} style={pct({ x: DC.x - 58, y: DC.y - 4 })}>
        インターネット
      </span>
      {radio && (
        <span className={styles.radioChip} data-mode={mode} style={pct({ x: 14, y: 280 })}>
          <InlineIcon name="wifi" />電波は周り全部に届く
        </span>
      )}

      <div
        className={styles.packet}
        data-state={packetState}
        data-place={step.stop === "desk" ? "above" : step.stop === "arrived" ? "below" : "left"}
        style={pct(step.stop === "arrived" ? { x: DC.x - 22, y: DC.y + 56 } : packet)}
        data-testid="isocafe-packet"
      >
        <span className={styles.packetTag}>{packetTag}</span>
        <span className={styles.packetBody}>{packetBody}</span>
      </div>

      {eveSees !== null && (
        <div className={styles.eveScreen} data-mode={mode} role="status" data-testid="isocafe-eve">
          <span className={styles.eveTitle}>盗聴者の画面</span>
          <span className={styles.eveBody}>{eveSees}</span>
          <span className={styles.eveVerdict}>{https ? "読めない…" : "読めた！"}</span>
        </div>
      )}

      <span className={styles.urlPlate} data-mode={mode}>
        {https ? "https://" : "http://"}
      </span>
    </div>
  );
}
